import Link from "next/link";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Note, Warning } from "@/components/ui/PageHeader";
import { h, type DocPage } from "@/lib/docs";

export const introduction: DocPage = {
  title: "Introduction",
  description:
    "AgentOrc v0.2 is a modular, provider-agnostic semantic memory SDK for AI agents.",
  href: "/docs/introduction",
  section: "Getting Started",
  headings: [
    h("what", "What is AgentOrc?"),
    h("philosophy", "Core philosophy"),
    h("features", "What's in v0.2"),
    h("limits", "v0.2 limitations"),
    h("not", "What it is not"),
    h("next", "Next steps"),
  ],
  content: (
    <>
      <h2 id="what">What is AgentOrc?</h2>
      <p>
        AgentOrc is a TypeScript SDK that gives multiple AI agents a shared,
        persistent semantic memory. You store facts with <code>remember</code>,
        retrieve them with <code>recall</code>, optionally ingest documents, and
        compress memories when you need an LLM summary.
      </p>
      <p>
        Version <strong>0.2</strong> rebuilds the internals around replaceable
        providers: storage, embeddings, keyword search, rerankers, OCR, vision,
        and chunking — while keeping the public API small.
      </p>

      <h2 id="philosophy">Core philosophy</h2>
      <ul>
        <li>
          <strong>Everything is configurable</strong> — swap any provider.
        </li>
        <li>
          <strong>Nothing is required unless necessary</strong> — only{" "}
          <code>organization</code>, <code>storage</code>, and{" "}
          <code>embedding</code>.
        </li>
        <li>
          <strong>Optional features degrade gracefully</strong> — missing
          reranker / OCR / keyword search skips that step, no crash.
        </li>
        <li>
          <strong>Calling a feature without its provider fails cleanly</strong>{" "}
          — e.g. <code>compress</code> without <code>llm</code> is a TypeScript
          error and a runtime <code>ProviderNotConfiguredError</code>.
        </li>
      </ul>

      <h2 id="features">What&apos;s in v0.2</h2>
      <ul>
        <li>Constructor DI + factory helpers (<code>sqlite</code>, <code>openaiEmbedding</code>, …)</li>
        <li>SQLite and PostgreSQL storage</li>
        <li>Hybrid recall (semantic + BM25), metadata filters, MMR, rerankers</li>
        <li>
          Document <code>ingest</code> (PDF, DOCX, Markdown, images + optional OCR/vision)
        </li>
        <li>Pluggable chunking strategies</li>
        <li>Optional LLM compression</li>
      </ul>

      <h2 id="limits">v0.2 limitations</h2>
      <p>
        AgentOrc <strong>0.2</strong> is production-usable for the core
        remember/recall path, but several edges are still early. Read the full
        list on{" "}
        <Link href="/docs/guides/limitations">Limitations (v0.2)</Link>.
      </p>
      <ul>
        <li>
          PDF/DOCX/OCR ingest need optional npm peers — they are{" "}
          <strong>not</strong> bundled with <code>agentorc</code>.
        </li>
        <li>
          PDF text extraction depends on <code>pdf-parse</code> (older pdf.js).
          Scan/image-only PDFs have no text layer unless you use OCR/vision.
        </li>
        <li>
          Built-in SQLite (<code>node:sqlite</code>) is still experimental in
          Node.
        </li>
        <li>
          PostgreSQL pgvector is optional; without it embeddings fall back to
          byte storage + in-process distance.
        </li>
      </ul>

      <h2 id="not">What it is not</h2>
      <ul>
        <li>Not an agent / orchestration framework</li>
        <li>Not a hosted vector database SaaS</li>
        <li>Not a chat UI</li>
      </ul>

      <h2 id="next">Next steps</h2>
      <ul>
        <li>
          <Link href="/docs/installation">Installation</Link>
        </li>
        <li>
          <Link href="/docs/quick-start">Quick Start</Link>
        </li>
        <li>
          <Link href="/docs/guides/limitations">Limitations (v0.2)</Link>
        </li>
        <li>
          <Link href="/docs/guides/migration-v02">Migrate from 0.1</Link>
        </li>
      </ul>
    </>
  ),
};

