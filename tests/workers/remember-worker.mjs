/**
 * Child-process worker for multi-process SQLite remember tests.
 * Loads the built ESM bundle from sdk/dist.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`missing ${name}`);
}

const dbPath = arg("--db");
const org = arg("--org", "mp-org");
const workerId = Number(arg("--worker", "0"));
const writes = Number(arg("--writes", "10"));

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

  let ok = 0;
  let fail = 0;
  const ctx = new Wolbarg();
  // Retry open under multi-process SQLITE_BUSY contention.
  let lastErr;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await ctx.init({
        organization: org,
        database: { provider: "sqlite", connectionString: dbPath },
        embedding: {
          baseUrl: "https://embed.test/v1",
          apiKey: "test",
          model: "test-embed",
        },
      });
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/locked|SQLITE_BUSY|busy/i.test(msg)) throw err;
      await new Promise((r) => setTimeout(r, 25 + attempt * 15));
    }
  }
  if (lastErr) throw lastErr;

  for (let i = 0; i < writes; i += 1) {
    try {
      await ctx.remember({
        agent: `worker-${workerId}`,
        content: {
          text: `mp memory w${workerId} #${i} ${Date.now()}-${Math.random()}`,
        },
        metadata: { workerId, i },
      });
      ok += 1;
    } catch {
      fail += 1;
    }
  }

  await ctx.close();
  if (typeof process.send === "function") {
    process.send({ ok, fail, workerId });
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
