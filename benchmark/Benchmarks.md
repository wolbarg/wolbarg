# Agent ORC Benchmarks

Generated **2026-07-14T11:25:28.934Z** · suite v1.0.0 · mode `mock` · scale `full`

## Environment

| Key | Value |
| --- | --- |
| Node | v24.13.1 |
| Platform | win32/arm64 |
| CPUs | 8 |
| Host RAM | 15.61 GB |
| SDK | agentorc |
| Organization | demo-org |
| Embedding mode | local-mock-openai-compatible |
| Embedding model | mock-embed |
| LLM model | mock-llm |
| Embedding dims | 384 |
| Wall clock | 327.35 s |
| Result rows | 37 |

## Summary

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Startup | Cold | 8.63 ms |
| Startup | Warm | 3.35 ms |
| Compression | 50 | 98.04% reduction |
| Compression | 200 | 99.50% reduction |
| Compression | 500 | 99.50% reduction |
| Compression | 1000 | 99.50% reduction |
| Concurrency | 10 writers | 2.64k ops/sec |
| Concurrency | 50 writers | 2.96k ops/sec |
| Concurrency | 100 writers | 2.63k ops/sec |
| Memory Usage | baseline (pre-init) | heap 14.02 MB / rss 81.21 MB |
| Memory Usage | after init | heap 14.09 MB / rss 81.27 MB |
| Memory Usage | after 100 inserts | heap 18.55 MB / rss 81.31 MB |
| Memory Usage | after 1000 inserts | heap 19.41 MB / rss 81.95 MB |
| Memory Usage | after 10000 inserts | heap 20.12 MB / rss 103.14 MB |
| Memory Usage | after recall | heap 31.19 MB / rss 136.27 MB |
| Memory Usage | after close | heap 31.19 MB / rss 136.24 MB |
| Database Size | 100 | 316.00 KB |
| Database Size | 1000 | 2.64 MB |
| Database Size | 10000 | 25.96 MB |
| Database Size | 100000 | 260.79 MB |
| Search | 100 | 722.7 µs |
| Search | 1000 | 11.65 ms |
| Search | 10000 | 100.84 ms |
| Search | 100000 | 1.12 s |
| Retrieval top-5 | 1000 | 8.33 ms |
| Retrieval top-10 | 1000 | 11.39 ms |
| Retrieval top-20 | 1000 | 9.61 ms |
| Retrieval top-5 | 10000 | 107.26 ms |
| Retrieval top-10 | 10000 | 105.44 ms |
| Retrieval top-20 | 10000 | 127.77 ms |
| Retrieval top-5 | 100000 | 1.43 s |
| Retrieval top-10 | 100000 | 1.27 s |
| Retrieval top-20 | 100000 | 968.21 ms |
| Insert | 100 | 2.03k ops/sec |
| Insert | 1000 | 2.54k ops/sec |
| Insert | 10000 | 2.39k ops/sec |
| Insert | 100000 | 2.02k ops/sec |

## Detailed Results

### Startup Benchmark

Measures cold vs warm AgentOrc initialization time (database open, WAL, vector schema, embedding/LLM health probes).

_Section duration: 1.33 s_

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Startup | Cold | 8.63 ms |
| Startup | Warm | 3.35 ms |

#### Metrics

##### Startup — Cold

| Metric | Value |
| --- | --- |
| avgInitMs | 8.63 ms |
| minMs | 8.34 ms |
| maxMs | 8.83 ms |
| iterations | 5 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "samplesMs": [
    8.339600000000019,
    8.481400000000008,
    8.715700000000083,
    8.787500000000023,
    8.834800000000087
  ],
  "definition": "New AgentOrc instance + init() against a freshly created empty SQLite file each iteration"
}
```

</details>

##### Startup — Warm

| Metric | Value |
| --- | --- |
| avgInitMs | 3.35 ms |
| minMs | 2.96 ms |
| maxMs | 3.81 ms |
| iterations | 5 |
| tinybenchHz | 295.41 ops/sec |
| tinybenchMeanMs | 3.55 ms |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "samplesMs": [
    2.963100000000054,
    3.1597000000000435,
    3.3281999999999243,
    3.466699999999946,
    3.8092999999998938
  ],
  "dbExists": true,
  "definition": "New AgentOrc instance + init() reopening an existing populated database"
}
```

</details>


#### Startup methodology

- **Cold**: empty DB created per iteration — migrations + vector schema + provider probes.
- **Warm**: reopen existing DB with data already present.
- Both paths include embedding and LLM `validate()` probes via the configured provider.

### Compression Benchmark

Measures AgentOrc.compress() duration, compression ratio, memory counts before/after, and on-disk storage saved.

_Section duration: 745.98 ms_

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Compression | 50 | 98.04% reduction |
| Compression | 200 | 99.50% reduction |
| Compression | 500 | 99.50% reduction |
| Compression | 1000 | 99.50% reduction |

#### Metrics

##### Compression — 50

> Reduction refers to active working-set (archived / (archived + summary)). Disk may grow slightly when a summary is added.

