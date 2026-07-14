# agentOrc

**Modular semantic memory for AI agents (v0.2)** — TypeScript SDK · SQLite / PostgreSQL · hybrid search · document ingest.

[![npm](https://img.shields.io/npm/v/agentorc?label=npm%20agentorc)](https://www.npmjs.com/package/agentorc)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./sdk/LICENSE)
[![Docs](https://img.shields.io/badge/docs-AgentOrc.lucareo.com-black)](https://AgentOrc.lucareo.com)

```bash
npm install agentorc
```

```ts
import { AgentOrc, sqlite, openaiEmbedding, openaiLlm, bm25 } from "agentorc";

const ctx = new AgentOrc({
  organization: "my-org",
  storage: sqlite("./memory.db"),
  embedding: openaiEmbedding({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  }),
  llm: openaiLlm({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4.1-mini",
  }),
  keywordSearch: bm25(),
});

await ctx.remember({
  agent: "research",
  content: { text: "Stripe supports recurring invoices." },
});

const hits = await ctx.recall({ query: "recurring invoices", topK: 5, hybrid: true });
```

## Docs

Full v0.2 documentation: [AgentOrc.lucareo.com/docs](https://AgentOrc.lucareo.com/docs/introduction)

- [What's New in 0.2](https://AgentOrc.lucareo.com/docs/guides/whats-new)
- [Limitations](https://AgentOrc.lucareo.com/docs/guides/limitations)
- [Changelog](./CHANGELOG.md)

## Repo layout

| Path | Purpose |
| --- | --- |
| `sdk/` | npm package `agentorc` |
| `website/` | Docs + marketing site |
| `test-envirnment/` | Dual-backend OpenAI demo harness |
| `benchmark/` | Benchmarks |

## Install ingest peers (when needed)

```bash
npm install pdf-parse@1.1.4   # PDF ingest
npm install mammoth           # DOCX ingest
npm install pg                # PostgreSQL storage
npm install tesseract.js      # OCR
```

## License

MIT — see [sdk/LICENSE](./sdk/LICENSE).


## Repository

| Path | Role |
| --- | --- |
| [`sdk/`](./sdk) | npm package `agentorc` |
| [`website/`](./website) | Docs site |
| [`test-envirnment/`](./test-envirnment) | Live v0.2 harness |
| [`benchmark/`](./benchmark) | Performance suite |

## License

MIT — see [`sdk/LICENSE`](./sdk/LICENSE).
