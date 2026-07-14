/**
 * Agent ORC benchmark runner.
 *
 * Discovers and executes all benchmark modules, then writes:
 *   - results/benchmark.json
 *   - results/benchmark.md
 *   - results/Benchmarks.md
 *   - ./Benchmarks.md
 *
 * Usage:
 *   npm run benchmark           # full suite, local mock embeddings/LLM
 *   npm run benchmark:quick     # smaller datasets
 *   npm run benchmark:live      # use .env OpenAI credentials (smaller recommended)
 */

import { AgentOrc } from "agentorc";
import type { BenchmarkFn, BenchmarkSection } from "./types.ts";
import {
  buildContext,
  createInitOptions,
  dbPathFor,
  ensureCleanDb,
  resolveCliArgs,
} from "./harness.ts";
import { buildReport, writeReports } from "./report.ts";
import { runInsertBenchmark } from "./insert.ts";
import { runSearchBenchmark } from "./search.ts";
import { runRetrievalBenchmark } from "./retrieval.ts";
import { runCompressionBenchmark } from "./compression.ts";
import { runStartupBenchmark } from "./startup.ts";
import { runConcurrencyBenchmark } from "./concurrency.ts";
import { runMemoryBenchmark } from "./memory.ts";
import { runFilesizeBenchmark } from "./filesize.ts";

/**
 * Auto-discovered benchmark registry — add new modules here.
 * Order matters: filesize builds shared corpora reused by search/retrieval.
 */
const BENCHMARKS: Array<{ id: string; run: BenchmarkFn }> = [
  { id: "startup", run: runStartupBenchmark },
  { id: "compression", run: runCompressionBenchmark },
  { id: "concurrency", run: runConcurrencyBenchmark },
  { id: "memory", run: runMemoryBenchmark },
  { id: "filesize", run: runFilesizeBenchmark },
  { id: "search", run: runSearchBenchmark },
  { id: "retrieval", run: runRetrievalBenchmark },
  { id: "insert", run: runInsertBenchmark },
];

async function probeSdkMeta(
  ctx: Awaited<ReturnType<typeof buildContext>>["ctx"],
): Promise<{
  embeddingModel: string;
  llmModel: string;
  embeddingDimensions: number;
}> {
  const path = dbPathFor(ctx, "probe-meta");
  ensureCleanDb(path);
  const client = new AgentOrc();
  await client.init(createInitOptions(ctx, path));
  const stats = await client.stats();
  await client.close();
  return {
    embeddingModel: stats.embeddingModel,
    llmModel: stats.llmModel,
    embeddingDimensions: stats.embeddingDimensions,
  };
}

async function main(): Promise<void> {
  const { mode, scale } = resolveCliArgs();
  console.log("══════════════════════════════════════════════");
  console.log(" Agent ORC Benchmark Suite");
  console.log("══════════════════════════════════════════════");
  console.log(` mode=${mode}  scale=${scale}`);
  console.log(` benchmarks=${BENCHMARKS.map((b) => b.id).join(", ")}`);

  const { ctx, cleanup } = await buildContext(mode, scale);
  const wallStart = performance.now();

  try {
    const sdkMeta = await probeSdkMeta(ctx);
    console.log(
      ` sdk probe: embed=${sdkMeta.embeddingModel} dims=${sdkMeta.embeddingDimensions} llm=${sdkMeta.llmModel}`,
    );

    const sections: BenchmarkSection[] = [];
    for (const entry of BENCHMARKS) {
      const section = await entry.run(ctx);
      sections.push(section);
    }

    const wallClockMs = performance.now() - wallStart;
    const report = buildReport(ctx, sections, wallClockMs, sdkMeta);
    const paths = writeReports(ctx, report);

    console.log("\n══════════════════════════════════════════════");
    console.log(" Benchmark complete");
    console.log("══════════════════════════════════════════════");
    console.log(` rows: ${report.totals.rows}`);
    console.log(` wall: ${(wallClockMs / 1000).toFixed(1)}s`);
    console.log(` json: ${paths.jsonPath}`);
    console.log(` md:   ${paths.mdPath}`);
    console.log(` doc:  ${paths.benchmarksMdPath}`);
    console.log(` root: Benchmarks.md`);
    console.log("\nSummary:");
    console.table(report.summaryTable);
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error("\nBenchmark suite failed:");
  console.error(error);
  process.exitCode = 1;
});
