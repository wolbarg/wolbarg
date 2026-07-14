/**
 * Shared harness helpers for Agent ORC benchmarks.
 */

import { mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cpus, totalmem } from "node:os";
import { AgentOrc } from "agentorc";
import type { InitOptions } from "agentorc";
import { config as loadDotenv } from "dotenv";
import type {
  BenchContext,
  BenchmarkResultRow,
  BenchmarkSection,
  MetricValue,
} from "./types.ts";
import { generateMemories, type GeneratedMemory } from "./data-generator.ts";
import { installMockFetch, startMockOpenAIServer } from "./mock-server.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: join(__dirname, ".env") });

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "n/a";
  if (ms < 1) return `${(ms * 1000).toFixed(1)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatOps(ops: number): string {
  if (!Number.isFinite(ops)) return "n/a";
  if (ops >= 1000) return `${(ops / 1000).toFixed(2)}k ops/sec`;
  return `${ops.toFixed(2)} ops/sec`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "n/a";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return Number.NaN;
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const rank = (p / 100) * (sortedAsc.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sortedAsc[low]!;
  const weight = rank - low;
  return sortedAsc[low]! * (1 - weight) + sortedAsc[high]! * weight;
}

export function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function metric(
  name: string,
  value: number | null,
  display: string,
  unit?: string,
): MetricValue {
  return { name, value, display, unit };
}

export function row(
  partial: Omit<BenchmarkResultRow, "metrics"> & { metrics?: MetricValue[] },
): BenchmarkResultRow {
  return {
    ...partial,
    metrics: partial.metrics ?? [],
  };
}

export async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, ms: performance.now() - start };
}

export function dbPathFor(ctx: BenchContext, name: string): string {
  return join(ctx.dataDir, `${name}.db`);
}

export function ensureCleanDb(path: string): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = `${path}${suffix}`;
    if (existsSync(p)) rmSync(p, { force: true });
  }
  mkdirSync(dirname(path), { recursive: true });
}

export function fileSizeBytes(path: string): number {
  if (!existsSync(path)) return 0;
  let total = statSync(path).size;
  for (const suffix of ["-wal", "-shm"]) {
    const side = `${path}${suffix}`;
    if (existsSync(side)) total += statSync(side).size;
  }
  return total;
}

export function memorySnapshot() {
  const m = process.memoryUsage();
  return {
    rss: m.rss,
    heapTotal: m.heapTotal,
    heapUsed: m.heapUsed,
    external: m.external,
    arrayBuffers: m.arrayBuffers,
  };
}

export function createInitOptions(
  ctx: BenchContext,
  connectionString: string,
): InitOptions {
  return {
    organization: ctx.organization,
    database: {
      provider: "sqlite",
      connectionString,
    },
    embedding: {
      baseUrl: ctx.embedding.baseUrl,
      apiKey: ctx.embedding.apiKey,
      model: ctx.embedding.model,
      timeoutMs: 120_000,
    },
    llm: {
      baseUrl: ctx.llm.baseUrl,
      apiKey: ctx.llm.apiKey,
      model: ctx.llm.model,
      temperature: ctx.llm.temperature,
      maxTokens: ctx.llm.maxTokens,
      timeoutMs: 180_000,
    },
  };
}

export async function createClient(
  ctx: BenchContext,
  connectionString: string,
): Promise<AgentOrc> {
  const client = new AgentOrc();
  await client.init(createInitOptions(ctx, connectionString));
  return client;
}

export async function populateDataset(
  client: AgentOrc,
  count: number,
  options?: { startSeed?: number; agentOverride?: string },
): Promise<GeneratedMemory[]> {
  const memories = generateMemories(count, options?.startSeed ?? 1);
  for (const memory of memories) {
    await client.remember({
      agent: options?.agentOverride ?? memory.agent,
      content: { text: memory.text },
      metadata: memory.metadata,
    });
  }
  return memories;
}

export function insertSizes(scale: "full" | "quick"): number[] {
  return scale === "quick" ? [100, 1_000] : [100, 1_000, 10_000, 100_000];
}

export function retrievalSizes(scale: "full" | "quick"): number[] {
  return scale === "quick" ? [1_000] : [1_000, 10_000, 100_000];
}

export function concurrencyLevels(scale: "full" | "quick"): number[] {
  return scale === "quick" ? [10, 50] : [10, 50, 100];
}

export function resolveCliArgs(argv = process.argv.slice(2)): {
  mode: "mock" | "live";
  scale: "full" | "quick";
} {
  const quick = argv.includes("--quick") || process.env.BENCH_SCALE === "quick";
  const live =
    argv.includes("--live") ||
    process.env.BENCH_MODE === "live" ||
    process.env.BENCH_USE_LIVE === "1";
  return {
    mode: live ? "live" : "mock",
    scale: quick ? "quick" : "full",
  };
}

export async function buildContext(
  mode: "mock" | "live",
  scale: "full" | "quick",
): Promise<{
  ctx: BenchContext;
  cleanup: () => Promise<void>;
}> {
  const dataDir = join(__dirname, "data");
  const resultsDir = join(__dirname, "results");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(resultsDir, { recursive: true });

  let mockClose: (() => Promise<void>) | null = null;
  let embeddingBase = process.env.EMBEDDING_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  let embeddingKey =
    process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY ?? "bench-key";
  let embeddingModel = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
  let llmBase = process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL ?? embeddingBase;
  let llmKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? embeddingKey;
  let llmModel = process.env.LLM_MODEL ?? "gpt-4.1-mini";
  let dimensions = Number(process.env.EMBEDDING_DIMS ?? 384);

  if (mode === "mock") {
    const useHttp = process.env.BENCH_MOCK_HTTP === "1";
    const mock = useHttp
      ? await startMockOpenAIServer(dimensions)
      : installMockFetch(dimensions);
    mockClose = mock.close;
    embeddingBase = mock.baseUrl;
    llmBase = mock.baseUrl;
    embeddingKey = "mock-key";
    llmKey = "mock-key";
    embeddingModel = "mock-embed";
    llmModel = "mock-llm";
  } else {
    dimensions = 1536; // text-embedding-3-small default; probed during init
    if (!process.env.OPENAI_API_KEY && !process.env.EMBEDDING_API_KEY) {
      throw new Error(
        "Live mode requires OPENAI_API_KEY or EMBEDDING_API_KEY in .env",
      );
    }
  }

  const ctx: BenchContext = {
    mode,
    scale,
    dataDir,
    resultsDir,
    organization: process.env.ORGANIZATION ?? "benchmark-org",
    embedding: {
      baseUrl: embeddingBase,
      apiKey: embeddingKey,
      model: embeddingModel,
      dimensions,
    },
    llm: {
      baseUrl: llmBase,
      apiKey: llmKey,
      model: llmModel,
      temperature: Number(process.env.LLM_TEMPERATURE ?? 0.2),
      maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 1024),
    },
  };

  return {
    ctx,
    cleanup: async () => {
      if (mockClose) await mockClose();
    },
  };
}

export function runtimeInfo() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: cpus().length,
    totalMemBytes: totalmem(),
  };
}

export async function sectionWrapper(
  id: string,
  title: string,
  description: string,
  run: () => Promise<{ rows: BenchmarkResultRow[]; extraMarkdown?: string }>,
): Promise<BenchmarkSection> {
  const start = performance.now();
  console.log(`\n▶ ${title}`);
  const { rows, extraMarkdown } = await run();
  const durationMs = performance.now() - start;
  console.log(`  ✓ ${title} finished in ${formatMs(durationMs)} (${rows.length} rows)`);
  return { id, title, description, rows, durationMs, extraMarkdown };
}

/** Normalize Tinybench v6 task results into ms / ops-sec helpers. */
export function tinybenchStats(task: {
  result?: {
    state?: string;
    latency?: { mean: number; p75: number; p99: number; rme: number; samplesCount: number };
    throughput?: { mean: number };
    period?: number;
  };
} | undefined) {
  const result = task?.result;
  if (
    !result ||
    (result.state !== "completed" && result.state !== "aborted-with-statistics") ||
    !result.latency ||
    !result.throughput
  ) {
    return null;
  }

  return {
    hz: result.throughput.mean,
    meanMs: result.latency.mean,
    p75Ms: result.latency.p75,
    p99Ms: result.latency.p99,
    rme: result.latency.rme,
    samples: result.latency.samplesCount,
    periodMs: result.period ?? result.latency.mean,
  };
}
