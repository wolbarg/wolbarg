/**
 * Insert throughput / latency benchmarks across dataset sizes.
 */

import { Bench } from "tinybench";
import type { BenchContext, BenchmarkSection } from "./types.ts";
import { generateMemory } from "./data-generator.ts";
import {
  createClient,
  dbPathFor,
  ensureCleanDb,
  formatMs,
  formatOps,
  insertSizes,
  metric,
  row,
  sectionWrapper,
  timed,
  tinybenchStats,
} from "./harness.ts";

export async function runInsertBenchmark(
  ctx: BenchContext,
): Promise<BenchmarkSection> {
  return sectionWrapper(
    "insert",
    "Insert Benchmark",
    "Measures AgentOrc.remember() total time, throughput, and average latency while inserting N realistic memories through the full SDK path (embed → persist → vector index).",
    async () => {
      const sizes = insertSizes(ctx.scale);
      const rows = [];

      for (const size of sizes) {
        const path = dbPathFor(ctx, `insert-${size}`);
        ensureCleanDb(path);
        const client = await createClient(ctx, path);

        let seed = 1;
        const { ms: totalMs } = await timed(async () => {
          for (let i = 0; i < size; i += 1) {
            const memory = generateMemory(seed++);
            await client.remember({
              agent: memory.agent,
              content: { text: memory.text },
              metadata: memory.metadata,
            });
          }
        });

        const opsPerSec = size / (totalMs / 1000);
        const avgLatencyMs = totalMs / size;

        // Tinybench micro-sample of single-insert latency on the warm DB
        const micro = new Bench({
          name: `insert-micro-${size}`,
          time: ctx.scale === "quick" ? 200 : 500,
          warmupTime: 50,
          iterations: 5,
        });

        let microSeed = size + 10_000;
        micro.add(
          "single remember()",
          async () => {
            const memory = generateMemory(microSeed++);
            await client.remember({
              agent: memory.agent,
              content: { text: memory.text },
              metadata: memory.metadata,
            });
          },
          { async: true },
        );
        await micro.run();
        const tb = tinybenchStats(micro.tasks[0]);

        const stats = await client.stats();
        await client.close();

        rows.push(
          row({
            category: "insert",
            name: "Insert",
            dataset: String(size),
            result: formatOps(opsPerSec),
            metrics: [
              metric("totalTimeMs", totalMs, formatMs(totalMs), "ms"),
              metric("opsPerSec", opsPerSec, formatOps(opsPerSec), "ops/sec"),
              metric("avgLatencyMs", avgLatencyMs, formatMs(avgLatencyMs), "ms"),
              metric(
                "tinybenchHz",
                tb?.hz ?? null,
                tb ? formatOps(tb.hz) : "n/a",
                "ops/sec",
              ),
              metric(
                "tinybenchMeanMs",
                tb?.meanMs ?? null,
                tb ? formatMs(tb.meanMs) : "n/a",
                "ms",
              ),
              metric(
                "tinybenchP99Ms",
                tb?.p99Ms ?? null,
                tb ? formatMs(tb.p99Ms) : "n/a",
                "ms",
              ),
              metric("memoriesStored", stats.totalMemories, String(stats.totalMemories)),
            ],
            details: {
              databasePath: path,
              databaseSizeBytes: stats.databaseSizeBytes,
              tinybenchSamples: tb?.samples ?? 0,
              tinybenchRme: tb?.rme ?? null,
            },
            notes: `Batch insert of ${size} memories via AgentOrc.remember()`,
          }),
        );

        console.log(
          `    insert ${size}: ${formatOps(opsPerSec)} | avg ${formatMs(avgLatencyMs)} | total ${formatMs(totalMs)}`,
        );
      }

      return {
        rows,
        extraMarkdown: [
          "",
          "#### Insert methodology",
          "",
          "- Each dataset size uses a fresh SQLite file.",
          "- Total time measures a sequential batch of `remember()` calls (full SDK: embedding + ACID write + vector index).",
          "- Tinybench additionally samples single-insert latency on the warm database after the batch.",
          "",
        ].join("\n"),
      };
    },
  );
}
