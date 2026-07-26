/**
 * Production SSL defaults for Postgres connection strings.
 *
 * Policy (v1):
 * - Loopback hosts (`localhost`, `127.0.0.1`, `::1`) leave SSL alone — local
 *   Docker/dev Postgres rarely has TLS.
 * - Non-loopback hosts without an explicit `sslmode` / `ssl` query param get
 *   `sslmode=require` so cloud deployments are secure by default.
 * - Callers can override with `ssl: false | "disable"` (insecure) or
 *   `ssl: true | "require"` (force), or by setting `sslmode` in the URL.
 */

import { ConfigurationError } from "../../errors/index.js";

/** Explicit SSL policy for {@link applyPostgresSslPolicy}. */
export type PostgresSslOption = boolean | "require" | "prefer" | "disable";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Whether the connection target is a loopback host (no remote TLS default).
 */
export function isPostgresLoopbackHost(connectionString: string): boolean {
  const host = extractHost(connectionString);
  if (!host) return false;
  return LOOPBACK.has(host.toLowerCase());
}

/**
 * True when the connection string already expresses an SSL preference.
 */
export function hasExplicitSslSetting(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.searchParams.has("sslmode") || url.searchParams.has("ssl");
  } catch {
    return /(?:^|[?&])sslmode=/i.test(connectionString) ||
      /(?:^|[?&])ssl=/i.test(connectionString);
  }
}

/**
 * Apply secure-by-default SSL to a Postgres connection string.
 *
 * @param connectionString - Raw URL or libpq-style string.
 * @param ssl - Optional override: `true`/`"require"` force TLS; `false`/`"disable"`
 *   force off; `"prefer"` sets prefer; omit for automatic remote-require policy.
 * @returns Connection string with SSL policy applied.
 */
export function applyPostgresSslPolicy(
  connectionString: string,
  ssl?: PostgresSslOption,
): string {
  if (ssl === false || ssl === "disable") {
    return setSslMode(connectionString, "disable");
  }
  if (ssl === true || ssl === "require") {
    return setSslMode(connectionString, "require");
  }
  if (ssl === "prefer") {
    return setSslMode(connectionString, "prefer");
  }

  // Automatic policy: remote hosts without SSL settings → require.
  if (hasExplicitSslSetting(connectionString)) {
    return connectionString;
  }
  if (isPostgresLoopbackHost(connectionString)) {
    return connectionString;
  }
  // Unparseable / missing host: fail closed toward TLS rather than plaintext.
  return setSslMode(connectionString, "require");
}

/**
 * Validate that an explicit `ssl: false` on a remote host is intentional.
 * Does not throw — operators may need insecure tunnels — but returns a warning
 * message when the combination is risky.
 */
export function remoteInsecureSslWarning(
  connectionString: string,
  ssl?: PostgresSslOption,
): string | null {
  if (ssl !== false && ssl !== "disable") return null;
  if (isPostgresLoopbackHost(connectionString)) return null;
  return (
    "PostgreSQL SSL is disabled for a non-loopback host. " +
    "Traffic (including credentials) may be sent in plaintext. " +
    'Prefer ssl: true / sslmode=require, or use an SSH tunnel.'
  );
}

function setSslMode(connectionString: string, mode: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.set("sslmode", mode);
    url.searchParams.delete("ssl");
    return url.toString();
  } catch {
    // libpq key=value form or opaque string — append / replace sslmode.
    if (/(?:^|[?&])sslmode=/i.test(connectionString)) {
      return connectionString.replace(
        /([?&])sslmode=[^&]*/i,
        `$1sslmode=${encodeURIComponent(mode)}`,
      );
    }
    const sep = connectionString.includes("?") ? "&" : "?";
    return `${connectionString}${sep}sslmode=${encodeURIComponent(mode)}`;
  }
}

function extractHost(connectionString: string): string | null {
  try {
    const url = new URL(connectionString);
    return url.hostname || null;
  } catch {
    // libpq: host=...
    const m = /(?:^|[;\s])host\s*=\s*([^\s;]+)/i.exec(connectionString);
    return m?.[1] ?? null;
  }
}

/** @internal Exported for tests — reject empty connection strings early. */
export function assertPostgresConnectionString(connectionString: string): void {
  if (typeof connectionString !== "string" || connectionString.trim() === "") {
    throw new ConfigurationError(
      "postgres connectionString must be a non-empty string",
    );
  }
}
