/**
 * BEGIN IMMEDIATE transactions with SQLITE_BUSY retry + jitter backoff.
 */

import type { DatabaseSync } from "node:sqlite";
import { StorageLockedError } from "../../errors/index.js";
import type { ResolvedConcurrencyConfig } from "./concurrency-config.js";

export function isSqliteBusyError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  return (
    lower.includes("database is locked") ||
    lower.includes("sqlite_busy") ||
    lower.includes("busy")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full-jitter exponential backoff, capped at maxBackoffMs. */
function backoffDelay(
  attempt: number,
  config: ResolvedConcurrencyConfig,
): number {
  const exp = Math.min(
    config.maxBackoffMs,
    config.baseBackoffMs * 2 ** attempt,
  );
  // Full jitter: uniform in [0, exp] reduces synchronized retry storms.
  return Math.random() * exp;
}

function deadlineExceeded(
  startedAt: number,
  config: ResolvedConcurrencyConfig,
): boolean {
  return performance.now() - startedAt >= config.lockDeadlineMs;
}

/**
 * Run `fn` inside BEGIN IMMEDIATE … COMMIT, retrying on SQLITE_BUSY.
 */
export function withImmediateTransactionSync<T>(
  db: DatabaseSync,
  config: ResolvedConcurrencyConfig,
  fn: () => T,
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void,
): T {
  let lastError: unknown;
  const startedAt = performance.now();
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    if (attempt > 0 && deadlineExceeded(startedAt, config)) {
      break;
    }
    try {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = fn();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // ignore rollback errors
        }
        throw error;
      }
    } catch (error) {
      lastError = error;
      const isBusy = isSqliteBusyError(error);
      if (!isBusy) {
        throw error;
      }
      if (attempt >= config.maxRetries || deadlineExceeded(startedAt, config)) {
        break;
      }
      const delay = backoffDelay(attempt, config);
      onRetry?.(attempt + 1, delay, error);
      // Sync path: busy-wait is unavoidable for node:sqlite sync API.
      const end = Date.now() + delay;
      while (Date.now() < end) {
        /* spin */
      }
    }
  }
  throw new StorageLockedError(
    `SQLite write lock could not be acquired after ${config.maxRetries} retries`,
    {
      cause: lastError instanceof Error ? lastError : undefined,
      reason: "SQLITE_BUSY exhausted retries",
      suggestion:
        "Increase concurrency.maxRetries / concurrency.lockDeadlineMs, set concurrency.multiProcess: true for shared-file writers, or use the Postgres backend.",
    },
  );
}

/**
 * Async variant — preferred when callers can await between retries.
 */
export async function withImmediateTransaction<T>(
  db: DatabaseSync,
  config: ResolvedConcurrencyConfig,
  fn: () => T | Promise<T>,
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void,
): Promise<T> {
  let lastError: unknown;
  const startedAt = performance.now();
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    if (attempt > 0 && deadlineExceeded(startedAt, config)) {
      break;
    }
    try {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // ignore
        }
        throw error;
      }
    } catch (error) {
      lastError = error;
      const isBusy = isSqliteBusyError(error);
      if (!isBusy) {
        throw error;
      }
      if (attempt >= config.maxRetries || deadlineExceeded(startedAt, config)) {
        break;
      }
      const delay = backoffDelay(attempt, config);
      onRetry?.(attempt + 1, delay, error);
      await sleep(delay);
    }
  }
  throw new StorageLockedError(
    `SQLite write lock could not be acquired after ${config.maxRetries} retries`,
    {
      cause: lastError instanceof Error ? lastError : undefined,
      reason: "SQLITE_BUSY exhausted retries",
      suggestion:
        "Increase concurrency.maxRetries / concurrency.lockDeadlineMs, set concurrency.multiProcess: true for shared-file writers, or use the Postgres backend.",
    },
  );
}
