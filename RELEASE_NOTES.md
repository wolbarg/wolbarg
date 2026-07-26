# Wolbarg 0.6.0

**Production-hardening release** for shared semantic memory. Same core loop — `remember()` / `recall()` — with safer concurrency, fail-closed retrieval, multi-tenant isolation, and Postgres defaults that match real deployments.

```bash
npm install wolbarg@0.6.0
```

Full changelog: [CHANGELOG.md](./CHANGELOG.md) · Architecture: [docs/architecture.md](./docs/architecture.md)

---

## Highlights

### Fail-closed retrieval

`hybrid: true` and `rerank: true` no longer silently degrade. Missing providers throw `ValidationError`. Built-in HTTP/OpenAI rerankers throw `RerankError` instead of falling back to identity order. Incorrect ranking that looks successful is worse than a loud error.

### Concurrent writers

SQLite: WAL, `BEGIN IMMEDIATE`, insert coalescing, busy retries, cold-open busy retries, write-mutex savepoints. Postgres: pool default max **20**, insert coalescing, `SELECT … FOR UPDATE` on update/archive, deadlock/serialization retries, session statement/lock timeouts, `row_version` CAS.

### Postgres for shared databases

- Non-loopback URLs without `sslmode` get **`sslmode=require`** by default (`ssl: false` to opt out for local-only tunnels).
- `schema: "wolbarg"` namespaces tables, indexes, and NOTIFY channels so one database can host independent deployments — including different embedding dimensions.

### Multi-tenant safety

SQLite `export` / `import` / `checkpoint` / `rollback` refuse files that contain another organization’s memories. `subscribe()` cannot override `organization` to another tenant. Open warns when a shared multi-org SQLite file is detected.

### Cancellation

Pass `signal: AbortSignal` (or `AbortSignal.timeout(ms)`) on `remember` / `recall` / `update` / `compress` / `forget`. Throws `CancellationError`; in-flight embedding HTTP aborts.

### Removed: graph memory

`sqliteGraph` / `neo4jGraph`, `linkMemories` / `getRelated`, and `includeGraph` are gone. Model relationships with metadata or an external store. Upgrade code that imported graph APIs before installing 0.6.0.

---

## Upgrade notes

| Area | Action |
| --- | --- |
| Graph APIs | Remove `graph`, `linkMemories`, `getRelated`, `includeGraph` usage |
| Hybrid / rerank | Ensure `keywordSearch` / `reranker` are configured when flags are set |
| Postgres remote | Expect TLS (`sslmode=require`) unless you override |
| Pool size | Raise `maxPoolSize` if you relied on the old default of 64 |
| Telemetry | Set `captureQueries: true` if you need query strings persisted |
| Rerank errors | Catch `RerankError` instead of assuming soft fallback |

From 0.5.x without graph:

```bash
npm install wolbarg@0.6.0
```

Most `remember` / `recall` call sites need no changes. Review hybrid, rerank, and Postgres SSL settings.

---

## Requirements

- Node.js **22.5+** (`node:sqlite`)
- SQLite (built-in) or PostgreSQL with optional pgvector (`pg` peer)
- Any OpenAI-compatible embedding endpoint

## What this release does not claim

- Postgres telemetry store (not implemented)
- Multi-process SQLite `subscribe()`
- Checked-in public benchmark reproduction in this repository
- Graph memory / Neo4j (removed)
- Application-layer auth — `organization` is a data namespace, not IAM

See [docs/production.md](./docs/production.md) for operator guidance.
