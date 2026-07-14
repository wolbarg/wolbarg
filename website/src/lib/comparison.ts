/**
 * Feature comparison — public docs only.
 * Values: Yes | No | Partial | Unknown
 * Never invent performance numbers.
 */

export type FeatureValue = "Yes" | "No" | "Partial" | "Unknown";

/** Instant-scan marks for comparison tables. */
export function featureMark(value: FeatureValue): string {
  switch (value) {
    case "Yes":
      return "✅";
    case "No":
      return "❌";
    case "Partial":
      return "⚠️";
    case "Unknown":
      return "❓";
  }
}

export const FEATURE_LEGEND =
  "✅ Supported · ⚠️ Partial · ❌ No · ❓ Unknown";

export const FEATURE_COLUMNS = [
  "SQLite-based",
  "Local-first",
  "Framework Agnostic",
  "Model Agnostic",
  "Memory Compression",
  "Semantic Search",
  "Hybrid Search",
  "Open Source",
  "Runs Offline",
  "Storage Adapter",
  "Provider Adapter",
  "Public Benchmark Repo",
] as const;

export type FeatureColumn = (typeof FEATURE_COLUMNS)[number];

export interface ProductFeatures {
  name: string;
  homepage: string;
  highlight?: boolean;
  features: Record<FeatureColumn, FeatureValue>;
}

export const PRODUCTS: ProductFeatures[] = [
  {
    name: "agentOrc",
    homepage: "https://AgentOrc.lucareo.com",
    highlight: true,
    features: {
      "SQLite-based": "Yes",
      "Local-first": "Yes",
      "Framework Agnostic": "Yes",
      "Model Agnostic": "Yes",
      "Memory Compression": "Yes",
      "Semantic Search": "Yes",
      "Hybrid Search": "No",
      "Open Source": "Yes",
      "Runs Offline": "Yes",
      "Storage Adapter": "Partial",
      "Provider Adapter": "Yes",
      "Public Benchmark Repo": "Yes",
    },
  },
  {
    name: "Chroma",
    homepage: "https://www.trychroma.com",
    features: {
      "SQLite-based": "Partial",
      "Local-first": "Yes",
      "Framework Agnostic": "Yes",
      "Model Agnostic": "Yes",
      "Memory Compression": "Unknown",
      "Semantic Search": "Yes",
      "Hybrid Search": "Partial",
      "Open Source": "Yes",
      "Runs Offline": "Yes",
      "Storage Adapter": "Yes",
      "Provider Adapter": "Yes",
      "Public Benchmark Repo": "Unknown",
    },
  },
  {
    name: "Qdrant",
    homepage: "https://qdrant.tech",
    features: {
      "SQLite-based": "No",
      "Local-first": "Partial",
      "Framework Agnostic": "Yes",
      "Model Agnostic": "Yes",
      "Memory Compression": "No",
      "Semantic Search": "Yes",
      "Hybrid Search": "Yes",
      "Open Source": "Yes",
      "Runs Offline": "Yes",
      "Storage Adapter": "Partial",
      "Provider Adapter": "Yes",
      "Public Benchmark Repo": "Unknown",
    },
  },
  {
    name: "LanceDB",
    homepage: "https://lancedb.com",
    features: {
      "SQLite-based": "No",
      "Local-first": "Yes",
      "Framework Agnostic": "Yes",
      "Model Agnostic": "Yes",
      "Memory Compression": "Unknown",
      "Semantic Search": "Yes",
      "Hybrid Search": "Yes",
      "Open Source": "Yes",
      "Runs Offline": "Yes",
      "Storage Adapter": "Partial",
      "Provider Adapter": "Yes",
      "Public Benchmark Repo": "Unknown",
    },
  },
  {
    name: "Mem0",
    homepage: "https://mem0.ai",
    features: {
      "SQLite-based": "Partial",
      "Local-first": "Partial",
      "Framework Agnostic": "Yes",
      "Model Agnostic": "Yes",
      "Memory Compression": "Yes",
      "Semantic Search": "Yes",
      "Hybrid Search": "Partial",
      "Open Source": "Yes",
      "Runs Offline": "Partial",
      "Storage Adapter": "Yes",
      "Provider Adapter": "Yes",
      "Public Benchmark Repo": "Unknown",
    },
  },
];

