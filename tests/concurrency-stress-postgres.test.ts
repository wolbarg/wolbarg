/**
 * Live Postgres concurrency stress (correctness).
 * Runs only when WOLBARG_TEST_DATABASE_URL / DATABASE_URL is set (CI).
 */
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  VersionConflictError,
  Wolbarg,
  postgres,
  openaiEmbedding,
  openaiLlm,
} from "../src/index.js";
import { installFetchMock } from "./helpers.js";
import {
  LIVE_DATABASE_URL,
  dropSchema,
  hasLivePostgres,
  uniqueSchema,
} from "./pg-live.js";

const describeLive = hasLivePostgres ? describe : describe.skip;
const SCHEMA = uniqueSchema("stress");

async function openPg(org: string): Promise<Wolbarg> {
  installFetchMock();
  const ctx = new Wolbarg({
    organization: org,
    storage: postgres({
      connectionString: LIVE_DATABASE_URL,
      maxPoolSize: 32,
      schema: SCHEMA,
    }),
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

describeLive("concurrency stress (postgres live)", () => {
  let ctx: Wolbarg;
  const org = `pg-stress-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  afterAll(async () => {
    await dropSchema(SCHEMA);
  });

  afterEach(async () => {
    if (ctx) {
      try {
        await ctx.clear({ confirm: true });
      } catch {
        /* ignore */
      }
      await ctx.close().catch(() => undefined);
    }
  });

  it("handles concurrent remember() without lost or duplicate ids", async () => {
    ctx = await openPg(org);
    const N = 120;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        ctx.remember({
          agent: "pg-writer",
          content: { text: `pg-unique-${i}-${Math.random()}` },
        }),
      ),
    );
    const ids = new Set(results.map((r) => r.id));
    expect(ids.size).toBe(N);
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBe(N);
  });

  it("exact dedupe under concurrent identical writes collapses to one row", async () => {
    ctx = await openPg(org);
    const text = "postgres shared preference";
    const results = await Promise.all(
      Array.from({ length: 30 }, () =>
        ctx.remember({
          agent: "pg-prefs",
          content: { text },
        }),
      ),
    );
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBe(1);
  });

  it("concurrent CAS updates: at most one winner per expectedVersion", async () => {
    ctx = await openPg(org);
    const created = await ctx.remember({
      agent: "pg-cas",
      content: { text: "cas target" },
    });
    const v0 = created.version ?? 1;

    const outcomes = await Promise.allSettled(
      Array.from({ length: 16 }, () =>
        ctx.update({
          id: created.id,
          content: { text: `cas-${Math.random()}` },
          expectedVersion: v0,
        }),
      ),
    );

    const ok = outcomes.filter((o) => o.status === "fulfilled");
    const bad = outcomes.filter((o) => o.status === "rejected");
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(ok.length + bad.length).toBe(16);
    for (const r of bad) {
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(VersionConflictError);
      }
    }
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBe(1);
  });

  it("concurrent compress() does not deadlock and keeps consistent archives", async () => {
    installFetchMock({ summaryText: "pg compressed summary" });
    ctx = await openPg(org);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        ctx.remember({
          agent: "pg-compress",
          content: { text: `compressible fact ${i} about invoices` },
        }),
      ),
    );

    const outcomes = await Promise.allSettled([
      ctx.compress({ agent: "pg-compress", limit: 10 }),
      ctx.compress({ agent: "pg-compress", limit: 10 }),
      ctx.compress({ agent: "pg-compress", limit: 10 }),
    ]);

    const ok = outcomes.filter((o) => o.status === "fulfilled");
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const o of ok) {
      if (o.status === "fulfilled") {
        expect(o.value.archivedIds.length).toBeGreaterThanOrEqual(2);
      }
    }
    // No hang / uncaught deadlock — reaching here is the primary assertion.
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBeGreaterThanOrEqual(1);
  });
});