| Metric | Value |
| --- | --- |
| compressionDurationMs | 4.58 ms |
| activeSetReduction | 98.04% |
| compressionRatio | 0.0196 |
| memoriesBefore | 50 |
| memoriesAfterTotal | 51 |
| activeAfterEstimate | 1 |
| archivedCount | 50 |
| storageBeforeBytes | 2.14 MB |
| storageAfterBytes | 2.27 MB |
| storageSavedBytes | 0 B |
| storageDeltaBytes | +140.82 KB |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "limit": 50,
  "summaryPreview": "Compressed agent memory summary covering related operational notes. Key themes extracted from 2 messages: billing, meetings, deployments, and follow-ups. Source snippet: You are a memory compression engine for multi-agent systems.\nGiven rel",
  "summaryId": "46a8a60e-456d-4df8-9677-28be4f158849",
  "archivedIdsSample": [
    "d904814d-1187-4cbd-9513-e1eed6d4a0e9",
    "bc99e295-0492-4961-9c41-d7f153a494e2",
    "0c7120bb-6651-49cd-948f-b1580631f260",
    "c3b4d183-6303-490a-87c9-10d2ba5a606a",
    "d3c2c507-ea84-4328-b3e3-f174e8d7d0ff",
    "e1493130-7a1f-4df3-b763-6b4be80d9306",
    "2612e5dc-b5fe-408e-a62b-8749749ae4bc",
    "6a46f999-15ea-4fb6-a744-7ab1936a7937",
    "288337e0-75c7-4b8d-8817-12f4f90acefc",
    "9ecbb474-6f84-44a3-9847-ed224ab8d121"
  ],
  "note": "Archived source memories remain on disk with lineage; total row count typically increases by 1 (summary)."
}
```

</details>

##### Compression — 200

> Reduction refers to active working-set (archived / (archived + summary)). Disk may grow slightly when a summary is added.

| Metric | Value |
| --- | --- |
| compressionDurationMs | 11.95 ms |
| activeSetReduction | 99.50% |
| compressionRatio | 0.0050 |
| memoriesBefore | 200 |
| memoriesAfterTotal | 201 |
| activeAfterEstimate | 1 |
| archivedCount | 200 |
| storageBeforeBytes | 4.55 MB |
| storageAfterBytes | 4.55 MB |
| storageSavedBytes | 0 B |
| storageDeltaBytes | -0 B |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "limit": 200,
  "summaryPreview": "Compressed agent memory summary covering related operational notes. Key themes extracted from 2 messages: billing, meetings, deployments, and follow-ups. Source snippet: You are a memory compression engine for multi-agent systems.\nGiven rel",
  "summaryId": "e0fd9cfd-0a6f-4d05-9df0-72efd834d4a8",
  "archivedIdsSample": [
    "1c1a2210-f443-4d2c-a139-6148e909ecff",
    "2b41a507-3d76-4de0-925e-6f31832c13cc",
    "d1d74258-a607-415e-bf42-69ffb34866ab",
    "afa06b02-b792-46be-b32b-be9cc5b48fee",
    "417c31b1-1833-4a8b-8187-79b90da75fad",
    "a862aab1-61fb-4e7f-b9d7-5375b0527f0c",
    "52d8b5eb-36bd-42f1-b63c-c1ad322c2920",
    "3ecbe654-66cf-426a-99c8-edd8eb739f90",
    "0e700ad5-baf0-495b-a391-732fa2c8150c",
    "e20c5585-ed4c-4c6b-b716-58e034ec5b1a"
  ],
  "note": "Archived source memories remain on disk with lineage; total row count typically increases by 1 (summary)."
}
```

</details>

##### Compression — 500

> Reduction refers to active working-set (archived / (archived + summary)). Disk may grow slightly when a summary is added.

