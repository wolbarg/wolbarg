import { CodeBlock } from "@/components/ui/CodeBlock";
import { Note, Warning } from "@/components/ui/PageHeader";
import { h, type DocPage } from "@/lib/docs";
import Link from "next/link";

export const sharedMemory: DocPage = {
  title: "Multi-Agent Memory",
  description: "Share one AgentOrc instance across concurrent agents.",
  href: "/docs/guides/shared-memory",
  section: "Guides",
  headings: [h("pattern", "Pattern"), h("isolation", "Isolation")],
  content: (
    <>
      <h2 id="pattern">Pattern</h2>
      <CodeBlock
        language="ts"
        code={`const ctx = new AgentOrc({ /* … */ });

// Same context, different agent ids
await ctx.remember({ agent: "writer", content: { text: "…" } });
await ctx.remember({ agent: "researcher", content: { text: "…" } });

// Agent-scoped recall
await ctx.recall({
  query: "…",
  filter: { agent: "writer" },
});

// Org-wide shared recall — omit agent filter
await ctx.recall({ query: "…" });`}
      />

      <h2 id="isolation">Isolation</h2>
      <p>
        Organizations isolate tenants in one database file. Agents isolate
        authors within an organization. Writes serialize via an in-process mutex
        and ACID transactions.
      </p>
    </>
  ),
};

export const whatsNewV02: DocPage = {
  title: "What's New in 0.2",
  description: "Highlights of the AgentOrc 0.2 release.",
  href: "/docs/guides/whats-new",
  section: "Guides",
  headings: [
    h("highlights", "Highlights"),
    h("ingest", "Ingest & peers"),
    h("upgrade", "Upgrade"),
  ],
  content: (
    <>
      <h2 id="highlights">Highlights</h2>
      <p>
        AgentOrc <strong>0.2</strong> is a modular rewrite around replaceable
        providers while keeping <code>remember</code> / <code>recall</code>{" "}
        familiar. Full notes live in the repo{" "}
        <code>CHANGELOG.md</code>.
      </p>
      <ul>
        <li>
          Constructor DI + factories (<code>sqlite</code>,{" "}
          <code>postgres</code>, embeddings, LLM, BM25, …)
        </li>
        <li>SQLite and PostgreSQL storage</li>
        <li>
          Hybrid recall, metadata filters (<code>meta.*</code>), MMR, rerankers
        </li>
        <li>
          Document <code>ingest()</code> (text, PDF, DOCX, images + OCR/vision)
        </li>
        <li>
          Optional <code>llm</code> — <code>compress()</code> only when
          configured
        </li>
      </ul>

      <h2 id="ingest">Ingest &amp; peers</h2>
      <Warning>
        PDF / DOCX / OCR are <strong>not</strong> bundled. If you use{" "}
        <code>ingest()</code> on those formats, install peers in your app:
        <code> pdf-parse</code>, <code>mammoth</code>,{" "}
        <code>tesseract.js</code>. See{" "}
        <Link href="/docs/guides/limitations">Limitations</Link>.
      </Warning>

      <h2 id="upgrade">Upgrade</h2>
      <CodeBlock
        language="bash"
        code={`npm install agentorc@^0.2.0`}
      />
      <p>
        Read <Link href="/docs/guides/migration-v02">Migration 0.1 → 0.2</Link>{" "}
        and <Link href="/docs/guides/limitations">Limitations (v0.2)</Link>.
      </p>
    </>
  ),
};

export const migrationV02: DocPage = {
  title: "Migration 0.1 → 0.2",
  description: "Upgrade with minimal breaking changes.",
  href: "/docs/guides/migration-v02",
  section: "Guides",
  headings: [
    h("breaking", "Breaking changes"),
    h("map", "API mapping"),
    h("schema", "Schema"),
  ],
  content: (
    <>
      <h2 id="breaking">Breaking changes</h2>
      <ul>
        <li>
          <code>llm</code> is no longer required to operate the SDK
        </li>
        <li>
          Constructor instances without <code>llm</code> do not type{" "}
          <code>compress</code>
        </li>
        <li>
          <code>stats().llmModel</code> may be <code>null</code>
        </li>
        <li>Package version is <strong>0.2.0</strong></li>
      </ul>

      <h2 id="map">API mapping</h2>
      <CodeBlock
        language="ts"
        code={`// 0.1
const ctx = new AgentOrc();
await ctx.init({ organization, database, embedding, llm });

// 0.2 (recommended)
const ctx = new AgentOrc({
  organization,
  storage: sqlite(database.connectionString),
  embedding: openaiEmbedding({ …embedding, apiKey: embedding.apiKey }),
  llm: openaiLlm({ …llm }), // optional
});

// 0.2 — init() still works for compatibility`}
      />

      <h2 id="schema">Schema</h2>
      <p>
        SQLite auto-migrates to schema version 2 (FTS5). Existing databases open
        without manual steps. Embedding dimension changes still require a fresh
        DB.
      </p>
      <Note>
        Method names (<code>remember</code> / <code>recall</code> / …) are
        unchanged. New optional <code>recall</code> fields are additive.
      </Note>
      <p>
        Highlights:{" "}
        <Link href="/docs/guides/whats-new">What&apos;s New in 0.2</Link>.
      </p>
    </>
  ),
};

