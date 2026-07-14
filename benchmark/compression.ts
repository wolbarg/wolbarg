/**
 * Compression duration, ratio, and storage savings.
 */

import type { BenchContext, BenchmarkSection } from "./types.ts";
import {
  createClient,
  dbPathFor,
  ensureCleanDb,
  fileSizeBytes,
  formatBytes,
  formatMs,
  formatPct,
  metric,
  populateDataset,
  row,
  sectionWrapper,
  timed,
} from "./harness.ts";

export async function runCompressionBenchmark(
  ctx: BenchContext,
): Promise<BenchmarkSection> {
  return sectionWrapper(
    "compression",
    "Compression Benchmark",
    "Measures AgentOrc.compress() duration, compression ratio, memory counts before/after, and on-disk storage saved.",
    async () => {
      const corpusSizes =
        ctx.scale === "quick" ? [50, 200] : [50, 200, 500, 1000];
      const rows = [];

      for (const size of corpusSizes) {
        const path = dbPathFor(ctx, `compression-${size}`);
        ensureCleanDb(path);
        const client = await createClient(ctx, path);

        const agent = "engineering";
        await populateDataset(client, size, {
          startSeed: 120_000,
          agentOverride: agent,
        });

        const beforeStats = await client.stats();
        const beforeBytes = fileSizeBytes(path);
        const beforeMemories = beforeStats.totalMemories;

        // compress() defaults to limit 50; pass a higher limit for larger corpora
        const limit = Math.min(size, ctx.mode === "live" ? 40 : Math.min(size, 200));

        const { result, ms } = await timed(() =>
          client.compress({ agent, limit }),
        );

        const afterStats = await client.stats();
        const afterBytes = fileSizeBytes(path);
        const afterActiveEstimate =
          beforeMemories - result.archivedIds.length + 1; // archived remain in DB
        const memoriesAfterTotal = afterStats.totalMemories;
        const archivedCount = result.archivedIds.length;
        const compressionRatio =
          archivedCount > 0 ? 1 / (archivedCount + 1) : Number.NaN;
        // Active working-set reduction (archived still occupy storage)
        const activeReduction =
          archivedCount > 0 ? archivedCount / (archivedCount + 1) : 0;
        const storageDelta = beforeBytes - afterBytes;
        const storageSaved = Math.max(0, storageDelta);

        await client.close();

        rows.push(
          row({
            category: "compression",
            name: "Compression",
            dataset: String(size),
            result: `${formatPct(activeReduction)} reduction`,
            metrics: [
              metric("compressionDurationMs", ms, formatMs(ms), "ms"),
              metric(
                "activeSetReduction",
                activeReduction,
                formatPct(activeReduction),
                "ratio",
              ),
              metric(
                "compressionRatio",
                compressionRatio,
                Number.isFinite(compressionRatio)
                  ? compressionRatio.toFixed(4)
                  : "n/a",
              ),
              metric("memoriesBefore", beforeMemories, String(beforeMemories)),
              metric(
                "memoriesAfterTotal",
                memoriesAfterTotal,
                String(memoriesAfterTotal),
              ),
              metric(
                "activeAfterEstimate",
                afterActiveEstimate,
                String(afterActiveEstimate),
              ),
              metric("archivedCount", archivedCount, String(archivedCount)),
              metric(
                "storageBeforeBytes",
                beforeBytes,
                formatBytes(beforeBytes),
                "bytes",
              ),
              metric(
                "storageAfterBytes",
                afterBytes,
                formatBytes(afterBytes),
                "bytes",
              ),
              metric(
                "storageSavedBytes",
                storageSaved,
                formatBytes(storageSaved),
                "bytes",
              ),
              metric(
                "storageDeltaBytes",
                storageDelta,
                `${storageDelta >= 0 ? "-" : "+"}${formatBytes(Math.abs(storageDelta))}`,
                "bytes",
              ),
            ],
            details: {
              limit,
              summaryPreview: result.summary.content.text.slice(0, 240),
              summaryId: result.summary.id,
              archivedIdsSample: result.archivedIds.slice(0, 10),
              note:
                "Archived source memories remain on disk with lineage; total row count typically increases by 1 (summary).",
            },
            notes:
              "Reduction refers to active working-set (archived / (archived + summary)). Disk may grow slightly when a summary is added.",
          }),
        );

        console.log(
          `    compression ${size}: ${formatMs(ms)} | archived ${archivedCount} | active reduction ${formatPct(activeReduction)}`,
        );
      }

      return {
        rows,
        extraMarkdown: [
          "",
          "#### Compression methodology",
          "",
          "- Populates one agent with N memories, then calls `compress({ agent, limit })`.",
          "- **Active-set reduction** = archived / (archived + 1 summary).",
          "- Source memories are archived (not deleted), so total DB rows usually grow by one summary row.",
          "- Storage saved may be 0 or negative because archival retains rows and adds a summary.",
          "",
        ].join("\n"),
      };
    },
  );
}
