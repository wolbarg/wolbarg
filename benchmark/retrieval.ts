/**
 * Top-K retrieval latency across corpus sizes.
 */

import { Bench } from "tinybench";
import type { BenchContext, BenchmarkSection } from "./types.ts";
import { pickSearchQueries } from "./data-generator.ts";
import { openDataset } from "./datasets.ts";
import {
  formatMs,
  mean,
  metric,
  percentile,
  retrievalSizes,
  row,
  sectionWrapper,
  tinybenchStats,
} from "./harness.ts";

const TOP_K_VALUES = [5, 10, 20] as const;

export async function runRetrievalBenchmark(
  ctx: BenchContext,
): Promise<BenchmarkSection> {
  return sectionWrapper(
    "retrieval",
    "Retrieval Benchmark",
    "Benchmarks top-5 / top-10 / top-20 recall against 1k, 10k, and 100k memory corpora.",
    async () => {
      const sizes = retrievalSizes(ctx.scale);
      const rows = [];
      const queries = pickSearchQueries(8);

      for (const size of sizes) {
        const { client } = await openDataset(ctx, size);

        for (const topK of TOP_K_VALUES) {
          const samples: number[] = [];
          const iterations = ctx.scale === "quick" ? 6 : 15;

          for (let i = 0; i < iterations; i += 1) {
            const query = queries[i % queries.length]!;
            const start = performance.now();
            const hits = await client.recall({ query, topK });
            samples.push(performance.now() - start);
            if (hits.length === 0 && i === 0) {
              console.warn(`      warn: topK=${topK} returned 0 hits on first query`);
            }
          }

          samples.sort((a, b) => a - b);
          const avg = mean(samples);
          const p95 = percentile(samples, 95);
          const p99 = percentile(samples, 99);

          const bench = new Bench({
            name: `retrieval-${size}-top${topK}`,
            time: ctx.scale === "quick" ? 250 : 600,
            warmupTime: 80,
            iterations: 5,
          });

          let qi = 0;
          bench.add(
            `recall topK=${topK}`,
            async () => {
              await client.recall({
                query: queries[qi++ % queries.length]!,
                topK,
              });
            },
            { async: true },
          );
          await bench.run();
          const tb = tinybenchStats(bench.tasks[0]);

          rows.push(
            row({
              category: "retrieval",
              name: `Retrieval top-${topK}`,
              dataset: String(size),
              result: formatMs(avg),
              metrics: [
                metric("avgLatencyMs", avg, formatMs(avg), "ms"),
                metric("p95Ms", p95, formatMs(p95), "ms"),
                metric("p99Ms", p99, formatMs(p99), "ms"),
                metric("topK", topK, String(topK)),
                metric(
                  "tinybenchHz",
                  tb?.hz ?? null,
                  tb ? `${tb.hz.toFixed(2)} ops/sec` : "n/a",
                  "ops/sec",
                ),
              ],
              details: {
                iterations,
                samplesMs: samples,
                tinybenchMeanMs: tb?.meanMs ?? null,
                tinybenchP99Ms: tb?.p99Ms ?? null,
              },
            }),
          );

          console.log(
            `    retrieval ${size} top-${topK}: avg ${formatMs(avg)} | p95 ${formatMs(p95)}`,
          );
        }

        await client.close();
      }

      return {
        rows,
        extraMarkdown: [
          "",
          "#### Retrieval methodology",
          "",
          "- Reuses the shared corpus per dataset size; topK ∈ {5, 10, 20}.",
          "- Latency includes query embedding + vector KNN + row hydration.",
          "",
        ].join("\n"),
      };
    },
  );
}
