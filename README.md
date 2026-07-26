<p align="center">
  <img src="https://wolbarg.com/brand/wolbarg-icon.png" alt="Wolbarg" width="96" height="96" align="absmiddle" />
  &nbsp;&nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://wolbarg.com/brand/wolbarg-name-dark.png" />
    <img src="https://wolbarg.com/brand/wolbarg-name-light.png" alt="wolbarg" height="46" align="absmiddle" />
  </picture>
</p>

<p align="center">
  <b>Modular, provider-agnostic semantic memory for AI agents.</b>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/wolbarg"><img alt="npm version" src="https://img.shields.io/npm/v/wolbarg.svg" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg" /></a>
  <a href="https://nodejs.org"><img alt="Node.js" src="https://img.shields.io/badge/node-%3E%3D22.5-brightgreen.svg" /></a>
  <a href="https://wolbarg.com/docs/quick-start"><img alt="Docs" src="https://img.shields.io/badge/docs-wolbarg.com-black" /></a>
  <a href="https://github.com/wolbarg/wolbarg/actions/workflows/sdk-ci.yml"><img alt="SDK CI" src="https://img.shields.io/github/actions/workflow/status/wolbarg/wolbarg/sdk-ci.yml?branch=main&label=SDK%20CI" /></a>
</p>

Wolbarg is **memory infrastructure**, not an agent framework. Agents call `remember()` / `recall()` against durable semantic memory on SQLite or PostgreSQL — with optional ingest, hybrid search, rerankers, and telemetry. You bring any OpenAI-compatible embedding API.

```bash
npm install wolbarg
```

Requires **Node.js 22.5+**. Current release: **0.6.0** — see [RELEASE_NOTES.md](./RELEASE_NOTES.md).

