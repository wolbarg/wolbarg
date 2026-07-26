/**
 * Postgres `schema` option: namespace isolation within a single database.
 *
 * The injection/naming guards run everywhere; the isolation proofs need a live
 * server and are skipped unless DATABASE_URL / WOLBARG_TEST_DATABASE_URL is set.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConfigurationError, Wolbarg, postgres } from "../src/index.js";
import {
  notifyChannelForSchema,
  WOLBARG_NOTIFY_CHANNEL,
} from "../src/subscribe/index.js";
import type { MemoryChangeEvent } from "../src/subscribe/index.js";
import {
  LIVE_DATABASE_URL,
  dropSchema,
  hasLivePostgres,
  memoryExistsInSchema,
  tablesInSchema,
  uniqueSchema,
} from "./pg-live.js";

/** Deterministic embedder of a chosen width, so each schema can differ. */
function installFetchWithDims(dims: number): void {
  globalThis.fetch = (async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const text = typeof body.input === "string" ? body.input : "x";
    const v = new Array<number>(dims).fill(0);
    for (let i = 0; i < text.length; i += 1) {
      v[i % dims]! += (text.charCodeAt(i) % 31) / 31;
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return new Response(
      JSON.stringify({ data: [{ embedding: v.map((x) => x / norm), index: 0 }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
}

describe("postgres schema option (guards)", () => {
  it("rejects schema names that are not plain identifiers", () => {
    const bad = [
      "public; DROP TABLE memories",
      "wolbarg--",
      'we"ird',
      "1abc",
      "has space",
      "tick'quote",
    ];
    for (const schema of bad) {
      expect(() =>
        postgres({ connectionString: "postgres://x/y", schema }),
      ).toThrow(ConfigurationError);
    }
  });

  it("rejects schema names too long for a NOTIFY channel identifier", () => {
    expect(() =>
      postgres({ connectionString: "postgres://x/y", schema: "a".repeat(49) }),
    ).toThrow(ConfigurationError);
    expect(() =>
      postgres({ connectionString: "postgres://x/y", schema: "a".repeat(48) }),
    ).not.toThrow();
  });

  it("scopes the NOTIFY channel per schema but keeps the default name", () => {
    expect(notifyChannelForSchema()).toBe(WOLBARG_NOTIFY_CHANNEL);
    expect(notifyChannelForSchema("public")).toBe(WOLBARG_NOTIFY_CHANNEL);
    expect(notifyChannelForSchema("tenant_a")).toBe(
      `${WOLBARG_NOTIFY_CHANNEL}_tenant_a`,
    );
    // Must stay within Postgres' 63-byte identifier limit.
    expect(notifyChannelForSchema("a".repeat(48)).length).toBeLessThanOrEqual(63);
  });
});

const describeLive = hasLivePostgres ? describe : describe.skip;

describeLive("postgres schema option (live isolation)", () => {
  const schemaA = uniqueSchema("isoa");
  const schemaB = uniqueSchema("isob");
  // Same organization in both: isolation must come from the schema alone.
  const org = "shared-org-name";
  // Deliberately different widths — proves the vector column is per-schema.
  const DIMS_A = 8;
  const DIMS_B = 16;
  let a: Wolbarg;
  let b: Wolbarg;

  /** The embedder mock is global, so pin the right width around each call. */
  async function withDims<T>(dims: number, fn: () => Promise<T>): Promise<T> {
    installFetchWithDims(dims);
    return fn();
  }

  async function open(schema: string, dims: number): Promise<Wolbarg> {
    return withDims(dims, async () => {
      const ctx = new Wolbarg({
        organization: org,
        storage: postgres({ connectionString: LIVE_DATABASE_URL, schema }),
        embedding: {
          baseUrl: "https://embed.test/v1",
          apiKey: "test",
          model: "test-embed",
        },
      });
      await ctx.ready();
      return ctx;
    });
  }

  beforeAll(async () => {
    a = await open(schemaA, DIMS_A);
    b = await open(schemaB, DIMS_B);
  }, 60_000);

  afterAll(async () => {
    await a?.close().catch(() => undefined);
    await b?.close().catch(() => undefined);
    await dropSchema(schemaA);
    await dropSchema(schemaB);
  });

  it("creates its tables inside the target schema", async () => {
    const tables = await tablesInSchema(schemaA);
    expect(tables).toContain("memories");
    expect(tables).toContain("memory_embeddings");
    expect(tables).toContain("wolbarg_meta");
  }, 60_000);

  it("supports different embedding dimensions per schema in one database", async () => {
    const inA = await withDims(DIMS_A, () =>
      a.remember({ agent: "iso", content: { text: "eight dimensional fact" } }),
    );
    const inB = await withDims(DIMS_B, () =>
      b.remember({ agent: "iso", content: { text: "sixteen dimensional fact" } }),
    );
    expect(inA.id).toBeTruthy();
    expect(inB.id).toBeTruthy();
  }, 60_000);

  it("does not leak rows across schemas despite an identical organization", async () => {
    const secret = `schema-a-only-${Date.now()}`;
    const saved = await withDims(DIMS_A, () =>
      a.remember({ agent: "iso", content: { text: secret } }),
    );

    // Recallable where it was written — so a passing test cannot just mean
    // "both sides are broken".
    const hitsA = await withDims(DIMS_A, () => a.recall({ query: secret, topK: 20 }));
    expect(hitsA.some((h) => h.id === saved.id)).toBe(true);

    const hitsB = await withDims(DIMS_B, () => b.recall({ query: secret, topK: 20 }));
    expect(hitsB.some((h) => h.id === saved.id)).toBe(false);
    expect(hitsB.some((h) => h.content?.text === secret)).toBe(false);

    // Straight at the tables: the row exists only where it was written, and
    // never in `public` (which this bench database may already be using).
    expect(await memoryExistsInSchema(schemaA, saved.id)).toBe(true);
    expect(await memoryExistsInSchema(schemaB, saved.id)).toBe(false);
    expect(await memoryExistsInSchema("public", saved.id)).toBe(false);
  }, 60_000);

  it("does not deliver NOTIFY events across schemas", async () => {
    const seenByB: MemoryChangeEvent[] = [];
    const unsub = b.subscribe({ organization: org }, (e) => {
      seenByB.push(e);
    });
    await new Promise((r) => setTimeout(r, 500));

    const saved = await withDims(DIMS_A, () =>
      a.remember({
        agent: "iso",
        content: { text: `cross-schema notify probe ${Date.now()}` },
      }),
    );

    // Generous window: absence of an event is the assertion.
    await new Promise((r) => setTimeout(r, 1500));
    unsub();

    const matched = seenByB.some(
      (e) =>
        e.memoryId === saved.id ||
        (Array.isArray(e.memoryId) && e.memoryId.includes(saved.id)),
    );
    expect(matched).toBe(false);
  }, 60_000);
});
