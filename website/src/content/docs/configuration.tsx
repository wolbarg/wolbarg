import { CodeBlock } from "@/components/ui/CodeBlock";
import { Note, Warning } from "@/components/ui/PageHeader";
import { h, type DocPage } from "@/lib/docs";

export const configuration: DocPage = {
  title: "Configuration Overview",
  description:
    "Constructor options for AgentOrc v0.2 — required vs optional providers.",
  href: "/docs/configuration",
  section: "Configuration",
  headings: [
    h("required", "Required"),
    h("optional", "Optional"),
    h("example", "Full example"),
    h("lazy", "Lazy initialization"),
  ],
  content: (
    <>
      <h2 id="required">Required</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>organization</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>Namespace isolating memories in a shared database</td>
          </tr>
          <tr>
            <td>
              <code>storage</code>
            </td>
            <td>
              <code>StorageProvider | StorageConfig</code>
            </td>
            <td>
              <code>sqlite(...)</code> or <code>postgres(...)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>embedding</code>
            </td>
            <td>
              <code>EmbeddingProvider | EmbeddingConfig</code>
            </td>
            <td>Any OpenAI-compatible embedding factory or custom provider</td>
          </tr>
        </tbody>
      </table>

      <h2 id="optional">Optional</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Enables</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>llm</code>
            </td>
            <td>
              <code>compress()</code> (typed at compile time)
            </td>
          </tr>
          <tr>
            <td>
              <code>keywordSearch</code>
            </td>
            <td>Hybrid recall</td>
          </tr>
          <tr>
            <td>
              <code>reranker</code>
            </td>
            <td>
              <code>recall(&#123; rerank: true &#125;)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>ocr</code> / <code>vision</code>
            </td>
            <td>Image ingest enrichment</td>
          </tr>
          <tr>
            <td>
              <code>chunking</code>
            </td>
            <td>Default ingest chunking strategy</td>
          </tr>
          <tr>
            <td>
              <code>compression</code>
            </td>
            <td>Custom compression provider (overrides llm default)</td>
          </tr>
          <tr>
            <td>
              <code>retrieval</code>
            </td>
            <td>Default hybrid / MMR / over-fetch settings</td>
          </tr>
        </tbody>
      </table>

      <h2 id="example">Full example</h2>
      <CodeBlock
        language="ts"
        code={`import {
  AgentOrc, sqlite, openaiEmbedding, openaiLlm,
  bm25, jinaReranker, tesseract, geminiVision,
} from "agentorc";

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
  reranker: jinaReranker({ apiKey: process.env.JINA_API_KEY! }),
  ocr: tesseract(),
  vision: geminiVision({ apiKey: process.env.GEMINI_API_KEY! }),
  retrieval: {
    overFetchFactor: 4,
    hybrid: { semanticWeight: 0.7, keywordWeight: 0.3 },
  },
});`}
      />

      <h2 id="lazy">Lazy initialization</h2>
      <p>
        Storage opens and embedding dimensions are probed on the first API call,
        or when you call <code>await ctx.ready()</code>. Optional providers are
        not probed until used.
      </p>
    </>
  ),
};

export const storageConfig: DocPage = {
  title: "Storage",
  description: "SQLite and PostgreSQL storage providers.",
  href: "/docs/configuration/storage",
  section: "Configuration",
  headings: [
    h("sqlite", "SQLite"),
    h("postgres", "PostgreSQL"),
    h("parity", "API parity"),
  ],
  content: (
    <>
      <h2 id="sqlite">SQLite</h2>
      <CodeBlock
        language="ts"
        code={`import { sqlite } from "agentorc";

storage: sqlite("./memory.db")
// or
storage: sqlite(":memory:")`}
      />
      <p>
        Uses WAL, prepared statements, sqlite-vec when available (BLOB cosine
        fallback otherwise), and FTS5 for keyword indexing (schema v2).
      </p>

      <h2 id="postgres">PostgreSQL</h2>
      <CodeBlock
        language="bash"
        code={`npm install pg`}
      />
      <CodeBlock
        language="ts"
        code={`import { postgres } from "agentorc";

storage: postgres(process.env.DATABASE_URL!)
// or
storage: postgres({
  connectionString: process.env.DATABASE_URL!,
  maxPoolSize: 10,
})`}
      />
      <p>
        Connection pooling, JSONB metadata + GIN index, and pgvector when the
        extension is available (BYTEA + cosine fallback otherwise).
      </p>
      <Warning>
        Install the optional <code>pg</code> peer dependency before using{" "}
        <code>postgres()</code>.
      </Warning>

      <h2 id="parity">API parity</h2>
      <p>
        Both backends implement the same <code>StorageProvider</code> contract:
        insert, batch insert, update, delete, vector search, metadata listing,
        history, transactions, and migrations. Switch storage by changing one
        constructor option.
      </p>
    </>
  ),
};

export const embeddingsConfig: DocPage = {
  title: "Embeddings",
  description: "Provider-agnostic embeddings via OpenAI-compatible factories.",
  href: "/docs/configuration/embeddings",
  section: "Configuration",
  headings: [
    h("factories", "Factories"),
    h("custom", "Custom provider"),
    h("batch", "Batch embeddings"),
  ],
  content: (
    <>
      <h2 id="factories">Factories</h2>
      <p>All factories wrap an OpenAI-compatible <code>/embeddings</code> HTTP API:</p>
      <CodeBlock
        language="ts"
        code={`import {
  openaiEmbedding,
  ollamaEmbedding,
  openRouterEmbedding,
  lmStudioEmbedding,
  geminiEmbedding,
  togetherEmbedding,
  vllmEmbedding,
  openaiCompatibleEmbedding,
} from "agentorc";

embedding: openaiEmbedding({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-small",
})

embedding: ollamaEmbedding({
  apiKey: "ollama",
  model: "nomic-embed-text",
  // baseUrl defaults to http://127.0.0.1:11434/v1
})`}
      />

      <h2 id="custom">Custom provider</h2>
      <CodeBlock
        language="ts"
        code={`const embedding = {
  model: "my-model",
  async embed(text: string) {
    /* return Float32Array */
  },
  async validate() {
    const v = await this.embed("ping");
    return { dimensions: v.length };
  },
};

new AgentOrc({ organization: "x", storage: sqlite(":memory:"), embedding });`}
      />

      <h2 id="batch">Batch embeddings</h2>
      <p>
        Providers may implement optional <code>embedBatch</code>. Ingest uses it
        automatically; otherwise the SDK parallelizes <code>embed</code>.
      </p>
      <Note>
        Changing embedding dimensionality on an existing database throws at
        startup — create a new DB file or wipe data first.
      </Note>
    </>
  ),
};

export const providersConfig: DocPage = {
  title: "Optional Providers",
  description:
    "LLM, keyword search, rerankers, OCR, vision, chunking, and compression.",
  href: "/docs/configuration/providers",
  section: "Configuration",
  headings: [
    h("llm", "LLM / compression"),
    h("keyword", "Keyword search"),
    h("rerank", "Rerankers"),
    h("ocr-vision", "OCR & vision"),
    h("chunking", "Chunking"),
  ],
  content: (
    <>
      <h2 id="llm">LLM / compression</h2>
      <CodeBlock
        language="ts"
        code={`import { openaiLlm, ollamaLlm, openRouterLlm } from "agentorc";

llm: openaiLlm({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4.1-mini",
})`}
      />
      <p>
        Without <code>llm</code>, TypeScript will not allow{" "}
        <code>compress()</code>. At runtime you get{" "}
        <code>ProviderNotConfiguredError</code>.
      </p>

      <h2 id="keyword">Keyword search</h2>
      <CodeBlock language="ts" code={`keywordSearch: bm25()`} />
      <p>
        Enables hybrid fusion in <code>recall</code>. If omitted, recall stays
        semantic-only.
      </p>

      <h2 id="rerank">Rerankers</h2>
      <CodeBlock
        language="ts"
        code={`import { jinaReranker, cohereReranker, bgeReranker, crossEncoder } from "agentorc";

reranker: jinaReranker({ apiKey: process.env.JINA_API_KEY! })`}
      />
      <p>
        Pass <code>rerank: true</code> on recall. If no reranker is configured,
        reranking is skipped silently.
      </p>

      <h2 id="ocr-vision">OCR &amp; vision</h2>
      <CodeBlock
        language="ts"
        code={`import { tesseract, geminiVision, openaiVision } from "agentorc";

ocr: tesseract(),
vision: geminiVision({ apiKey: process.env.GEMINI_API_KEY! }),`}
      />

      <h2 id="chunking">Chunking</h2>
      <CodeBlock
        language="ts"
        code={`import { createChunkingStrategy } from "agentorc";

chunking: createChunkingStrategy("markdown")`}
      />
      <p>
        Strategies: <code>fixed</code>, <code>sentence</code>,{" "}
        <code>paragraph</code>, <code>markdown</code>, <code>heading</code>.
        Overridable per <code>ingest</code> call.
      </p>
    </>
  ),
};