| Metric | Value |
| --- | --- |
| compressionDurationMs | 11.90 ms |
| activeSetReduction | 99.50% |
| compressionRatio | 0.0050 |
| memoriesBefore | 500 |
| memoriesAfterTotal | 501 |
| activeAfterEstimate | 301 |
| archivedCount | 200 |
| storageBeforeBytes | 5.27 MB |
| storageAfterBytes | 5.27 MB |
| storageSavedBytes | 0 B |
| storageDeltaBytes | -0 B |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "limit": 200,
  "summaryPreview": "Compressed agent memory summary covering related operational notes. Key themes extracted from 2 messages: billing, meetings, deployments, and follow-ups. Source snippet: You are a memory compression engine for multi-agent systems.\nGiven rel",
  "summaryId": "0ddaed81-1b7f-4a8c-b573-8540f6de0191",
  "archivedIdsSample": [
    "f201b7e6-0123-41e8-8922-83b3038ab4c7",
    "a479bcb6-4742-4e82-b77a-d9a44d584217",
    "94ecce77-0ad9-45ca-9cd7-c1f16f4e45fe",
    "b8fbf32a-dd5e-4fd9-9f02-a2b354b67f77",
    "148bb6a3-1b10-438c-bc2b-7812b02f7a39",
    "f801cd48-d4e1-4f68-874d-61e3be45f985",
    "f9e1e98f-2379-4841-bf70-0e46e13c550a",
    "208955e2-7302-4d77-84cf-fb375828657e",
    "b73dfe4e-736a-4480-9659-9574b3aff673",
    "e223c665-afd2-4130-8be9-4e552ef7accc"
  ],
  "note": "Archived source memories remain on disk with lineage; total row count typically increases by 1 (summary)."
}
```

</details>

##### Compression — 1000

> Reduction refers to active working-set (archived / (archived + summary)). Disk may grow slightly when a summary is added.

| Metric | Value |
| --- | --- |
| compressionDurationMs | 13.19 ms |
| activeSetReduction | 99.50% |
| compressionRatio | 0.0050 |
| memoriesBefore | 1000 |
| memoriesAfterTotal | 1001 |
| activeAfterEstimate | 801 |
| archivedCount | 200 |
| storageBeforeBytes | 6.61 MB |
| storageAfterBytes | 6.61 MB |
| storageSavedBytes | 0 B |
| storageDeltaBytes | -0 B |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "limit": 200,
  "summaryPreview": "Compressed agent memory summary covering related operational notes. Key themes extracted from 2 messages: billing, meetings, deployments, and follow-ups. Source snippet: You are a memory compression engine for multi-agent systems.\nGiven rel",
  "summaryId": "fed9de05-48b5-44a4-a300-e2ce85a93633",
  "archivedIdsSample": [
    "bdc02d7e-a1ba-4f45-a239-3f45a573beb9",
    "1440d408-3edb-441b-ab25-005796ea6e2c",
    "883b772e-52ba-4fff-9b48-cecfa449aa25",
    "96638606-33d0-439c-b924-b9bab782a80f",
    "d6d7123e-b4e2-49cb-a0b7-2382fb0f98d2",
    "a8833ca7-d229-4015-a3bd-08717dff0115",
    "a7e1c9fc-3815-443a-a3e9-b84369417a85",
    "961bc005-30b1-4568-a3fa-75238f74f05d",
    "64a9bce1-f3cd-4880-8e18-f77b6af4229b",
    "e2c2c9f6-39f3-4c17-b0c9-fabf5ea4865e"
  ],
  "note": "Archived source memories remain on disk with lineage; total row count typically increases by 1 (summary)."
}
```

</details>


#### Compression methodology

- Populates one agent with N memories, then calls `compress({ agent, limit })`.
- **Active-set reduction** = archived / (archived + 1 summary).
- Source memories are archived (not deleted), so total DB rows usually grow by one summary row.
- Storage saved may be 0 or negative because archival retains rows and adds a summary.

### Concurrency Benchmark

Runs N concurrent AgentOrc.remember() writers against one client and measures throughput, failures, and average latency.

_Section duration: 628.66 ms_

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Concurrency | 10 writers | 2.64k ops/sec |
| Concurrency | 50 writers | 2.96k ops/sec |
| Concurrency | 100 writers | 2.63k ops/sec |

#### Metrics

##### Concurrency — 10 writers

| Metric | Value |
| --- | --- |
| throughputOpsPerSec | 2.64k ops/sec |
| failures | 0 |
| successes | 100 |
| avgLatencyMs | 3.39 ms |
| totalTimeMs | 37.93 ms |
| writers | 10 |
| writesPerWorker | 10 |
| storedMemories | 100 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "note": "AgentOrc serializes writes via an internal AsyncMutex; concurrent callers measure queueing + work.",
  "latencySamples": 100
}
```

</details>

##### Concurrency — 50 writers

| Metric | Value |
| --- | --- |
| throughputOpsPerSec | 2.96k ops/sec |
| failures | 0 |
| successes | 500 |
| avgLatencyMs | 16.17 ms |
| totalTimeMs | 169.13 ms |
| writers | 50 |
| writesPerWorker | 10 |
| storedMemories | 500 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "note": "AgentOrc serializes writes via an internal AsyncMutex; concurrent callers measure queueing + work.",
  "latencySamples": 500
}
```

</details>

##### Concurrency — 100 writers

