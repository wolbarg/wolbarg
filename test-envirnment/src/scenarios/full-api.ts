import fs from "node:fs";
import path from "node:path";
import { meta, type AgentOrc, type RecallResult } from "agentorc";
import type { AppConfig } from "../config.js";
import type { BackendName } from "../config.js";
import { ScenarioRunner } from "./runner.js";

/**
 * Exhaustive API matrix — every public AgentOrc method / option path.
 * Run once per backend (sqlite and postgres).
 */
export async function runFullApiSuite(options: {
  memory: AgentOrc;
  backend: BackendName;
  config: AppConfig;
  runner: ScenarioRunner;
}): Promise<void> {
  const { memory, backend, config, runner } = options;
  const tag = backend;

  const prefix = (name: string) => `[${tag}] ${name}`;

  // ── lifecycle ──────────────────────────────────────────────────────────
  await runner.step(prefix("isInitialized is true after ready()"), async () => {
    runner.assert(memory.isInitialized === true, "expected initialized");
  });

  await runner.step(prefix("ready() is idempotent"), async () => {
    await memory.ready();
    runner.assert(memory.isInitialized, "still initialized");
  });

  await runner.step(prefix("clear() empty org"), async () => {
    const n = await memory.clear({ confirm: true });
    runner.assert(typeof n === "number", "clear must return number");
    const stats = await memory.stats();
    runner.assert(stats.totalMemories === 0, `expected 0 memories, got ${stats.totalMemories}`);
  });

  // ── remember ───────────────────────────────────────────────────────────
  let idA = "";
  let idB = "";
  let idC = "";

  await runner.step(prefix("remember() basic"), async () => {
    const record = await memory.remember({
      agent: "agentA",
      content: { text: "Stripe supports recurring invoices billed monthly." },
      metadata: { topic: "billing", source: "docs", priority: 2 },
    });
    idA = record.id;
    runner.assert(!!record.id, "missing id");
    runner.assert(record.agent === "agentA", "agent mismatch");
    runner.assert(record.content.text.includes("Stripe"), "text mismatch");
    runner.assert(record.metadata.topic === "billing", "metadata lost");
    runner.assert(record.archived === false, "should not be archived");
    runner.assert(record.organization.includes(backend), "org should include backend");
  });

  await runner.step(prefix("remember() second agent"), async () => {
    const record = await memory.remember({
      agent: "agentB",
      content: {
        text: "Acme Corp raised Series B at a $50M valuation in 2024.",
      },
      metadata: { topic: "funding", company: "Acme", priority: 1 },
    });
    idB = record.id;
    runner.assert(record.agent === "agentB", "agentB mismatch");
  });

  await runner.step(prefix("remember() lexical fox fact"), async () => {
    const record = await memory.remember({
      agent: "agentA",
      content: {
        text: "The quick brown fox jumps over the lazy dog near the riverbank.",
      },
      metadata: { topic: "animals", tag: "fox" },
    });
    idC = record.id;
    runner.assert(!!idC, "missing fox id");
  });

  await runner.step(prefix("remember() rejects empty text"), async () => {
    let threw = false;
    try {
      await memory.remember({
        agent: "agentA",
        content: { text: "   " },
      });
    } catch {
      threw = true;
    }
    runner.assert(threw, "expected validation error for empty text");
  });

  // ── recall (semantic) ──────────────────────────────────────────────────
  await runner.step(prefix("recall() semantic"), async () => {
    const hits = await memory.recall({
      query: "How do recurring invoices work?",
      topK: 5,
      threshold: 0.05,
    });
    runner.assert(hits.length > 0, "no semantic hits");
    runner.assert(
      typeof hits[0]!.similarity === "number",
      "missing similarity",
    );
    runner.assert(hits[0]!.similarity >= 0, "similarity out of range");
  });

  await runner.step(prefix("recall() agent filter"), async () => {
    const hits = await memory.recall({
      query: "invoices subscriptions",
      topK: 10,
      threshold: 0.05,
      filter: { agent: "agentA" },
    });
    runner.assert(hits.length > 0, "no agentA hits");
    runner.assert(
      hits.every((h: RecallResult) => h.agent === "agentA"),
      "agent filter leaked",
    );
  });

  await runner.step(prefix("recall() threshold filters weak hits"), async () => {
    const loose = await memory.recall({
      query: "recurring invoices",
      topK: 10,
      threshold: 0,
    });
    const strict = await memory.recall({
      query: "recurring invoices",
      topK: 10,
      threshold: 0.99,
    });
    runner.assert(loose.length >= strict.length, "threshold should reduce or equal hits");
  });

  // ── recall (hybrid + metadata + mmr + rerank) ──────────────────────────
  await runner.step(prefix("recall() hybrid BM25"), async () => {
    const hits = await memory.recall({
      query: "quick brown fox",
      topK: 5,
      hybrid: true,
      filter: { agent: "agentA" },
    });
    runner.assert(hits.length > 0, "no hybrid hits");
    runner.assert(
      hits.some((h) => h.content.text.toLowerCase().includes("fox")),
      "hybrid missed fox memory",
    );
  });

  await runner.step(prefix("recall() hybrid weights"), async () => {
    const hits = await memory.recall({
      query: "fox riverbank",
      topK: 5,
      hybrid: { semanticWeight: 0.5, keywordWeight: 0.5 },
    });
    runner.assert(hits.length > 0, "weighted hybrid empty");
  });

  await runner.step(prefix("recall() metadata eq filter"), async () => {
    const hits = await memory.recall({
      query: "billing invoices",
      topK: 10,
      filter: {
        metadata: meta.eq("topic", "billing"),
      },
    });
    runner.assert(hits.length >= 1, "metadata eq empty");
    runner.assert(
      hits.every((h) => h.metadata.topic === "billing"),
      "metadata eq leaked",
    );
  });

  await runner.step(prefix("recall() metadata and/or/gte"), async () => {
    const hits = await memory.recall({
      query: "company valuation",
      topK: 10,
      filter: {
        metadata: meta.and(
          meta.or(meta.eq("topic", "funding"), meta.eq("topic", "billing")),
          meta.gte("priority", 1),
        ),
      },
    });
    runner.assert(hits.length >= 1, "compound metadata empty");
  });

  await runner.step(prefix("recall() MMR"), async () => {
    const hits = await memory.recall({
      query: "facts about companies and animals",
      topK: 3,
      mmr: { lambda: 0.55 },
    });
    runner.assert(hits.length > 0, "mmr empty");
  });

  await runner.step(prefix("recall() rerank flag (graceful)"), async () => {
    const hits = await memory.recall({
      query: "lazy dog riverbank",
      topK: 3,
      rerank: true,
    });
    runner.assert(hits.length > 0, "rerank path empty");
  });

  // ── history ────────────────────────────────────────────────────────────
  await runner.step(prefix("history() created event"), async () => {
    const hist = await memory.history({ id: idA });
    runner.assert(hist.memory.id === idA, "history memory mismatch");
    runner.assert(
      hist.events.some((e) => e.eventType === "created"),
      "missing created event",
    );
  });

  await runner.step(prefix("history() missing id throws"), async () => {
    let threw = false;
    try {
      await memory.history({ id: "00000000-0000-4000-8000-000000000000" });
    } catch {
      threw = true;
    }
    runner.assert(threw, "expected MemoryNotFoundError");
  });

  // ── stats ──────────────────────────────────────────────────────────────
  await runner.step(prefix("stats()"), async () => {
    const stats = await memory.stats();
    runner.assert(stats.totalMemories >= 3, `expected ≥3 memories, got ${stats.totalMemories}`);
    runner.assert(stats.totalAgents >= 2, "expected ≥2 agents");
    runner.assert(stats.embeddingDimensions > 0, "dims missing");
    runner.assert(typeof stats.embeddingModel === "string", "model missing");
    runner.assert(stats.organization.includes(backend), "org backend tag missing");
    runner.assert(stats.llmModel !== null, "llmModel should be set (OpenAI demo)");
  });

  // ── ingest ─────────────────────────────────────────────────────────────
  await runner.step(prefix("ingest() inline markdown"), async () => {
    const result = await memory.ingest({
      agent: "docs",
      source: {
        text: `# Pricing\n\nWidgets cost $10.\n\n## Support\n\nEmail help@example.com.`,
        filename: "pricing.md",
      },
      chunking: { strategy: "markdown", chunkSize: 240, overlap: 20 },
      metadata: { collection: "inline" },
    });
    runner.assert(result.chunkCount >= 1, "expected chunks");
    runner.assert(result.memories.length === result.chunkCount, "count mismatch");
    runner.assert(result.extractedChars > 0, "empty extraction");
    runner.assert(result.usedOcr === false, "ocr should be false for text");
  });

  await runner.step(prefix("ingest() json"), async () => {
    const result = await memory.ingest({
      agent: "docs",
      source: {
        text: JSON.stringify({ sku: "GZ-1", price: 42, name: "Gizmo" }),
        filename: "product.json",
      },
      chunking: { strategy: "fixed", chunkSize: 500, overlap: 0 },
    });
    runner.assert(result.chunkCount >= 1, "json ingest failed");
  });

  const mdPath = path.join(config.fixturesDir, "sample.md");
  if (fs.existsSync(mdPath)) {
    await runner.step(prefix("ingest() fixtures/sample.md"), async () => {
      const result = await memory.ingest({
        agent: "docs",
        source: { path: mdPath },
        chunking: { strategy: "markdown" },
      });
      runner.assert(result.chunkCount >= 1, "md fixture failed");
    });
  } else {
    runner.skip(prefix("ingest() fixtures/sample.md"), "missing fixtures/sample.md");
  }

  const txtPath = path.join(config.fixturesDir, "sample.txt");
  if (fs.existsSync(txtPath)) {
    await runner.step(prefix("ingest() fixtures/sample.txt"), async () => {
      const result = await memory.ingest({
        agent: "docs",
        source: { path: txtPath },
        chunking: { strategy: "sentence" },
      });
      runner.assert(result.chunkCount >= 1, "txt fixture failed");
    });
  } else {
    runner.skip(prefix("ingest() fixtures/sample.txt"), "missing fixtures/sample.txt");
  }

  const pdfCandidates = [
    path.join(config.fixturesDir, "sample.pdf"),
    path.join(config.fixturesDir, "sample-text.pdf"),
  ].filter((p) => fs.existsSync(p));

  if (pdfCandidates.length === 0) {
    runner.skip(prefix("ingest() PDF"), "add fixtures/sample.pdf");
  } else {
    let ingestedPdf = false;
    for (const pdfFile of pdfCandidates) {
      const label = path.basename(pdfFile);
      // Probe extractability without failing the suite on scan-only PDFs.
      let extractable = true;
      try {
        const mod = await import("pdf-parse");
        const pdfParse =
          (mod as { default?: (buf: Buffer) => Promise<{ text: string }> }).default ??
          (mod as unknown as (buf: Buffer) => Promise<{ text: string }>);
        const probed = await pdfParse(fs.readFileSync(pdfFile));
        extractable = (probed.text ?? "").trim().length > 0;
      } catch {
        extractable = true; // let ingest surface the real error
      }

      if (!extractable) {
        runner.skip(
          prefix(`ingest() fixtures/${label}`),
          "no text layer (scan/image PDF) — trying next fixture",
        );
        continue;
      }

      await runner.step(prefix(`ingest() fixtures/${label}`), async () => {
        try {
          const result = await memory.ingest({
            agent: "docs",
            source: { path: pdfFile },
            chunking: { strategy: "paragraph", chunkSize: 800, overlap: 80 },
          });
          runner.assert(result.chunkCount >= 1, "pdf produced no chunks");
          runner.assert(result.extractedChars > 0, "pdf extracted empty text");
          ingestedPdf = true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.includes("pdf-parse")) {
            throw new Error(`${msg} — run: npm install pdf-parse@1.1.4`);
          }
          throw error;
        }
      });
      if (ingestedPdf) break;
    }
    if (!ingestedPdf) {
      runner.skip(
        prefix("ingest() PDF (required)"),
        "no text-extractable PDF found — keep sample-text.pdf",
      );
    }
  }

  const docxPath = path.join(config.fixturesDir, "sample.docx");
  if (fs.existsSync(docxPath)) {
    await runner.step(prefix("ingest() fixtures/sample.docx"), async () => {
      try {
        const result = await memory.ingest({
          agent: "docs",
          source: { path: docxPath },
        });
        runner.assert(result.chunkCount >= 1, "docx produced no chunks");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("mammoth")) {
          throw new Error(`${msg} — run: npm install mammoth`);
        }
        throw error;
      }
    });
  } else {
    runner.skip(prefix("ingest() fixtures/sample.docx"), "add fixtures/sample.docx");
  }

  await runner.step(prefix("recall() after ingest"), async () => {
    const hits = await memory.recall({
      query: "widgets pricing refunds",
      topK: 5,
      hybrid: true,
      filter: { agent: "docs" },
    });
    runner.assert(hits.length > 0, "no recall after ingest");
  });

  // ── multimodal via OpenAI vision (image = "OCR" + captions) ────────────
  if (config.enableVision) {
    const image = ["sample.png", "sample.jpg", "sample.jpeg", "sample.webp"]
      .map((name) => path.join(config.fixturesDir, name))
      .find((p) => fs.existsSync(p));

    if (image) {
      await runner.step(prefix(`ingest() image via OpenAI vision ${path.basename(image)}`), async () => {
        const result = await memory.ingest({
          agent: "vision",
          source: { path: image },
          metadata: { kind: "image" },
        });
        runner.assert(result.extractedChars > 0, "no text from OpenAI vision");
        runner.assert(result.usedVision === true, "expected usedVision=true");
      });

      await runner.step(prefix("recall() image-derived memories"), async () => {
        const hits = await memory.recall({
          query: "what is shown in the image",
          topK: 5,
          filter: { agent: "vision" },
          threshold: 0.05,
          rerank: true,
        });
        runner.assert(hits.length > 0, "no vision memories recalled");
      });
    } else {
      runner.skip(
        prefix("ingest() image"),
        "upload fixtures/sample.png (or jpg/webp) — required to validate vision",
      );
    }
  } else {
    runner.skip(prefix("vision ingest"), "ENABLE_VISION=false");
  }

  // ── concurrency ────────────────────────────────────────────────────────
  await runner.step(prefix("20 concurrent remember()"), async () => {
    const tasks = Array.from({ length: 20 }, (_, i) =>
      memory.remember({
        agent: "agentA",
        content: { text: `Concurrent fact ${i} about widgets and gizmos.` },
        metadata: { batch: i },
      }),
    );
    const records = await Promise.all(tasks);
    runner.assert(records.length === 20, "missing concurrent records");
    runner.assert(
      new Set(records.map((r) => r.id)).size === 20,
      "duplicate ids under concurrency",
    );
  });

  // ── compress (OpenAI LLM — always on in this demo harness) ─────────────
  await runner.step(prefix("compress()"), async () => {
    await memory.remember({
      agent: "compress-bot",
      content: { text: "Warehouse opens at 08:00 UTC every weekday." },
    });
    await memory.remember({
      agent: "compress-bot",
      content: { text: "Shipments leave from dock B each afternoon." },
    });
    await memory.remember({
      agent: "compress-bot",
      content: { text: "Inventory sync runs hourly on the main warehouse." },
    });

    const result = await (memory as unknown as AgentOrc<true>).compress({
      agent: "compress-bot",
      limit: 50,
    });
    runner.assert(!!result.summary.id, "missing summary");
    runner.assert(result.archivedIds.length >= 2, "expected archived sources");
    runner.assert(
      result.summary.metadata.compressed === true,
      "summary missing compressed flag",
    );

    const hist = await memory.history({ id: result.archivedIds[0]! });
    runner.assert(
      hist.events.some((e) => e.eventType === "archived"),
      "missing archived event",
    );
  });

  await runner.step(prefix("recall() excludes archived by default"), async () => {
    const hits = await memory.recall({
      query: "warehouse dock inventory",
      topK: 10,
      threshold: 0.05,
      filter: { agent: "compress-bot", includeArchived: false },
    });
    runner.assert(
      hits.every((h) => !h.archived),
      "archived leak in recall",
    );
  });

  // ── forget ─────────────────────────────────────────────────────────────
  await runner.step(prefix("forget() by id"), async () => {
    const n = await memory.forget({ id: idB });
    runner.assert(n === 1, `expected 1 deleted, got ${n}`);
    const again = await memory.forget({ id: idB });
    runner.assert(again === 0, "second forget should be 0");
  });

  await runner.step(prefix("forget() by agent filter"), async () => {
    const before = await memory.stats();
    const n = await memory.forget({ filter: { agent: "docs" } });
    runner.assert(n >= 1, "expected to forget docs memories");
    const after = await memory.stats();
    runner.assert(
      after.totalMemories < before.totalMemories,
      "stats did not drop after forget filter",
    );
  });

  await runner.step(prefix("forget() rejects empty options"), async () => {
    let threw = false;
    try {
      await memory.forget({} as { id: string });
    } catch {
      threw = true;
    }
    runner.assert(threw, "expected validation error");
  });

  // ── clear confirm guard ────────────────────────────────────────────────
  await runner.step(prefix("clear() rejects without confirm"), async () => {
    let threw = false;
    try {
      await memory.clear({ confirm: false } as unknown as { confirm: true });
    } catch {
      threw = true;
    }
    runner.assert(threw, "expected validation error without confirm");
  });

  await runner.step(prefix("clear() wipes organization"), async () => {
    const n = await memory.clear({ confirm: true });
    runner.assert(n >= 0, "clear should return count");
    const stats = await memory.stats();
    runner.assert(stats.totalMemories === 0, "org not empty after clear");
  });

  // ── close / reopen ─────────────────────────────────────────────────────
  // close is done by the runner harness after the suite; we only verify here
  // that the client is still usable until then.
  await runner.step(prefix("post-clear remember still works"), async () => {
    const record = await memory.remember({
      agent: "smoke",
      content: { text: "Post-clear smoke memory for reopen checks." },
    });
    runner.assert(!!record.id, "post-clear remember failed");
  });
}
