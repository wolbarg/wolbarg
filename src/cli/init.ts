/**
 * `wolbarg init` — interactive (or flag-driven) project configuration.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  defaultProjectConfig,
  resolveConfigPath,
  saveProjectConfig,
  type WolbargProjectConfig,
} from "../config/project-config.js";
import {
  DEFAULT_ENV_PATH,
  DEFAULT_ORGANIZATION,
  DEFAULT_SQLITE_DB_PATH,
  EMBEDDING_PROVIDER_PRESETS,
  getEmbeddingProviderPreset,
  type EmbeddingProviderId,
} from "../config/providers.js";
import {
  askConfirm,
  askOptionalText,
  askSelect,
  askText,
  withReadline,
} from "./prompt.js";

export interface InitCliOptions {
  cwd?: string;
  /** Non-interactive: accept defaults / provided flags. */
  yes?: boolean;
  force?: boolean;
  organization?: string;
  db?: string;
  dbProvider?: "sqlite" | "postgres";
  provider?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  /** Skip embedding entirely. */
  skipEmbedding?: boolean;
}

function printHelp(): void {
  console.log(`Usage: wolbarg init [options]

Configure Wolbarg for this project (database + optional embedding provider).

All prompts are optional — press Enter to accept defaults, or skip embedding.

Options:
  -y, --yes                 Non-interactive; use defaults / flags
  -f, --force               Overwrite existing .wolbarg/config.json
  --org <name>              Organization id (default: ${DEFAULT_ORGANIZATION})
  --db <path-or-url>        SQLite path or Postgres URL
                            (default: ${DEFAULT_SQLITE_DB_PATH})
  --db-provider <sqlite|postgres>
  --provider <id>           Embedding provider preset
                            (${EMBEDDING_PROVIDER_PRESETS.map((p) => p.id).join("|")})
  --base-url <url>          Embedding API base URL (shown with provider default)
  --model <id>              Embedding model id
  --api-key <key>           Write API key into .wolbarg/.env
  --api-key-env <NAME>      Env var name for the key
  --skip-embedding          Do not configure embedding
  -h, --help                Show help

Examples:
  wolbarg init
  wolbarg init --yes
  wolbarg init --provider ollama --model nomic-embed-text --api-key ollama
  wolbarg init --db postgresql://user:pass@localhost:5432/wolbarg --db-provider postgres
`);
}