| Metric | Value |
| --- | --- |
| throughputOpsPerSec | 2.63k ops/sec |
| failures | 0 |
| successes | 1000 |
| avgLatencyMs | 35.83 ms |
| totalTimeMs | 379.59 ms |
| writers | 100 |
| writesPerWorker | 10 |
| storedMemories | 1000 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "note": "AgentOrc serializes writes via an internal AsyncMutex; concurrent callers measure queueing + work.",
  "latencySamples": 1000
}
```

</details>


#### Concurrency methodology

- Levels: 10, 50, 100 concurrent writers × 10 writes each.
- All writers share one initialized `AgentOrc` instance.
- Throughput counts successful `remember()` calls only.

### Memory Usage Benchmark

Reports Node.js process.memoryUsage() (heapUsed, rss, heapTotal) before/after init and after progressive inserts.

_Section duration: 4.60 s_

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Memory Usage | baseline (pre-init) | heap 14.02 MB / rss 81.21 MB |
| Memory Usage | after init | heap 14.09 MB / rss 81.27 MB |
| Memory Usage | after 100 inserts | heap 18.55 MB / rss 81.31 MB |
| Memory Usage | after 1000 inserts | heap 19.41 MB / rss 81.95 MB |
| Memory Usage | after 10000 inserts | heap 20.12 MB / rss 103.14 MB |
| Memory Usage | after recall | heap 31.19 MB / rss 136.27 MB |
| Memory Usage | after close | heap 31.19 MB / rss 136.24 MB |

#### Metrics

##### Memory Usage — baseline (pre-init)

| Metric | Value |
| --- | --- |
| heapUsed | 14.02 MB |
| rss | 81.21 MB |
| heapTotal | 29.78 MB |
| external | 6.03 MB |
| arrayBuffers | 2.32 MB |

##### Memory Usage — after init

| Metric | Value |
| --- | --- |
| heapUsed | 14.09 MB |
| rss | 81.27 MB |
| heapTotal | 29.78 MB |
| external | 6.04 MB |
| arrayBuffers | 2.32 MB |

##### Memory Usage — after 100 inserts

| Metric | Value |
| --- | --- |
| heapUsed | 18.55 MB |
| rss | 81.31 MB |
| heapTotal | 29.78 MB |
| external | 6.62 MB |
| arrayBuffers | 2.90 MB |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "memories": 100
}
```

</details>

##### Memory Usage — after 1000 inserts

| Metric | Value |
| --- | --- |
| heapUsed | 19.41 MB |
| rss | 81.95 MB |
| heapTotal | 30.28 MB |
| external | 6.62 MB |
| arrayBuffers | 2.90 MB |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "memories": 1000
}
```

</details>

##### Memory Usage — after 10000 inserts

| Metric | Value |
| --- | --- |
| heapUsed | 20.12 MB |
| rss | 103.14 MB |
| heapTotal | 51.03 MB |
| external | 6.11 MB |
| arrayBuffers | 2.39 MB |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "memories": 10000
}
```

</details>

##### Memory Usage — after recall

| Metric | Value |
| --- | --- |
| heapUsed | 31.19 MB |
| rss | 136.27 MB |
| heapTotal | 51.28 MB |
| external | 35.41 MB |
| arrayBuffers | 31.69 MB |

##### Memory Usage — after close

| Metric | Value |
| --- | --- |
| heapUsed | 31.19 MB |
| rss | 136.24 MB |
| heapTotal | 51.28 MB |
| external | 35.41 MB |
| arrayBuffers | 31.69 MB |


#### Memory methodology

- Uses `process.memoryUsage()` for heapUsed, rss, heapTotal, external, and arrayBuffers.
- Optional `node --expose-gc` enables forced GC between stages for cleaner deltas.

### Database Size Benchmark

Measures SQLite file size (including WAL/SHM when present) after inserting 100 / 1k / 10k / 100k memories via the SDK.

_Section duration: 58.47 s_

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Database Size | 100 | 316.00 KB |
| Database Size | 1000 | 2.64 MB |
| Database Size | 10000 | 25.96 MB |
| Database Size | 100000 | 260.79 MB |

#### Metrics

##### Database Size — 100

| Metric | Value |
| --- | --- |
| sqliteBytes | 316.00 KB |
| bytesBeforeClose | 348.00 KB |
| bytesPerMemory | 3.16 KB |
| statsDatabaseSizeBytes | 348.00 KB |
| memories | 100 |
| embeddingDimensions | 384 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "path": "C:\\Users\\ATHARV MUNDE\\Desktop\\AgentOrc\\benchmark\\data\\corpus-100.db",
  "includesWalShm": true,
  "sharedCorpus": true
}
```

</details>

##### Database Size — 1000

| Metric | Value |
| --- | --- |
| sqliteBytes | 2.64 MB |
| bytesBeforeClose | 2.67 MB |
| bytesPerMemory | 2.70 KB |
| statsDatabaseSizeBytes | 2.67 MB |
| memories | 1000 |
| embeddingDimensions | 384 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "path": "C:\\Users\\ATHARV MUNDE\\Desktop\\AgentOrc\\benchmark\\data\\corpus-1000.db",
  "includesWalShm": true,
  "sharedCorpus": true
}
```

</details>

##### Database Size — 10000

