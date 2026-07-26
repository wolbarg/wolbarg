/**
 * Phase 1.1 ΓÇö emitChange must run inside withWriteLock so Postgres NOTIFY
 * uses the ambient TX client (not a post-commit pool round-trip).
 */
import { describe, expect, it } from "vitest";
import { Wolbarg } from "../src/index.js";

describe("NOTIFY in-transaction (1.1)", () => {
  it("emits change events only while withWriteLock is active", async () => {
    const dims = 8;
    globalThis.fetch = (async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
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

    const ctx = new Wolbarg();
    await ctx.init({
      organization: "notify-tx",
      database: { provider: "sqlite", connectionString: ":memory:" },
      embedding: {
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      },
    });

    const probe = ctx as unknown as {
      withWriteLock: <T>(
        fn: () => Promise<T>,
        options?: { exclusive?: boolean },
      ) => Promise<T>;
      emitChange: (event: unknown) => void;
    };

    let lockDepth = 0;
    let emitDuringLock = 0;
    let emitOutsideLock = 0;

    const origLock = probe.withWriteLock.bind(ctx);
    probe.withWriteLock = async <T>(
      fn: () => Promise<T>,
      options?: { exclusive?: boolean },
    ): Promise<T> => {
      lockDepth += 1;
      try {
        return await origLock(fn, options);
      } finally {
        lockDepth -= 1;
      }
    };

    const origEmit = probe.emitChange.bind(ctx);
    probe.emitChange = (event: unknown) => {
      if (lockDepth > 0) emitDuringLock += 1;
      else emitOutsideLock += 1;
      origEmit(event);
    };

    await ctx.remember({
      agent: "a",
      content: { text: "in-tx notify probe" },
    });
    await ctx.rememberBatch([
      { agent: "a", content: { text: "batch one" } },
      { agent: "a", content: { text: "batch two" } },
    ]);
    const mem = await ctx.remember({
      agent: "a",
      content: { text: "to forget" },
    });
    await ctx.forget({ id: mem.id });

    expect(emitDuringLock).toBeGreaterThan(0);
    expect(emitOutsideLock).toBe(0);

    await ctx.close();
  });
});
