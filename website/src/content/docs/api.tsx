import { CodeBlock } from "@/components/ui/CodeBlock";
import { Note, Warning } from "@/components/ui/PageHeader";
import { h, type DocPage } from "@/lib/docs";
import Link from "next/link";

export const agentOrcApi: DocPage = {
  title: "AgentOrc",
  description: "Lifecycle methods: construct, ready, close, isInitialized.",
  href: "/docs/api/agentorc",
  section: "Core API",
  headings: [
    h("construct", "Constructor"),
    h("ready", "ready()"),
    h("close", "close()"),
    h("init", "init() shim"),
  ],
  content: (
    <>
      <h2 id="construct">Constructor</h2>
      <CodeBlock
        language="ts"
        code={`new AgentOrc(options)  // preferred
new AgentOrc()          // then init() for v0.1 compat`}
      />
      <p>
        When <code>llm</code> is present, the instance type allows{" "}
        <code>compress</code>. Without it, calling <code>compress</code> is a
        compile-time error.
      </p>

      <h2 id="ready">ready()</h2>
      <CodeBlock language="ts" code={`await ctx.ready();`} />
      <p>
        Opens storage and probes embedding dimensions. Called automatically by
        other methods; use explicitly if you want to fail fast at startup.
      </p>

      <h2 id="close">close()</h2>
      <CodeBlock language="ts" code={`await ctx.close();`} />
      <p>Idempotent. Releases the database connection.</p>

      <h2 id="init">init() shim</h2>
      <CodeBlock
        language="ts"
        code={`const ctx = new AgentOrc();
await ctx.init({
  organization: "my-org",
  database: { provider: "sqlite", connectionString: "./memory.db" },
  embedding: { baseUrl, apiKey, model },
  llm: { baseUrl, apiKey, model }, // optional in v0.2
});`}
      />
      <Note>
        Prefer constructor options. See{" "}
        <a href="/docs/reference/init-compat">init() compatibility</a>.
      </Note>
    </>
  ),
};

export const rememberApi: DocPage = {
  title: "remember()",
  description: "Store a semantic memory with embedding and optional metadata.",
  href: "/docs/api/remember",
  section: "Core API",
  headings: [h("signature", "Signature"), h("example", "Example")],
  content: (
    <>
      <h2 id="signature">Signature</h2>
      <CodeBlock
        language="ts"
        code={`remember(options: RememberOptions): Promise<MemoryRecord>

interface RememberOptions {
  agent: string;
  content: { text: string };
  metadata?: Record<string, unknown>;
}`}
      />
      <h2 id="example">Example</h2>
      <CodeBlock
        language="ts"
        code={`const record = await ctx.remember({
  agent: "research",
  content: { text: "Acme raised Series B at $50M." },
  metadata: { company: "Acme", year: 2024 },
});`}
      />
    </>
  ),
};

export const recallApi: DocPage = {
  title: "recall()",
  description:
    "Semantic and hybrid search with filters, thresholds, MMR, and rerank.",
  href: "/docs/api/recall",
  section: "Core API",
  headings: [
    h("signature", "Signature"),
    h("options", "Options"),
    h("example", "Example"),
  ],
  content: (
    <>
      <h2 id="signature">Signature</h2>
      <CodeBlock
        language="ts"
        code={`recall(options: RecallOptions): Promise<RecallResult[]>`}
      />

      <h2 id="options">Options</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>query</code>
            </td>
            <td>—</td>
            <td>Natural-language query (required)</td>
          </tr>
          <tr>
            <td>
              <code>topK</code>
            </td>
            <td>
              <code>5</code>
            </td>
            <td>Max results (1–1000)</td>
          </tr>
          <tr>
            <td>
              <code>threshold</code>
            </td>
            <td>
              <code>0</code>
            </td>
            <td>Minimum cosine similarity</td>
          </tr>
          <tr>
            <td>
              <code>filter</code>
            </td>
            <td>—</td>
            <td>
              <code>agent</code>, <code>includeArchived</code>,{" "}
              <code>metadata</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>hybrid</code>
            </td>
            <td>—</td>
            <td>
              <code>true</code> or weights; needs <code>keywordSearch</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>mmr</code>
            </td>
            <td>—</td>
            <td>
              Diversification; <code>true</code> or <code>&#123; lambda &#125;</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>rerank</code>
            </td>
            <td>
              <code>false</code>
            </td>
            <td>Uses configured reranker; skips if absent</td>
          </tr>
        </tbody>
      </table>

      <h2 id="example">Example</h2>
      <CodeBlock
        language="ts"
        code={`import { meta } from "agentorc";

const hits = await ctx.recall({
  query: "billing invoices",
  topK: 8,
  threshold: 0.25,
  hybrid: { semanticWeight: 0.7, keywordWeight: 0.3 },
  mmr: { lambda: 0.6 },
  rerank: true,
  filter: {
    agent: "research",
    metadata: meta.and(
      meta.eq("topic", "billing"),
      meta.gte("priority", 1),
    ),
  },
});`}
      />
    </>
  ),
};