| Metric | Value |
| --- | --- |
| sqliteBytes | 25.96 MB |
| bytesBeforeClose | 25.99 MB |
| bytesPerMemory | 2.66 KB |
| statsDatabaseSizeBytes | 25.99 MB |
| memories | 10000 |
| embeddingDimensions | 384 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "path": "C:\\Users\\ATHARV MUNDE\\Desktop\\AgentOrc\\benchmark\\data\\corpus-10000.db",
  "includesWalShm": true,
  "sharedCorpus": true
}
```

</details>

##### Database Size — 100000

| Metric | Value |
| --- | --- |
| sqliteBytes | 260.79 MB |
| bytesBeforeClose | 260.82 MB |
| bytesPerMemory | 2.67 KB |
| statsDatabaseSizeBytes | 260.82 MB |
| memories | 100000 |
| embeddingDimensions | 384 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "path": "C:\\Users\\ATHARV MUNDE\\Desktop\\AgentOrc\\benchmark\\data\\corpus-100000.db",
  "includesWalShm": true,
  "sharedCorpus": true
}
```

</details>


#### Database size methodology

- Uses the shared SDK-populated corpus for each dataset size.
- Size includes main `.db` plus `-wal` / `-shm` if present.
- Also records `stats().databaseSizeBytes` from the SDK.

### Search Benchmark

Populates the database first (shared corpus), then benchmarks AgentOrc.recall() with realistic natural-language queries. Reports average, p95, and p99 latency.

_Section duration: 58.79 s_

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Search | 100 | 722.7 µs |
| Search | 1000 | 11.65 ms |
| Search | 10000 | 100.84 ms |
| Search | 100000 | 1.12 s |

#### Metrics

##### Search — 100

> Semantic search over 100 memories with realistic queries

| Metric | Value |
| --- | --- |
| avgLatencyMs | 722.7 µs |
| p95Ms | 860.1 µs |
| p99Ms | 1.14 ms |
| minMs | 605.4 µs |
| maxMs | 1.21 ms |
| tinybenchHz | 1340.55 ops/sec |
| tinybenchMeanMs | 1.01 ms |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 20,
  "queries": [
    "Which invoices were paid recently?",
    "Meetings scheduled with OpenAI",
    "PostgreSQL adapter fixes",
    "LangChain integration research",
    "Customer refund requests",
    "Production deployment plans",
    "Project roadmap updates",
    "Billing issues and invoice disputes",
    "Recall latency incidents",
    "Follow ups with partners this week",
    "Who requested a status update?",
    "Security or compliance meetings"
  ],
  "sampleCount": 20,
  "samplesMs": [
    0.6054000000003725,
    0.6261000000085915,
    0.629400000005262,
    0.6301000000094064,
    0.6337000000057742,
    0.640400000003865,
    0.6665999999968335,
    0.6817000000010012,
    0.6876000000047497,
    0.6937000000034459,
    0.700700000001234,
    0.7131000000081258,
    0.7168999999994412,
    0.7182000000029802,
    0.7275000000081491,
    0.7428999999974621,
    0.7738000000099419,
    0.8145999999978812,
    0.8417000000044936,
    1.2092999999877065
  ],
  "tinybenchP75Ms": 0.7769000000080268,
  "tinybenchP99Ms": 7.106876000005293
}
```

</details>

##### Search — 1000

> Semantic search over 1000 memories with realistic queries

| Metric | Value |
| --- | --- |
| avgLatencyMs | 11.65 ms |
| p95Ms | 15.32 ms |
| p99Ms | 17.59 ms |
| minMs | 7.47 ms |
| maxMs | 18.16 ms |
| tinybenchHz | 107.88 ops/sec |
| tinybenchMeanMs | 9.58 ms |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 20,
  "queries": [
    "Which invoices were paid recently?",
    "Meetings scheduled with OpenAI",
    "PostgreSQL adapter fixes",
    "LangChain integration research",
    "Customer refund requests",
    "Production deployment plans",
    "Project roadmap updates",
    "Billing issues and invoice disputes",
    "Recall latency incidents",
    "Follow ups with partners this week",
    "Who requested a status update?",
    "Security or compliance meetings"
  ],
  "sampleCount": 20,
  "samplesMs": [
    7.465200000006007,
    7.7951000000030035,
    8.237499999988358,
    8.575899999996182,
    8.639899999994668,
    8.698099999994156,
    9.521099999998114,
    9.980899999995017,
    11.227699999988545,
    11.438300000008894,
    12.10339999999269,
    12.421400000006543,
    12.478100000007544,
    13.514400000000023,
    13.863300000011805,
    13.894599999999627,
    14.639500000004773,
    15.154999999998836,
    15.165699999997742,
    18.15570000000298
  ],
  "tinybenchP75Ms": 9.71534999999858,
  "tinybenchP99Ms": 17.381289000001708
}
```

</details>

##### Search — 10000

> Semantic search over 10000 memories with realistic queries

