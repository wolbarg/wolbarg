/**
 * Retest only previously skipped fixture ingest steps:
 *   - fixtures/sample.pdf
 *   - fixtures/sample.docx
 * on both sqlite and postgres.
 */

import fs from "node:fs";
import path from "node:path";
import { loadConfig, type BackendName } from "./config.js";
import { createClientForBackend } from "./client.js";
import { ScenarioRunner } from "./scenarios/runner.js";

async function runSkippedForBackend(
  backend: BackendName,
  runner: ScenarioRunner,
): Promise<void> {
  const config = loadConfig();
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Retest skipped: ${backend.toUpperCase().padEnd(27)}║`);
  console.log(`╚══════════════════════════════════════════════╝`);

  const handle = await createClientForBackend(config, backend);
  const memory = handle.memory;
  const prefix = (name: string) => `[${backend}] ${name}`;

  try {
    await memory.clear({ confirm: true });

    const pdfPath = path.join(config.fixturesDir, "sample.pdf");
    if (!fs.existsSync(pdfPath)) {
      runner.skip(prefix("ingest() fixtures/sample.pdf"), "missing fixtures/sample.pdf");
    } else {
      await runner.step(prefix("ingest() fixtures/sample.pdf"), async () => {
        const result = await memory.ingest({
          agent: "docs",
          source: { path: pdfPath },
          chunking: { strategy: "paragraph", chunkSize: 800, overlap: 80 },
        });
        runner.assert(result.chunkCount >= 1, "pdf produced no chunks");
        runner.assert(result.extractedChars > 0, "pdf extracted empty text");
      });
    }

    const docxPath = path.join(config.fixturesDir, "sample.docx");
    if (!fs.existsSync(docxPath)) {
      runner.skip(
        prefix("ingest() fixtures/sample.docx"),
        "missing fixtures/sample.docx",
      );
    } else {
      await runner.step(prefix("ingest() fixtures/sample.docx"), async () => {
        try {
          const result = await memory.ingest({
            agent: "docs",
            source: { path: docxPath },
          });
          runner.assert(result.chunkCount >= 1, "docx produced no chunks");
          runner.assert(result.extractedChars > 0, "docx extracted empty text");
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.includes("mammoth")) {
            throw new Error(`${msg} — run: npm install mammoth`);
          }
          throw error;
        }
      });
    }
  } finally {
    if (memory.isInitialized) {
      await memory.clear({ confirm: true }).catch(() => undefined);
      await memory.close().catch(() => undefined);
    }
  }
}

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  Retest previously skipped PDF + DOCX steps  ║");
  console.log("╚══════════════════════════════════════════════╝");

  const config = loadConfig();
  const runner = new ScenarioRunner();

  for (const backend of config.backends) {
    if (backend === "postgres" && !config.postgresUrl) {
      runner.skip(`[postgres] entire backend`, "DATABASE_URL not set");
      continue;
    }
    await runSkippedForBackend(backend, runner);
  }

  const { passed, failed, skipped, results } = runner.summary();
  console.log("\n══════════════════════════════════════════");
  console.log(
    `Results: ${passed} passed, ${failed} failed, ${skipped} skipped, ${results.length} total`,
  );
  console.log("══════════════════════════════════════════");

  for (const backend of config.backends) {
    const related = results.filter((r) => r.name.startsWith(`[${backend}]`));
    const p = related.filter((r) => r.status === "pass").length;
    const f = related.filter((r) => r.status === "fail").length;
    const s = related.filter((r) => r.status === "skip").length;
    console.log(`  ${backend.padEnd(10)} pass=${p} fail=${f} skip=${s}`);
  }

  const logsDir = path.resolve(process.cwd(), "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsPath = path.join(logsDir, `results-skipped-retest-${stamp}.json`);
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        focus: ["sample.pdf", "sample.docx"],
        backends: config.backends,
        summary: { passed, failed, skipped, total: results.length },
        steps: results,
      },
      null,
      2,
    ),
  );
  console.log(`\nSaved results JSON: ${resultsPath}`);

  if (failed > 0) {
    console.log("\nFailed steps:");
    for (const step of results.filter((r) => r.status === "fail")) {
      console.log(`  ✗ ${step.name}`);
      console.log(`    ${step.detail}`);
    }
    process.exitCode = 1;
  } else if (skipped > 0) {
    console.log("\nSome steps still skipped — check fixtures.");
    process.exitCode = 1;
  } else {
    console.log("\nAll previously skipped steps passed.");
  }
}

main().catch((error) => {
  console.error("\nFatal error:");
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
