/**
 * Live Postgres integration tests (Phase 1.1 + 1.2 + 1.4).
 * Skipped unless DATABASE_URL / WOLBARG_TEST_DATABASE_URL is set.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Wolbarg, VersionConflictError } from "../src/index.js";
import type { MemoryChangeEvent } from "../src/subscribe/index.js";
import {
  LIVE_DATABASE_URL,
  dropSchema,
  hasLivePostgres,
  uniqueSchema,
} from "./pg-live.js";

const describeLive = hasLivePostgres ? describe : describe.skip;
const SCHEMA = uniqueSchema("live");

function installLocalFetch(): void {
  const dims = 8;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const text = typeof body.input === "string" ? body.input : "x";
    const v = new Array(dims).fill(0);
    for (let i = 0; i < text.length; i += 1) {
      v[i % dims]! += (text.charCodeAt(i) % 31) / 31;
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return new Response(
      JSON.stringify({
        data: [{ embedding: v.map((x) => x / norm), index: 0 }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
}

describeLive("live Postgres (1.4)", () => {
  const org = `pg-live-${Date.now()}`;
  let writer: Wolbarg;
  let listener: Wolbarg;

  afterAll(async () => {
    await writer?.close().catch(() => undefined);
    await listener?.close().catch(() => undefined);
    await dropSchema(SCHEMA);
  });

  async function openCtx(): Promise<Wolbarg> {
    installLocalFetch();
    const ctx = new Wolbarg();
    await ctx.init({
      organization: org,
      database: {
        provider: "postgres",
        connectionString: LIVE_DATABASE_URL,
        schema: SCHEMA,
      },
      embedding: {
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      },
    });
    return ctx;
  }

  it("CRUD round-trip", async () => {
    writer = await openCtx();
    const saved = await writer.remember({
      agent: "pg",
      content: { text: "postgres live crud fact" },
      metadata: { k: 1 },
    });
    expect(saved.id).toBeTruthy();
    expect(saved.version).toBe(1);

    const hits = await writer.recall({
      query: "postgres live crud fact",
      topK: 3,
    });
    expect(hits.some((h) => h.id === saved.id)).toBe(true);

    const updated = await writer.update({
      id: saved.id,
      metadata: { k: 2 },
      expectedVersion: 1,
    });
    expect(updated.version).toBe(2);

    await expect(
      writer.update({
        id: saved.id,
        metadata: { k: 3 },
        expectedVersion: 1,
      }),
    ).rejects.toBeInstanceOf(VersionConflictError);
  }, 60_000);

  it("cross-process NOTIFY: writer without local subscribers still delivers", async () => {
    writer = await openCtx();
    listener = await openCtx();

    const seen: MemoryChangeEvent[] = [];
    const unsub = listener.subscribe({ organization: org }, (e) => {
      seen.push(e);
    });

    // Give LISTEN a moment to attach
    await new Promise((r) => setTimeout(r, 500));

    // Writer has NO local subscribers ΓÇö this is the regression from 1.1.
    const saved = await writer.remember({
      agent: "notify-writer",
      content: { text: `notify probe ${Date.now()}` },
    });

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && !seen.some((e) => e.memoryId === saved.id || (Array.isArray(e.memoryId) && e.memoryId.includes(saved.id)))) {
      await new Promise((r) => setTimeout(r, 100));
    }

    unsub();
    expect(
      seen.some(
        (e) =>
          e.memoryId === saved.id ||
          (Array.isArray(e.memoryId) && e.memoryId.includes(saved.id)),
      ),
    ).toBe(true);
  }, 60_000);
});
