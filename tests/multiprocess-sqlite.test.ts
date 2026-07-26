/**
 * Multi-process SQLite remember() stress (Phase 1.3).
 * Spawns real OS child processes via child_process.fork — not worker_threads.
 */
import { afterAll, describe, expect, it } from "vitest";
import { fork, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { Wolbarg } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKERS = 4;
const WRITES_PER_WORKER = 25;

interface WorkerResult {
  ok: number;
  fail: number;
  workerId: number;
}

describe("multi-process SQLite remember (1.3)", () => {
  const tmpDirs: string[] = [];
  afterAll(() => {
    for (const d of tmpDirs) {
      try {
        fs.rmSync(d, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("survives concurrent fork writers without data loss", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-mp-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, "memory.db");
    const workerPath = path.join(__dirname, "workers", "remember-worker.mjs");

    // Bootstrap schema once in the parent so workers don't race on first-open
    // migrations (SQLITE_BUSY / "database is locked" on cold create).
    globalThis.fetch = async (_input, init) => {
      const dims = 8;
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const text = typeof body.input === "string" ? body.input : "x";
      const v = new Array(dims).fill(0);
      for (let i = 0; i < text.length; i += 1) {
        v[i % dims] += (text.charCodeAt(i) % 31) / 31;
      }
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
      return new Response(
        JSON.stringify({
          data: [{ embedding: v.map((x) => x / norm), index: 0 }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    const seed = new Wolbarg();
    await seed.init({
      organization: "mp-org",
      database: { provider: "sqlite", connectionString: dbPath },
      embedding: {
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      },
    });
    const seeded = await seed.remember({
      agent: "seed",
      content: { text: "schema seed" },
    });
    await seed.forget({ id: seeded.id });
    await seed.close();

    const start = performance.now();
    const results = await new Promise<WorkerResult[]>((resolve, reject) => {
      const collected: WorkerResult[] = [];
      let remaining = WORKERS;
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      for (let i = 0; i < WORKERS; i += 1) {
        const child: ChildProcess = fork(
          workerPath,
          [
            "--db",
            dbPath,
            "--org",
            "mp-org",
            "--worker",
            String(i),
            "--writes",
            String(WRITES_PER_WORKER),
          ],
          { execArgv: [] },
        );
        child.on("message", (msg: WorkerResult) => {
          collected.push(msg);
          remaining -= 1;
          if (remaining === 0 && !settled) {
            settled = true;
            resolve(collected);
          }
        });
        child.on("error", (err) => fail(err));
        child.on("exit", (code) => {
          if (code !== 0 && !settled) {
            fail(new Error(`worker ${i} exited with code ${code}`));
          }
        });
      }
    });

    const wallMs = performance.now() - start;
    const totalOk = results.reduce((s, r) => s + r.ok, 0);
    const totalFail = results.reduce((s, r) => s + r.fail, 0);
    const expected = WORKERS * WRITES_PER_WORKER;
    const opsPerSec = totalOk / (wallMs / 1000);

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM memories WHERE organization = ? AND archived = 0`,
      )
      .get("mp-org") as { c: number };
    db.close();

    // Honest multi-process throughput ΓÇö use this figure in Phase 3 docs.
    console.log(
      `[1.3 multi-process] workers=${WORKERS} writes_each=${WRITES_PER_WORKER} ` +
        `ok=${totalOk} fail=${totalFail} wall_ms=${wallMs.toFixed(1)} ` +
        `ops_per_sec=${opsPerSec.toFixed(2)} db_rows=${row.c}`,
    );

    expect(totalFail).toBe(0);
    expect(totalOk).toBe(expected);
    expect(Number(row.c)).toBe(expected);
    expect(opsPerSec).toBeGreaterThan(0);
  }, 120_000);
});
