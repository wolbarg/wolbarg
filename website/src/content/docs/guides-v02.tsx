import { CodeBlock } from "@/components/ui/CodeBlock";
import { Note, Warning } from "@/components/ui/PageHeader";
import { h, type DocPage } from "@/lib/docs";
import Link from "next/link";

export const hybridRetrieval: DocPage = {
  title: "Hybrid Search",
  description: "Combine semantic vectors with BM25 keyword scores.",
  href: "/docs/retrieval/hybrid",
  section: "Retrieval",
  headings: [
    h("setup", "Setup"),
    h("usage", "Usage"),
    h("fallback", "Fallback"),
  ],
  content: (
    <>
      <h2 id="setup">Setup</h2>
      <CodeBlock
        language="ts"
        code={`import { bm25 } from "agentorc";

new AgentOrc({
  /* organization, storage, embedding */
  keywordSearch: bm25(),
});`}
      />

      <h2 id="usage">Usage</h2>
      <CodeBlock
        language="ts"
        code={`await ctx.recall({
  query: "quick brown fox",
  hybrid: true,
  // or
  hybrid: { semanticWeight: 0.7, keywordWeight: 0.3 },
});`}
      />
      <p>
        Scores are normalized then fused. Tune weights for keyword-heavy vs
        semantic-heavy corpora.
      </p>

      <h2 id="fallback">Fallback</h2>
      <Note>
        If <code>keywordSearch</code> is not configured, hybrid quietly falls
        back to semantic-only search.
      </Note>
    </>
  ),
};

export const metadataRetrieval: DocPage = {
  title: "Metadata Filters",
  description: "Filter recall with eq, contains, comparisons, and AND/OR/NOT.",
  href: "/docs/retrieval/metadata",
  section: "Retrieval",
  headings: [h("helpers", "meta helpers"), h("example", "Example")],
  content: (
    <>
      <h2 id="helpers">meta helpers</h2>
      <CodeBlock
        language="ts"
        code={`import { meta } from "agentorc";

meta.eq("topic", "billing")
meta.contains("title", "invoice")
meta.gt("score", 10)
meta.gte("score", 10)
meta.lt("score", 100)
meta.lte("score", 100)
meta.between("year", 2020, 2026)
meta.and(filterA, filterB)
meta.or(filterA, filterB)
meta.not(filterA)`}
      />

      <h2 id="example">Example</h2>
      <CodeBlock
        language="ts"
        code={`await ctx.recall({
  query: "pricing",
  filter: {
    agent: "sales",
    metadata: meta.and(
      meta.eq("region", "eu"),
      meta.gte("priority", 2),
    ),
  },
});`}
      />
      <p>
        Opaque metadata is never validated by the SDK — store any JSON-serializable
        object and filter on known fields.
      </p>
    </>
  ),
};

export const rerankRetrieval: DocPage = {
  title: "Rerankers & MMR",
  description: "Optional cross-encoder reranking and MMR diversification.",
  href: "/docs/retrieval/rerank",
  section: "Retrieval",
  headings: [h("rerank", "Rerank"), h("mmr", "MMR")],
  content: (
    <>
      <h2 id="rerank">Rerank</h2>
      <CodeBlock
        language="ts"
        code={`import { jinaReranker, cohereReranker } from "agentorc";

reranker: jinaReranker({ apiKey: process.env.JINA_API_KEY! })

await ctx.recall({ query: "…", topK: 5, rerank: true });`}
      />
      <Note>
        <code>rerank: true</code> without a configured provider skips reranking —
        no error.
      </Note>

      <h2 id="mmr">MMR</h2>
      <CodeBlock
        language="ts"
        code={`await ctx.recall({
  query: "…",
  topK: 5,
  mmr: true,              // lambda = 0.5
  // mmr: { lambda: 0.7 } // higher = more relevance, less diversity
});`}
      />
    </>
  ),
};

