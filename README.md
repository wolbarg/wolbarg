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
  <a href="https://wolbarg.com/benchmarks"><img alt="Benchmarks" src="https://img.shields.io/badge/benchmarks-wolbarg.com-black" /></a>
  <a href="https://github.com/wolbarg/wolbarg/actions/workflows/sdk-ci.yml"><img alt="SDK CI" src="https://github.com/wolbarg/wolbarg/actions/workflows/sdk-ci.yml/badge.svg?branch=main" /></a>
</p>

Wolbarg is **memory infrastructure**, not an agent framework. Agents call `remember()` / `recall()` against durable semantic memory on your disk or Postgres — with optional ingest, graph links, hybrid search, and [Wolbarg Studio](https://wolbarg.com/docs/observability) for observability. You bring any OpenAI-compatible embedding API.

> [!TIP]
> No API key needed to try it — point embeddings at local [Ollama](https://ollama.com) below. For projects, run `npx wolbarg init` and use `createWolbargFromProjectConfig()` — see the [Quick Start](https://wolbarg.com/docs/quick-start).

## Quickstart

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
console.log(hits[0].content.text);
await ctx.close();
```

That's the loop: `remember()` writes it, `recall()` finds it by meaning. Swap the embedding config for OpenAI, Gemini, or anything OpenAI-compatible when you're ready for production — nothing else in your code changes.

Requires **Node.js 22.5+**. Optional peers (`pg`, `neo4j-driver`, PDF/DOCX/OCR) — [Installation](https://wolbarg.com/docs/installation).

## Wolbarg ecosystem

Use the core SDK alone, or plug into the tools around it:

- **[Docs](https://wolbarg.com/docs/quick-start)** — quick start, configuration, API reference
- **[@wolbarg/vercel-ai](https://wolbarg.com/docs/integrations/vercel-ai)** — Vercel AI SDK middleware (`wrapLanguageModel`)
- **[@wolbarg/openai](https://wolbarg.com/docs/integrations/openai)** — OpenAI Agents SDK session
- **[@wolbarg/langchain](https://wolbarg.com/docs/integrations/langchain)** — LangChain / LangGraph memory
- **[@wolbarg/llamaindex](https://wolbarg.com/docs/integrations/llamaindex)** — LlamaIndexTS memory block
- **[@wolbarg/mastra](https://wolbarg.com/docs/integrations/mastra)** — Mastra processor
- **[Cursor plugin](https://wolbarg.com/docs/connectors/cursor)** — shared memory for Cursor agents
- **[Wolbarg Studio](https://wolbarg.com/docs/observability)** — local telemetry dashboard, Trace Explorer, graph canvas
- **[Benchmarks](https://wolbarg.com/benchmarks)** — published SQLite / Postgres stress results

## Why use Wolbarg?

Most agent stacks either bolt memory onto a chat transcript or lock you into a hosted vector database. Wolbarg sits in between: a **shared semantic memory layer** you own, with a small public API and replaceable backends.

- **Agents that forget between sessions** — Durable memory on your SQLite file or Postgres. Facts survive restarts, redeploys, and new agent runs — not trapped in a single conversation window.
- **No vendor lock-in** — Pluggable embeddings, LLM, rerankers, OCR, vision, storage, and graph. Swap OpenAI ↔ Ollama or SQLite ↔ Postgres by changing a factory, not your agent logic.
- **Vectors alone are not enough** — Hybrid search (semantic + BM25), metadata filters, MMR, and optional rerank so recall matches how agents actually ask questions.
- **Multi-agent writes collide** — SQLite hardened with `BEGIN IMMEDIATE` + retries (`WOLBARG_STORAGE_LOCKED` when exhausted); Postgres uses row-level locking. Built for parallel writers, not single-process demos.
- **Duplicate facts pile up** — Opt-in write-time dedupe / upsert so restated preferences update instead of flooding the store.
- **Repeated embeds cost money** — Transparent embedding cache keyed by `hash(content) + model` (on by default) cuts provider calls on repeated text.
- **Need structure, not only similarity** — Optional [graph memory](https://wolbarg.com/docs/graph-memory): `linkMemories` / `getRelated` / `includeGraph` on recall, with the same typed API for local SQLite graph and production Neo4j.
- **Hard to debug memory** — Independent telemetry DB plus [Wolbarg Studio](https://wolbarg.com/docs/observability) (dashboard, Trace Explorer, graph canvas) so you can see what was remembered and how recall ranked it.

---

## Resources

- [Quick start](https://wolbarg.com/docs/quick-start) — remember / recall in under a minute
- [Installation & project layout](https://wolbarg.com/docs/installation) — peers and recommended folder structure
- [Configuration](https://wolbarg.com/docs/configuration) — every constructor option
- [API reference](https://wolbarg.com/docs/api) — public methods and types
- [Graph memory](https://wolbarg.com/docs/graph-memory) — SQLite ↔ Neo4j graph layer
- [Examples](https://wolbarg.com/docs/examples) — copy-paste snippets
- [Migration](https://wolbarg.com/docs/migration) — upgrade guides
- [Limitations](https://wolbarg.com/docs/guides/limitations) — honest boundaries
- [Changelog](./CHANGELOG.md) — release history
- [llms.txt](https://wolbarg.com/llms.txt) — docs index for LLMs

## License

MIT © [Atharv Munde](https://github.com/Atharvmunde11)
