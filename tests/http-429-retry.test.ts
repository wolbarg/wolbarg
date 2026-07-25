import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAICompatibleEmbeddingProvider } from "../src/embedding/index.js";
import { OpenAICompatibleLlmProvider } from "../src/llm/index.js";
import { EmbeddingError } from "../src/errors/index.js";
import { CompressionError } from "../src/errors/index.js";

describe("HTTP 429 retry (embedding + LLM)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retries embedding 429 then succeeds", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        if (calls < 3) {
          return new Response(
            JSON.stringify({ error: { message: "rate limited" } }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": "0",
              },
            },
          );
        }
        return new Response(
          JSON.stringify({
            data: [{ embedding: [0.1, 0.2, 0.3, 0.4], index: 0 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: "https://embed.test/v1",
      apiKey: "k",
      model: "m",
    });
    const vec = await provider.embed("hello");
    expect(vec.length).toBe(4);
    expect(calls).toBe(3);
  });

  it("exhausts embedding 429 retries with a clear error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ error: { message: "rate limited" } }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "0",
            },
          },
        );
      }),
    );

    const provider = new OpenAICompatibleEmbeddingProvider({
      baseUrl: "https://embed.test/v1",
      apiKey: "k",
      model: "m",
    });
    await expect(provider.embed("hello")).rejects.toMatchObject({
      name: "EmbeddingError",
      code: "EMBEDDING_ERROR",
      reason: "HTTP 429 retries exhausted",
    } satisfies Partial<EmbeddingError>);
  });

  it("retries LLM 429 then succeeds", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        if (calls < 2) {
          return new Response(
            JSON.stringify({ error: { message: "rate limited" } }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": "0",
              },
            },
          );
        }
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "ok" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const provider = new OpenAICompatibleLlmProvider({
      baseUrl: "https://llm.test/v1",
      apiKey: "k",
      model: "m",
    });
    const text = await provider.complete([{ role: "user", content: "hi" }]);
    expect(text).toBe("ok");
    expect(calls).toBe(2);
  });

  it("exhausts LLM 429 retries with a clear error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ error: { message: "rate limited" } }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "0",
            },
          },
        );
      }),
    );

    const provider = new OpenAICompatibleLlmProvider({
      baseUrl: "https://llm.test/v1",
      apiKey: "k",
      model: "m",
    });
    await expect(
      provider.complete([{ role: "user", content: "hi" }]),
    ).rejects.toMatchObject({
      name: "CompressionError",
      reason: "HTTP 429 retries exhausted",
    } satisfies Partial<CompressionError>);
  });
});
