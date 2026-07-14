/**
 * Cold and warm startup / initialization timing.
 */

import { existsSync } from "node:fs";
import { Bench } from "tinybench";
import { AgentOrc } from "agentorc";
import type { BenchContext, BenchmarkSection } from "./types.ts";
import {
  createInitOptions,
  dbPathFor,
  ensureCleanDb,
  formatMs,
  mean,
  metric,
  populateDataset,
  row,
  sectionWrapper,
  timed,
  tinybenchStats,
} from "./harness.ts";

export async function runStartupBenchmark(
  ctx: BenchContext,
): Promise<BenchmarkSection> {
  return sectionWrapper(
    "startup",
    "Startup Benchmark",
    "Measures cold vs warm AgentOrc initialization time (database open, WAL, vector schema, embedding/LLM health probes).",
    async () => {
      const coldPath = dbPathFor(ctx, "startup-cold");
      const warmPath = dbPathFor(ctx, "startup-warm");
      ensureCleanDb(coldPath);
      ensureCleanDb(warmPath);

      // Seed warm DB once so subsequent inits hit an existing schema + data
      {
        const seed = new AgentOrc();
        await seed.init(createInitOptions(ctx, warmPath));
        await populateDataset(seed, ctx.scale === "quick" ? 50 : 200, {
          startSeed: 200_000,
        });
        await seed.close();
      }

      const coldSamples: number[] = [];
      const warmSamples: number[] = [];
      const iterations = ctx.scale === "quick" ? 3 : 5;

      for (let i = 0; i < iterations; i += 1) {
        // Cold: brand-new empty DB file each iteration
        const path = dbPathFor(ctx, `startup-cold-${i}`);
        ensureCleanDb(path);
        const coldClient = new AgentOrc();
        const { ms: coldMs } = await timed(() =>
          coldClient.init(createInitOptions(ctx, path)),
        );
        coldSamples.push(coldMs);
        await coldClient.close();

        // Warm: reopen existing populated DB
        const warmClient = new AgentOrc();
        const { ms: warmMs } = await timed(() =>
          warmClient.init(createInitOptions(ctx, warmPath)),
        );
        warmSamples.push(warmMs);
        await warmClient.close();
      }

      coldSamples.sort((a, b) => a - b);
      warmSamples.sort((a, b) => a - b);

      const coldAvg = mean(coldSamples);
      const warmAvg = mean(warmSamples);

      const bench = new Bench({
        name: "startup-tinybench",
        time: ctx.scale === "quick" ? 400 : 1000,
        warmupTime: 100,
        iterations: 3,
      });

      bench.add(
        "warm init()",
        async () => {
          const client = new AgentOrc();
          await client.init(createInitOptions(ctx, warmPath));
          await client.close();
        },
        { async: true },
      );
      await bench.run();
      const tb = tinybenchStats(bench.tasks[0]);

      const rows = [
        row({
          category: "startup",
          name: "Startup",
          dataset: "Cold",
          result: formatMs(coldAvg),
          metrics: [
            metric("avgInitMs", coldAvg, formatMs(coldAvg), "ms"),
            metric("minMs", coldSamples[0]!, formatMs(coldSamples[0]!), "ms"),
            metric(
              "maxMs",
              coldSamples[coldSamples.length - 1]!,
              formatMs(coldSamples[coldSamples.length - 1]!),
              "ms",
            ),
            metric("iterations", iterations, String(iterations)),
          ],
          details: {
            samplesMs: coldSamples,
            definition:
              "New AgentOrc instance + init() against a freshly created empty SQLite file each iteration",
          },
        }),
        row({
          category: "startup",
          name: "Startup",
          dataset: "Warm",
          result: formatMs(warmAvg),
          metrics: [
            metric("avgInitMs", warmAvg, formatMs(warmAvg), "ms"),
            metric("minMs", warmSamples[0]!, formatMs(warmSamples[0]!), "ms"),
            metric(
              "maxMs",
              warmSamples[warmSamples.length - 1]!,
              formatMs(warmSamples[warmSamples.length - 1]!),
              "ms",
            ),
            metric("iterations", iterations, String(iterations)),
            metric(
              "tinybenchHz",
              tb?.hz ?? null,
              tb ? `${tb.hz.toFixed(2)} ops/sec` : "n/a",
            ),
            metric(
              "tinybenchMeanMs",
              tb?.meanMs ?? null,
              tb ? formatMs(tb.meanMs) : "n/a",
              "ms",
            ),
          ],
          details: {
            samplesMs: warmSamples,
            dbExists: existsSync(warmPath),
            definition:
              "New AgentOrc instance + init() reopening an existing populated database",
          },
        }),
      ];

      console.log(
        `    startup cold avg ${formatMs(coldAvg)} | warm avg ${formatMs(warmAvg)}`,
      );

      return {
        rows,
        extraMarkdown: [
          "",
          "#### Startup methodology",
          "",
          "- **Cold**: empty DB created per iteration — migrations + vector schema + provider probes.",
          "- **Warm**: reopen existing DB with data already present.",
          "- Both paths include embedding and LLM `validate()` probes via the configured provider.",
          "",
        ].join("\n"),
      };
    },
  );
}
