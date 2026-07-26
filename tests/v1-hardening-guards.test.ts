/**
 * Content length DoS guard + telemetry privacy defaults.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_MEMORY_CONTENT_CHARS,
  MAX_METADATA_JSON_BYTES,
  Wolbarg,
  ValidationError,
  openaiEmbedding,
  sqlite,
  SqliteEventDatabase,
} from "../src/index.js";
import { fakeEmbedding } from "./helpers.js";

function installFetchMock(): void {
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
        const body = init?.body
          ? (JSON.parse(String(init.body)) as { input?: string | string[] })
          : {};
        const text = Array.isArray(body.input)
          ? body.input[0] ?? ""
          : body.input ?? "";
        return new Response(
          JSON.stringify({ data: [{ embedding: fakeEmbedding(text) }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 404 });
    }),
  );
}

describe("v1 hardening guards", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects oversized content.text", async () => {
    installFetchMock();
    const ctx = new Wolbarg({
      organization: "dos-org",
      storage: sqlite(":memory:"),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
    });
    await expect(
      ctx.remember({
        agent: "a",
        content: { text: "x".repeat(MAX_MEMORY_CONTENT_CHARS + 1) },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await ctx.close();
  });

  it("rejects oversized metadata on remember", async () => {
    installFetchMock();
    const ctx = new Wolbarg({
      organization: "dos-org",
      storage: sqlite(":memory:"),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
    });
    await expect(
      ctx.remember({
        agent: "a",
        content: { text: "ok" },
        metadata: { blob: "y".repeat(MAX_METADATA_JSON_BYTES) },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await ctx.close();
  });

  it("rejects oversized metadata on update", async () => {
    installFetchMock();
    const ctx = new Wolbarg({
      organization: "dos-org",
      storage: sqlite(":memory:"),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
    });
    const mem = await ctx.remember({
      agent: "a",
      content: { text: "ok" },
      metadata: { keep: true },
    });
    await expect(
      ctx.update({
        id: mem.id,
        metadata: { blob: "z".repeat(MAX_METADATA_JSON_BYTES) },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await ctx.close();
  });

  it("does not persist recall queries unless captureQueries is opted in", async () => {
    installFetchMock();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-telem-"));
    tmpDirs.push(dir);
    const telemPath = path.join(dir, "telemetry.db");
    const memPath = path.join(dir, "memory.db");

    const ctx = new Wolbarg({
      organization: "privacy-org",
      storage: sqlite(memPath),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
      telemetry: {
        enabled: true,
        database: { provider: "sqlite", url: telemPath },
        // captureQueries omitted — must default to false
      },
    });

    await ctx.remember({
      agent: "a",
      content: { text: "privacy sensitive memory text" },
    });
    await ctx.recall({ query: "SECRET_USER_QUERY_SHOULD_NOT_PERSIST", topK: 3 });
    await ctx.flushTelemetry();
    await ctx.close();

    const events = new SqliteEventDatabase({ url: telemPath, readonly: true });
    await events.open();
    const result = await events.query({ limit: 50 });
    const recallEvents = result.events.filter((e) => e.operation === "recall");
    expect(recallEvents.length).toBeGreaterThan(0);
    for (const ev of recallEvents) {
      expect(ev.query).toBeNull();
    }
    await events.close();
  });
});