export const documentsIngest: DocPage = {
  title: "Documents",
  description: "Supported formats and ingest source shapes.",
  href: "/docs/ingestion/documents",
  section: "Ingestion",
  headings: [
    h("deps", "Required dependencies"),
    h("sources", "Sources"),
    h("formats", "Formats"),
  ],
  content: (
    <>
      <h2 id="deps">Required dependencies</h2>
      <Warning>
        Calling <code>ingest()</code> on PDF or DOCX <strong>requires</strong>{" "}
        installing optional peers in your application. They are not bundled with{" "}
        <code>agentorc</code>.
      </Warning>
      <CodeBlock
        language="bash"
        code={`npm install pdf-parse@1.1.4   # required for .pdf
npm install mammoth           # required for .docx
npm install tesseract.js      # required if using OCR on images`}
      />
      <p>
        Without the peer, ingest throws a clear configuration error when that
        format is used. Plain text formats need no extra packages. Full
        caveats: <Link href="/docs/guides/limitations">Limitations (v0.2)</Link>.
      </p>

      <h2 id="sources">Sources</h2>
      <CodeBlock
        language="ts"
        code={`source: { path: "./file.pdf" }
source: { buffer: buf, filename: "file.docx" }
source: { text: "# Markdown…" }`}
      />

      <h2 id="formats">Formats</h2>
      <ul>
        <li>
          <strong>Text family:</strong> .txt .md .csv .json — built-in (no peer)
        </li>
        <li>
          <strong>PDF:</strong> <strong>requires</strong>{" "}
          <code>npm install pdf-parse@1.1.4</code>. Only text-layer PDFs
          extract without OCR/vision.
        </li>
        <li>
          <strong>DOCX:</strong> <strong>requires</strong>{" "}
          <code>npm install mammoth</code>
        </li>
        <li>
          <strong>Images:</strong> .png .jpg .jpeg .webp — configure{" "}
          <code>ocr</code> / <code>vision</code> (see{" "}
          <Link href="/docs/ingestion/ocr-vision">OCR &amp; Vision</Link>)
        </li>
      </ul>
    </>
  ),
};

export const chunkingIngest: DocPage = {
  title: "Chunking",
  description: "Replaceable chunking strategies for ingest.",
  href: "/docs/ingestion/chunking",
  section: "Ingestion",
  headings: [h("strategies", "Strategies"), h("options", "Options")],
  content: (
    <>
      <h2 id="strategies">Strategies</h2>
      <CodeBlock
        language="ts"
        code={`import { createChunkingStrategy } from "agentorc";

createChunkingStrategy("fixed")
createChunkingStrategy("sentence")   // default when no markdown headings
createChunkingStrategy("paragraph")
createChunkingStrategy("markdown")   // auto-inferred when headings present
createChunkingStrategy("heading")`}
      />

      <h2 id="options">Options</h2>
      <CodeBlock
        language="ts"
        code={`await ctx.ingest({
  agent: "docs",
  source: { path: "./guide.md" },
  chunking: {
    strategy: "markdown",
    chunkSize: 800,
    overlap: 100,
  },
});`}
      />
    </>
  ),
};

export const ocrVisionIngest: DocPage = {
  title: "OCR & Vision",
  description: "Optional image text extraction and captions during ingest.",
  href: "/docs/ingestion/ocr-vision",
  section: "Ingestion",
  headings: [h("ocr", "OCR"), h("vision", "Vision"), h("merge", "Merge")],
  content: (
    <>
      <h2 id="ocr">OCR</h2>
      <Warning>
        OCR requires installing <code>tesseract.js</code> in your app, then
        passing <code>ocr: tesseract()</code> to the constructor. Scan-only PDFs
        are not OCR&apos;d as PDFs in v0.2 — convert to images or use a vision
        provider on image fixtures.
      </Warning>
      <CodeBlock
        language="bash"
        code={`npm install tesseract.js`}
      />
      <CodeBlock
        language="ts"
        code={`import { tesseract } from "agentorc";
ocr: tesseract()`}
      />

      <h2 id="vision">Vision</h2>
      <CodeBlock
        language="ts"
        code={`import { geminiVision, openaiVision } from "agentorc";

vision: geminiVision({ apiKey: process.env.GEMINI_API_KEY! })
// or
vision: openaiVision({ apiKey: process.env.OPENAI_API_KEY! })`}
      />

      <h2 id="merge">Merge</h2>
      <p>
        OCR text, captions, descriptions, and entities are concatenated before
        chunking. If neither provider is configured, image ingest continues only
        when other text is available; otherwise it errors with a clear message.
      </p>
    </>
  ),
};
