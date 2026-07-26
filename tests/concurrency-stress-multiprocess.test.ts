/**
 * Multi-process SQLite stress: several OS processes writing one WAL file.
 * Requires `npm run build` so workers can load dist/index.js (CI builds first).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { Wolbarg, sqlite, openaiEmbedding } from "../src/index.js";
import { installFetchMock } from "./helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(here, "workers", "remember-worker.mjs");
const distEntry = path.resolve(here, "../dist/index.js");

describe("concurrency stress (sqlite multi-process)", () => {
  let dbPath: string;

  afterEach(() => {
    if (!dbPath) return;
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.rmSync(`${dbPath}${suffix}`, { force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("four processes × 25 remembers lose no rows", async () => {
    if (!fs.existsSync(distEntry)) {
      throw new Error(
        "dist/index.js missing — run npm run build before multi-process tests",
      );
    }

    dbPath = path.join(
      os.tmpdir(),
      `wolbarg-mp-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
    );

    installFetchMock();
    const bootstrap = new Wolbarg({
      organization: "mp-org",
      storage: sqlite(dbPath, { concurrency: { multiProcess: true } }),
      embedding: openaiEmbedding({
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      }),
    });
    await bootstrap.ready();
    await bootstrap.close();

    const processes = 4;
    const perProcess = 25;
    const children = Array.from({ length: processes }, (_, i) =>
      runWorker({
        dbPath,
        organization: "mp-org",
        workerId: i,
        writes: perProcess,
      }),
    );

    const codes = await Promise.all(children);
    expect(codes.every((c) => c === 0)).toBe(true);

    installFetchMock();
    const verify = new Wolbarg({
      organization: "mp-org",
      storage: sqlite(dbPath, { concurrency: { multiProcess: true } }),
      embedding: openaiEmbedding({
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      }),
    });
    await verify.ready();
    const stats = await verify.stats();
    await verify.close();
    expect(stats.activeMemories).toBe(processes * perProcess);
  }, 120_000);
});

function runWorker(args: {
  dbPath: string;
  organization: string;
  workerId: number;
  writes: number;
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        workerPath,
        "--db",
        args.dbPath,
        "--org",
        args.organization,
        "--worker",
        String(args.workerId),
        "--writes",
        String(args.writes),
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`worker failed code=${code} stderr=${stderr}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}
