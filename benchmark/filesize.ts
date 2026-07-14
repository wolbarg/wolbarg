/**
 * On-disk SQLite database size after N memories.
 */

import type { BenchContext, BenchmarkSection } from "./types.ts";
import { ensureDataset } from "./datasets.ts";
import {
  createClient,
  fileSizeBytes,
  formatBytes,
  insertSizes,
  metric,
  row,
  sectionWrapper,
} from "./harness.ts";

export async function runFilesizeBenchmark(
  ctx: BenchContext,
): Promise<BenchmarkSection> {
  return sectionWrapper(
    "filesize",
    "Database Size Benchmark",
    "Measures SQLite file size (including WAL/SHM when present) after inserting 100 / 1k / 10k / 100k memories via the SDK.",
    async () => {
      const sizes = insertSizes(ctx.scale);
      const rows = [];

      for (const size of sizes) {
        const path = await ensureDataset(ctx, size);
        const client = await createClient(ctx, path);
        const stats = await client.stats();
        const sizeBeforeClose = fileSizeBytes(path);
        await client.close();
        const sizeAfterClose = fileSizeBytes(path);
        const bytesPerMemory = sizeAfterClose / size;

        rows.push(
          row({
            category: "filesize",
            name: "Database Size",
            dataset: String(size),
            result: formatBytes(sizeAfterClose),
            metrics: [
              metric(
                "sqliteBytes",
                sizeAfterClose,
                formatBytes(sizeAfterClose),
                "bytes",
              ),
              metric(
                "bytesBeforeClose",
                sizeBeforeClose,
                formatBytes(sizeBeforeClose),
                "bytes",
              ),
              metric(
                "bytesPerMemory",
                bytesPerMemory,
                formatBytes(bytesPerMemory),
                "bytes",
              ),
              metric(
                "statsDatabaseSizeBytes",
                stats.databaseSizeBytes,
                formatBytes(stats.databaseSizeBytes),
                "bytes",
              ),
              metric("memories", stats.totalMemories, String(stats.totalMemories)),
              metric(
                "embeddingDimensions",
                stats.embeddingDimensions,
                String(stats.embeddingDimensions),
              ),
            ],
            details: {
              path,
              includesWalShm: true,
              sharedCorpus: true,
            },
          }),
        );

        console.log(
          `    filesize ${size}: ${formatBytes(sizeAfterClose)} (${formatBytes(bytesPerMemory)}/memory)`,
        );
      }

      return {
        rows,
        extraMarkdown: [
          "",
          "#### Database size methodology",
          "",
          "- Uses the shared SDK-populated corpus for each dataset size.",
          "- Size includes main `.db` plus `-wal` / `-shm` if present.",
          "- Also records `stats().databaseSizeBytes` from the SDK.",
          "",
        ].join("\n"),
      };
    },
  );
}