| Metric | Value |
| --- | --- |
| avgLatencyMs | 100.84 ms |
| p95Ms | 114.44 ms |
| p99Ms | 122.52 ms |
| minMs | 87.11 ms |
| maxMs | 124.54 ms |
| tinybenchHz | 9.98 ops/sec |
| tinybenchMeanMs | 101.18 ms |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 20,
  "queries": [
    "Which invoices were paid recently?",
    "Meetings scheduled with OpenAI",
    "PostgreSQL adapter fixes",
    "LangChain integration research",
    "Customer refund requests",
    "Production deployment plans",
    "Project roadmap updates",
    "Billing issues and invoice disputes",
    "Recall latency incidents",
    "Follow ups with partners this week",
    "Who requested a status update?",
    "Security or compliance meetings"
  ],
  "sampleCount": 20,
  "samplesMs": [
    87.10779999999795,
    88.27240000000165,
    89.06659999999101,
    89.4594999999972,
    89.89890000000014,
    90.84980000001087,
    94.19150000000081,
    96.09500000000116,
    102.07610000000568,
    102.27689999999711,
    102.53789999999572,
    103.88250000000698,
    103.8920000000071,
    104.26799999999639,
    106.425900000002,
    106.63069999999425,
    108.24530000000959,
    113.23080000000482,
    113.90409999999974,
    124.53600000000733
  ],
  "tinybenchP75Ms": 105.07550000000629,
  "tinybenchP99Ms": 124.65677599999297
}
```

</details>

##### Search — 100000

> Semantic search over 100000 memories with realistic queries

| Metric | Value |
| --- | --- |
| avgLatencyMs | 1.12 s |
| p95Ms | 1.23 s |
| p99Ms | 1.25 s |
| minMs | 1.02 s |
| maxMs | 1.26 s |
| tinybenchHz | 0.75 ops/sec |
| tinybenchMeanMs | 1.38 s |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 20,
  "queries": [
    "Which invoices were paid recently?",
    "Meetings scheduled with OpenAI",
    "PostgreSQL adapter fixes",
    "LangChain integration research",
    "Customer refund requests",
    "Production deployment plans",
    "Project roadmap updates",
    "Billing issues and invoice disputes",
    "Recall latency incidents",
    "Follow ups with partners this week",
    "Who requested a status update?",
    "Security or compliance meetings"
  ],
  "sampleCount": 20,
  "samplesMs": [
    1016.7266999999993,
    1019.876099999994,
    1026.4749999999913,
    1050.2281999999977,
    1059.3252000000066,
    1079.4591999999975,
    1092.3597000000009,
    1105.2220000000088,
    1117.517599999992,
    1120.809699999998,
    1128.2216999999946,
    1143.3011999999871,
    1143.8271999999997,
    1145.5209999999934,
    1147.0155999999988,
    1156.7146000000066,
    1186.6168999999936,
    1192.684300000008,
    1231.6640000000043,
    1257.151199999993
  ],
  "tinybenchP75Ms": 1498.4094749999967,
  "tinybenchP99Ms": 1925.4084720000033
}
```

</details>


#### Search methodology

- Shared on-disk corpus is built once per dataset size and reused across search / retrieval / filesize.
- Each sample embeds the query then runs KNN via sqlite-vec through `recall()`.
- Queries used: `Which invoices were paid recently?`, `Meetings scheduled with OpenAI`, `PostgreSQL adapter fixes`, `LangChain integration research`, `Customer refund requests`, `Production deployment plans`, `Project roadmap updates`, `Billing issues and invoice disputes`, `Recall latency incidents`, `Follow ups with partners this week`, `Who requested a status update?`, `Security or compliance meetings`

### Retrieval Benchmark

Benchmarks top-5 / top-10 / top-20 recall against 1k, 10k, and 100k memory corpora.

_Section duration: 146.33 s_

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Retrieval top-5 | 1000 | 8.33 ms |
| Retrieval top-10 | 1000 | 11.39 ms |
| Retrieval top-20 | 1000 | 9.61 ms |
| Retrieval top-5 | 10000 | 107.26 ms |
| Retrieval top-10 | 10000 | 105.44 ms |
| Retrieval top-20 | 10000 | 127.77 ms |
| Retrieval top-5 | 100000 | 1.43 s |
| Retrieval top-10 | 100000 | 1.27 s |
| Retrieval top-20 | 100000 | 968.21 ms |

#### Metrics

##### Retrieval top-5 — 1000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 8.33 ms |
| p95Ms | 9.43 ms |
| p99Ms | 10.43 ms |
| topK | 5 |
| tinybenchHz | 97.53 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    7.524399999994785,
    7.635800000003655,
    7.648499999995693,
    7.652699999991455,
    7.74989999999525,
    7.767099999997299,
    7.777800000010757,
    8.21140000000014,
    8.560100000002421,
    8.613899999996647,
    8.670700000002398,
    8.77379999999539,
    8.803899999998976,
    8.901899999997113,
    10.677200000005541
  ],
  "tinybenchMeanMs": 10.834744642857656,
  "tinybenchP99Ms": 22.504810000000745
}
```

</details>

##### Retrieval top-10 — 1000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 11.39 ms |
| p95Ms | 17.45 ms |
| p99Ms | 18.77 ms |
| topK | 10 |
| tinybenchHz | 98.49 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    8.08969999999681,
    8.575199999992037,
    8.634000000005472,
    8.67170000000624,
    9.018399999986286,
    9.082500000004075,
    10.189899999997579,
    10.253700000001118,
    11.302800000004936,
    11.650600000008126,
    12.912899999995716,
    13.111599999989267,
    13.467600000003586,
    16.749400000000605,
    19.097399999998743
  ],
  "tinybenchMeanMs": 10.650726315789814,
  "tinybenchP99Ms": 20.492851999996343
}
```

