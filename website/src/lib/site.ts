export const siteConfig = {
  name: "agentOrc",
  shortName: "agentOrc",
  /** Primary brand string used in titles / OG (exact casing). */
  brand: "agentOrc",
  title: "agentOrc — Local-first Semantic Memory SDK for AI Agents",
  description:
    "agentOrc is a model-agnostic TypeScript SDK for shared semantic memory across AI agents. Local-first SQLite + sqlite-vec — no hosted vector DB, zero infrastructure.",
  /** Longer description for JSON-LD / README mirrors. */
  longDescription:
    "agentOrc (AgentOrc) gives multiple AI agents one persistent semantic memory layer. Store and recall facts by meaning with remember() and recall(), compress history, and run fully locally on SQLite + sqlite-vec. Open source, MIT-licensed, npm package agentorc.",
  url: "https://AgentOrc.lucareo.com",
  locale: "en_US",
  /** Brand variants people actually search for. */
  keywords: [
    "agentOrc",
    "AgentOrc",
    "agentorc",
    "agent orc",
    "Agent ORC",
    "AI agent memory",
    "semantic memory",
    "multi-agent memory",
    "shared agent memory",
    "local-first AI",
    "SQLite vector search",
    "sqlite-vec",
    "TypeScript agent SDK",
    "OpenAI compatible embeddings",
    "Ollama agents",
    "RAG local",
    "vector database SQLite",
    "npm agentorc",
  ],
  author: {
    name: "Atharv Munde",
    url: "https://github.com/Atharvmunde11",
  },
  links: {
    github: "https://github.com/Atharvmunde11/agentOrc",
    npm: "https://www.npmjs.com/package/agentorc",
    benchmarks: "https://github.com/Atharvmunde11/agentorc-benchmarks",
    benchmarksPage: "/benchmarks",
    docs: "/docs/introduction",
    twitter: undefined as string | undefined,
  },
  sameAs: [
    "https://github.com/Atharvmunde11/agentOrc",
    "https://www.npmjs.com/package/agentorc",
    "https://github.com/Atharvmunde11/agentorc-benchmarks",
  ],
} as const;

export type SiteConfig = typeof siteConfig;
