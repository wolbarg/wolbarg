/**
 * Shared on-disk corpora so 1k/10k/100k datasets are built once and reused.
 */

import { existsSync } from "node:fs";
import type { AgentOrc } from "agentorc";
import type { BenchContext } from "./types.ts";
import {
  createClient,
  dbPathFor,
  ensureCleanDb,
  populateDataset,
} from "./harness.ts";

const ready = new Map<number, string>();
const inflight = new Map<number, Promise<string>>();

/**
 * Ensure a dataset of `size` memories exists on disk and return its DB path.
 * Safe to call concurrently for the same size (single-flight).
 */
export async function ensureDataset(
  ctx: BenchContext,
  size: number,
  options?: { label?: string; startSeed?: number },
): Promise<string> {
  const cached = ready.get(size);
  if (cached && existsSync(cached)) {
    return cached;
  }

  const existing = inflight.get(size);
  if (existing) return existing;

  const promise = (async () => {
    const label = options?.label ?? `corpus-${size}`;
    const path = dbPathFor(ctx, label);
    ensureCleanDb(path);
    console.log(`    ⟳ building shared corpus (${size} memories) → ${label}`);
    const client = await createClient(ctx, path);
    try {
      await populateDataset(client, size, {
        startSeed: options?.startSeed ?? size * 1_000,
      });
    } finally {
      await client.close();
    }
    ready.set(size, path);
    inflight.delete(size);
    return path;
  })();

  inflight.set(size, promise);
  return promise;
}

/** Open a read/write client against a shared corpus (caller must close). */
export async function openDataset(
  ctx: BenchContext,
  size: number,
): Promise<{ client: AgentOrc; path: string }> {
  const path = await ensureDataset(ctx, size);
  const client = await createClient(ctx, path);
  return { client, path };
}

export function clearDatasetCache(): void {
  ready.clear();
  inflight.clear();
}
