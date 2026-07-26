/**
 * AbortSignal / CancellationError coverage for the public facade.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  CancellationError,
  ValidationError,
  Wolbarg,
  openaiEmbedding,
} from "../src/index.js";
import { installFetchMock } from "./helpers.js";

describe("AbortSignal cancellation", () => {
  let ctx: Wolbarg;

  afterEach(async () => {
    await ctx?.close().catch(() => undefined);
  });

  async function open(): Promise<Wolbarg> {
    installFetchMock();
    ctx = new Wolbarg({
      organization: `abort-${Date.now()}`,
      database: { provider: "sqlite", url: ":memory:" },
      embedding: openaiEmbedding({
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      }),
    });
    await ctx.ready();
    return ctx;
  }

  it("rejects already-aborted signals before any work", async () => {
    const c = await open();
    const ac = new AbortController();
    ac.abort();
    await expect(
      c.remember({
        agent: "a",
        content: { text: "should not land" },
        signal: ac.signal,
      }),
    ).rejects.toBeInstanceOf(CancellationError);
    await expect(
      c.recall({ query: "anything", signal: ac.signal }),
    ).rejects.toBeInstanceOf(CancellationError);
    const stats = await c.stats();
    expect(stats.activeMemories).toBe(0);
  });

  it("rejects non-AbortSignal values", async () => {
    const c = await open();
    await expect(
      c.remember({
        agent: "a",
        content: { text: "x" },
        signal: { aborted: true } as AbortSignal,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("cancels an in-flight embedding HTTP request", async () => {
    const ac = new AbortController();
    let hangNext = false;
    let fetchStarted = false;
    globalThis.fetch = (async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      // ready()/validate() must succeed; only the remember() call hangs.
      if (!hangNext) {
        const dims = 8;
        const v = new Array(dims).fill(0.1);
        return new Response(
          JSON.stringify({ data: [{ embedding: v, index: 0 }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      fetchStarted = true;
      const signal = init?.signal;
      return await new Promise<Response>((_resolve, reject) => {
        if (!signal) {
          reject(new Error("expected abort signal on fetch"));
          return;
        }
        const fail = () => {
          reject(
            Object.assign(new Error("The operation was aborted"), {
              name: "AbortError",
            }),
          );
        };
        if (signal.aborted) {
          fail();
          return;
        }
        signal.addEventListener("abort", fail, { once: true });
      });
    }) as typeof fetch;

    ctx = new Wolbarg({
      organization: `abort-inflight-${Date.now()}`,
      database: { provider: "sqlite", url: ":memory:" },
      embedding: openaiEmbedding({
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
        timeoutMs: 30_000,
      }),
      embeddingCache: { enabled: false },
    });
    await ctx.ready();
    hangNext = true;

    const pending = ctx.remember({
      agent: "a",
      content: { text: "hang until aborted" },
      signal: ac.signal,
    });

    for (let i = 0; i < 50 && !fetchStarted; i += 1) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(fetchStarted).toBe(true);
    ac.abort();

    await expect(pending).rejects.toBeInstanceOf(CancellationError);
  }, 15_000);

  it("leaves no row when cancelled before the write", async () => {
    const c = await open();
    // Pre-aborted covers the checkpoint after embed would have run — same
    // contract as cancelling between embed and write.
    const ac = new AbortController();
    ac.abort(new Error("stop"));
    await expect(
      c.remember({
        agent: "a",
        content: { text: "ghost" },
        signal: ac.signal,
      }),
    ).rejects.toMatchObject({ code: "OPERATION_CANCELLED" });
    expect((await c.stats()).activeMemories).toBe(0);
  });
});
