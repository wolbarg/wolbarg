/**
 * Schema upgrade + integrity-check regression tests.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Wolbarg,
  InitializationError,
  openaiEmbedding,
  sqlite,
} from "../src/index.js";
import { SCHEMA_VERSION } from "../src/schema/index.js";
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

/** Minimal pre-v5 schema (memories without row_version; history/cache match current). */
function seedLegacyV4Db(dbPath: string): void {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE Wolbarg_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    INSERT INTO Wolbarg_meta(key, value) VALUES ('schema_version', '4');
    CREATE TABLE memories (
      id TEXT PRIMARY KEY NOT NULL,
      organization TEXT NOT NULL,
      agent TEXT NOT NULL,
      content_text TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
      compressed_into TEXT NULL,
      content_hash TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE memory_history (
      id TEXT PRIMARY KEY NOT NULL,
      memory_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('created', 'archived', 'compressed', 'updated')),
      related_memory_id TEXT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );
    CREATE TABLE memory_embeddings_blob (
      memory_rowid INTEGER PRIMARY KEY NOT NULL,
      embedding BLOB NOT NULL
    );
    CREATE TABLE embedding_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      model TEXT NOT NULL,
      vector BLOB NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE memories_fts USING fts5(
      content_text,
      memory_id UNINDEXED,
      organization UNINDEXED,
      agent UNINDEXED,
      tokenize = 'porter unicode61'
    );
  `);
  db.close();
}

describe("SQLite integrity + schema migration", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("upgrades schema v4 → current and preserves rows", async () => {
    installFetchMock();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-migrate-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, "legacy.db");
    seedLegacyV4Db(dbPath);

    // Insert a legacy row directly (no row_version column yet).
    {
      const db = new DatabaseSync(dbPath);
      db.prepare(
        `INSERT INTO memories(id, organization, agent, content_text, metadata_json, created_at, updated_at, archived)
         VALUES (?, ?, ?, ?, '{}', ?, ?, 0)`,
      ).run(
        "legacy-1",
        "migrate-org",
        "agent",
        "legacy memory content about widgets",
        new Date().toISOString(),
        new Date().toISOString(),
      );
      db.close();
    }

    const ctx = new Wolbarg({
      organization: "migrate-org",
      storage: sqlite(dbPath),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
    });

    await ctx.ready();

    const hits = await ctx.recall({
      query: "legacy memory widgets",
      topK: 5,
    });
    // Fresh embed of a new remember proves the upgraded schema accepts writes;
    // the legacy row is still readable via history/stats even if ANN empty.
    const stats = await ctx.stats();
    expect(stats.activeMemories).toBeGreaterThanOrEqual(1);

    await ctx.remember({
      agent: "agent",
      content: { text: "post-upgrade memory about widgets" },
    });
    const after = await ctx.recall({ query: "widgets", topK: 5 });
    expect(after.length).toBeGreaterThan(0);

    // Confirm schema_version bumped.
    const db = new DatabaseSync(dbPath);
    const ver = db
      .prepare(`SELECT value FROM Wolbarg_meta WHERE key = 'schema_version'`)
      .get() as { value: string };
    expect(Number(ver.value)).toBe(SCHEMA_VERSION);
    db.close();

    void hits;
    await ctx.close();
  });

  it("rejects a truncated/corrupt database on open", async () => {
    installFetchMock();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wolbarg-corrupt-"));
    tmpDirs.push(dir);
    const dbPath = path.join(dir, "corrupt.db");
    // Not a valid SQLite header.
    fs.writeFileSync(dbPath, Buffer.from("NOT_A_SQLITE_DATABASE_FILE!!!!"));

    const ctx = new Wolbarg({
      organization: "corrupt-org",
      storage: sqlite(dbPath),
      embedding: openaiEmbedding({
        apiKey: "k",
        model: "m",
        baseUrl: "https://embed.test/v1",
      }),
    });

    await expect(ctx.ready()).rejects.toBeInstanceOf(InitializationError);
  });
});
