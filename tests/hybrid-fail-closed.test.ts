/**
 * Fail-closed hybrid: no silent semantic-only when keyword channel is missing.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  ConfigurationError,
  ValidationError,
  Wolbarg,
  bm25,
  openaiEmbedding,
} from "../src/index.js";
import type { KeywordSearchProvider } from "../src/keyword/index.js";
import type { StorageProvider } from "../src/storage/types.js";
import { installFetchMock } from "./helpers.js";

describe("hybrid fail-closed", () => {
  let ctx: Wolbarg | undefined;

  afterEach(async () => {
    await ctx?.close().catch(() => undefined);
  });

  it("throws when hybrid is requested without a keyword channel", async () => {
    installFetchMock();
    // Build a normal instance, then strip searchKeyword from the live storage
    // so the facade sees no keyword backend (same as a custom provider).
    ctx = new Wolbarg({
      organization: `hybrid-${Date.now()}`,
      database: { provider: "sqlite", url: ":memory:" },
      embedding: openaiEmbedding({
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      }),
    });
    await ctx.ready();
    await ctx.remember({ agent: "a", content: { text: "alpha beta gamma" } });

    const storage = (ctx as unknown as { storage: StorageProvider }).storage;
    // Shadow the prototype method so the facade sees no keyword backend.
    Object.defineProperty(storage, "searchKeyword", {
      value: undefined,
      configurable: true,
    });

    await expect(
      ctx.recall({ query: "alpha", hybrid: true, topK: 3 }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      ctx.recall({ query: "alpha", hybrid: true, topK: 3 }),
    ).rejects.toThrow(/hybrid search requires a keyword channel/i);
  });

  async function openWith(
    keywordSearch?: KeywordSearchProvider,
  ): Promise<Wolbarg> {
    installFetchMock();
    const instance = new Wolbarg({
      organization: `hybrid-${Date.now()}-${Math.random()}`,
      database: { provider: "sqlite", url: ":memory:" },
      embedding: openaiEmbedding({
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      }),
      ...(keywordSearch ? { keywordSearch } : {}),
    });
    await instance.ready();
    await instance.remember({
      agent: "a",
      content: { text: "alpha beta gamma" },
    });
    return instance;
  }

  it("fails closed when the storage keyword search throws", async () => {
    ctx = await openWith();
    const storage = (ctx as unknown as { storage: StorageProvider }).storage;
    Object.defineProperty(storage, "searchKeyword", {
      value: async () => {
        throw new Error("boom: FTS index corrupted");
      },
      configurable: true,
    });

    await expect(
      ctx.recall({ query: "alpha", hybrid: true, topK: 3 }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      ctx.recall({ query: "alpha", hybrid: true, topK: 3 }),
    ).rejects.toThrow(/keyword channel is unavailable or unhealthy/i);
  });

  it("fails closed when the FTS keyword channel is unavailable", async () => {
    ctx = await openWith();
    const storage = (ctx as unknown as { storage: StorageProvider }).storage;
    // Mimic the SQLite provider when the FTS5 virtual table was never created.
    Object.defineProperty(storage, "searchKeyword", {
      value: async () => {
        throw new ConfigurationError(
          "FTS keyword search is unavailable on this SQLite database",
          { operation: "searchKeyword" },
        );
      },
      configurable: true,
    });

    await expect(
      ctx.recall({ query: "alpha", hybrid: true, topK: 3 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("fails closed when SQLite FTS is disabled (searchFts null)", async () => {
    ctx = await openWith();
    // Drive the real SQLite searchKeyword path with FTS prepared statements
    // cleared — same state as a DB that never created memories_fts.
    const storage = (
      ctx as unknown as {
        storage: StorageProvider & {
          statements: { searchFts: unknown } | null;
        };
      }
    ).storage;
    expect(storage.statements).not.toBeNull();
    storage.statements!.searchFts = null;

    await expect(
      ctx.recall({ query: "alpha", hybrid: true, topK: 3 }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      ctx.recall({ query: "alpha", hybrid: true, topK: 3 }),
    ).rejects.toThrow(/keyword channel is unavailable or unhealthy/i);
  });

  it("fails closed when a configured keyword provider throws", async () => {
    const throwingKeyword: KeywordSearchProvider = {
      name: "explode",
      async search() {
        throw new Error("keyword provider offline");
      },
    };
    // Build an instance whose storage has no FTS so the facade uses the
    // configured keywordSearch provider, then make that provider throw.
    ctx = await openWith(throwingKeyword);
    const storage = (ctx as unknown as { storage: StorageProvider }).storage;
    Object.defineProperty(storage, "searchKeyword", {
      value: undefined,
      configurable: true,
    });

    await expect(
      ctx.recall({ query: "alpha", hybrid: true, topK: 3 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("does not fail closed when the keyword channel is healthy", async () => {
    // A working BM25 provider must let hybrid succeed (no false positives).
    ctx = await openWith(bm25());
    const storage = (ctx as unknown as { storage: StorageProvider }).storage;
    Object.defineProperty(storage, "searchKeyword", {
      value: undefined,
      configurable: true,
    });
    const hits = await ctx.recall({ query: "alpha", hybrid: true, topK: 3 });
    expect(hits.length).toBeGreaterThan(0);
  });

  it("still recalls semantically when hybrid is not requested", async () => {
    installFetchMock();
    ctx = new Wolbarg({
      organization: `hybrid-sem-${Date.now()}`,
      database: { provider: "sqlite", url: ":memory:" },
      embedding: openaiEmbedding({
        baseUrl: "https://embed.test/v1",
        apiKey: "test",
        model: "test-embed",
      }),
    });
    await ctx.ready();
    await ctx.remember({ agent: "a", content: { text: "semantic only path" } });
    const hits = await ctx.recall({ query: "semantic only path", topK: 3 });
    expect(hits.length).toBeGreaterThan(0);
  });
});
