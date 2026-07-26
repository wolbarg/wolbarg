/**
 * Event-loop lag probe around coalesced SQLite inserts (Phase 1.7).
 *
 * Strategy (chosen over worker-thread offload): yield between coalesce flush
 * waves and between insertMemoriesBatch chunks via setImmediate, while keeping
 * each wave/batch inside one BEGIN IMMEDIATE for correctness.
 *
 * node:sqlite DatabaseSync work still runs on the main thread ΓÇö yielding only
 * bounds how long a single synchronous stretch can run before timers fire.
 */
import { describe, expect, it } from "vitest";
import { SqliteStorageProvider } from "../src/storage/providers/sqlite.js";
import type { InsertMemoryInput } from "../src/storage/types.js";

function input(i: number): InsertMemoryInput {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    organization: "lag-org",
    agent: "writer",
    contentText: `lag probe ${i}`,
    metadata: {},
    embedding: Float32Array.from([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]),
    createdAt: now,
    updatedAt: now,
    contentHash: null,
  };
}

describe("sqlite event-loop lag during coalesce (1.7)", () => {
  it("keeps timer lag bounded under a burst of coalesced inserts", async () => {
    const storage = new SqliteStorageProvider({ connectionString: ":memory:" });
    await storage.open();
    await storage.ensureVectorSchema(8);

    const lags: number[] = [];
    let expected = performance.now() + 10;
    const timer = setInterval(() => {
      const now = performance.now();
      lags.push(Math.max(0, now - expected));
      expected = now + 10;
    }, 10);

    const N = 200;
    await Promise.all(Array.from({ length: N }, (_, i) => storage.insertMemory(input(i))));

    // Drain remaining timers
    await new Promise((r) => setTimeout(r, 50));
    clearInterval(timer);

    const maxLag = lags.length ? Math.max(...lags) : 0;
    const p95 = lags.length
      ? [...lags].sort((a, b) => a - b)[Math.floor(lags.length * 0.95)]!
      : 0;

    console.log(
      `[1.7 event-loop] samples=${lags.length} max_lag_ms=${maxLag.toFixed(1)} p95_lag_ms=${p95.toFixed(1)}`,
    );

    expect(lags.length).toBeGreaterThan(0);
    // With yield-between-chunks + serialized flush, 200 in-memory inserts must
    // not stall the event loop for multi-second stretches.
    expect(maxLag).toBeLessThan(500);

    await storage.close();
  });
});
