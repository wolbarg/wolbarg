/**
 * process.memoryUsage() snapshots across workload phases.
 */

import type { BenchContext, BenchmarkSection } from "./types.ts";
import {
  createClient,
  dbPathFor,
  ensureCleanDb,
  formatBytes,
  memorySnapshot,
  metric,
  populateDataset,
  row,
  sectionWrapper,
} from "./harness.ts";

function snapRow(
  phase: string,
  snap: ReturnType<typeof memorySnapshot>,
  extras?: Record<string, unknown>,
) {
  return row({
    category: "memory",
    name: "Memory Usage",
    dataset: phase,
    result: `heap ${formatBytes(snap.heapUsed)} / rss ${formatBytes(snap.rss)}`,
    metrics: [
      metric("heapUsed", snap.heapUsed, formatBytes(snap.heapUsed), "bytes"),
      metric("rss", snap.rss, formatBytes(snap.rss), "bytes"),
      metric("heapTotal", snap.heapTotal, formatBytes(snap.heapTotal), "bytes"),
      metric("external", snap.external, formatBytes(snap.external), "bytes"),
      metric(
        "arrayBuffers",
        snap.arrayBuffers,
        formatBytes(snap.arrayBuffers),
        "bytes",
      ),
    ],
    details: extras,
  });
}

export async function runMemoryBenchmark(
  ctx: BenchContext,
): Promise<BenchmarkSection> {
  return sectionWrapper(
    "memory",
    "Memory Usage Benchmark",
    "Reports Node.js process.memoryUsage() (heapUsed, rss, heapTotal) before/after init and after progressive inserts.",
    async () => {
      if (typeof global.gc === "function") {
        global.gc();
      }

      const path = dbPathFor(ctx, "memory-usage");
      ensureCleanDb(path);
      const rows = [];

      rows.push(snapRow("baseline (pre-init)", memorySnapshot()));

      const client = await createClient(ctx, path);
      rows.push(snapRow("after init", memorySnapshot()));

      const stages =
        ctx.scale === "quick"
          ? [100, 1_000]
          : [100, 1_000, 10_000];

      let inserted = 0;
      for (const target of stages) {
        const delta = target - inserted;
        await populateDataset(client, delta, { startSeed: 300_000 + inserted });
        inserted = target;
        if (typeof global.gc === "function") {
          global.gc();
        }
        rows.push(
          snapRow(`after ${target} inserts`, memorySnapshot(), {
            memories: target,
          }),
        );
        console.log(
          `    memory after ${target}: heapUsed ${formatBytes(memorySnapshot().heapUsed)} rss ${formatBytes(memorySnapshot().rss)}`,
        );
      }

      // One recall to capture post-search heap
      await client.recall({ query: "invoice refund roadmap deploy", topK: 10 });
      rows.push(snapRow("after recall", memorySnapshot()));

      await client.close();
      rows.push(snapRow("after close", memorySnapshot()));

      return {
        rows,
        extraMarkdown: [
          "",
          "#### Memory methodology",
          "",
          "- Uses `process.memoryUsage()` for heapUsed, rss, heapTotal, external, and arrayBuffers.",
          "- Optional `node --expose-gc` enables forced GC between stages for cleaner deltas.",
          "",
        ].join("\n"),
      };
    },
  );
}