export const limitationsV02: DocPage = {
  title: "Limitations (v0.2)",
  description:
    "Honest boundaries of AgentOrc 0.2 — peers, PDF quality, SQLite, and Postgres.",
  href: "/docs/guides/limitations",
  section: "Guides",
  headings: [
    h("status", "Maturity"),
    h("ingest-deps", "Ingest dependencies (required)"),
    h("pdf", "PDF extraction"),
    h("sqlite", "SQLite"),
    h("postgres", "PostgreSQL"),
    h("providers", "Optional providers"),
    h("not-yet", "Not in v0.2"),
  ],
  content: (
    <>
      <h2 id="status">Maturity</h2>
      <p>
        Core <code>remember</code> / <code>recall</code> (semantic + hybrid +
        metadata filters) on SQLite and PostgreSQL is the most battle-tested
        path. Document ingest, OCR/vision, and LLM compression are supported and
        covered by demos, but depend on optional packages and external APIs.
      </p>

      <h2 id="ingest-deps">Ingest dependencies (required)</h2>
      <Warning>
        <code>agentorc</code> does <strong>not</strong> ship PDF/DOCX/OCR
        parsers. If your app calls <code>ingest()</code> on those formats,
        install the peer in <strong>your</strong> project (same dependency
        tree that resolves <code>agentorc</code>):
      </Warning>
      <CodeBlock
        language="bash"
        code={`# Required when ingesting PDFs
npm install pdf-parse@1.1.4

# Required when ingesting DOCX
npm install mammoth

# Required for OCR on images (or configure vision instead / as well)
npm install tesseract.js

# Required for postgres({ … }) storage
npm install pg`}
      />
      <ul>
        <li>
          <strong>.txt / .md / .csv / .json</strong> — built-in, no extra deps
        </li>
        <li>
          <strong>.pdf</strong> — <code>pdf-parse</code> required
        </li>
        <li>
          <strong>.docx</strong> — <code>mammoth</code> required
        </li>
        <li>
          <strong>images</strong> — configure <code>ocr</code> and/or{" "}
          <code>vision</code>; OCR needs <code>tesseract.js</code>
        </li>
      </ul>
      <p>
        Details: <Link href="/docs/installation">Installation</Link>,{" "}
        <Link href="/docs/ingestion/documents">Documents</Link>,{" "}
        <Link href="/docs/api/ingest">ingest()</Link>.
      </p>

      <h2 id="pdf">PDF extraction</h2>
      <ul>
        <li>
          Text is taken from the PDF&apos;s text layer via{" "}
          <code>pdf-parse</code>. Scan / camera PDFs with no text layer yield
          empty extract — use OCR/vision or a text-based PDF.
        </li>
        <li>
          The common <code>pdf-parse@1.1.4</code> stack uses an older pdf.js.
          Some modern / heavily compressed PDFs fail to parse. Prefer simple
          text PDFs or try a compatible <code>pdf-parse</code> version.
        </li>
      </ul>

      <h2 id="sqlite">SQLite</h2>
      <ul>
        <li>
          Uses Node&apos;s built-in <code>node:sqlite</code> (still marked
          experimental). Requires Node <strong>22.5+</strong>.
        </li>
        <li>
          Hybrid BM25 uses FTS5 when available; keyword search needs{" "}
          <code>keywordSearch: bm25()</code>.
        </li>
      </ul>

      <h2 id="postgres">PostgreSQL</h2>
      <ul>
        <li>
          Requires optional peer <code>pg</code>.
        </li>
        <li>
          <code>pgvector</code> is used when the extension is available;
          otherwise embeddings are stored as bytes and similarity is computed
          in-process (fine for moderate data sizes).
        </li>
      </ul>

      <h2 id="providers">Optional providers</h2>
      <ul>
        <li>
          <code>compress()</code> needs <code>llm</code> (compile-time + runtime
          guard).
        </li>
        <li>
          <code>hybrid: true</code> without <code>keywordSearch</code> falls
          back to semantic-only.
        </li>
        <li>
          <code>rerank: true</code> without a reranker skips reranking
          gracefully.
        </li>
      </ul>

      <h2 id="not-yet">Not in v0.2</h2>
      <ul>
        <li>No hosted cloud control plane or multi-tenant SaaS</li>
        <li>No built-in agent framework / tool calling / chat UI</li>
        <li>No Atlas Search / dedicated vector DB product integration</li>
        <li>No guaranteed PDF OCR-from-scan pipeline without vision/OCR peers</li>
      </ul>
    </>
  ),
};