export function parseInitArgs(argv: string[]): InitCliOptions | { help: true } {
  const opts: InitCliOptions = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value after ${a}`);
      return v;
    };
    switch (a) {
      case "-h":
      case "--help":
        return { help: true };
      case "-y":
      case "--yes":
        opts.yes = true;
        break;
      case "-f":
      case "--force":
        opts.force = true;
        break;
      case "--org":
        opts.organization = next();
        break;
      case "--db":
        opts.db = next();
        break;
      case "--db-provider": {
        const p = next();
        if (p !== "sqlite" && p !== "postgres") {
          throw new Error(`--db-provider must be sqlite|postgres`);
        }
        opts.dbProvider = p;
        break;
      }
      case "--provider":
        opts.provider = next();
        break;
      case "--base-url":
        opts.baseUrl = next();
        break;
      case "--model":
        opts.model = next();
        break;
      case "--api-key":
        opts.apiKey = next();
        break;
      case "--api-key-env":
        opts.apiKeyEnv = next();
        break;
      case "--skip-embedding":
        opts.skipEmbedding = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return opts;
}

function inferDbProvider(url: string, explicit?: "sqlite" | "postgres"): "sqlite" | "postgres" {
  if (explicit) return explicit;
  if (/^postgres(ql)?:\/\//i.test(url)) return "postgres";
  return "sqlite";
}

export async function runInit(options: InitCliOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolveConfigPath(cwd);

  if (existsSync(configPath) && !options.force && !options.yes) {
    const overwrite = await withReadline((rl) =>
      askConfirm(
        rl,
        `Config already exists at ${configPath}. Overwrite?`,
        false,
      ),
    );
    if (!overwrite) {
      console.log("Aborted. Pass --force to overwrite.");
      return 1;
    }
  } else if (existsSync(configPath) && options.yes && !options.force) {
    console.error(
      `Config already exists at ${configPath}. Re-run with --force to overwrite.`,
    );
    return 1;
  }

  const config: WolbargProjectConfig = defaultProjectConfig();
  let apiKey: string | undefined;

  if (options.yes) {
    config.organization = options.organization ?? DEFAULT_ORGANIZATION;
    const dbUrl = options.db ?? DEFAULT_SQLITE_DB_PATH;
    config.database = {
      provider: inferDbProvider(dbUrl, options.dbProvider),
      url: dbUrl,
    };

    if (!options.skipEmbedding) {
      const providerId = (options.provider ?? "openai") as EmbeddingProviderId;
      const preset = getEmbeddingProviderPreset(providerId);
      if (!preset) {
        console.error(`Unknown provider: ${providerId}`);
        return 1;
      }
      // Base URL must be explicit in the written config (even when using default).
      const baseUrl = options.baseUrl ?? preset.defaultBaseUrl;
      const model = options.model ?? preset.defaultModel;
      config.embedding = {
        provider: preset.id,
        baseUrl,
        model,
        apiKeyEnv: options.apiKeyEnv ?? preset.apiKeyEnv,
      };
      apiKey = options.apiKey;
    }
  } else {
    await withReadline(async (rl) => {
      console.log("\nWolbarg init — all fields optional (Enter = default / skip).\n");

      const org = await askOptionalText(
        rl,
        "Organization",
        options.organization ?? DEFAULT_ORGANIZATION,
      );
      config.organization = org ?? DEFAULT_ORGANIZATION;

      const dbUrl = await askOptionalText(
        rl,
        "Database path or Postgres URL",
        options.db ?? DEFAULT_SQLITE_DB_PATH,
      );
      const resolvedDb = dbUrl ?? DEFAULT_SQLITE_DB_PATH;
      config.database = {
        provider: inferDbProvider(resolvedDb, options.dbProvider),
        url: resolvedDb,
      };

      if (options.skipEmbedding) {
        return;
      }

      const providerId =
        options.provider ??
        (await askSelect(
          rl,
          "Embedding provider",
          EMBEDDING_PROVIDER_PRESETS.map((p) => ({
            value: p.id,
            label: `${p.label} — ${p.defaultBaseUrl}`,
          })),
          "openai",
          true,
        ));

      if (!providerId) {
        console.log("Skipping embedding configuration.");
        return;
      }

      const preset = getEmbeddingProviderPreset(providerId);
      if (!preset) {
        console.log(`Unknown provider ${providerId}; skipping embedding.`);
        return;
      }

      // CRITICAL: always show base URL field with the provider default visible.
      console.log(
        `\nProvider default base URL for ${preset.label}: ${preset.defaultBaseUrl}`,
      );
      const baseUrl =
        options.baseUrl ??
        (await askText(
          rl,
          "Embedding base URL",
          preset.defaultBaseUrl,
        ));

      const model =
        options.model ??
        (await askText(rl, "Embedding model", preset.defaultModel));

      const apiKeyEnv =
        options.apiKeyEnv ??
        (await askText(rl, "API key environment variable", preset.apiKeyEnv));

      const keyPrompt = preset.apiKeyHint
        ? `API key (${preset.apiKeyHint})`
        : `API key (stored in ${DEFAULT_ENV_PATH} as ${apiKeyEnv})`;
      const key =
        options.apiKey ??
        (await askOptionalText(rl, keyPrompt, undefined));

      config.embedding = {
        provider: preset.id,
        baseUrl: baseUrl || preset.defaultBaseUrl,
        model: model || preset.defaultModel,
        apiKeyEnv: apiKeyEnv || preset.apiKeyEnv,
      };
      if (key) apiKey = key;
    });
  }

  const saved = saveProjectConfig(config, {
    cwd,
    overwrite: true,
    apiKey,
    envPath: DEFAULT_ENV_PATH,
  });

  console.log("\nWolbarg configured.\n");
  console.log(`  config: ${saved.configPath}`);
  if (saved.envPath) console.log(`  env:    ${saved.envPath}`);
  console.log(`  db:     ${config.database.provider} → ${config.database.url}`);
  if (config.embedding) {
    console.log(`  embed:  ${config.embedding.provider}`);
    console.log(`  base:   ${config.embedding.baseUrl}`);
    console.log(`  model:  ${config.embedding.model}`);
    console.log(`  key:    $${config.embedding.apiKeyEnv}`);
  } else {
    console.log("  embed:  (not configured)");
  }
  console.log(`
Next:
  import { createWolbargFromProjectConfig } from "wolbarg";
  const ctx = createWolbargFromProjectConfig();
  await ctx.ready();
`);
  return 0;
}

export async function initCommand(argv: string[]): Promise<number> {
  try {
    const parsed = parseInitArgs(argv);
    if ("help" in parsed) {
      printHelp();
      return 0;
    }
    return await runInit(parsed);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return 1;
  }
}

/** Exposed for tests — builds config object without writing when needed. */
export function buildConfigFromFlags(options: InitCliOptions): WolbargProjectConfig {
  const config = defaultProjectConfig();
  config.organization = options.organization ?? DEFAULT_ORGANIZATION;
  const dbUrl = options.db ?? DEFAULT_SQLITE_DB_PATH;
  config.database = {
    provider: inferDbProvider(dbUrl, options.dbProvider),
    url: dbUrl,
  };
  if (!options.skipEmbedding) {
    const preset = getEmbeddingProviderPreset(options.provider ?? "openai");
    if (preset) {
      config.embedding = {
        provider: preset.id,
        baseUrl: options.baseUrl ?? preset.defaultBaseUrl,
        model: options.model ?? preset.defaultModel,
        apiKeyEnv: options.apiKeyEnv ?? preset.apiKeyEnv,
      };
    }
  }
  return config;
}

export function resolveInitCwd(cwd?: string): string {
  return cwd ? resolve(cwd) : process.cwd();
}
