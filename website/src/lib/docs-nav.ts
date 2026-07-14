import type { NavSection } from "@/types/docs";

export const docsNavigation: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs/introduction" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quick Start", href: "/docs/quick-start" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { title: "Overview", href: "/docs/configuration" },
      { title: "Storage", href: "/docs/configuration/storage" },
      { title: "Embeddings", href: "/docs/configuration/embeddings" },
      { title: "Optional Providers", href: "/docs/configuration/providers" },
    ],
  },
  {
    title: "Core API",
    items: [
      { title: "AgentOrc", href: "/docs/api/agentorc" },
      { title: "remember()", href: "/docs/api/remember" },
      { title: "recall()", href: "/docs/api/recall" },
      { title: "ingest()", href: "/docs/api/ingest" },
      { title: "compress()", href: "/docs/api/compress" },
      { title: "forget()", href: "/docs/api/forget" },
      { title: "history()", href: "/docs/api/history" },
      { title: "stats() / clear()", href: "/docs/api/lifecycle" },
    ],
  },
  {
    title: "Retrieval",
    items: [
      { title: "Hybrid Search", href: "/docs/retrieval/hybrid" },
      { title: "Metadata Filters", href: "/docs/retrieval/metadata" },
      { title: "Rerankers & MMR", href: "/docs/retrieval/rerank" },
    ],
  },
  {
    title: "Ingestion",
    items: [
      { title: "Documents", href: "/docs/ingestion/documents" },
      { title: "Chunking", href: "/docs/ingestion/chunking" },
      { title: "OCR & Vision", href: "/docs/ingestion/ocr-vision" },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Multi-Agent Memory", href: "/docs/guides/shared-memory" },
      { title: "What's New in 0.2", href: "/docs/guides/whats-new" },
      { title: "Migration 0.1 → 0.2", href: "/docs/guides/migration-v02" },
      { title: "Limitations (v0.2)", href: "/docs/guides/limitations" },
      { title: "Best Practices", href: "/docs/guides/best-practices" },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "Types", href: "/docs/reference/types" },
      { title: "Errors", href: "/docs/reference/errors" },
      { title: "init() Compat", href: "/docs/reference/init-compat" },
    ],
  },
];

export function flattenNav() {
  return docsNavigation.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      section: section.title,
    })),
  );
}
