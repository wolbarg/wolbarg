/**
 * AgentOrc v0.2 — dual-backend full API harness.
 *
 * Runs the same exhaustive suite against:
 *   1. SQLite
 *   2. PostgreSQL (when DATABASE_URL is set)
 *
 * Covers every public method:
 *   ready, remember, recall (semantic/hybrid/filters/MMR/rerank),
 *   ingest, compress, forget, history, stats, clear, close
 *
 * Do not run until credentials + (optional) DATABASE_URL are ready.
 *
 *   cp .env.example .env
 *   npm install
 *   npm start
 */

import fs from "node:fs";
import path from "node:path";
import { loadConfig, type BackendName } from "./config.js";
import { createClientForBackend } from "./client.js";
import { ScenarioRunner } from "./scenarios/runner.js";
import { runFullApiSuite } from "./scenarios/full-api.js";

async function runBackend(
  backend: BackendName,
  runner: ScenarioRunner,
): Promise<void> {
  const config = loadConfig();

  if (backend === "postgres" && !config.postgresUrl) {
    if (config.requirePostgres) {
      throw new Error(
        "REQUIRE_POSTGRES=true but DATABASE_URL is missing.",
      );
    }
    runner.skip(
      `[postgres] entire backend`,
      "set DATABASE_URL to enable Postgres tests (and npm install pg)",
    );
    return;
  }

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  Backend: ${backend.toUpperCase().padEnd(36)}║`);
  console.log(`╚══════════════════════════════════════════════╝`);

  const handle = await createClientForBackend(config, backend);
  console.log(`  organization : ${config.organization}-${backend}`);
  console.log(
    `  storage      : ${
      backend === "sqlite" ? config.sqlitePath : "(DATABASE_URL)"
    }`,
  );
  console.log(
    `  openai       : embeddings=${config.embeddingModel}, llm=${config.llmModel}, vision=${config.visionModel}, rerank=${config.rerankModel}`,
  );
  console.log(`  base URL     : ${config.openaiBaseUrl}`);

  try {
    await runFullApiSuite({
      memory: handle.memory,
      backend,
      config,
      runner,
    });

    // close / reopen continuity
    await runner.step(`[${backend}] close()`, async () => {
      await handle.memory.close();
      runner.assert(
        handle.memory.isInitialized === false,
        "expected isInitialized=false after close",
      );
    });

    await runner.step(`[${backend}] reopen + recall persisted data`, async () => {
      const reopened = await createClientForBackend(config, backend);
      try {
        // smoke memory was written before close in full-api suite
        const hits = await reopened.memory.recall({
          query: "Post-clear smoke memory",
          topK: 5,
          threshold: 0.05,
          filter: { agent: "smoke" },
        });
        runner.assert(hits.length > 0, "persisted smoke memory not found after reopen");
        await reopened.memory.clear({ confirm: true });
      } finally {
        await reopened.memory.close();
      }
    });
  } catch (error) {
    // Ensure connection released on unexpected throw mid-suite
    if (handle.memory.isInitialized) {
      await handle.memory.close().catch(() => undefined);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  AgentOrc v0.2 — SQLite + Postgres API tests ║");
  console.log("╚══════════════════════════════════════════════╝");

  const config = loadConfig();
  fs.mkdirSync(path.dirname(config.sqlitePath), { recursive: true });
  fs.mkdirSync(config.fixturesDir, { recursive: true });

  console.log("\nPlan:");
  console.log(`  backends     : ${config.backends.join(", ")}`);
  console.log(`  fixtures     : ${config.fixturesDir}`);
  console.log(
    `  postgres URL : ${config.postgresUrl ? "(set)" : "(not set — will skip)"}`,
  );

  const runner = new ScenarioRunner();

  for (const backend of config.backends) {
    await runBackend(backend, runner);
  }

  const { passed, failed, skipped, results } = runner.summary();
  console.log("\n══════════════════════════════════════════");
  console.log(
    `Results: ${passed} passed, ${failed} failed, ${skipped} skipped, ${results.length} total`,
  );
  console.log("══════════════════════════════════════════");

  const rollup: Record<string, { pass: number; fail: number; skip: number }> =
    {};
  for (const backend of config.backends) {
    const related = results.filter((r) => r.name.startsWith(`[${backend}]`));
    const p = related.filter((r) => r.status === "pass").length;
    const f = related.filter((r) => r.status === "fail").length;
    const s = related.filter((r) => r.status === "skip").length;
    rollup[backend] = { pass: p, fail: f, skip: s };
    console.log(`  ${backend.padEnd(10)} pass=${p} fail=${f} skip=${s}`);
  }

  const logsDir = path.resolve(process.cwd(), "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsPath = path.join(logsDir, `results-${stamp}.json`);
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        backends: config.backends,
        summary: { passed, failed, skipped, total: results.length },
        byBackend: rollup,
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
  } else {
    console.log("\nAll executed steps passed.");
  }
}

main().catch((error) => {
  console.error("\nFatal error:");
  console.error(
    error instanceof Error ? (error.stack ?? error.message) : error,
  );
  process.exitCode = 1;
});
