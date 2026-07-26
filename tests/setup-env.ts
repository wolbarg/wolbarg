/**
 * Load `.env.test.local` before any suite runs.
 *
 * Live Postgres suites need a connection string. Reading it from a gitignored
 * file keeps credentials out of shell history and CI logs, and means
 * `npm test` alone is enough to run the full matrix locally.
 *
 * Already-set variables always win, so CI secrets are never overridden.
 */
import fs from "node:fs";
import path from "node:path";

const ENV_FILE = path.resolve(process.cwd(), ".env.test.local");

function parseEnv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (fs.existsSync(ENV_FILE)) {
  for (const [key, value] of Object.entries(
    parseEnv(fs.readFileSync(ENV_FILE, "utf8")),
  )) {
    process.env[key] ??= value;
  }
}
