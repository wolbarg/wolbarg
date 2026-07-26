/**
 * PostgreSQL concurrency helpers for multi-writer memory storage.
 *
 * Design decisions (v1):
 * - Row locks (`FOR UPDATE`) only on read-modify-write paths (update / archive).
 *   Plain inserts rely on unique constraints + coalesce batches — no table locks.
 * - Deadlock (`40P01`) and serialization failure (`40001`) retry at the
 *   transaction boundary with full-jitter backoff (not per-statement).
 * - Session GUCs cap runaway work: statement_timeout, lock_timeout,
 *   idle_in_transaction_session_timeout. Values are intentionally moderate so
 *   interactive agent workloads fail loudly instead of hanging forever.
 * - `AsyncLocalStorage` is **per provider instance** so two pools never share
 *   ambient transaction clients.
 */

/** Max retries for deadlock / serialization failures (attempt 0 is the first try). */
export const PG_TX_MAX_RETRIES = 5;

/** Base backoff (ms) before full jitter. */
export const PG_TX_BASE_BACKOFF_MS = 20;

/** Cap on backoff delay (ms). */
export const PG_TX_MAX_BACKOFF_MS = 500;

/**
 * Session GUCs applied via libpq `options=` on every pool connection.
 * Tuned for agent write bursts, not long analytical queries.
 */
export const PG_SESSION_TIMEOUTS = {
  /** Cancel statements that run longer than this (ms). */
  statementTimeoutMs: 30_000,
  /** Fail lock waits faster than the statement timeout (ms). */
  lockTimeoutMs: 10_000,
  /** Abort idle open transactions (ms). */
  idleInTransactionSessionTimeoutMs: 60_000,
} as const;

/**
 * True when Postgres reports a retryable concurrency error.
 * - `40P01` deadlock_detected
 * - `40001` serialization_failure
 */
export function isRetryablePgConcurrencyError(error: unknown): boolean {
  const code = extractPgCode(error);
  if (code === "40P01" || code === "40001") {
    return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes("deadlock detected") ||
    lower.includes("could not serialize access") ||
    lower.includes("serialization failure")
  );
}

function extractPgCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/** Full-jitter exponential backoff delay for retry attempt `attempt` (1-based). */
export function pgTxBackoffDelayMs(attempt: number): number {
  const exp = Math.min(
    PG_TX_MAX_BACKOFF_MS,
    PG_TX_BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1),
  );
  return Math.random() * exp;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Append statement/lock/idle-in-tx timeouts to a connection string `options=` value.
 */
export function withPostgresSessionTimeouts(connectionString: string): string {
  const { statementTimeoutMs, lockTimeoutMs, idleInTransactionSessionTimeoutMs } =
    PG_SESSION_TIMEOUTS;
  const flags = [
    `-c statement_timeout=${statementTimeoutMs}`,
    `-c lock_timeout=${lockTimeoutMs}`,
    `-c idle_in_transaction_session_timeout=${idleInTransactionSessionTimeoutMs}`,
  ].join(" ");
  try {
    const url = new URL(connectionString);
    const existing = url.searchParams.get("options");
    url.searchParams.set(
      "options",
      existing ? `${existing} ${flags}`.trim() : flags,
    );
    return url.toString();
  } catch {
    const sep = connectionString.includes("?") ? "&" : "?";
    return `${connectionString}${sep}options=${encodeURIComponent(flags)}`;
  }
}
