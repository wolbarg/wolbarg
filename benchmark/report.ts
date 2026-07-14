/**
 * JSON + Markdown report generation for the benchmark suite.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  BenchmarkSection,
  BenchmarkSuiteReport,
  BenchContext,
} from "./types.ts";
import { formatBytes, formatMs, runtimeInfo } from "./harness.ts";

const SUITE_VERSION = "1.0.0";

export function buildReport(
  ctx: BenchContext,
  sections: BenchmarkSection[],
  wallClockMs: number,
  sdkMeta: {
    embeddingModel: string;
    llmModel: string;
    embeddingDimensions: number;
  },
): BenchmarkSuiteReport {
  const summaryTable = sections.flatMap((section) =>
    section.rows.map((r) => ({
      benchmark: r.name,
      dataset: r.dataset,
      result: r.result,
    })),
  );

  return {
    generatedAt: new Date().toISOString(),
    suiteVersion: SUITE_VERSION,
    mode: ctx.mode,
    scale: ctx.scale,
    runtime: runtimeInfo(),
    sdk: {
      package: "agentorc",
      organization: ctx.organization,
      embeddingMode: ctx.mode === "mock" ? "local-mock-openai-compatible" : "live-api",
      embeddingModel: sdkMeta.embeddingModel,
      llmModel: sdkMeta.llmModel,
      embeddingDimensions: sdkMeta.embeddingDimensions,
    },
    sections,
    summaryTable,
    totals: {
      sections: sections.length,
      rows: sections.reduce((n, s) => n + s.rows.length, 0),
      wallClockMs,
    },
  };
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((r) => `| ${r.map((c) => escapeCell(c)).join(" | ")} |`)
    .join("\n");
  return `${head}\n${sep}\n${body}`;
}

export function renderMarkdown(report: BenchmarkSuiteReport): string {
  const lines: string[] = [];

  lines.push("# Agent ORC Benchmarks");
  lines.push("");
  lines.push(
    `Generated **${report.generatedAt}** · suite v${report.suiteVersion} · mode \`${report.mode}\` · scale \`${report.scale}\``,
  );
  lines.push("");
  lines.push("## Environment");
  lines.push("");
  lines.push(
    mdTable(
      ["Key", "Value"],
      [
        ["Node", report.runtime.node],
        ["Platform", `${report.runtime.platform}/${report.runtime.arch}`],
        ["CPUs", String(report.runtime.cpus)],
        ["Host RAM", formatBytes(report.runtime.totalMemBytes)],
        ["SDK", report.sdk.package],
        ["Organization", report.sdk.organization],
        ["Embedding mode", report.sdk.embeddingMode],
        ["Embedding model", report.sdk.embeddingModel],
        ["LLM model", report.sdk.llmModel],
        ["Embedding dims", String(report.sdk.embeddingDimensions)],
        ["Wall clock", formatMs(report.totals.wallClockMs)],
        ["Result rows", String(report.totals.rows)],
      ],
    ),
  );

  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(
    mdTable(
      ["Benchmark", "Dataset", "Result"],
      report.summaryTable.map((r) => [r.benchmark, r.dataset, r.result]),
    ),
  );

  lines.push("");
  lines.push("## Detailed Results");
  lines.push("");

  for (const section of report.sections) {
    lines.push(`### ${section.title}`);
    lines.push("");
    lines.push(section.description);
    lines.push("");
    lines.push(`_Section duration: ${formatMs(section.durationMs)}_`);
    lines.push("");

    lines.push(
      mdTable(
        ["Benchmark", "Dataset", "Result"],
        section.rows.map((r) => [r.name, r.dataset, r.result]),
      ),
    );
    lines.push("");

    lines.push("#### Metrics");
    lines.push("");
    for (const r of section.rows) {
      lines.push(`##### ${r.name} — ${r.dataset}`);
      lines.push("");
      if (r.notes) {
        lines.push(`> ${r.notes}`);
        lines.push("");
      }
      if (r.metrics.length > 0) {
        lines.push(
          mdTable(
            ["Metric", "Value"],
            r.metrics.map((m) => [m.name, m.display]),
          ),
        );
        lines.push("");
      }
      if (r.details && Object.keys(r.details).length > 0) {
        lines.push("<details>");
        lines.push(`<summary>Raw details (JSON)</summary>`);
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(r.details, null, 2));
        lines.push("```");
        lines.push("");
        lines.push("</details>");
        lines.push("");
      }
    }

    if (section.extraMarkdown) {
      lines.push(section.extraMarkdown);
    }
  }

  lines.push("## Notes");
  lines.push("");
  lines.push(
    "- This suite benchmarks the **Agent ORC SDK** (`remember`, `recall`, `compress`, `init`, concurrency, stats/size) — not raw SQLite micro-ops.",
  );
  lines.push(
    "- Default mode uses a local OpenAI-compatible mock so large corpora (10k / 100k) are measurable without API cost or rate limits; pass `--live` to use `.env` credentials.",
  );
  lines.push(
    "- Machine load, disk type, and embedding backend dominate absolute numbers; use relative comparisons across dataset sizes.",
  );
  lines.push("");

  return lines.join("\n");
}

export function writeReports(
  ctx: BenchContext,
  report: BenchmarkSuiteReport,
): { jsonPath: string; mdPath: string; benchmarksMdPath: string } {
  const jsonPath = join(ctx.resultsDir, "benchmark.json");
  const mdPath = join(ctx.resultsDir, "benchmark.md");
  const benchmarksMdPath = join(ctx.resultsDir, "Benchmarks.md");
  const rootBenchmarksMd = join(process.cwd(), "Benchmarks.md");

  const markdown = renderMarkdown(report);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(mdPath, markdown, "utf8");
  writeFileSync(benchmarksMdPath, markdown, "utf8");
  writeFileSync(rootBenchmarksMd, markdown, "utf8");

  return { jsonPath, mdPath, benchmarksMdPath };
}
