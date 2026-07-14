/**
 * Concurrent writer stress: throughput, failures, average latency.
 */

import type { BenchContext, BenchmarkSection } from "./types.ts";
import { generateMemory } from "./data-generator.ts";
import {
  concurrencyLevels,
  createClient,
  dbPathFor,
  ensureCleanDb,
  formatMs,
  formatOps,
  mean,
  metric,
  row,
  sectionWrapper,
  timed,
} from "./harness.ts";

export async function runConcurrencyBenchmark(
  ctx: BenchContext,
): Promise<BenchmarkSection> {
  return sectionWrapper(
    "concurrency",
    "Concurrency Benchmark",
    "Runs N concurrent AgentOrc.remember() writers against one client and measures throughput, failures, and average latency.",
    async () => {
      const levels = concurrencyLevels(ctx.scale);
      const writesPerWorker = ctx.scale === "quick" ? 5 : 10;
      const rows = [];

      for (const writers of levels) {
        const path = dbPathFor(ctx, `concurrency-${writers}`);
        ensureCleanDb(path);
        const client = await createClient(ctx, path);

        let failures = 0;
        const latencies: number[] = [];
        let nextSeed = writers * 1000;

        const { ms: totalMs } = await timed(async () => {
          const jobs = Array.from({ length: writers }, (_, workerId) =>
            (async () => {
              for (let i = 0; i < writesPerWorker; i += 1) {
                const seed = nextSeed++;
                const memory = generateMemory(seed + workerId * 17);
                const start = performance.now();
                try {
                  await client.remember({
                    agent: memory.agent,
                    content: { text: `${memory.text} [w${workerId}/${i}]` },
                    metadata: {
                      ...memory.metadata,
                      workerId,
                      writeIndex: i,
                    },
                  });
                  latencies.push(performance.now() - start);
                } catch (error) {
                  failures += 1;
                  latencies.push(performance.now() - start);
                  if (failures <= 3) {
                    console.warn(
                      `      writer failure: ${error instanceof Error ? error.message : String(error)}`,
                    );
                  }
                }
              }
            })(),
          );
          await Promise.all(jobs);
        });

        const totalOps = writers * writesPerWorker;
        const successes = totalOps - failures;
        const throughput = successes / (totalMs / 1000);
        const avgLatency = mean(latencies);
        const stats = await client.stats();
        await client.close();

        rows.push(
          row({
            category: "concurrency",
            name: "Concurrency",
            dataset: `${writers} writers`,
            result: formatOps(throughput),
            metrics: [
              metric("throughputOpsPerSec", throughput, formatOps(throughput), "ops/sec"),
              metric("failures", failures, String(failures)),
              metric("successes", successes, String(successes)),
              metric("avgLatencyMs", avgLatency, formatMs(avgLatency), "ms"),
              metric("totalTimeMs", totalMs, formatMs(totalMs), "ms"),
              metric("writers", writers, String(writers)),
              metric("writesPerWorker", writesPerWorker, String(writesPerWorker)),
              metric("storedMemories", stats.totalMemories, String(stats.totalMemories)),
            ],
            details: {
              note: "AgentOrc serializes writes via an internal AsyncMutex; concurrent callers measure queueing + work.",
              latencySamples: latencies.length,
            },
          }),
        );

        console.log(
          `    concurrency ${writers}: ${formatOps(throughput)} | failures ${failures} | avg ${formatMs(avgLatency)}`,
        );
      }

      return {
        rows,
        extraMarkdown: [
          "",
          "#### Concurrency methodology",
          "",
          `- Levels: ${levels.join(", ")} concurrent writers × ${writesPerWorker} writes each.`,
          "- All writers share one initialized `AgentOrc` instance.",
          "- Throughput counts successful `remember()` calls only.",
          "",
        ].join("\n"),
      };
    },
  );
}