</details>

##### Retrieval top-20 — 1000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 9.61 ms |
| p95Ms | 13.63 ms |
| p99Ms | 15.69 ms |
| topK | 20 |
| tinybenchHz | 102.88 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    7.9658999999955995,
    8.072199999995064,
    8.097199999989243,
    8.338499999998021,
    8.473499999992782,
    8.80219999999099,
    8.809600000007777,
    8.866399999998976,
    8.874199999991106,
    8.887500000011642,
    9.125799999994342,
    9.29220000001078,
    11.863799999991897,
    12.524700000009034,
    16.20089999999618
  ],
  "tinybenchMeanMs": 10.071206666667424,
  "tinybenchP99Ms": 17.247841999998627
}
```

</details>

##### Retrieval top-5 — 10000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 107.26 ms |
| p95Ms | 147.72 ms |
| p99Ms | 173.31 ms |
| topK | 5 |
| tinybenchHz | 8.49 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    84.07510000000184,
    87.75089999999909,
    92.26810000000114,
    95.22060000000056,
    95.31500000000233,
    99.9595999999874,
    103.53340000000026,
    103.86320000000705,
    104.13880000000063,
    106.36579999999958,
    106.65439999999944,
    108.02190000000701,
    108.03689999999187,
    134.0054999999993,
    179.7051999999967
  ],
  "tinybenchMeanMs": 119.03286666666827,
  "tinybenchP99Ms": 137.96696500000107
}
```

</details>

##### Retrieval top-10 — 10000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 105.44 ms |
| p95Ms | 130.11 ms |
| p99Ms | 136.98 ms |
| topK | 10 |
| tinybenchHz | 7.88 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    81.74569999999949,
    90.4777999999933,
    91.45160000000033,
    95.68210000000545,
    97.38519999998971,
    98.74929999999586,
    98.851399999985,
    100.53500000000349,
    105.52559999999357,
    106.39670000001206,
    109.64459999999963,
    114.54980000000796,
    125.45380000001751,
    126.43390000000363,
    138.6999000000069
  ],
  "tinybenchMeanMs": 130.72218000000575,
  "tinybenchP99Ms": 175.8663360000099
}
```

</details>

##### Retrieval top-20 — 10000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 127.77 ms |
| p95Ms | 154.36 ms |
| p99Ms | 162.32 ms |
| topK | 20 |
| tinybenchHz | 7.38 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    99.97469999999157,
    100.63329999998678,
    105.5059000000183,
    107.01970000000438,
    110.75169999999343,
    121.7840000000142,
    126.76540000000386,
    129.3619999999937,
    135.31070000000182,
    135.77270000000135,
    139.08840000000782,
    143.83780000000843,
    146.40009999999893,
    150.09329999997863,
    164.3128999999899
  ],
  "tinybenchMeanMs": 138.07184000000126,
  "tinybenchP99Ms": 168.87070799999404
}
```

</details>

##### Retrieval top-5 — 100000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 1.43 s |
| p95Ms | 1.82 s |
| p99Ms | 2.09 s |
| topK | 5 |
| tinybenchHz | 0.74 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    1188.2532999999821,
    1215.4629000000132,
    1237.7707999999984,
    1284.9670999999798,
    1285.766900000017,
    1335.0035999999964,
    1351.9844999999914,
    1372.919499999989,
    1375.386599999998,
    1431.9410999999964,
    1451.0188999999955,
    1515.844299999997,
    1526.2432999999728,
    1673.8820000000123,
    2159.6356000000087
  ],
  "tinybenchMeanMs": 1362.8175600000018,
  "tinybenchP99Ms": 1596.9545479999924
}
```

</details>

##### Retrieval top-10 — 100000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 1.27 s |
| p95Ms | 1.44 s |
| p99Ms | 1.62 s |
| topK | 10 |
| tinybenchHz | 0.92 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    1157.2614000000176,
    1160.7488000000012,
    1162.889199999976,
    1163.1742999999842,
    1191.6837999999989,
    1207.5046000000148,
    1237.2974000000104,
    1267.9592999999877,
    1272.5664000000106,
    1289.2545999999857,
    1291.4704000000202,
    1294.6499000000185,
    1309.1441999999806,
    1342.6094999999914,
    1666.4284000000043
  ],
  "tinybenchMeanMs": 1120.9316000000108,
  "tinybenchP99Ms": 1343.504707999992
}
```

</details>

##### Retrieval top-20 — 100000

