# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.6.0] — 2026-07-26

Production-hardening release for the public SDK. Focus: correctness under concurrent writers, fail-closed retrieval, multi-tenant isolation, Postgres SSL/schema defaults, and honest documentation.

### Removed

- **Graph memory** — `sqliteGraph` / `neo4jGraph`, `linkMemories` / `getRelated`, `includeGraph`, Neo4j peer dependency, related tests, and the leftover `src/graph` tree. Graph is no longer part of the SDK surface.

### Breaking

- **Rerank fail-closed** — built-in HTTP / OpenAI chat rerankers throw `RerankError` (`RERANK_ERROR`) on HTTP errors, network/timeouts, or empty/unparseable rankings. Silent identity-order fallback is removed so `rerank: true` never looks successful while ranking was skipped. Custom `RerankerProvider` implementations may still soft-fail if they choose to.
- **Fail-closed recall** — `hybrid: true` without a keyword channel and `rerank: true` without a reranker throw `ValidationError` instead of silently degrading.
- **Hybrid keyword channel** — SQLite/Postgres `searchKeyword` no longer swallows FTS failures into empty hits. Unavailable or broken FTS now throws.
- **Telemetry privacy** — `captureQueries` now defaults to `false` (opt-in to persist query strings).
- **Subscribe tenant lock** — `subscribe()` cannot override `organization` to another tenant.
- **Postgres TLS defaults** — non-loopback connection strings without `sslmode`/`ssl` get `sslmode=require`. Loopback hosts are unchanged. Override with `ssl: false` / `"disable"` (warns for remote hosts), `ssl: true` / `"require"`, or `"prefer"`.
- **Postgres pool default** — `maxPoolSize` default lowered from `64` to `20` (safer for shared managed Postgres). Raise explicitly for high-concurrency hosts.
- **Multi-tenant file transfer** — `export` / `import` / `checkpoint` / `rollback` refuse to operate on a SQLite file that contains memories from any other organization.

### Added

- **`AbortSignal` cancellation** — `signal?: AbortSignal` on `remember`, `rememberFromMessages`, `recall`, `update`, `compress`, and `forget`. Throws `CancellationError` (`OPERATION_CANCELLED`). Built-in OpenAI-compatible embedder combines the caller signal with its timeout via `AbortSignal.any`.
- **Postgres `schema` option** — `postgres({ connectionString, schema: "wolbarg" })` puts every table, index, and NOTIFY channel in a named schema. Independent deployments (including different embedding dimensions) can share one database.
- **Schema-scoped NOTIFY** — custom schema uses `wolbarg_events_<schema>`; default schema keeps `wolbarg_events`.
- **`RerankError`** public export.
- **`MAX_MEMORY_CONTENT_CHARS` (1_000_000)** / **`MAX_METADATA_JSON_BYTES` (256_000)** — exported DoS guards on `content.text` and serialized metadata.
- **Release CI matrix** — Ubuntu (typecheck / build / live Postgres) + Windows (typecheck / build / SQLite). Both verify `dist` keeps `node:sqlite`.
- **Dependabot** — weekly grouped npm (minor/patch) and GitHub Actions updates.
- **`npm run test:dist`** — verifies dist keeps `node:sqlite`; wired into `prepublishOnly`.
- Hermetic live-Postgres harness (`tests/pg-live.ts`) with `.env.test.example` / `.env.test.local`.
- [Architecture notes](./docs/architecture.md) covering coalescing, WAL, CAS, Postgres locking, SSL, and trust boundaries.
- Concurrency stress tests, multi-tenant isolation tests, schema isolation tests, SSL policy tests, rerank fail-closed tests.

### Fixed

