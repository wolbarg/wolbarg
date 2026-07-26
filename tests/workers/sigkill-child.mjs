/**
 * Child process for SIGKILL recovery test.
 * Args: --db <path> --marker <path>
 *
 * Commits N remembers, writes a marker file, then hangs until killed.
 * Does NOT call close() — parent sends SIGKILL / taskkill.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  throw new Error(`missing ${name}`);
}

const dbPath = arg("--db");
const markerPath = arg("--marker");

async function run() {
  const dims = 8;
  globalThis.fetch = async (_input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const text = typeof body.input === "string" ? body.input : "x";
    const v = new Array(dims).fill(0);
    for (let i = 0; i < text.length; i += 1) {
      v[i % dims] += (text.charCodeAt(i) % 31) / 31;
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return new Response(
      JSON.stringify({
        data: [{ embedding: v.map((x) => x / norm), index: 0 }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const distUrl = pathToFileURL(
    path.resolve(__dirname, "../../dist/index.js"),
  ).href;
  const { Wolbarg } = await import(distUrl);

  const ctx = new Wolbarg();
  await ctx.init({
    organization: "sigkill-org",
    database: { provider: "sqlite", connectionString: dbPath },
    embedding: {
      baseUrl: "https://embed.test/v1",
      apiKey: "test",
      model: "test-embed",
    },
  });

  const ids = [];
  for (let i = 0; i < 25; i += 1) {
    const r = await ctx.remember({
      agent: "killer",
      content: { text: `sigkill committed row ${i} ${Date.now()}` },
    });
    ids.push(r.id);
  }

  fs.writeFileSync(markerPath, JSON.stringify({ ids, pid: process.pid }));
  // Stay alive until parent kills us — do NOT call close().
  await new Promise(() => {});
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
