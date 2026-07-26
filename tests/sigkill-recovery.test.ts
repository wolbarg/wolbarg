/**
 * Abrupt process death (SIGKILL / taskkill) mid-session must not lose
 * *committed* writes after WAL recovery. This does not claim durability of
 * in-flight uncommitted transactions (synchronous=NORMAL).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { Wolbarg, sqlite } from "../src/index.js";
import { fakeEmbedding } from "./helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const childScript = path.join(here, "workers", "sigkill-child.mjs");
const distEntry = path.resolve(here, "../dist/index.js");

describe("SIGKILL / abrupt exit WAL recovery", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("committed remembers survive child SIGKILL then reopen", async () => {
    if (!fs.existsSync(distEntry)) {
      throw new Error(
        "dist/index.js missing — run npm run build before SIGKILL test",
      );
    }

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-sigkill-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, "memory.db");
    const markerPath = path.join(dir, "committed.json");

    // Bootstrap schema in parent so child open is warm.
    {
      const boot = new Wolbarg({
        organization: "sigkill-org",
        storage: sqlite(dbPath),
        embedding: {
          model: "fake",
          embed: async (text: string) => fakeEmbedding(text),
          validate: async () => ({ dimensions: 8 }),
        },
      });
      await boot.ready();
      await boot.close();
    }

    const child = spawn(
      process.execPath,
      [childScript, "--db", dbPath, "--marker", markerPath],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stderr = "";
    child.stderr?.on("data", (buf) => {
      stderr += String(buf);
    });

    const marker = await new Promise<{ ids: string[]; pid: number }>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          reject(
            new Error(`child timed out before committing\nstderr:\n${stderr}`),
          );
        }, 30_000);
        const poll = setInterval(() => {
          if (fs.existsSync(markerPath)) {
            clearInterval(poll);
            clearTimeout(timer);
            resolve(JSON.parse(fs.readFileSync(markerPath, "utf8")));
          }
        }, 50);
        child.on("error", (err) => {
          clearInterval(poll);
          clearTimeout(timer);
          reject(err);
        });
        child.on("exit", (code, signal) => {
          if (!fs.existsSync(markerPath)) {
            clearInterval(poll);
            clearTimeout(timer);
            reject(
              new Error(
                `child exited early code=${code} signal=${signal}\nstderr:\n${stderr}`,
              ),
            );
          }
        });
      },
    );

    // Abrupt kill — no graceful close.
    child.kill("SIGKILL");
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode) {
        resolve();
        return;
      }
      child.on("exit", () => resolve());
      setTimeout(resolve, 5_000);
    });

    const verify = new Wolbarg({
      organization: "sigkill-org",
      storage: sqlite(dbPath),
      embedding: {
        model: "fake",
        embed: async (text: string) => fakeEmbedding(text),
        validate: async () => ({ dimensions: 8 }),
      },
    });
    await verify.ready();
    const stats = await verify.stats();
    expect(stats.activeMemories).toBe(marker.ids.length);
    await verify.close();
  }, 60_000);
});
