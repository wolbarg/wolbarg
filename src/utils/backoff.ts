/**
 * Full-jitter exponential backoff helpers shared by SQLite BUSY retry and HTTP 429 retry.
 */

export interface BackoffConfig {
  /** Maximum retry attempts after the first failure (default 5). */
  maxRetries?: number;
  /** Base delay in ms before jitter (default 50). */
  baseBackoffMs?: number;
  /** Cap on computed delay (default 2000). */
  maxBackoffMs?: number;
  /** Wall-clock budget in ms across all attempts (default 30_000). */
  deadlineMs?: number;
}

export interface ResolvedBackoffConfig {
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  deadlineMs: number;
}

export function resolveBackoffConfig(
  config: BackoffConfig = {},
): ResolvedBackoffConfig {
  const baseBackoffMs = config.baseBackoffMs ?? 50;
  const maxBackoffMs = config.maxBackoffMs ?? 2000;
  return {
    maxRetries: config.maxRetries ?? 5,
    baseBackoffMs,
    maxBackoffMs: Math.max(maxBackoffMs, baseBackoffMs),
    deadlineMs: config.deadlineMs ?? 30_000,
  };
}

/** Full-jitter delay: uniform in [0, min(cap, base┬╖2^attempt)]. */
export function fullJitterDelay(
  attempt: number,
  config: ResolvedBackoffConfig,
): number {
  const exp = Math.min(
    config.maxBackoffMs,
    config.baseBackoffMs * 2 ** attempt,
  );
  return Math.random() * exp;
}

export function deadlineExceeded(
  startedAt: number,
  config: ResolvedBackoffConfig,
): boolean {
  return performance.now() - startedAt >= config.deadlineMs;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse Retry-After header (seconds or HTTP-date). Returns ms, or null if absent/invalid.
 */
export function parseRetryAfterMs(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const trimmed = header.trim();
  const asSeconds = Number(trimmed);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.min(asSeconds * 1000, 120_000);
  }
  const asDate = Date.parse(trimmed);
  if (!Number.isNaN(asDate)) {
    const delta = asDate - Date.now();
    return delta > 0 ? Math.min(delta, 120_000) : 0;
  }
  return null;
}
