/**
 * SQLite multi-writer concurrency defaults and validation.
 */

import { ConfigurationError } from "../../errors/index.js";

export interface ConcurrencyConfig {
  /** Max retry attempts after SQLITE_BUSY. Default: 5 */
  maxRetries?: number;
  /** Base backoff in ms before jitter. Default: 50 */
  baseBackoffMs?: number;
  /** Cap on backoff delay in ms. Default: 2000 */
  maxBackoffMs?: number;
  /** SQLite busy_timeout pragma in ms. Default: 5000 */
  lockTimeoutMs?: number;
  /**
   * Hard ceiling for total lock-wait + retry budget in ms.
   * Default: lockTimeoutMs * (maxRetries + 1).
   */
  lockDeadlineMs?: number;
  /**
   * When true, use multi-process-oriented defaults (higher busy_timeout / retries)
   * unless the caller overrides individual fields.
   */
  multiProcess?: boolean;
}

export interface ResolvedConcurrencyConfig {
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  lockTimeoutMs: number;
  lockDeadlineMs: number;
}

export const DEFAULT_CONCURRENCY: ResolvedConcurrencyConfig = {
  maxRetries: 5,
  baseBackoffMs: 50,
  maxBackoffMs: 2000,
  lockTimeoutMs: 5000,
  lockDeadlineMs: 30_000,
};

/** Stronger defaults when many OS processes share one SQLite file. */
export const MULTI_PROCESS_CONCURRENCY: ResolvedConcurrencyConfig = {
  maxRetries: 12,
  baseBackoffMs: 40,
  maxBackoffMs: 3000,
  lockTimeoutMs: 15_000,
  lockDeadlineMs: 90_000,
};

export function resolveConcurrencyConfig(
  input?: ConcurrencyConfig,
): ResolvedConcurrencyConfig {
  const base = input?.multiProcess
    ? MULTI_PROCESS_CONCURRENCY
    : DEFAULT_CONCURRENCY;
  const maxRetries = input?.maxRetries ?? base.maxRetries;
  const baseBackoffMs = input?.baseBackoffMs ?? base.baseBackoffMs;
  const maxBackoffMs = input?.maxBackoffMs ?? base.maxBackoffMs;
  const lockTimeoutMs = input?.lockTimeoutMs ?? base.lockTimeoutMs;
  const lockDeadlineMs =
    input?.lockDeadlineMs ??
    Math.max(base.lockDeadlineMs, lockTimeoutMs * (maxRetries + 1));

  const resolved: ResolvedConcurrencyConfig = {
    maxRetries,
    baseBackoffMs,
    maxBackoffMs,
    lockTimeoutMs,
    lockDeadlineMs,
  };

  assertPositiveInt(resolved.maxRetries, "concurrency.maxRetries");
  assertPositiveNumber(resolved.baseBackoffMs, "concurrency.baseBackoffMs");
  assertPositiveNumber(resolved.maxBackoffMs, "concurrency.maxBackoffMs");
  assertPositiveInt(resolved.lockTimeoutMs, "concurrency.lockTimeoutMs");
  assertPositiveInt(resolved.lockDeadlineMs, "concurrency.lockDeadlineMs");

  if (resolved.maxBackoffMs < resolved.baseBackoffMs) {
    throw new ConfigurationError(
      "concurrency.maxBackoffMs must be >= concurrency.baseBackoffMs",
    );
  }

  return resolved;
}

function assertPositiveInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ConfigurationError(`${field} must be a non-negative integer`);
  }
}

function assertPositiveNumber(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConfigurationError(`${field} must be a non-negative number`);
  }
}