| Metric | Value |
| --- | --- |
| avgLatencyMs | 968.21 ms |
| p95Ms | 1.04 s |
| p99Ms | 1.12 s |
| topK | 20 |
| tinybenchHz | 1.09 ops/sec |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "iterations": 15,
  "samplesMs": [
    905.8908999999985,
    926.6114999999991,
    940.7045999999973,
    941.7372000000032,
    944.4069000000018,
    945.428899999999,
    948.4509000000253,
    950.0125000000116,
    956.681500000006,
    958.3793000000005,
    976.6126000000222,
    988.9128999999957,
    992.7692999999854,
    1001.7975000000151,
    1144.8073999999906
  ],
  "tinybenchMeanMs": 923.0718599999906,
  "tinybenchP99Ms": 993.851699999962
}
```

</details>


#### Retrieval methodology

- Reuses the shared corpus per dataset size; topK ∈ {5, 10, 20}.
- Latency includes query embedding + vector KNN + row hydration.

### Insert Benchmark

Measures AgentOrc.remember() total time, throughput, and average latency while inserting N realistic memories through the full SDK path (embed → persist → vector index).

_Section duration: 56.43 s_

| Benchmark | Dataset | Result |
| --- | --- | --- |
| Insert | 100 | 2.03k ops/sec |
| Insert | 1000 | 2.54k ops/sec |
| Insert | 10000 | 2.39k ops/sec |
| Insert | 100000 | 2.02k ops/sec |

#### Metrics

##### Insert — 100

> Batch insert of 100 memories via AgentOrc.remember()

| Metric | Value |
| --- | --- |
| totalTimeMs | 49.33 ms |
| opsPerSec | 2.03k ops/sec |
| avgLatencyMs | 493.3 µs |
| tinybenchHz | 4.12k ops/sec |
| tinybenchMeanMs | 343.2 µs |
| tinybenchP99Ms | 4.40 ms |
| memoriesStored | 1682 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "databasePath": "C:\\Users\\ATHARV MUNDE\\Desktop\\AgentOrc\\benchmark\\data\\insert-100.db",
  "databaseSizeBytes": 8601440,
  "tinybenchSamples": 1457,
  "tinybenchRme": 11.062927486455553
}
```

</details>

##### Insert — 1000

> Batch insert of 1000 memories via AgentOrc.remember()

| Metric | Value |
| --- | --- |
| totalTimeMs | 394.20 ms |
| opsPerSec | 2.54k ops/sec |
| avgLatencyMs | 394.2 µs |
| tinybenchHz | 4.17k ops/sec |
| tinybenchMeanMs | 372.7 µs |
| tinybenchP99Ms | 6.88 ms |
| memoriesStored | 2545 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "databasePath": "C:\\Users\\ATHARV MUNDE\\Desktop\\AgentOrc\\benchmark\\data\\insert-1000.db",
  "databaseSizeBytes": 11173728,
  "tinybenchSamples": 1376,
  "tinybenchRme": 13.441988061758936
}
```

</details>

##### Insert — 10000

> Batch insert of 10000 memories via AgentOrc.remember()

| Metric | Value |
| --- | --- |
| totalTimeMs | 4.19 s |
| opsPerSec | 2.39k ops/sec |
| avgLatencyMs | 419.1 µs |
| tinybenchHz | 4.22k ops/sec |
| tinybenchMeanMs | 445.7 µs |
| tinybenchP99Ms | 14.43 ms |
| memoriesStored | 11260 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "databasePath": "C:\\Users\\ATHARV MUNDE\\Desktop\\AgentOrc\\benchmark\\data\\insert-10000.db",
  "databaseSizeBytes": 34664240,
  "tinybenchSamples": 1122,
  "tinybenchRme": 22.762979001923078
}
```

</details>

##### Insert — 100000

> Batch insert of 100000 memories via AgentOrc.remember()

| Metric | Value |
| --- | --- |
| totalTimeMs | 49.41 s |
| opsPerSec | 2.02k ops/sec |
| avgLatencyMs | 494.1 µs |
| tinybenchHz | 3.43k ops/sec |
| tinybenchMeanMs | 572.8 µs |
| tinybenchP99Ms | 21.09 ms |
| memoriesStored | 100966 |

<details>
<summary>Raw details (JSON)</summary>

```json
{
  "databasePath": "C:\\Users\\ATHARV MUNDE\\Desktop\\AgentOrc\\benchmark\\data\\insert-100000.db",
  "databaseSizeBytes": 279355328,
  "tinybenchSamples": 873,
  "tinybenchRme": 28.053095588237518
}
```

</details>


#### Insert methodology

- Each dataset size uses a fresh SQLite file.
- Total time measures a sequential batch of `remember()` calls (full SDK: embedding + ACID write + vector index).
- Tinybench additionally samples single-insert latency on the warm database after the batch.

## Notes

- This suite benchmarks the **Agent ORC SDK** (`remember`, `recall`, `compress`, `init`, concurrency, stats/size) — not raw SQLite micro-ops.
- Default mode uses a local OpenAI-compatible mock so large corpora (10k / 100k) are measurable without API cost or rate limits; pass `--live` to use `.env` credentials.
- Machine load, disk type, and embedding backend dominate absolute numbers; use relative comparisons across dataset sizes.
