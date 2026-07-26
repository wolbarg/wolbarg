/**
 * Prove organization isolation on a shared SQLite database.
 * Zero cross-tenant leakage for remember / recall / hybrid / metadata /
 * archive / forget / subscribe.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Wolbarg,
  ValidationError,
  bm25,
  meta,
  openaiEmbedding,
  sqlite,
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

function makeCtx(org: string, dbPath: string): Wolbarg {
  return new Wolbarg({
    organization: org,
    storage: sqlite(dbPath),
    embedding: openaiEmbedding({
      apiKey: "k",
      model: "m",
      baseUrl: "https://embed.test/v1",
    }),
    keywordSearch: bm25(),
  });
}

describe("multi-tenant isolation (shared SQLite)", () => {
  const tmpDirs: string[] = [];

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("org A cannot recall org B memories (semantic, hybrid, metadata)", async () => {
    installFetchMock();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-tenant-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, "shared.db");

    const orgA = makeCtx("tenant-a", dbPath);
    const orgB = makeCtx("tenant-b", dbPath);

    const secretA = await orgA.remember({
      agent: "writer",
      content: { text: "tenant A secret project aurora launch codes" },
      metadata: { project: "aurora", tenant: "a" },
    });
    const secretB = await orgB.remember({
      agent: "writer",
      content: { text: "tenant B secret project borealis launch codes" },
      metadata: { project: "borealis", tenant: "b" },
    });

    const semanticA = await orgA.recall({
      query: "secret project launch codes",
      topK: 10,
    });
    expect(semanticA.every((h) => h.id !== secretB.id)).toBe(true);
    expect(semanticA.some((h) => h.id === secretA.id)).toBe(true);

    const semanticB = await orgB.recall({
      query: "secret project launch codes",
      topK: 10,
    });
    expect(semanticB.every((h) => h.id !== secretA.id)).toBe(true);
    expect(semanticB.some((h) => h.id === secretB.id)).toBe(true);

    const hybridA = await orgA.recall({
      query: "borealis",
      topK: 10,
      hybrid: true,
    });
    expect(hybridA.every((h) => h.id !== secretB.id)).toBe(true);

    const metaA = await orgA.recall({
      query: "launch codes",
      topK: 10,
      filter: { metadata: meta.eq("tenant", "b") },
    });
    expect(metaA).toHaveLength(0);

    const metaBLeak = await orgB.recall({
      query: "launch codes",
      topK: 10,
      filter: { metadata: meta.eq("project", "aurora") },
    });
    expect(metaBLeak).toHaveLength(0);

    await orgA.close();
    await orgB.close();
  });

  it("forget and archive stay within organization", async () => {
    installFetchMock();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-tenant-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, "shared.db");

    const orgA = makeCtx("tenant-a", dbPath);
    const orgB = makeCtx("tenant-b", dbPath);

    const a = await orgA.remember({
      agent: "a",
      content: { text: "alpha memory unique phrase" },
    });
    const b = await orgB.remember({
      agent: "b",
      content: { text: "beta memory unique phrase" },
    });

    await orgA.forget({ id: a.id });
    const stillB = await orgB.recall({ query: "beta memory unique", topK: 5 });
    expect(stillB.some((h) => h.id === b.id)).toBe(true);

    // Forgetting B's id from A's instance must not delete it.
    await expect(orgA.forget({ id: b.id })).resolves.toBe(0);
    const stillB2 = await orgB.recall({ query: "beta memory unique", topK: 5 });
    expect(stillB2.some((h) => h.id === b.id)).toBe(true);

    await orgA.close();
    await orgB.close();
  });

  it("rejects cross-organization subscribe filters", async () => {
    installFetchMock();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-tenant-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, "shared.db");

    const orgA = makeCtx("tenant-a", dbPath);
    await orgA.ready();

    expect(() =>
      orgA.subscribe({ organization: "tenant-b" }, () => undefined),
    ).toThrow(ValidationError);

    await orgA.close();
  });
});
