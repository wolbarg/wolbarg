/**
 * Public factory helpers for storage, telemetry, and checkpoints.
 */

import type {
  PostgresDatabaseConfig,
  SqliteDatabaseConfig,
  TelemetryConfig,
} from "../types/index.js";
import { SqliteStorageProvider } from "../storage/providers/sqlite.js";
import { PostgresStorageProvider } from "../storage/providers/postgres.js";
import type { StorageProvider } from "../storage/types.js";
import { SqliteTelemetryProvider } from "../providers/sqlite/sqliteTelemetryProvider.js";
import { SqliteCheckpointProvider } from "../providers/sqlite/sqliteCheckpointProvider.js";
import type { TelemetryProvider } from "../providers/interfaces/TelemetryProvider.js";
import type { CheckpointProvider } from "../providers/interfaces/CheckpointProvider.js";
import { ConfigurationError } from "../errors/index.js";
import type {
  WolbargOptions,
  WolbargOptionsWithLlm,
  WolbargOptionsWithoutLlm,
} from "../core/options.js";
import { wolbarg as createCoreWolbarg, type Wolbarg } from "../core/wolbarg.js";

/**
 * Create a SQLite {@link StorageProvider} from a filesystem path or `:memory:`.
 *
 * @param connectionString - Absolute/relative `.db` path, or `":memory:"` for ephemeral.
 * @returns Ready-to-pass storage provider (Wolbarg still calls `open()` via `ready()`).
 *
 * @example
 * ```ts
 * wolbarg({ organization: "acme", storage: sqlite("./memory.db"), embedding: ... })
 * ```
 */
export function sqlite(
  connectionString: string,
  options?: { concurrency?: import("../types/index.js").ConcurrencyConfig },
): StorageProvider {
  return new SqliteStorageProvider({
    connectionString,
    concurrency: options?.concurrency,
  });
}

/**
 * Create a SQLite storage **config object** (for `database` / `init` options).
 *
 * @param connectionString - Path or `:memory:`.
 * @returns `{ provider: "sqlite", connectionString, url }`.
 */
export function sqliteConfig(
  connectionString: string,
): SqliteDatabaseConfig {
  return {
    provider: "sqlite",
    connectionString,
    url: connectionString,
  };
}

/**
 * Create a PostgreSQL {@link StorageProvider}. Requires optional peer `pg`.
 *
 * @param options - Connection string, or an object with:
 *   - `connectionString` — Postgres URL
 *   - `maxPoolSize` — optional pool size (default 20)
 *   - `durableWrites` — default `true`; set `false` for higher write throughput (async commit)
 *   - `schema` — optional schema owning Wolbarg's tables (default `public`)
 *   - `ssl` — TLS policy (default: `sslmode=require` for non-loopback hosts)
 * @returns Postgres storage provider instance.
 *
 * @example
 * ```ts
 * postgres(process.env.DATABASE_URL!)
 * postgres({ connectionString: process.env.DATABASE_URL!, maxPoolSize: 10 })
 * postgres({ connectionString: process.env.DATABASE_URL!, schema: "wolbarg" })
 * postgres({ connectionString: "postgres://localhost/db", ssl: false }) // local Docker
 * ```
 */
export function postgres(
  options:
    | string
    | {
        connectionString: string;
        maxPoolSize?: number;
        /** Default true. Set false for higher write throughput (async commit). */
        durableWrites?: boolean;
        /** Schema owning Wolbarg's tables. Created on open. Default `public`. */
        schema?: string;
        /** TLS policy — see {@link PostgresDatabaseConfig.ssl}. */
        ssl?: boolean | "require" | "prefer" | "disable";
      },
): StorageProvider {
  const opts =
    typeof options === "string"
      ? { connectionString: options }
      : options;
  return new PostgresStorageProvider(opts);
}

/**
 * Create a PostgreSQL storage **config object**.
 *
 * @param connectionString - Postgres connection URL.
 * @param options.maxPoolSize - Optional pool size (default 20).
 * @param options.durableWrites - Optional durability flag (default true).
 * @param options.schema - Optional schema owning Wolbarg's tables (default `public`).
 * @param options.ssl - Optional TLS policy.
 * @returns `{ provider: "postgres", connectionString, url, ... }`.
 */
export function postgresConfig(
  connectionString: string,
  options?: {
    maxPoolSize?: number;
    durableWrites?: boolean;
    schema?: string;
    ssl?: boolean | "require" | "prefer" | "disable";
  },
): PostgresDatabaseConfig {
  return {
    provider: "postgres",
    connectionString,
    url: connectionString,
    ...options,
  };
}

/**
 * Create a SQLite {@link TelemetryProvider} for an independent event database.
 *
 * @param url - Path to the telemetry SQLite file (separate from memory DB).
 * @returns Telemetry provider for `telemetry:` constructor option.
 */
export function sqliteTelemetry(url: string): TelemetryProvider {
  return new SqliteTelemetryProvider({ url });
}

/**
 * Create a SQLite {@link CheckpointProvider}.
 *
 * @param directory - Optional directory for checkpoint files (default under cwd).
 * @returns Checkpoint provider for `checkpoint:` constructor option.
 */
export function sqliteCheckpoint(directory?: string): CheckpointProvider {
  return new SqliteCheckpointProvider({ directory });
}

/**
 * Create a {@link TelemetryProvider} from {@link TelemetryConfig}.
 * Currently only SQLite telemetry databases are implemented.
 *
 * @param config - Telemetry config with `database.provider` and `database.url`.
 * @returns SQLite telemetry provider instance.
 * @throws {ConfigurationError} If provider is not `"sqlite"` or url is missing.
 */
export function createTelemetryProvider(
  config: TelemetryConfig,
): TelemetryProvider {
  if (config.database.provider !== "sqlite") {
    throw new ConfigurationError(
      `Unsupported telemetry provider "${config.database.provider}". Only "sqlite" is implemented; PostgreSQL telemetry is not implemented.`,
    );
  }
  const url =
    config.database.url ?? config.database.connectionString ?? "";
  if (!url) {
    throw new ConfigurationError("telemetry.database.url is required");
  }
  return new SqliteTelemetryProvider({ url });
}

/**
 * Preferred factory. Equivalent to `new Wolbarg(options)`.
 * Overloads match core `wolbarg` so `llm` yields `Wolbarg<true>`.
 *
 * @param options - Full {@link WolbargOptions} (providers, database, embedding, optional llm).
 * @returns Configured {@link Wolbarg} instance — call `ready()` before use.
 *
 * @example
 * ```ts
 * const ctx = wolbarg({
 *   organization: "acme",
 *   database: sqliteConfig("./memory.db"),
 *   embedding: openaiEmbedding({ apiKey: "...", model: "text-embedding-3-small" }),
 * });
 * await ctx.ready();
 * ```
 */
export function wolbarg(options: WolbargOptionsWithLlm): Wolbarg<true>;
export function wolbarg(options: WolbargOptionsWithoutLlm): Wolbarg<false>;
export function wolbarg(options: WolbargOptions): Wolbarg<boolean>;
export function wolbarg(options: WolbargOptions): Wolbarg<boolean> {
  return createCoreWolbarg(options);
}

/** @deprecated Alias of {@link wolbarg}. */
export const createWolbarg = wolbarg;
