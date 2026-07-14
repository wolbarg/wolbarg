import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example → .env and set OPENAI_API_KEY (and DATABASE_URL for Postgres).`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Env var ${name} must be a number (got "${raw}")`);
  }
  return parsed;
}

function optionalBool(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim()?.toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

export type BackendName = "sqlite" | "postgres";

/**
 * OpenAI-only demo config.
 * One key drives: embeddings, chat/compress, vision (image OCR+captions), rerank.
 */
export interface AppConfig {
  organization: string;
  backends: BackendName[];
  sqlitePath: string;
  postgresUrl: string | null;
  requirePostgres: boolean;
  openaiApiKey: string;
  openaiBaseUrl: string;
  embeddingModel: string;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  visionModel: string;
  rerankModel: string;
  /** Always on for the OpenAI demo harness. */
  enableVision: boolean;
  /** Always on — uses openaiReranker. */
  enableRerank: boolean;
  fixturesDir: string;
}

/**
 * Repair common .env mistakes:
 * - `postgres:postgresql://...` (accidental scheme prefix)
 * - `sslmode=require/dbname` (path stuck onto the query value)
 */
function sanitizePostgresUrl(raw: string): string {
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (v.startsWith("postgres:postgresql://")) {
    v = v.slice("postgres:".length);
  } else if (v.startsWith("postgres:postgres://")) {
    v = `postgresql://${v.slice("postgres:postgres://".length)}`;
  }
  v = v.replace(/([?&]sslmode=)require\/[^&\s"]+/i, "$1require");
  return v;
}

export function loadConfig(): AppConfig {
  const openaiApiKey = required("OPENAI_API_KEY");
  const openaiBaseUrl = optional(
    "OPENAI_BASE_URL",
    "https://api.openai.com/v1",
  );

  const postgresUrlRaw = optional("DATABASE_URL") || null;
  const postgresUrl = postgresUrlRaw
    ? sanitizePostgresUrl(postgresUrlRaw)
    : null;
  const requirePostgres = optionalBool("REQUIRE_POSTGRES", true);

  const backendsRaw = optional("BACKENDS", "sqlite,postgres");
  const backends = backendsRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is BackendName => s === "sqlite" || s === "postgres");

  if (backends.length === 0) {
    throw new Error('BACKENDS must include "sqlite" and/or "postgres"');
  }

  if (requirePostgres && backends.includes("postgres") && !postgresUrl) {
    throw new Error(
      "REQUIRE_POSTGRES=true but DATABASE_URL is missing. Set your Postgres connection string.",
    );
  }

  return {
    organization: optional("ORGANIZATION", "openai-demo"),
    backends,
    sqlitePath: path.resolve(
      process.cwd(),
      optional("DATABASE_PATH", "./data/memory-sqlite.db"),
    ),
    postgresUrl,
    requirePostgres,
    openaiApiKey,
    openaiBaseUrl,
    embeddingModel: optional("EMBEDDING_MODEL", "text-embedding-3-small"),
    llmModel: optional("LLM_MODEL", "gpt-4.1-mini"),
    llmTemperature: optionalNumber("LLM_TEMPERATURE", 0.2),
    llmMaxTokens: optionalNumber("LLM_MAX_TOKENS", 1024),
    visionModel: optional("VISION_MODEL", "gpt-4o-mini"),
    rerankModel: optional("RERANK_MODEL", "gpt-4.1-mini"),
    enableVision: optionalBool("ENABLE_VISION", true),
    enableRerank: optionalBool("ENABLE_RERANK", true),
    fixturesDir: path.resolve(
      process.cwd(),
      optional("FIXTURES_DIR", "./fixtures"),
    ),
  };
}
