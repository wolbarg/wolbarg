/**
 * Local OpenAI-compatible mock embedding + chat backends.
 * Default mock mode stubs global fetch (fast, full SDK path).
 * Optional HTTP server mode remains available for network-path testing.
 */

import http from "node:http";
import type { AddressInfo } from "node:net";

const DEFAULT_DIMS = 384;

/** Deterministic pseudo-embedding with light token overlap signal. */
export function fakeEmbedding(text: string, dims = DEFAULT_DIMS): number[] {
  const vector = new Array<number>(dims).fill(0);
  const normalized = text.toLowerCase();
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  for (let i = 0; i < normalized.length; i += 1) {
    const idx = (normalized.charCodeAt(i) * (i + 17)) % dims;
    vector[idx] = (vector[idx] ?? 0) + ((normalized.charCodeAt(i) % 31) / 31);
  }

  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const idx = Math.abs(hash) % dims;
    vector[idx] = (vector[idx] ?? 0) + 1.25;
    vector[(idx + 7) % dims] = (vector[(idx + 7) % dims] ?? 0) + 0.35;
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleOpenAICompatible(
  url: string,
  init: RequestInit | undefined,
  dimensions: number,
): Promise<Response> {
  let body: Record<string, unknown> = {};
  if (init?.body) {
    try {
      body = JSON.parse(String(init.body)) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  if (url.includes("/embeddings")) {
    const input = body.input;
    const text =
      typeof input === "string"
        ? input
        : Array.isArray(input)
          ? String(input[0] ?? "")
          : "";
    return jsonResponse({
      data: [{ embedding: fakeEmbedding(text, dimensions), index: 0 }],
      model: body.model ?? "mock-embed",
      usage: {
        prompt_tokens: Math.max(1, text.split(/\s+/).length),
        total_tokens: Math.max(1, text.split(/\s+/).length),
      },
    });
  }

  if (url.includes("/chat/completions")) {
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const joined = messages
      .map((m) =>
        typeof m === "object" && m && "content" in m
          ? String((m as { content?: unknown }).content ?? "")
          : "",
      )
      .join("\n")
      .slice(0, 400);

    const summary =
      `Compressed agent memory summary covering related operational notes. ` +
      `Key themes extracted from ${messages.length} messages: billing, meetings, ` +
      `deployments, and follow-ups. Source snippet: ${joined.slice(0, 180)}`;

    return jsonResponse({
      choices: [
        {
          message: { role: "assistant", content: summary },
          finish_reason: "stop",
        },
      ],
      model: body.model ?? "mock-llm",
      usage: { prompt_tokens: 128, completion_tokens: 64, total_tokens: 192 },
    });
  }

  return jsonResponse({ error: { message: `No mock route for ${url}` } }, 404);
}

export interface MockBackend {
  baseUrl: string;
  dimensions: number;
  close: () => Promise<void>;
}

/** In-process fetch stub — exercises full SDK provider code without TCP overhead. */
export function installMockFetch(dimensions = DEFAULT_DIMS): MockBackend {
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes("mock.agentorc.local")) {
      return handleOpenAICompatible(url, init, dimensions);
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  return {
    baseUrl: "https://mock.agentorc.local/v1",
    dimensions,
    close: async () => {
      globalThis.fetch = originalFetch;
    },
  };
}

export async function startMockOpenAIServer(
  dimensions = DEFAULT_DIMS,
): Promise<MockBackend> {
  const server = http.createServer(async (req, res) => {
    const url = req.url ?? "";
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const response = await handleOpenAICompatible(
      url,
      { body: raw, method: req.method },
      dimensions,
    );
    const text = await response.text();
    res.statusCode = response.status;
    res.setHeader("Content-Type", "application/json");
    res.end(text);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/v1`;

  return {
    baseUrl,
    dimensions,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
