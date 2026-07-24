/**
 * Build a Wolbarg instance from `.wolbarg/config.json` (+ env).
 */

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { wolbarg, type Wolbarg } from "../core/wolbarg.js";
import type { WolbargOptions } from "../core/options.js";
import {
  loadProjectConfig,
  resolveEmbeddingApiKey,
  resolveEnvPath,
  type WolbargProjectConfig,
} from "./project-config.js";
import { DEFAULT_ENV_PATH } from "./providers.js";

export interface CreateFromProjectConfigOptions {
  cwd?: string;
  configPath?: string;
  /** Extra env overlay (defaults to process.env after optional .env load). */
  env?: NodeJS.ProcessEnv;
  /** Load `.wolbarg/.env` into the env overlay when present (default true). */
  loadEnvFile?: boolean;
  /** Override organization. */
  organization?: string;
}

/**
 * Load key=value pairs from a dotenv-style file into a shallow copy of `base`.
 * Does not mutate `process.env` unless `base` is `process.env`.
 */
export function applyEnvFile(
  envPath: string,
  base: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...base };
  if (!existsSync(envPath)) return out;
  const text = readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (out[key] === undefined) out[key] = value;
  }
  return out;
}

export function projectConfigToWolbargOptions(
  config: WolbargProjectConfig,
  env: NodeJS.ProcessEnv = process.env,
): WolbargOptions {
  if (!config.embedding) {
    throw new Error(
      "Project config has no embedding section. Re-run `wolbarg init` and configure an embedding provider, or pass embedding explicitly to wolbarg().",
    );
  }

  const apiKey = resolveEmbeddingApiKey(config, env);
  if (!apiKey) {
    throw new Error(
      `Missing API key. Set ${config.embedding.apiKeyEnv} in the environment or in .wolbarg/.env (from wolbarg init).`,
    );
  }

  const dbUrl = config.database.url;
  return {
    organization: config.organization,
    database: {
      provider: config.database.provider,
      url: dbUrl,
      connectionString: dbUrl,
    },
    embedding: {
      baseUrl: config.embedding.baseUrl,
      apiKey,
      model: config.embedding.model,
    },
  };
}

/**
 * Create a {@link Wolbarg} context from project config written by `wolbarg init`.
 */
export function createWolbargFromProjectConfig(
  options: CreateFromProjectConfigOptions = {},
): Wolbarg {
  const cwd = options.cwd ?? process.cwd();
  const config = loadProjectConfig(cwd, options.configPath);
  if (!config) {
    throw new Error(
      `No Wolbarg config found. Run \`wolbarg init\` in ${cwd} (expected .wolbarg/config.json).`,
    );
  }

  let env = options.env ?? { ...process.env };
  if (options.loadEnvFile !== false) {
    const envFile = resolveEnvPath(
      cwd,
      config.paths?.env ?? DEFAULT_ENV_PATH,
    );
    env = applyEnvFile(envFile, env);
  }

  if (options.organization) {
    config.organization = options.organization;
  }

  // Resolve relative sqlite paths against cwd for the running process
  if (
    config.database.provider === "sqlite" &&
    !config.database.url.includes("://") &&
    !isAbsolute(config.database.url)
  ) {
    config.database = {
      ...config.database,
      url: resolve(cwd, config.database.url),
    };
  }

  return wolbarg(projectConfigToWolbargOptions(config, env));
}
