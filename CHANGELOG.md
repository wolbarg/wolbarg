# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Postgres `compress()` atomicity:** `insertMemory` no longer joins the coalesce queue inside an ambient transaction (summary + archive now share one TX)
- **Postgres blob archive:** `archiveMemories` deletes from `memory_embeddings_blob` when pgvector is unavailable (no longer updates missing `memory_embeddings`)
- **Postgres TX context:** transaction `AsyncLocalStorage` is per-provider instance (no cross-instance leakage)
- **Compress race:** abort TX when fewer than 2 sources remain active after concurrent compressors
- **SQLite startup storm:** `open()` now retries the whole connect → WAL switch → migrate sequence on `SQLITE_BUSY` (many processes opening one file no longer fail with "database is locked"). `busy_timeout` is applied before the WAL switch
- **SQLite savepoint corruption / lost writes under concurrency:** top-level write transactions are serialized on the single connection with an async write mutex, and the ambient-transaction bypass is now gated on an `AsyncLocalStorage` flag instead of a shared depth counter. Fixes intermittent `no such savepoint: wolbarg_sp_N` under many concurrent same-process writers, and materially improves write throughput (e.g. 32-agent same-process inserts ~2k → ~7k ops/s)
- **CLI `askConfirm`:** used an undefined `defaultValue` (would throw at runtime); now honors the `defaultYes` parameter

### Added

- Postgres deadlock/serialization retries (`40P01` / `40001`) with jitter backoff
- Postgres session timeouts: `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`
- Postgres `FOR UPDATE` on `updateMemory` and ordered row locks on archive
- SQLite `concurrency.lockDeadlineMs` and `concurrency.multiProcess` profile
- SQLite ambient-TX coalesce bypass (parity with Postgres)
- Full-jitter SQLITE_BUSY backoff
- Vector-storage-only benchmark suite: `benchmark/vector-storage-bench.ts`

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

- **Comprehensive JSDoc** across the SDK and official adapter packages — every exported function, method, class, interface, and notable helper now has descriptions with `@param` / `@returns` / `@example` where useful for IDE hover documentation
- Provider interface docs explain how to implement custom storage, telemetry, checkpoint, graph, OCR, vision, rerank, and keyword backends

### Changed

- **`SDK_VERSION`** and package version bumped to **0.5.5**
- Adapter packages peer-depend on `wolbarg >= 0.5.5`

### Compatibility

- Documentation-only release. No runtime API or schema changes from **0.5.4**.

## [0.5.3] — 2026-07-20

### Added