- **Rollback / import reopen** — if storage was closed for a file swap and reopen fails, the SDK throws `InitializationError` instead of leaving the facade silently unusable.
- **Postgres TX retries** — top-level transactions retry on deadlock (`40P01`) and serialization failure (`40001`) with full-jitter backoff.
- **Postgres session timeouts** — pool connections set `statement_timeout`, `lock_timeout`, and `idle_in_transaction_session_timeout`.
- **Postgres TX context** — `AsyncLocalStorage` is per provider instance (no cross-instance leakage).
- **Postgres blob archive** — archived memories also clear `memory_embeddings_blob` rows when present.
- **Postgres vector DDL** — embedding dimensions validated before interpolating `vector(N)`.
- **Postgres catalog probes** — HNSW and `content_tsv` detection filter on `current_schema()`.
- **Postgres pgvector detection** — `CREATE EXTENSION` success no longer assumes the `vector` type is usable; resolved with `to_regtype('vector')`.
- **Postgres LISTEN identifier** — channel is quoted so mixed-case channels match `pg_notify()`.
- **SQLite savepoint corruption** — top-level write transactions serialized with an async write mutex; ambient nesting uses `AsyncLocalStorage`.
- **SQLite cold open** — `open()` retries connect → busy_timeout → WAL → migrate on `SQLITE_BUSY`.
- **Compress race** — abort when fewer than 2 sources remain active after concurrent compressors.
- **`wolbarg()` / `createWolbarg()` typing** — overloads preserve `Wolbarg<true>` when `llm` is provided.
- Multi-org SQLite open warning (export/checkpoint still refuse; operators are warned at `open()`).
- Documentation honesty — claims aligned with implemented behavior (no unverified benchmark numbers in this tree; Postgres telemetry marked unimplemented).

### Changed

- SQLite `concurrency.lockDeadlineMs` and `concurrency.multiProcess` profile documented for operators.
- Full-jitter `SQLITE_BUSY` backoff on write transactions.
- Companion `@wolbarg/*` adapters should peer-depend on `wolbarg >= 0.6.0` (bump when republishing those packages).

## [0.5.6] — 2026-07-24

### Added

- **`wolbarg` CLI** with `wolbarg init` — interactive (or `--yes`) project setup for database + embedding provider
- Default SQLite path: `.wolbarg/shared-memory/memory.db`
- Provider presets (OpenAI, Ollama, OpenRouter, LM Studio, Gemini, Together, vLLM, custom) with **visible default base URLs** the user can edit
- Writes `.wolbarg/config.json` and optional `.wolbarg/.env` (API key); adds `.env` paths to `.gitignore`
- **`createWolbargFromProjectConfig()`** / `loadProjectConfig()` to boot the SDK from init output

### Compatibility

- Additive. Existing programmatic `wolbarg({...})` usage unchanged.

## [0.5.5] — 2026-07-21

### Added

- **Comprehensive JSDoc** across the core SDK — every exported function, method, class, interface, and notable helper now has descriptions with `@param` / `@returns` / `@example` where useful for IDE hover documentation (framework adapters ship in separate packages, not this tree)
- Provider interface docs explain how to implement custom storage, telemetry, checkpoint, OCR, vision, rerank, and keyword backends

### Changed

- **`SDK_VERSION`** and package version bumped to **0.5.5**
- Adapter packages (published separately) peer-depend on `wolbarg >= 0.5.5`

### Compatibility

- Documentation-only release. No runtime API or schema changes from **0.5.4**.

## [0.5.3] — 2026-07-20

### Added