export const bestPractices: DocPage = {
  title: "Best Practices",
  description: "Practical guidance for production AgentOrc usage.",
  href: "/docs/guides/best-practices",
  section: "Guides",
  headings: [
    h("scope", "Scope memories"),
    h("filters", "Prefer metadata filters"),
    h("peers", "Peers on demand"),
    h("lifecycle", "Lifecycle"),
  ],
  content: (
    <>
      <h2 id="scope">Scope memories</h2>
      <p>
        Use stable <code>agent</code> ids and meaningful metadata keys (
        <code>topic</code>, <code>source</code>, <code>collection</code>).
      </p>

      <h2 id="filters">Prefer metadata filters</h2>
      <p>
        Narrow recall with <code>meta.*</code> before increasing{" "}
        <code>topK</code>. Combine with hybrid search for exact token matches.
      </p>

      <h2 id="peers">Peers on demand</h2>
      <p>
        Do not install <code>pg</code> / <code>pdf-parse</code> /{" "}
        <code>mammoth</code> / <code>tesseract.js</code> unless you need them —
        they load lazily. If you <em>do</em> use ingest for PDF/DOCX/images,
        those peers are <strong>required</strong> in your app — see{" "}
        <Link href="/docs/guides/limitations">Limitations</Link>.
      </p>

      <h2 id="lifecycle">Lifecycle</h2>
      <ul>
        <li>
          Call <code>ready()</code> at process start to fail fast
        </li>
        <li>
          Always <code>close()</code> on shutdown
        </li>
        <li>
          One <code>AgentOrc</code> instance per process / org is enough
        </li>
      </ul>
    </>
  ),
};

export const typesRef: DocPage = {
  title: "Types",
  description: "Key public TypeScript types in agentorc 0.2.",
  href: "/docs/reference/types",
  section: "Reference",
  headings: [h("domain", "Domain"), h("options", "Options"), h("providers", "Providers")],
  content: (
    <>
      <h2 id="domain">Domain</h2>
      <CodeBlock
        language="ts"
        code={`MemoryRecord, MemoryContent, MemoryMetadata
RecallResult, HistoryEvent, HistoryResult
IngestResult, CompressResult, StatsResult`}
      />
      <h2 id="options">Options</h2>
      <CodeBlock
        language="ts"
        code={`AgentOrcOptions, RememberOptions, RecallOptions
IngestOptions, CompressOptions, ForgetOptions
MemoryFilter, MetadataFilter, HybridConfig, MmrConfig`}
      />
      <h2 id="providers">Providers</h2>
      <CodeBlock
        language="ts"
        code={`StorageProvider, EmbeddingProvider, LlmProvider
KeywordSearchProvider, RerankerProvider
OCRProvider, VisionProvider, ChunkingStrategy
CompressionProvider`}
      />
    </>
  ),
};

export const errorsRef: DocPage = {
  title: "Errors",
  description: "Typed error hierarchy for AgentOrc.",
  href: "/docs/reference/errors",
  section: "Reference",
  headings: [h("hierarchy", "Hierarchy")],
  content: (
    <>
      <h2 id="hierarchy">Hierarchy</h2>
      <ul>
        <li>
          <code>AgentOrcError</code> — base
        </li>
        <li>
          <code>ConfigurationError</code> — bad config
        </li>
        <li>
          <code>ProviderNotConfiguredError</code> — method needs a missing provider
        </li>
        <li>
          <code>InitializationError</code> — open / probe failed
        </li>
        <li>
          <code>ValidationError</code> — bad method arguments
        </li>
        <li>
          <code>DatabaseError</code> / <code>EmbeddingError</code> /{" "}
          <code>CompressionError</code>
        </li>
        <li>
          <code>MemoryNotFoundError</code>
        </li>
      </ul>
    </>
  ),
};

export const initCompat: DocPage = {
  title: "init() Compatibility",
  description: "v0.1 init() API remains supported as a shim.",
  href: "/docs/reference/init-compat",
  section: "Reference",
  headings: [h("usage", "Usage"), h("notes", "Notes")],
  content: (
    <>
      <h2 id="usage">Usage</h2>
      <CodeBlock
        language="ts"
        code={`const ctx = new AgentOrc();
await ctx.init({
  organization: "my-org",
  database: {
    provider: "sqlite", // or "postgres"
    connectionString: "./memory.db",
  },
  embedding: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  },
  llm: { // optional in 0.2
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4.1-mini",
  },
});`}
      />
      <h2 id="notes">Notes</h2>
      <p>
        Prefer constructor DI + factories for new code. <code>init</code> maps{" "}
        <code>database</code> → storage and wires embedding / optional llm the
        same way.
      </p>
    </>
  ),
};
