/** Shared types for the Agent ORC benchmark suite. */

export type BenchmarkCategory =
  | "insert"
  | "search"
  | "retrieval"
  | "compression"
  | "startup"
  | "concurrency"
  | "memory"
  | "filesize";

export interface MetricValue {
  /** Human-readable label, e.g. "ops/sec", "p95 (ms)" */
  name: string;
  /** Numeric value when available */
  value: number | null;
  /** Display string used in markdown tables */
  display: string;
  /** Optional unit for JSON consumers */
  unit?: string;
}

export interface BenchmarkResultRow {
  category: BenchmarkCategory;
  name: string;
  dataset: string;
  result: string;
  metrics: MetricValue[];
  details?: Record<string, unknown>;
  notes?: string;
}

export interface BenchmarkSection {
  id: string;
  title: string;
  description: string;
  rows: BenchmarkResultRow[];
  durationMs: number;
  extraMarkdown?: string;
}

export interface BenchmarkSuiteReport {
  generatedAt: string;
  suiteVersion: string;
  mode: "mock" | "live";
  scale: "full" | "quick";
  runtime: {
    node: string;
    platform: string;
    arch: string;
    cpus: number;
    totalMemBytes: number;
  };
  sdk: {
    package: string;
    organization: string;
    embeddingMode: string;
    embeddingModel: string;
    llmModel: string;
    embeddingDimensions: number;
  };
  sections: BenchmarkSection[];
  summaryTable: Array<{
    benchmark: string;
    dataset: string;
    result: string;
  }>;
  totals: {
    sections: number;
    rows: number;
    wallClockMs: number;
  };
}

export interface BenchContext {
  mode: "mock" | "live";
  scale: "full" | "quick";
  dataDir: string;
  resultsDir: string;
  organization: string;
  embedding: {
    baseUrl: string;
    apiKey: string;
    model: string;
    dimensions: number;
  };
  llm: {
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

export type BenchmarkFn = (ctx: BenchContext) => Promise<BenchmarkSection>;