/** Published agentOrc SDK numbers from the public benchmark suite (mock mode). */
export const BENCHMARK_SUMMARY = {
  generatedAt: "2026-07-14",
  mode: "mock",
  platform: "win32/arm64 · Node 24 · 8 CPUs · 16 GB RAM",
  rows: [
    { benchmark: "Startup", dataset: "Cold", result: "8.63 ms" },
    { benchmark: "Startup", dataset: "Warm", result: "3.35 ms" },
    { benchmark: "Insert", dataset: "1000", result: "2.54k ops/sec" },
    { benchmark: "Insert", dataset: "100000", result: "2.02k ops/sec" },
    { benchmark: "Search", dataset: "1000", result: "11.65 ms" },
    { benchmark: "Search", dataset: "100000", result: "1.12 s" },
    { benchmark: "Concurrency", dataset: "100 writers", result: "2.63k ops/sec" },
    { benchmark: "Database Size", dataset: "100000", result: "260.79 MB" },
  ],
} as const;

/** Highlight stats for the hero strip */
export const KEY_STATS = [
  { label: "Cold start", value: "8.63 ms" },
  { label: "Insert @ 1k", value: "2.54k/s" },
  { label: "Search @ 1k", value: "11.65 ms" },
  { label: "100 writers", value: "2.63k/s" },
  { label: "DB @ 100k", value: "261 MB" },
] as const;

/** Numeric series for shadcn / Recharts (from published suite). */
export const CHART_SERIES = {
  startup: [
    { label: "Cold", value: 8.63 },
    { label: "Warm", value: 3.35 },
  ],
  insert: [
    { label: "100", value: 2027 },
    { label: "1k", value: 2537 },
    { label: "10k", value: 2386 },
    { label: "100k", value: 2024 },
  ],
  search: [
    { label: "100", value: 0.72 },
    { label: "1k", value: 11.65 },
    { label: "10k", value: 100.84 },
    { label: "100k", value: 1121 },
  ],
  retrieval: [
    { label: "1k", top5: 8.33, top10: 11.39, top20: 9.61 },
    { label: "10k", top5: 107.26, top10: 105.44, top20: 127.77 },
    { label: "100k", top5: 1427, top10: 1268, top20: 968 },
  ],
  concurrency: [
    { label: "10", value: 2637 },
    { label: "50", value: 2956 },
    { label: "100", value: 2634 },
  ],
  databaseSizeMb: [
    { label: "100", value: 0.32 },
    { label: "1k", value: 2.64 },
    { label: "10k", value: 26.0 },
    { label: "100k", value: 260.8 },
  ],
  memoryHeapMb: [
    { label: "Base", value: 14.0 },
    { label: "Init", value: 14.1 },
    { label: "100", value: 18.6 },
    { label: "1k", value: 19.4 },
    { label: "10k", value: 20.1 },
    { label: "Recall", value: 31.2 },
  ],
  compressionPct: [
    { label: "50", value: 98.0 },
    { label: "200", value: 99.5 },
    { label: "500", value: 99.5 },
    { label: "1k", value: 99.5 },
  ],
} as const;

export const BENCHMARKS_REPO =
  "https://github.com/Atharvmunde11/agentorc-benchmarks";

export const PAGE_SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "charts", label: "Charts" },
  { id: "comparison", label: "Comparison" },
  { id: "methodology", label: "Methodology" },
  { id: "hardware", label: "Hardware" },
  { id: "faq", label: "FAQ" },
  { id: "reproduce", label: "Reproduce" },
] as const;
