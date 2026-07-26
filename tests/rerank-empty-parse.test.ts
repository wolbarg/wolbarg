/**
 * Fail-closed rerank: empty / HTTP / network failures must throw RerankError.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Wolbarg,
  RerankError,
  crossEncoder,
  openaiReranker,
} from "../src/index.js";
import { fakeEmbedding } from "./helpers.js";

function installFetchMock(opts: {
  rerankStatus?: number;
  rerankBody?: unknown;
  chatContent?: string;
  chatStatus?: number;
}): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/embeddings")) {
        const bodyRaw = init?.body
          ? JSON.parse(String(init.body))
          : ({ input: undefined } as unknown);
        const body = bodyRaw as { input?: string | string[] };
        const text = Array.isArray(body.input)
          ? body.input[0] ?? ""
          : body.input ?? "";
        return new Response(
          JSON.stringify({ data: [{ embedding: fakeEmbedding(text) }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/rerank")) {
        return new Response(JSON.stringify(opts.rerankBody ?? {}), {
          status: opts.rerankStatus ?? 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/chat/completions")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: opts.chatContent ?? "{}",
                },
              },
            ],
          }),
          {
            status: opts.chatStatus ?? 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ error: { message: "not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

describe("recall rerank fail-closed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws RerankError when reranker parses 200 as empty", async () => {
    installFetchMock({ rerankBody: {} });

    const reranker = crossEncoder({
      apiKey: "rerank-key",
      baseUrl: "https://rerank.test",
    });

    const ctx = new Wolbarg({
      organization: "rerank-org",
      database: { provider: "sqlite", connectionString: ":memory:" },
      embedding: {
        baseUrl: "https://embed.test/v1",
        apiKey: "embed-key",
        model: "embed-model",
      },
      reranker,
    });

    await ctx.ready();
    await ctx.remember({ agent: "a", content: { text: "alpha" } });
    await ctx.remember({ agent: "a", content: { text: "beta" } });

    await expect(
      ctx.recall({ query: "alpha", topK: 2, rerank: true }),
    ).rejects.toBeInstanceOf(RerankError);

    await ctx.close();
  });

  it("throws RerankError on HTTP error from reranker", async () => {
    installFetchMock({
      rerankStatus: 503,
      rerankBody: { message: "unavailable" },
    });

    const reranker = crossEncoder({
      apiKey: "rerank-key",
      baseUrl: "https://rerank.test",
    });

    const ctx = new Wolbarg({
      organization: "rerank-http",
      database: { provider: "sqlite", connectionString: ":memory:" },
      embedding: {
        baseUrl: "https://embed.test/v1",
        apiKey: "embed-key",
        model: "embed-model",
      },
      reranker,
    });

    await ctx.ready();
    await ctx.remember({ agent: "a", content: { text: "alpha" } });

    await expect(
      ctx.recall({ query: "alpha", topK: 1, rerank: true }),
    ).rejects.toMatchObject({ code: "RERANK_ERROR" });

    await ctx.close();
  });

  it("throws RerankError when openai chat reranker returns empty results", async () => {
    installFetchMock({ chatContent: '{"results":[]}' });

    const reranker = openaiReranker({
      apiKey: "k",
      baseUrl: "https://openai.test/v1",
    });

    const ctx = new Wolbarg({
      organization: "rerank-oai",
      database: { provider: "sqlite", connectionString: ":memory:" },
      embedding: {
        baseUrl: "https://embed.test/v1",
        apiKey: "embed-key",
        model: "embed-model",
      },
      reranker,
    });

    await ctx.ready();
    await ctx.remember({ agent: "a", content: { text: "alpha" } });

    await expect(
      ctx.recall({ query: "alpha", topK: 1, rerank: true }),
    ).rejects.toBeInstanceOf(RerankError);

    await ctx.close();
  });
});
