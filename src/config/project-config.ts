/**
 * Project-level Wolbarg configuration written by `wolbarg init`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  DEFAULT_CONFIG_PATH,
  DEFAULT_ENV_PATH,
  DEFAULT_ORGANIZATION,
  DEFAULT_SQLITE_DB_PATH,
  getEmbeddingProviderPreset,
  type EmbeddingProviderId,
} from "./providers.js";

export interface WolbargProjectDatabaseConfig {
  provider: "sqlite" | "postgres";
  /** SQLite file path or Postgres connection URL. */
  url: string;
}

export interface WolbargProjectEmbeddingConfig {
  /** Named provider preset id (or `custom`). */
  provider: EmbeddingProviderId;
  /** OpenAI-compatible embeddings base URL (always stored explicitly). */
  baseUrl: string;
  /** Embedding model id. */
  model: string;
  /** Env var that holds the API key (preferred over storing secrets). */
  apiKeyEnv: string;
}

export interface WolbargProjectConfig {
  version: 1;
  organization: string;
  database: WolbargProjectDatabaseConfig;
  embedding?: WolbargProjectEmbeddingConfig;
  /** Relative paths written by init (informational). */
  paths?: {
    config: string;
    env?: string;
  };
}

export interface SaveProjectConfigOptions {
  cwd?: string;
  configPath?: string;
  /** Absolute or cwd-relative path for `.env` (optional). */
  envPath?: string;
  /** Raw API key to write into the env file (optional). */
  apiKey?: string;
  /** When true, overwrite an existing config without merging. */
  overwrite?: boolean;
}

export function defaultProjectConfig(): WolbargProjectConfig {
  return {
    version: 1,
    organization: DEFAULT_ORGANIZATION,
    database: {
      provider: "sqlite",
      url: DEFAULT_SQLITE_DB_PATH,
    },
    paths: {
      config: DEFAULT_CONFIG_PATH,
    },
  };
}

export function resolveConfigPath(cwd = process.cwd(), configPath?: string): string {
  const rel = configPath ?? DEFAULT_CONFIG_PATH;
  return isAbsolute(rel) ? rel : resolve(cwd, rel);
}

export function resolveEnvPath(cwd = process.cwd(), envPath?: string): string {
  const rel = envPath ?? DEFAULT_ENV_PATH;
  return isAbsolute(rel) ? rel : resolve(cwd, rel);
}

export function loadProjectConfig(
  cwd = process.cwd(),
  configPath?: string,
): WolbargProjectConfig | null {
  const full = resolveConfigPath(cwd, configPath);
  if (!existsSync(full)) return null;
  const raw = JSON.parse(readFileSync(full, "utf8")) as WolbargProjectConfig;
  if (!raw || raw.version !== 1 || !raw.database?.url) {
    throw new Error(`Invalid Wolbarg config at ${full}`);
  }
  return raw;
}

export function saveProjectConfig(
  config: WolbargProjectConfig,
  options: SaveProjectConfigOptions = {},
): { configPath: string; envPath?: string } {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolveConfigPath(cwd, options.configPath);
  const dir = dirname(configPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(configPath) && options.overwrite === false) {
    throw new Error(`Config already exists: ${configPath} (pass --force to overwrite)`);
  }

  const toWrite: WolbargProjectConfig = {
    ...config,
    paths: {
      config: options.configPath ?? DEFAULT_CONFIG_PATH,
      ...(options.envPath || options.apiKey
        ? { env: options.envPath ?? DEFAULT_ENV_PATH }
        : config.paths?.env
          ? { env: config.paths.env }
          : {}),
    },
  };

  writeFileSync(configPath, `${JSON.stringify(toWrite, null, 2)}\n`, "utf8");

  let envPath: string | undefined;
  if (options.apiKey && config.embedding?.apiKeyEnv) {
    envPath = resolveEnvPath(cwd, options.envPath);
    ensureParent(envPath);
    upsertEnvVar(envPath, config.embedding.apiKeyEnv, options.apiKey);
    ensureGitignore(cwd, [DEFAULT_ENV_PATH, ".env"]);
  }

  // Ensure sqlite parent dir exists for the default layout
  if (config.database.provider === "sqlite" && !config.database.url.includes("://")) {
    const dbPath = isAbsolute(config.database.url)
      ? config.database.url
      : resolve(cwd, config.database.url);
    ensureParent(dbPath);
  }

  return { configPath, envPath };
}

function ensureParent(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function upsertEnvVar(
  envPath: string,
  key: string,
  value: string,
): void {
  ensureParent(envPath);
  let text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = `${key}=${shellQuoteEnv(value)}`;
  const re = new RegExp(`^${escapeRegExp(key)}=.*$`, "m");
  if (re.test(text)) {
    text = text.replace(re, line);
  } else {
    if (text && !text.endsWith("\n")) text += "\n";
    text += `${line}\n`;
  }
  writeFileSync(envPath, text, "utf8");
}

function shellQuoteEnv(value: string): string {
  if (/[\s#"']/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureGitignore(cwd: string, entries: string[]): void {
  const gi = join(cwd, ".gitignore");
  let text = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  let changed = false;
  for (const entry of entries) {
    if (text.split(/\r?\n/).some((l) => l.trim() === entry)) continue;
    if (text && !text.endsWith("\n")) text += "\n";
    text += `${entry}\n`;
    changed = true;
  }
  if (changed) writeFileSync(gi, text, "utf8");
}

/**
 * Resolve the API key for a project config from process.env (and optional `.env` load).
 * Does not invent keys — returns empty string if unset.
 */
export function resolveEmbeddingApiKey(
  config: WolbargProjectConfig,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const name = config.embedding?.apiKeyEnv;
  if (!name) return "";
  return env[name] ?? "";
}

export function assertEmbeddingPreset(
  provider: string,
): EmbeddingProviderId {
  const preset = getEmbeddingProviderPreset(provider);
  if (!preset) {
    throw new Error(
      `Unknown embedding provider "${provider}". Choose one of: ${[
        "openai",
        "ollama",
        "openrouter",
        "lmstudio",
        "gemini",
        "together",
        "vllm",
        "custom",
      ].join(", ")}`,
    );
  }
  return preset.id;
}