- **Official framework adapters (`@1.0.0`)** — `@wolbarg/openai`, `@wolbarg/langchain`, `@wolbarg/llamaindex`, `@wolbarg/mastra` (alongside existing `@wolbarg/vercel-ai`)
- Docs + runnable examples under `examples/adapters/*` and [Integrations](https://wolbarg.com/docs/integrations)

### Compatibility

- Additive only. Core API unchanged from **0.5.2**. Adapter packages peer-depend on `wolbarg >= 0.5.3`.

## [0.5.2] — 2026-07-19

### Added

- **`rememberFromMessages()` (experimental)** — conversation → memory bridge with `mode: "raw"` (default, no LLM) and optional `mode: "extract"` via configured `llm`
- **Vercel AI SDK adapter example** — `examples/adapters/vercel-ai/` (now uses official `@wolbarg/vercel-ai` middleware)
- **Companion package `@wolbarg/vercel-ai`** — Language Model Middleware (`wolbargMiddleware` + `wrapLanguageModel`) for automatic recall / remember (published separately under `packages/vercel-ai/`)

### Compatibility

- Additive only. Omit the new method and behavior matches **0.5.1**. Experimental API may change before 1.0 — pin versions if you depend on it.
- Core `wolbarg` remains framework-agnostic; AI SDK types live only in `@wolbarg/vercel-ai`.
- `@wolbarg/vercel-ai@1` requires **AI SDK v7+** (`ai@^7`). Upgrade from AI SDK v4 before adopting the middleware.

## [0.5.1] — 2026-07-19


### Fixed

- **SQLite vec0 rowid binding on Linux** — bind `memory_rowid` as `BigInt` for `node:sqlite` + sqlite-vec so CI / Linux inserts and KNN search do not fail on integer PK binds

### Compatibility

- Drop-in patch for **0.5.0**. No API or schema changes.

## [0.5.0] — 2026-07-19

### Added

- **Optional graph memory** — `graph` constructor option with `sqliteGraph({ path })` (local) and `neo4jGraph({ url, username, password })` (networked); optional peer `neo4j-driver`
- **Typed graph API** — `linkMemories()`, `getRelated()` on the facade; provider surface also includes `unlinkMemories`, `upsertEntity`, `linkEntityToMemory`, `deleteMemory`
- **`recall({ includeGraph: true })`** — attaches `related` neighbor memories from the graph
- **Cascade deletes** — `forget` / `clear` remove graph memory nodes and incident edges when graph is configured
- **Graph-aware checkpoints / export** — file-backed SQLite graph snapshots alongside memory DB; Neo4j refuses with `GraphCheckpointNotSupportedError` (`GRAPH_CHECKPOINT_NOT_SUPPORTED`)
- **Schema v4** — memory DB index / ANN housekeeping migration on open (graph tables live in a separate SQLite file or Neo4j)
- **Wolbarg Studio** — graph canvas, Connect for memory/telemetry/checkpoints/graph, ops filters for graph methods, stream / checkpoints / explain polish
- **Docs** — Graph memory, What's New 0.5, Observability screenshots, provider-isolated project layout

### Compatibility

- Graph is **optional** and **additive**. Omitting `graph` leaves 0.4 behavior unchanged.
- No required constructor changes for upgrades from **0.4.x**.
- Raw Cypher `query()` is Neo4j-only; SQLite graph hard-errors (use typed methods for portable code).

## [0.4.0] — 2026-07-18

### Added

- **`subscribe()`** — real-time memory change events (SQLite in-process EventEmitter; Postgres LISTEN/NOTIFY with reconnect)
- **Multi-writer SQLite concurrency** — `BEGIN IMMEDIATE`, exponential backoff retry, `concurrency` constructor config, stable error code `WOLBARG_STORAGE_LOCKED`
- **Embedding cache** — transparent `hash(content)+model` cache with optional LRU/TTL (`embeddingCache` config); additive `cacheHit` path via cache wrapper stats
- **Memory upsert / dedupe** — opt-in write-time exact and near-duplicate detection updates existing active memories instead of inserting (`memory.dedupe`); `RememberResult.action`; history event `"updated"`; public `update()`
- **Schema v3** — `content_hash` column, unique active hash index, `embedding_cache` table, history CHECK allows `'updated'`
- **Docs** — Concurrency, Real-time events, Embedding cache, Memory upsert pages
- **Benchmarks** — `benchmark/multiprocess-levels.ts`, `benchmark/embedding-cache-bench.ts`

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

- **Telemetry system** — independent EventDatabase (never shares tables with memory). SQLite provider first; interface-ready for PostgreSQL.
- **`wolbarg()` factory** plus `database.url` / `telemetry` configuration (additive; `storage` + `init()` still work)
- **Trace system** — `session_id`, `trace_id`, `parent_trace_id` for waterfall debugging
- **Telemetry schema v2** — additive organization, agent, tags, checkpoint, recall-explain, and stage-span fields with indexed queries and automatic v1 migration
- **Recall explain mode** — `recall({ explain: true })` returns ranking diagnostics and timings
- **Checkpoint API** — `checkpoint`, `rollback`, `deleteCheckpoint`, `listCheckpoints`, `getCheckpoint` (first-party SQLite snapshots, never overwrite)
- **Import / export** — portable SQLite + manifest bundles
- **Batch APIs** — `rememberBatch`, `recallBatch` with parent + child telemetry traces
- **Actionable errors** — operation-scoped messages with reason + suggestion
- **Internal benchmark helpers** — `runBenchmark` / `summarizeBenchmark`
- **Wolbarg Studio** — separate Next.js app that reads telemetry databases (see `/wolbarg_studio`)

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
- **PostgreSQL production hardening** — named prepared statements, concurrent insert coalescing / unnest batches, COPY for large ingest, org-scoped ANN with adaptive overfetch, deferred HNSW build
- **FTS correctness** — archived memories removed from FTS so hybrid/keyword search never returns archived rows; rebuild path when FTS diverges
- **Multi-tenant isolation** — organization filters enforced on ANN / HNSW query paths so tenants cannot leak across shared Postgres instances
- **HNSW lifecycle** — index created lazily before first KNN (keeps bulk inserts fast); soft org reset does not drop unrelated indexes incorrectly
- **Compression correctness** — active-set reduction and archive bookkeeping aligned with recall filters
- **Vector index paths** — SQLite blob vector index initialization and overfetch handling fixed for recall correctness

### Improved

- **Performance** — batched transactions (SQLite), insert coalescing (Postgres), adaptive overfetch for filtered ANN
- **Benchmark suite** — dual-backend mock stress + separate LIVE spot suite; clearer methodology separating storage latency from embedding-provider latency
- **Docs / website** — v0.2.1 release notes, dual-backend benchmark page with SQLite and PostgreSQL sections

### Notes

- Storage benchmarks use mock embeddings to isolate SDK + database performance
- LIVE spot benchmarks use real embedding providers for end-to-end latency — these are separate suites; do not mix the numbers
- Node.js **22.5+** still required

## [0.2.0] — 2026-07-14

### Added

- Constructor dependency injection with factory helpers (`sqlite`, `postgres`, `openaiEmbedding`, `openaiLlm`, `bm25`, …)
- PostgreSQL storage provider (`pg` peer) with optional pgvector
- Document `ingest()` for TXT/MD/CSV/JSON, PDF (`pdf-parse`), DOCX (`mammoth`), and images (OCR/vision)
- Hybrid recall (semantic + BM25), metadata filters (`meta.*`), MMR, pluggable rerankers
- Pluggable chunking strategies and optional vision / OCR providers
- Website docs for v0.2 including Limitations and What’s New
- Dual-backend (SQLite + Postgres) test harness

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

[0.5.1]: https://github.com/wolbarg/wolbarg/releases/tag/v0.5.1
[0.5.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.5.0
[0.4.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.4.0
[0.3.2]: https://github.com/wolbarg/wolbarg/releases/tag/v0.3.2
[0.3.1]: https://github.com/wolbarg/wolbarg/releases/tag/v0.3.1
[0.3.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.3.0
[0.2.1]: https://github.com/wolbarg/wolbarg/releases/tag/v0.2.1
[0.2.0]: https://github.com/wolbarg/wolbarg/releases/tag/v0.2.0
[0.1.1]: https://www.npmjs.com/package/wolbarg/v/0.1.1
