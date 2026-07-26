/**
 * Same-process concurrency stress (correctness, not throughput).
 * Asserts no lost writes, no duplicate ids, stable row versions, and compress races.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  VersionConflictError,
  Wolbarg,
  sqlite,
  openaiEmbedding,
  openaiLlm,
} from "../src/index.js";
import { EMBED_DIMS, fakeEmbedding, installFetchMock } from "./helpers.js";

function tmpDb(): string {
  return path.join(
    os.tmpdir(),
    `wolbarg-stress-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
}

async function openSqlite(dbPath: string, org = "stress-org"): Promise<Wolbarg> {
  installFetchMock();
  const ctx = new Wolbarg({
    organization: org,
    storage: sqlite(dbPath, { concurrency: { multiProcess: true } }),
    embedding: openaiEmbedding({
      baseUrl: "https://embed.test/v1",
      apiKey: "test",
      model: "test-embed",
    }),
    llm: openaiLlm({
      baseUrl: "https://llm.test/v1",
      apiKey: "test",
      model: "test-llm",
    }),
    memory: { dedupe: { enabled: true, strategy: "exact" } },
  });
  await ctx.ready();
  return ctx;
}

describe("concurrency stress (sqlite same-process)", () => {
  let dbPath: string;
  let ctx: Wolbarg;

  beforeEach(() => {
    dbPath = tmpDb();
  });

  afterEach(async () => {
    await ctx?.close().catch(() => undefined);
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.rmSync(`${dbPath}${suffix}`, { force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("handles hundreds of concurrent remember() without lost writes", async () => {
    ctx = await openSqlite(dbPath);
    const N = 200;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        ctx.remember({
          agent: "writer",
          content: { text: `unique-memory-${i}-${Math.random()}` },
        }),
      ),
    );
    const ids = new Set(results.map((r) => r.id));
    expect(ids.size).toBe(N);
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBe(N);
  });

  it("exact dedupe under concurrent identical writes keeps a single active row", async () => {
    ctx = await openSqlite(dbPath);
    const text = "same preference for dark mode";
    const results = await Promise.all(
      Array.from({ length: 40 }, () =>
        ctx.remember({
          agent: "prefs",
          content: { text },
          metadata: { n: Math.random() },
        }),
      ),
    );
    const ids = new Set(results.map((r) => r.id));
    expect(ids.size).toBe(1);
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBe(1);
  });

  it("concurrent update() with CAS rejects stale versions without corruption", async () => {
    ctx = await openSqlite(dbPath);
    const created = await ctx.remember({
      agent: "cas",
      content: { text: "versioned row" },
    });
    const v0 = created.version ?? 1;

    const outcomes = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        ctx.update({
          id: created.id,
          content: { text: `updated-${Math.random()}` },
          expectedVersion: v0,
        }),
      ),
    );

    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o) => o.status === "rejected");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    expect(fulfilled.length + rejected.length).toBe(20);
    for (const r of rejected) {
      expect(r.status).toBe("rejected");
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(VersionConflictError);
      }
    }

    const hits = await ctx.recall({ query: "versioned", topK: 5 });
    expect(hits.some((h) => h.id === created.id)).toBe(true);
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBe(1);
  });

  it("concurrent forget + remember does not leave inconsistent stats", async () => {
    ctx = await openSqlite(dbPath);
    const seeded = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        ctx.remember({
          agent: "mix",
          content: { text: `seed-${i}` },
        }),
      ),
    );

    await Promise.all([
      ...seeded.slice(0, 25).map((m) => ctx.forget({ id: m.id })),
      ...Array.from({ length: 25 }, (_, i) =>
        ctx.remember({
          agent: "mix",
          content: { text: `new-${i}-${Math.random()}` },
        }),
      ),
    ]);

    const stats = await ctx.stats();
    expect(stats.activeMemories).toBe(50);
    expect(stats.totalMemories).toBe(stats.activeMemories + stats.archivedMemories);
  });

  it("concurrent compress() never archives fewer than 2 sources without failing", async () => {
    installFetchMock({ summaryText: "summary of batch" });
    ctx = await openSqlite(dbPath);
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        ctx.remember({
          agent: "compress-agent",
          content: { text: `fact-${i} about widgets and sprockets` },
        }),
      ),
    );

    const outcomes = await Promise.allSettled([
      ctx.compress({ agent: "compress-agent", limit: 8 }),
      ctx.compress({ agent: "compress-agent", limit: 8 }),
      ctx.compress({ agent: "compress-agent", limit: 8 }),
    ]);

    const ok = outcomes.filter((o) => o.status === "fulfilled");
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const o of ok) {
      if (o.status === "fulfilled") {
        expect(o.value.archivedIds.length).toBeGreaterThanOrEqual(2);
      }
    }

    const stats = await ctx.stats();
    expect(stats.activeMemories).toBeGreaterThanOrEqual(1);
  });

  it("survives reopen after write storm (WAL recovery sanity)", async () => {
    ctx = await openSqlite(dbPath);
    await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        ctx.remember({
          agent: "wal",
          content: { text: `wal-row-${i}` },
        }),
      ),
    );
    await ctx.close();

    ctx = await openSqlite(dbPath);
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBe(100);
  });
});

// Keep fakeEmbedding referenced for potential future near-dedupe stress.
void fakeEmbedding;
void EMBED_DIMS;