export const ingestApi: DocPage = {
  title: "ingest()",
  description: "Parse documents into chunked semantic memories.",
  href: "/docs/api/ingest",
  section: "Core API",
  headings: [
    h("signature", "Signature"),
    h("dependencies", "Dependencies"),
    h("formats", "Formats"),
    h("example", "Example"),
  ],
  content: (
    <>
      <h2 id="signature">Signature</h2>
      <CodeBlock
        language="ts"
        code={`ingest(options: IngestOptions): Promise<IngestResult>

// source: { path } | { buffer, filename? } | { text }
// chunking?: { strategy, chunkSize, overlap }
// metadata?: Record<string, unknown>`}
      />
      <p>
        Pipeline: parse → OCR/vision (if configured) → chunk → embed (batch) →
        store (batch transaction).
      </p>

      <h2 id="dependencies">Dependencies</h2>
      <Warning>
        PDF and DOCX ingest require optional npm peers in your project. Install
        them before calling <code>ingest()</code> on those file types:
        <br />
        <code>npm install pdf-parse@1.1.4</code> for PDF ·{" "}
        <code>npm install mammoth</code> for DOCX ·{" "}
        <code>npm install tesseract.js</code> if you enable OCR.
      </Warning>
      <p>
        Text formats need no peers. See{" "}
        <Link href="/docs/guides/limitations">Limitations (v0.2)</Link> for PDF
        scan limitations and parser caveats.
      </p>

      <h2 id="formats">Formats</h2>
      <ul>
        <li>TXT, Markdown, CSV, JSON — built-in</li>
        <li>
          PDF — peer <code>pdf-parse</code> (text-layer PDFs only without
          OCR/vision)
        </li>
        <li>
          DOCX — peer <code>mammoth</code>
        </li>
        <li>PNG, JPEG, WEBP — OCR/vision optional but required for usable text</li>
      </ul>

      <h2 id="example">Example</h2>
      <CodeBlock
        language="ts"
        code={`// After: npm install pdf-parse@1.1.4
const result = await ctx.ingest({
  agent: "docs",
  source: { path: "./handbook.pdf" },
  chunking: { strategy: "paragraph", chunkSize: 900, overlap: 120 },
  metadata: { collection: "handbook" },
});

console.log(result.chunkCount, result.usedOcr, result.usedVision);`}
      />
      <Warning>
        Images with no OCR/vision and no extractable text throw a validation
        error — configure <code>ocr</code> / <code>vision</code> or pass text.
        Scan/image-only PDFs with an empty text layer fail the same way unless
        you use vision/OCR on images.
      </Warning>
    </>
  ),
};

export const compressApi: DocPage = {
  title: "compress()",
  description: "Summarize an agent's active memories with an LLM.",
  href: "/docs/api/compress",
  section: "Core API",
  headings: [
    h("requirements", "Requirements"),
    h("signature", "Signature"),
    h("example", "Example"),
  ],
  content: (
    <>
      <h2 id="requirements">Requirements</h2>
      <p>
        Construct with <code>llm</code> (or a custom <code>compression</code>{" "}
        provider). Without it, TypeScript rejects the call.
      </p>

      <h2 id="signature">Signature</h2>
      <CodeBlock
        language="ts"
        code={`compress(options: { agent: string; limit?: number }): Promise<CompressResult>
// returns { summary: MemoryRecord, archivedIds: string[] }`}
      />
      <p>
        Requires at least 2 active (non-archived) memories for the agent.
        Sources are soft-archived with lineage.
      </p>

      <h2 id="example">Example</h2>
      <CodeBlock
        language="ts"
        code={`const { summary, archivedIds } = await ctx.compress({
  agent: "research",
  limit: 50,
});`}
      />
    </>
  ),
};

export const forgetApi: DocPage = {
  title: "forget()",
  description: "Hard-delete memories by id or agent filter.",
  href: "/docs/api/forget",
  section: "Core API",
  headings: [h("signature", "Signature"), h("example", "Example")],
  content: (
    <>
      <h2 id="signature">Signature</h2>
      <CodeBlock
        language="ts"
        code={`forget({ id: string }): Promise<number>
forget({ filter: { agent: string } }): Promise<number>`}
      />
      <h2 id="example">Example</h2>
      <CodeBlock
        language="ts"
        code={`await ctx.forget({ id: memoryId });
await ctx.forget({ filter: { agent: "research" } });`}
      />
    </>
  ),
};

export const historyApi: DocPage = {
  title: "history()",
  description: "Inspect creation, archive, and compression lineage.",
  href: "/docs/api/history",
  section: "Core API",
  headings: [h("signature", "Signature"), h("example", "Example")],
  content: (
    <>
      <h2 id="signature">Signature</h2>
      <CodeBlock
        language="ts"
        code={`history({ id: string }): Promise<{ memory: MemoryRecord; events: HistoryEvent[] }>`}
      />
      <h2 id="example">Example</h2>
      <CodeBlock
        language="ts"
        code={`const { memory, events } = await ctx.history({ id });
// eventType: "created" | "archived" | "compressed"`}
      />
    </>
  ),
};

export const lifecycleApi: DocPage = {
  title: "stats() / clear()",
  description: "Organization statistics and destructive wipe.",
  href: "/docs/api/lifecycle",
  section: "Core API",
  headings: [h("stats", "stats()"), h("clear", "clear()")],
  content: (
    <>
      <h2 id="stats">stats()</h2>
      <CodeBlock
        language="ts"
        code={`const s = await ctx.stats();
// totalMemories, totalAgents, databaseSizeBytes,
// embeddingModel, llmModel (null if unset),
// organization, embeddingDimensions`}
      />

      <h2 id="clear">clear()</h2>
      <CodeBlock
        language="ts"
        code={`await ctx.clear({ confirm: true });`}
      />
      <Warning>
        Irreversible. Requires <code>confirm: true</code>. Deletes all memories
        in the current organization.
      </Warning>
    </>
  ),
};