- **Official framework adapters (`@1.0.0`, separate packages)** — `@wolbarg/openai`, `@wolbarg/langchain`, `@wolbarg/llamaindex`, `@wolbarg/mastra` (alongside existing `@wolbarg/vercel-ai`); not vendored in this repository tree
- Docs + integration guides on [Integrations](https://wolbarg.com/docs/integrations)

### Compatibility

- Additive only. Core API unchanged from **0.5.2**. Adapter packages peer-depend on `wolbarg >= 0.5.3`.

## [0.5.2] — 2026-07-19

### Added

- **`rememberFromMessages()` (experimental)** — conversation → memory bridge with `mode: "raw"` (default, no LLM) and optional `mode: "extract"` via configured `llm`
- **Companion package `@wolbarg/vercel-ai`** — Language Model Middleware (`wolbargMiddleware` + `wrapLanguageModel`) for automatic recall / remember (published separately; not in this tree)

### Compatibility

- Additive only. Omit the new method and behavior matches **0.5.1**. Experimental API may change — pin versions if you depend on it.
- Core `wolbarg` remains framework-agnostic; AI SDK types live only in `@wolbarg/vercel-ai`.
- `@wolbarg/vercel-ai@1` requires **AI SDK v7+** (`ai@^7`). Upgrade from AI SDK v4 before adopting the middleware.

## [0.5.1] — 2026-07-19

### Fixed

- **SQLite vec0 rowid binding on Linux** — bind `memory_rowid` as `BigInt` for `node:sqlite` + sqlite-vec so CI / Linux inserts and KNN search do not fail on integer PK binds

### Compatibility

- Drop-in patch for **0.5.0**. No API or schema changes.

## [0.5.0] — 2026-07-19

### Added

- **Optional graph memory** (removed in 0.6.0) — historical note only
- **Schema v4** — memory DB index / ANN housekeeping migration on open
- **Wolbarg Studio** — separate product surface (not in this SDK package)
- **Docs** — What's New 0.5, Observability screenshots, provider-isolated project layout

### Compatibility

- Graph was optional and additive in 0.5.0; it has since been removed from the SDK.

## [0.4.0] — 2026-07-18

### Added

- **`subscribe()`** — real-time memory change events (SQLite in-process EventEmitter; Postgres LISTEN/NOTIFY with reconnect)
- **Multi-writer SQLite concurrency** — `BEGIN IMMEDIATE`, exponential backoff retry, `concurrency` constructor config, stable error code `WOLBARG_STORAGE_LOCKED`
- **Embedding cache** — transparent `hash(content)+model` cache with optional LRU/TTL (`embeddingCache` config); additive `cacheHit` path via cache wrapper stats
- **Memory upsert / dedupe** — opt-in write-time exact and near-duplicate detection updates existing active memories instead of inserting (`memory.dedupe`); `RememberResult.action`; history event `"updated"`; public `update()`
- **Schema v3** — `content_hash` column, unique active hash index, `embedding_cache` table, history CHECK allows `'updated'`
- **Docs** — Concurrency, Real-time events, Embedding cache, Memory upsert pages

### Changed

- SQLite mutating transactions use `BEGIN IMMEDIATE` instead of deferred `BEGIN`
- `remember()` / `rememberBatch()` return `RememberResult` (MemoryRecord + `action`) — additive field

### Compatibility

- All features are additive. Dedupe defaults **off**. Embedding cache defaults **on**. No required constructor changes for upgrades from 0.3.x.

## [0.3.2] — 2026-07-18

### Changed

- **npm metadata** — `repository`, `bugs`, `homepage`, and `funding` now point at [wolbarg/wolbarg](https://github.com/wolbarg/wolbarg)

## [0.3.1] — 2026-07-17

### Fixed

- **Checkpoint rollback recovery** — a failed `rollback()` (e.g. missing checkpoint name) no longer leaves SQLite storage closed; the checkpoint is validated before close, and storage is reopened on error
- **Import recovery** — a failed `import()` reopens storage the same way so the client stays usable after a bad export path

## [0.3.0] — 2026-07-17

### Added

- **Telemetry system** — independent EventDatabase (never shares tables with memory). SQLite provider first; interface-ready for PostgreSQL (Postgres telemetry still not implemented).
- **`wolbarg()` factory** plus `database.url` / `telemetry` configuration (additive; `storage` + `init()` still work)
- **Trace system** — `session_id`, `trace_id`, `parent_trace_id` for waterfall debugging
- **Telemetry schema v2** — additive organization, agent, tags, checkpoint, recall-explain, and stage-span fields with indexed queries and automatic v1 migration
- **Recall explain mode** — `recall({ explain: true })` returns ranking diagnostics and timings
- **Checkpoint API** — `checkpoint`, `rollback`, `deleteCheckpoint`, `listCheckpoints`, `getCheckpoint` (first-party SQLite snapshots, never overwrite)
- **Import / export** — portable SQLite + manifest bundles
- **Batch APIs** — `rememberBatch`, `recallBatch` with parent + child telemetry traces
- **Actionable errors** — operation-scoped messages with reason + suggestion
- **Internal benchmark helpers** — `runBenchmark` / `summarizeBenchmark` (stopwatch utilities, not a product stress suite)
- **Wolbarg Studio** — separate Next.js app that reads telemetry databases

### Changed

- **Telemetry instrumentation** — records available organization/agent/checkpoint context, persists real recall explanations, and reports measured pipeline stages without inventing recency signals
- **Rebrand** — product renamed from AgentOrc / `agentorc` to **Wolbarg** / `wolbarg`
- **API** — `AgentOrc` → `Wolbarg`, `AgentOrcOptions` → `WolbargOptions`, `AgentOrcError` → `WolbargError`
- **Links** — docs and homepage now at [wolbarg.com](https://wolbarg.com); GitHub at [wolbarg/wolbarg](https://github.com/wolbarg/wolbarg)
- **Schema** — internal meta table renamed `agentorc_meta` → `wolbarg_meta` (new databases only; recreate or migrate existing DBs)

### Migration

```bash
npm uninstall agentorc
npm install wolbarg
```

```ts
import { wolbarg, openaiEmbedding } from "wolbarg";

const ctx = wolbarg({
  organization: "my-org",
  database: { provider: "sqlite", url: "./memory.db" },
  embedding: openaiEmbedding({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  }),
  telemetry: {
    enabled: true,
    database: { provider: "sqlite", url: "./telemetry.db" },
    level: "debug",
  },
});
```

`new Wolbarg({ storage, embedding })` and `init({ database })` remain fully supported.

## [0.2.1] — 2026-07-15

### Fixed

- **SQLite production hardening** — WAL-safe pragmas, prepared statements, crash-safe batch inserts, and FTS5 kept in the same ACID transaction as semantic writes
- **PostgreSQL production hardening** — named prepared statements, concurrent insert coalescing / unnest batches, org-scoped ANN with adaptive overfetch, deferred HNSW build
- **FTS correctness** — archived memories removed from FTS so hybrid/keyword search never returns archived rows; rebuild path when FTS diverges
- **Multi-tenant isolation** — organization filters enforced on ANN / HNSW query paths so tenants cannot leak across shared Postgres instances
- **HNSW lifecycle** — index created lazily before first KNN (keeps bulk inserts fast); soft org reset does not drop unrelated indexes incorrectly
- **Compression correctness** — active-set reduction and archive bookkeeping aligned with recall filters
- **Vector index paths** — SQLite blob vector index initialization and overfetch handling fixed for recall correctness

### Improved

- **Performance** — batched transactions (SQLite), insert coalescing (Postgres), adaptive overfetch for filtered ANN
- **Docs / website** — v0.2.1 release notes

### Notes

- Storage benchmarks historically used mock embeddings to isolate SDK + database performance
- Node.js **22.5+** still required

## [0.2.0] — 2026-07-14

### Added

- Constructor dependency injection with factory helpers (`sqlite`, `postgres`, `openaiEmbedding`, `openaiLlm`, `bm25`, …)
- PostgreSQL storage provider (`pg` peer) with optional pgvector
- Document `ingest()` for TXT/MD/CSV/JSON, PDF (`pdf-parse`), DOCX (`mammoth`), and images (OCR/vision)
- Hybrid recall (semantic + BM25), metadata filters (`meta.*`), MMR, pluggable rerankers
- Pluggable chunking strategies and optional vision / OCR providers
- Website docs for v0.2 including Limitations and What’s New

### Changed

- LLM / `compress()` is optional (typed `Wolbarg<true>` when configured)
- Schema migrates to v2; storage moved behind `StorageProvider`
- Prefer constructor DI; `init()` remains as a compatibility shim

### Fixed

- Clearer configuration errors when optional ingest peers are missing
- PDF parser compatibility with `pdf-parse` v1 function API and v2 `PDFParse` class

### Notes / limitations

- PDF/DOCX/OCR require optional peers installed in the consumer app (not bundled)
- Scan/image-only PDFs need OCR/vision or a text-layer PDF
- Node `node:sqlite` is experimental; Node.js **22.5+** required

## [0.1.1] — previous

- Initial npm release path (pre–modular storage / ingest)

[0.6.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.6.0
[0.5.6]: https://github.com/wolbarg/wolbarg/releases/tag/v0.5.6
[0.5.5]: https://github.com/wolbarg/wolbarg/releases/tag/v0.5.5
[0.5.3]: https://github.com/wolbarg/wolbarg/releases/tag/v0.5.3
[0.5.2]: https://github.com/wolbarg/wolbarg/releases/tag/v0.5.2
[0.5.1]: https://github.com/wolbarg/wolbarg/releases/tag/v0.5.1
[0.5.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.5.0
[0.4.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.4.0
[0.3.2]: https://github.com/wolbarg/wolbarg/releases/tag/v0.3.2
[0.3.1]: https://github.com/wolbarg/wolbarg/releases/tag/v0.3.1
[0.3.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.3.0
[0.2.1]: https://github.com/wolbarg/wolbarg/releases/tag/v0.2.1
[0.2.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.2.0