export const installation: DocPage = {
  title: "Installation",
  description: "Install AgentOrc and optional peer packages for v0.2 features.",
  href: "/docs/installation",
  section: "Getting Started",
  headings: [
    h("requirements", "Requirements"),
    h("install", "Install"),
    h("peers", "Optional peers"),
    h("verify", "Verify"),
  ],
  content: (
    <>
      <h2 id="requirements">Requirements</h2>
      <ul>
        <li>Node.js <strong>22.5+</strong> (uses built-in <code>node:sqlite</code>)</li>
        <li>An OpenAI-compatible embedding endpoint (required for remember/recall)</li>
        <li>An LLM endpoint only if you use <code>compress</code></li>
      </ul>

      <h2 id="install">Install</h2>
      <CodeBlock language="bash" code={`npm install agentorc`} />
      <CodeBlock
        language="bash"
        code={`pnpm add agentorc
yarn add agentorc
bun add agentorc`}
      />

      <h2 id="peers">Optional peers</h2>
      <p>Install only what you need:</p>
      <CodeBlock
        language="bash"
        code={`npm install pg              # PostgreSQL storage
npm install pdf-parse@1.1.4 # PDF ingest (text-layer PDFs)
npm install mammoth         # DOCX ingest
npm install tesseract.js    # OCR on images`}
      />
      <Warning>
        If you call <code>ingest()</code> on PDF or DOCX files, you{" "}
        <strong>must</strong> install the matching peer in the same app that
        depends on <code>agentorc</code>:
        <ul>
          <li>
            <code>pdf-parse</code> for <code>.pdf</code>
          </li>
          <li>
            <code>mammoth</code> for <code>.docx</code>
          </li>
          <li>
            <code>tesseract.js</code> and/or a <code>vision</code> provider for
            images / scan-only PDFs
          </li>
        </ul>
        Plain text formats (<code>.txt</code>, <code>.md</code>,{" "}
        <code>.csv</code>, <code>.json</code>) need no extra packages. Missing
        peers throw a configuration error when that format is used — not at
        import time.
      </Warning>
      <Note>
        Prefer pinning <code>pdf-parse@1.1.4</code> for the function API
        AgentOrc v0.2 tests against. Newer majors may work via the{" "}
        <code>PDFParse</code> class path, but the ecosystem matrix is still
        settling.
      </Note>

      <h2 id="verify">Verify</h2>
      <CodeBlock
        language="ts"
        code={`import { AgentOrc, sqlite, openaiEmbedding } from "agentorc";

const ctx = new AgentOrc({
  organization: "demo",
  storage: sqlite(":memory:"),
  embedding: openaiEmbedding({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  }),
});

await ctx.ready();
console.log(ctx.isInitialized); // true
await ctx.close();`}
      />
    </>
  ),
};

export const quickStart: DocPage = {
  title: "Quick Start",
  description: "Remember and recall your first memories with AgentOrc v0.2.",
  href: "/docs/quick-start",
  section: "Getting Started",
  headings: [
    h("construct", "1. Construct"),
    h("remember", "2. Remember"),
    h("recall", "3. Recall"),
    h("hybrid", "4. Hybrid + filters (optional)"),
    h("ingest", "5. Ingest a document (optional)"),
    h("next", "Next"),
  ],
  content: (
    <>
      <h2 id="construct">1. Construct</h2>
      <CodeBlock
        language="ts"
        filename="index.ts"
        code={`import {
  AgentOrc,
  sqlite,
  openaiEmbedding,
  openaiLlm,
  bm25,
} from "agentorc";

const ctx = new AgentOrc({
  organization: "my-org",
  storage: sqlite("./memory.db"),
  embedding: openaiEmbedding({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  }),
  // Optional — enables compress()
  llm: openaiLlm({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4.1-mini",
  }),
  // Optional — enables hybrid recall
  keywordSearch: bm25(),
});`}
      />

      <h2 id="remember">2. Remember</h2>
      <CodeBlock
        language="ts"
        code={`await ctx.remember({
  agent: "research",
  content: { text: "Stripe supports recurring invoices." },
  metadata: { topic: "billing", source: "docs" },
});`}
      />

      <h2 id="recall">3. Recall</h2>
      <CodeBlock
        language="ts"
        code={`const results = await ctx.recall({
  query: "How do recurring invoices work?",
  topK: 5,
  threshold: 0.3,
  filter: { agent: "research" },
});

console.log(results[0]?.content.text, results[0]?.similarity);`}
      />

      <h2 id="hybrid">4. Hybrid + filters (optional)</h2>
      <CodeBlock
        language="ts"
        code={`import { meta } from "agentorc";

const hits = await ctx.recall({
  query: "recurring invoices",
  topK: 5,
  hybrid: true,
  filter: {
    agent: "research",
    metadata: meta.eq("topic", "billing"),
  },
});`}
      />

      <h2 id="ingest">5. Ingest a document (optional)</h2>
      <Warning>
        Markdown / TXT ingest works out of the box. For PDF or DOCX you must
        install peers in your app first (
        <code>pdf-parse@1.1.4</code>, <code>mammoth</code>). See{" "}
        <Link href="/docs/ingestion/documents">Documents</Link> and{" "}
        <Link href="/docs/guides/limitations">Limitations</Link>.
      </Warning>
      <CodeBlock
        language="bash"
        code={`npm install pdf-parse@1.1.4   # required for .pdf ingest
npm install mammoth           # required for .docx ingest`}
      />
      <CodeBlock
        language="ts"
        code={`// .md / .txt — no extra deps
const result = await ctx.ingest({
  agent: "docs",
  source: { path: "./guide.md" },
  chunking: { strategy: "markdown", chunkSize: 800, overlap: 100 },
});
console.log(result.chunkCount);

// PDF — requires: npm install pdf-parse@1.1.4
await ctx.ingest({
  agent: "docs",
  source: { path: "./handbook.pdf" },
});`}
      />

      <h2 id="next">Next</h2>
      <ul>
        <li>
          <Link href="/docs/configuration">Configuration</Link>
        </li>
        <li>
          <Link href="/docs/api/recall">recall() options</Link>
        </li>
        <li>
          <Link href="/docs/api/ingest">ingest()</Link>
        </li>
      </ul>
      <Note>
        Call <code>await ctx.close()</code> on shutdown to release the database.
      </Note>
    </>
  ),
};
