/**
 * Semantic search latency benchmarks (avg / p95 / p99).
 */

import { Bench } from "tinybench";
import type { BenchContext, BenchmarkSection } from "./types.ts";
import { pickSearchQueries } from "./data-generator.ts";
import { openDataset } from "./datasets.ts";
import {
  formatMs,
  insertSizes,
  mean,
  metric,
  percentile,
  row,
  sectionWrapper,
  tinybenchStats,
} from "./harness.ts";

export async function runSearchBenchmark(
  ctx: BenchContext,
): Promise<BenchmarkSection> {
  return sectionWrapper(
    "search",
    "Search Benchmark",
    "Populates the database first (shared corpus), then benchmarks AgentOrc.recall() with realistic natural-language queries. Reports average, p95, and p99 latency.",
    async () => {
      const sizes = insertSizes(ctx.scale);
      const rows = [];
      const queries = pickSearchQueries(ctx.scale === "quick" ? 6 : 12);

      for (const size of sizes) {
        const { client } = await openDataset(ctx, size);

        const samples: number[] = [];
        const iterations = ctx.scale === "quick" ? 8 : 20;

        for (let i = 0; i < iterations; i += 1) {
          const query = queries[i % queries.length]!;
          const start = performance.now();
          await client.recall({ query, topK: 5 });
          samples.push(performance.now() - start);
        }

        samples.sort((a, b) => a - b);
        const avg = mean(samples);
        const p95 = percentile(samples, 95);
        const p99 = percentile(samples, 99);

        const bench = new Bench({
          name: `search-${size}`,
          time: ctx.scale === "quick" ? 300 : 800,
          warmupTime: 100,
          iterations: 8,
        });

        let qi = 0;
        bench.add(
          "recall topK=5",
          async () => {
            const query = queries[qi++ % queries.length]!;
            await client.recall({ query, topK: 5 });
          },
          { async: true },
        );
        await bench.run();
        const tb = tinybenchStats(bench.tasks[0]);

        await client.close();

        rows.push(
          row({
            category: "search",
            name: "Search",
            dataset: String(size),
            result: formatMs(avg),
            metrics: [
              metric("avgLatencyMs", avg, formatMs(avg), "ms"),
              metric("p95Ms", p95, formatMs(p95), "ms"),
              metric("p99Ms", p99, formatMs(p99), "ms"),
              metric("minMs", samples[0] ?? null, formatMs(samples[0] ?? NaN), "ms"),
              metric(
                "maxMs",
                samples[samples.length - 1] ?? null,
                formatMs(samples[samples.length - 1] ?? NaN),
                "ms",
              ),
              metric(
                "tinybenchHz",
                tb?.hz ?? null,
                tb ? `${tb.hz.toFixed(2)} ops/sec` : "n/a",
                "ops/sec",
              ),
              metric(
                "tinybenchMeanMs",
                tb?.meanMs ?? null,
                tb ? formatMs(tb.meanMs) : "n/a",
                "ms",
              ),
            ],
            details: {
              iterations,
              queries,
              sampleCount: samples.length,
              samplesMs: samples,
              tinybenchP75Ms: tb?.p75Ms ?? null,
              tinybenchP99Ms: tb?.p99Ms ?? null,
            },
            notes: `Semantic search over ${size} memories with realistic queries`,
          }),
        );

        console.log(
          `    search ${size}: avg ${formatMs(avg)} | p95 ${formatMs(p95)} | p99 ${formatMs(p99)}`,
        );
      }

      return {
        rows,
        extraMarkdown: [
          "",
          "#### Search methodology",
          "",
          "- Shared on-disk corpus is built once per dataset size and reused across search / retrieval / filesize.",
          "- Each sample embeds the query then runs KNN via sqlite-vec through `recall()`.",
          `- Queries used: ${queries.map((q) => `\`${q}\``).join(", ")}`,
          "",
        ].join("\n"),
      };
    },
  );
}