> [!TIP]
> No API key needed to try it — point embeddings at local [Ollama](https://ollama.com) below. For projects, run `npx wolbarg init` and use `createWolbargFromProjectConfig()`.

---

## Quick start

```bash
npm install wolbarg
ollama pull nomic-embed-text
```

```ts
import { wolbarg, sqlite, openaiEmbedding } from "wolbarg";

const ctx = wolbarg({
  organization: "demo",
  storage: sqlite("./memory.db"),
  embedding: openaiEmbedding({
    baseUrl: "http://localhost:11434/v1",
    apiKey: "ollama",
    model: "nomic-embed-text",
  }),
});

await ctx.ready();

await ctx.remember({
  agent: "demo",
  content: { text: "Stripe supports recurring invoices." },
});

const hits = await ctx.recall({ query: "How do recurring invoices work?" });
console.log(hits[0]?.content.text);

await ctx.close();
```

That's the loop: `remember()` writes it, `recall()` finds it by meaning. Swap the embedding config for OpenAI, Gemini, or anything OpenAI-compatible when you're ready — nothing else in your agent code needs to change.

**Project setup (recommended):**

```bash
npx wolbarg init
```

```ts
import { createWolbargFromProjectConfig } from "wolbarg";

const ctx = createWolbargFromProjectConfig();
await ctx.ready();
```

---

## Why Wolbarg?

Most agent stacks either bolt memory onto a chat transcript or lock you into a hosted vector database. Wolbarg sits in between: a **shared semantic memory layer** you own, with a small public API and replaceable backends.

| Need | What Wolbarg provides |
| --- | --- |
| Durable facts across sessions | SQLite file or Postgres tables owned by your app |
| Swap providers without rewrites | Embedding / storage factories; same `remember` / `recall` |
| Search by meaning + keywords | Semantic ANN + optional BM25 hybrid (FTS5 / `tsvector`) |
| Parallel agents writing | WAL + busy retries (SQLite); pool + row locks (Postgres) |
| Observability | Independent SQLite telemetry DB + `recall({ explain: true })` |

---

## Features

- **Semantic memory** — `remember`, `rememberBatch`, `recall`, `recallBatch`, `update`, `forget`, `history`, `stats`, `clear`
- **Hybrid search** — semantic + BM25; metadata filters (`meta.*`); optional MMR; optional HTTP rerankers
- **Document ingest** — TXT/MD/CSV/JSON built-in; PDF (`pdf-parse`), DOCX (`mammoth`), OCR/vision as optional peers
- **Embedding cache** — transparent `hash(content) + model` (on by default; durable on SQLite, L1-only on Postgres)
- **Write-time dedupe** — opt-in exact / near upsert (`memory.dedupe`)
- **Real-time events** — `subscribe()` (SQLite: same-process; Postgres: `LISTEN/NOTIFY`)
- **Cancellation** — `AbortSignal` on remember / recall / update / compress / forget
- **Checkpoints & transfer** — SQLite file-backed `checkpoint` / `rollback` / `export` / `import`
- **CLI** — `wolbarg init` (+ `--help` / `--version`)
- **Compression** — optional LLM `compress()` when `llm` is configured

Optional peers: `pg`, `pdf-parse`, `mammoth`, `tesseract.js` — see [Installation](https://wolbarg.com/docs/installation).

Framework adapters (`@wolbarg/vercel-ai`, `@wolbarg/openai`, `@wolbarg/langchain`, …) and the Cursor connector (`@wolbarg/cursor`) are **separate packages**, not part of this repository tree.

---

## Storage backends

### SQLite (default)

Best for local agents, CLI tools, and single-node apps.

```ts
import { wolbarg, sqlite, openaiEmbedding } from "wolbarg";

const ctx = wolbarg({
  organization: "acme",
  storage: sqlite("./data/memory.db"),
  embedding: openaiEmbedding({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  }),
});
```

- Uses Node `node:sqlite` + `sqlite-vec`
- WAL, `BEGIN IMMEDIATE`, insert coalescing, busy retries
- Prefer **one file per organization** for export/checkpoint safety

### PostgreSQL

Best for multi-tenant SaaS and multi-process agent fleets.

```ts
import { wolbarg, postgres, openaiEmbedding, bm25 } from "wolbarg";

const ctx = wolbarg({
  organization: "acme",
  storage: postgres({
    connectionString: process.env.DATABASE_URL!,
    schema: "wolbarg", // optional namespaced deployment
  }),
  embedding: openaiEmbedding({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  }),
  keywordSearch: bm25(), // required when using hybrid: true
});
```

- Install peer: `npm install pg`
- Optional [pgvector](https://github.com/pgvector/pgvector) for HNSW ANN (otherwise BYTEA + in-process cosine)
- Remote hosts default to `sslmode=require` when unset
- Default pool `maxPoolSize`: **20**

Operator details: [docs/production.md](./docs/production.md) · [docs/architecture.md](./docs/architecture.md).

---

## Embedding providers

Any OpenAI-compatible `/v1/embeddings` endpoint works. Built-in helpers:

| Helper | Typical use |
| --- | --- |
| `openaiEmbedding` | OpenAI |
| `ollamaEmbedding` | Local Ollama |
| `openRouterEmbedding` | OpenRouter |
| `lmStudioEmbedding` | LM Studio |
| `geminiEmbedding` | Google Gemini (OpenAI-compatible base) |
| `togetherEmbedding` | Together |
| `vllmEmbedding` | vLLM |
| `openaiCompatibleEmbedding` | Custom base URL |

`wolbarg init` writes provider presets into `.wolbarg/config.json`.

---

## API overview

| Method | Purpose |
| --- | --- |
| `ready()` / `close()` | Open / close storage (+ telemetry) |
| `remember` / `rememberBatch` | Store memories |
| `rememberFromMessages` | Chat → memory (**experimental**) |
| `recall` / `recallBatch` | Semantic / hybrid search |
| `update` | Update by id (optional `expectedVersion` CAS) |
| `forget` | Archive / delete by id or filter |
| `ingest` | Document → chunked memories |
| `compress` | LLM compression (requires `llm`) |
| `subscribe` | Change events |
| `history` / `stats` / `clear` | Audit / introspection |
| `checkpoint` / `listCheckpoints` / `getCheckpoint` / `deleteCheckpoint` / `rollback` / `export` / `import` | SQLite file transfer |

Typed errors include `ValidationError`, `RerankError`, `StorageLockedError`, `VersionConflictError`, `CancellationError`, `ConfigurationError`, and more — see exports from `wolbarg`.

Full reference: [API docs](https://wolbarg.com/docs/api) · IDE hover JSDoc on all public exports.

---

## Configuration sketch

```ts
const ctx = wolbarg({
  organization: "acme",
  storage: sqlite("./memory.db"),
  embedding: openaiEmbedding({ /* … */ }),
  llm: openaiLlm({ /* … */ }),           // optional — enables compress / extract
  keywordSearch: bm25(),                   // required for hybrid: true
  reranker: jinaReranker({ /* … */ }),     // required for rerank: true
  concurrency: { multiProcess: true },     // SQLite: longer busy timeouts
  memory: { dedupe: { strategy: "exact" } },
  embeddingCache: { enabled: true },
  telemetry: {
    enabled: true,
    database: { provider: "sqlite", url: "./telemetry.db" },
    captureQueries: false,                 // default since 0.6.0
  },
});
```

---

## Production recommendations

1. **SQLite** — one DB file per organization when using export/checkpoint; enable `concurrency.multiProcess` if multiple OS processes share a file; isolate heavy writers from latency-sensitive HTTP workers (`DatabaseSync` runs on the event loop).
2. **Postgres** — use `schema` for isolation; keep TLS on for remote hosts; size `maxPoolSize` for your managed Postgres limits; install pgvector when ANN latency matters.
3. **Hybrid / rerank** — configure providers before setting flags; they **fail closed** in 0.6.0.
4. **Secrets** — API keys in env / `.wolbarg/.env` (gitignored by `init`); never bake into images.
5. **Trust boundary** — `organization` is a namespace, not authentication. Authorize before constructing a tenant context.

See [docs/production.md](./docs/production.md) for backups, migrations, SSL, troubleshooting, and limits.

---

## Limits (honest)

- SQLite `subscribe()` is **same-process only**. Cross-process events need Postgres.
- SQLite export/checkpoint/import/rollback are **whole-file** operations and refuse multi-org files.
- CLI is **`wolbarg init` only** (plus `--help` / `--version`).
- `rememberFromMessages({ mode: "extract" })` is **experimental**.
- Postgres telemetry is **not implemented** (SQLite telemetry only).
- Graph memory (`linkMemories`, Neo4j, …) was **removed** in 0.6.0.
- Published website benchmark pages are **not reproduced by a checked-in suite in this tree**.

More: [Limitations](https://wolbarg.com/docs/guides/limitations) · [docs/architecture.md](./docs/architecture.md).

---

## Examples

| Path | Description |
| --- | --- |
| [wolbarg-tutorials/demo](./wolbarg-tutorials/demo) | Two-agent shared memory (Intent + Partner) |
| [demos/wolbarg-coord-demo](./demos/wolbarg-coord-demo) | Cursor coordination plane smoke demo |

> Tutorials/demos that use `file:../../packages/*` or `file:../../plugins/*` expect companion packages from the broader Wolbarg monorepo. Against **published** npm packages, point dependencies at `wolbarg@0.6.0` and the matching `@wolbarg/*` versions.

---

## Testing

```bash
npm test
npm run test:dist   # after build: assert dist keeps node:sqlite
```

SQLite, concurrency, and crash-recovery suites run everywhere. Live Postgres suites skip unless configured:

```bash
cp .env.test.example .env.test.local   # edit connection string
npm test
```

The target database needs pgvector (`CREATE EXTENSION IF NOT EXISTS vector`). Each live suite uses a throwaway schema and drops it afterwards.

---

## Benchmarks

Historical storage-path numbers (mock embeddings, v0.4 suite) are published on [wolbarg.com/benchmarks](https://wolbarg.com/benchmarks). This repository ships `runBenchmark` / `summarizeBenchmark` stopwatch helpers — **not** a checked-in public stress suite. Treat website numbers as historical until re-run against 0.6.0.

Methodology notes: [docs/benchmarks.md](./docs/benchmarks.md).

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security reports: [SECURITY.md](./SECURITY.md). Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

```bash
npm install
npm run typecheck
npm test
npm run build
```

---

## Roadmap (directional)

- Keep core memory APIs stable and fail-closed where ranking correctness matters
- Postgres telemetry (typed historically; not implemented yet)
- Coding-agent coordination plane via separate connectors (`@wolbarg/cursor`, …)
- ~~Website / docs sync for 0.6.0~~ (done: graph removal, fail-closed hybrid/rerank, SSL defaults)

Not planned for core: becoming an agent framework, hosted control plane, or re-adding graph APIs without a separate package.

---

## Resources

- [Quick start](https://wolbarg.com/docs/quick-start)
- [Installation](https://wolbarg.com/docs/installation)
- [Configuration](https://wolbarg.com/docs/configuration)
- [API reference](https://wolbarg.com/docs/api)
- [What's new in 0.6](./docs/whats-new-0.6.md) · [Website what's new](https://wolbarg.com/docs/guides/whats-new)
- [Production guide](./docs/production.md) · [Website production](https://wolbarg.com/docs/guides/production)
- [Architecture](./docs/architecture.md)
- [Changelog](./CHANGELOG.md)
- [Release notes](./RELEASE_NOTES.md)

---

## License

MIT © [Atharv Munde](https://github.com/Atharvmunde11) / [Wolbarg](https://github.com/wolbarg/wolbarg)
