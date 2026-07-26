/**
 * Reranker provider abstractions for second-stage recall ranking.
 *
 * Rerankers reorder vector/keyword candidates using cross-encoders or LLM scoring.
 * Built-in HTTP adapters **fail closed**: network / HTTP / empty-parse failures
 * throw {@link RerankError} so production never silently keeps semantic order
 * while `rerank: true` was requested.
 *
 * @example
 * ```ts
 * import { cohereReranker } from "wolbarg";
 *
 * const reranker = cohereReranker({ apiKey: process.env.COHERE_API_KEY! });
 * ```
 */

import { RerankError } from "../errors/index.js";

/** Document passed to a reranker — memory id + searchable text. */
export interface RerankDocument {
  /** Memory UUID. */
  id: string;
  /** Text body used for relevance scoring. */
  text: string;
}

/** A reranked hit with relevance score. */
export interface RerankHit {
  /** Memory UUID. */
  id: string;
  /** Relevance score (higher is better; provider-specific scale). */
  score: number;
}

/**
 * Contract for cross-encoder and API rerankers.
 *
 * Implement this interface to plug in Cohere, Jina, local cross-encoders, or
 * custom scoring. Custom providers that intentionally soft-fail may return
 * identity order; built-in HTTP adapters throw {@link RerankError} instead.
 *
 * @example Custom provider
 * ```ts
 * const myReranker: RerankerProvider = {
 *   name: "local-ce",
 *   async rerank(query, documents, topK) {
 *     return documents.slice(0, topK).map((d, i) => ({ id: d.id, score: 1 - i * 0.1 }));
 *   },
 * };
 * ```
 */
export interface RerankerProvider {
  /** Provider identifier (e.g. `"cohere"`, `"openai"`). */
  readonly name: string;
  /**
   * Reorder documents by query relevance.
   * @param query - User search string.
   * @param documents - Candidate memories to rerank.
   * @param topK - Maximum hits to return.
   * @returns Hits sorted by score descending.
   * @throws {RerankError} When the provider cannot produce a usable ranking
   *   (built-in adapters).
   */
  rerank(
    query: string,
    documents: RerankDocument[],
    topK: number,
  ): Promise<RerankHit[]>;
}

interface HttpRerankerOptions {
  name: string;
  url: string;
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  /** Build request body for the provider. */
  buildBody: (
    query: string,
    documents: RerankDocument[],
    topK: number,
    model?: string,
  ) => unknown;
  /** Parse ranked results from JSON response. */
  parseResults: (body: unknown, documents: RerankDocument[]) => RerankHit[];
}

class HttpRerankerProvider implements RerankerProvider {
  readonly name: string;
  private readonly options: HttpRerankerOptions;

  constructor(options: HttpRerankerOptions) {
    this.name = options.name;
    this.options = options;
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    topK: number,
  ): Promise<RerankHit[]> {
    if (documents.length === 0) {
      return [];
    }
    const controller = new AbortController();
    const timeoutMs = this.options.timeoutMs ?? 30_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(this.options.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(
          this.options.buildBody(
            query,
            documents,
            topK,
            this.options.model,
          ),
        ),
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          typeof body === "object" &&
          body !== null &&
          "message" in body &&
          typeof (body as { message: unknown }).message === "string"
            ? (body as { message: string }).message
            : `HTTP ${res.status}`;
        throw new RerankError(
          `Reranker "${this.name}" request failed: ${detail}`,
          {
            operation: "rerank",
            reason: `provider=${this.name} status=${res.status}`,
            suggestion:
              "Verify reranker URL, API key, and model; or omit rerank: true",
          },
        );
      }
      const parsed = this.options.parseResults(body, documents);
      const hits = parsed.slice(0, topK);
      // Empty parse on a non-empty candidate set is treated as provider failure
      // — never silent identity order.
      if (hits.length === 0) {
        throw new RerankError(
          `Reranker "${this.name}" returned no usable rankings`,
          {
            operation: "rerank",
            reason: "empty or unparseable rerank response",
            suggestion:
              "Check the provider response shape, or omit rerank: true to keep semantic order",
          },
        );
      }
      return hits;
    } catch (error) {
      if (error instanceof RerankError) {
        throw error;
      }
      throw new RerankError(
        `Reranker "${this.name}" failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          cause: error instanceof Error ? error : undefined,
          operation: "rerank",
          reason: "network, timeout, or transport error",
        },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Generic cross-encoder reranker for OpenAI-compatible `/rerank` endpoints.
 *
 * @throws {RerankError} On HTTP, network, or empty-parse failure.
 *
 * @param options - Remote endpoint configuration.
 * @param options.baseUrl - API base URL (appends `/rerank`).
 * @param options.apiKey - Bearer token for authorization.
 * @param options.model - Optional model name sent in the request body.
 * @param options.timeoutMs - Request timeout (default `30000`).
 */
export function crossEncoder(options: {
  baseUrl: string;
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}): RerankerProvider {
  const base = options.baseUrl.replace(/\/+$/, "");
  return new HttpRerankerProvider({
    name: "cross-encoder",
    url: `${base}/rerank`,
    apiKey: options.apiKey,
    model: options.model,
    timeoutMs: options.timeoutMs,
    buildBody: (query, documents, topK, model) => ({
      model,
      query,
      documents: documents.map((d) => d.text),
      top_n: topK,
    }),
    parseResults: (body, documents) => {
      const results =
        (body as { results?: Array<{ index: number; relevance_score: number }> })
          .results ?? [];
      return results.map((r) => ({
        id: documents[r.index]?.id ?? String(r.index),
        score: r.relevance_score,
      }));
    },
  });
}

/**
 * Jina AI reranker (`jina-reranker-v2-base-multilingual` by default).
 *
 * @throws {RerankError} On HTTP, network, or empty-parse failure.
 *
 * @param options.apiKey - Jina API key.
 * @param options.model - Model id override.
 * @param options.timeoutMs - Request timeout (default `30000`).
 */
export function jinaReranker(options: {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}): RerankerProvider {
  return new HttpRerankerProvider({
    name: "jina",
    url: "https://api.jina.ai/v1/rerank",
    apiKey: options.apiKey,
    model: options.model ?? "jina-reranker-v2-base-multilingual",
    timeoutMs: options.timeoutMs,
    buildBody: (query, documents, topK, model) => ({
      model,
      query,
      documents: documents.map((d) => d.text),
      top_n: topK,
    }),
    parseResults: (body, documents) => {
      const results =
        (body as { results?: Array<{ index: number; relevance_score: number }> })
          .results ?? [];
      return results.map((r) => ({
        id: documents[r.index]?.id ?? String(r.index),
        score: r.relevance_score,
      }));
    },
  });
}

/**
 * Cohere Rerank v3.5 API adapter.
 *
 * @throws {RerankError} On HTTP, network, or empty-parse failure.
 *
 * @param options.apiKey - Cohere API key.
 * @param options.model - Model id (default `"rerank-v3.5"`).
 * @param options.timeoutMs - Request timeout (default `30000`).
 */
export function cohereReranker(options: {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}): RerankerProvider {
  return new HttpRerankerProvider({
    name: "cohere",
    url: "https://api.cohere.com/v2/rerank",
    apiKey: options.apiKey,
    model: options.model ?? "rerank-v3.5",
    timeoutMs: options.timeoutMs,
    buildBody: (query, documents, topK, model) => ({
      model,
      query,
      documents: documents.map((d) => d.text),
      top_n: topK,
    }),
    parseResults: (body, documents) => {
      const results =
        (body as { results?: Array<{ index: number; relevance_score: number }> })
          .results ?? [];
      return results.map((r) => ({
        id: documents[r.index]?.id ?? String(r.index),
        score: r.relevance_score,
      }));
    },
  });
}

/**
 * BGE-style remote reranker for self-hosted endpoints with Jina/Cohere response shape.
 *
 * @throws {RerankError} On HTTP, network, or empty-parse failure.
 *
 * @param options.apiKey - Bearer token for the remote service.
 * @param options.baseUrl - Service base URL (appends `/rerank`).
 * @param options.model - Optional model name.
 * @param options.timeoutMs - Request timeout (default `30000`).
 */
export function bgeReranker(options: {
  apiKey: string;
  baseUrl: string;
  model?: string;
  timeoutMs?: number;
}): RerankerProvider {
  const base = options.baseUrl.replace(/\/+$/, "");
  return new HttpRerankerProvider({
    name: "bge",
    url: `${base}/rerank`,
    apiKey: options.apiKey,
    model: options.model,
    timeoutMs: options.timeoutMs,
    buildBody: (query, documents, topK, model) => ({
      model,
      query,
      documents: documents.map((d) => d.text),
      top_n: topK,
    }),
    parseResults: (body, documents) => {
      const results =
        (body as { results?: Array<{ index: number; relevance_score: number }> })
          .results ?? [];
      return results.map((r) => ({
        id: documents[r.index]?.id ?? String(r.index),
        score: r.relevance_score,
      }));
    },
  });
}

/**
 * OpenAI chat-based reranker (no dedicated rerank API key required).
 *
 * Scores query–document relevance via JSON-mode chat completions and reorders hits.
 *
 * @throws {RerankError} On parse, network, or empty-result failure.
 *
 * @param options.apiKey - OpenAI API key.
 * @param options.model - Chat model (default `"gpt-4.1-mini"`).
 * @param options.baseUrl - API base (default `"https://api.openai.com/v1"`).
 * @param options.timeoutMs - Request timeout (default `60000`).
 *
 * @example
 * ```ts
 * const reranker = openaiReranker({ apiKey: process.env.OPENAI_API_KEY! });
 * ```
 */
export function openaiReranker(options: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}): RerankerProvider {
  const base = (options.baseUrl ?? "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  const model = options.model ?? "gpt-4.1-mini";
  const timeoutMs = options.timeoutMs ?? 60_000;

  return {
    name: "openai",
    async rerank(query, documents, topK) {
      if (documents.length === 0) {
        return [];
      }
      const listed = documents
        .map((d, i) => `[${i}] ${d.text.slice(0, 800)}`)
        .join("\n\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  'You rerank documents for a retrieval system. Reply ONLY with JSON: {"results":[{"index":0,"score":0.0}]} where score is 0-1 relevance.',
              },
              {
                role: "user",
                content: `Query: ${query}\n\nDocuments:\n${listed}\n\nReturn the top ${topK} indices sorted by score descending.`,
              },
            ],
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new RerankError(
            `OpenAI reranker request failed: HTTP ${res.status}`,
            {
              operation: "rerank",
              reason: `status=${res.status}`,
            },
          );
        }
        const body = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content ?? "{}";
        let parsed: { results?: Array<{ index: number; score: number }> };
        try {
          parsed = JSON.parse(content) as typeof parsed;
        } catch (error) {
          throw new RerankError(
            "OpenAI reranker returned non-JSON content",
            {
              cause: error instanceof Error ? error : undefined,
              operation: "rerank",
              reason: "json_parse_failed",
            },
          );
        }
        const results = parsed.results ?? [];
        if (results.length === 0) {
          throw new RerankError(
            "OpenAI reranker returned no usable rankings",
            {
              operation: "rerank",
              reason: "empty results array",
            },
          );
        }
        return results
          .filter((r) => documents[r.index])
          .slice(0, topK)
          .map((r) => ({
            id: documents[r.index]!.id,
            score: Number(r.score) || 0,
          }));
      } catch (error) {
        if (error instanceof RerankError) {
          throw error;
        }
        throw new RerankError(
          `OpenAI reranker failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            cause: error instanceof Error ? error : undefined,
            operation: "rerank",
            reason: "network, timeout, or transport error",
          },
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
