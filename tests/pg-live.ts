/**
 * Shared harness for live Postgres suites.
 *
 * Every suite runs inside a throwaway schema so results never depend on what
 * the target database already contains. Without this, a leftover
 * `memory_embeddings` column of a different width (a previous benchmark, say)
 * makes the whole suite fail on dimension mismatch.
 */

/** Connection string for live Postgres suites, or `""` when not configured. */
export const LIVE_DATABASE_URL =
  process.env.WOLBARG_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

/** True when live Postgres suites should run. */
export const hasLivePostgres = LIVE_DATABASE_URL !== "";

/** Minimal shape used here — `pg` is an optional peer with loose typings. */
interface RawClient {
  connect: () => Promise<void>;
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
  end: () => Promise<void>;
}

/** Unique, identifier-safe schema name for one suite run. */
export function uniqueSchema(prefix: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `wt_${prefix.replace(/[^a-z0-9]/gi, "").toLowerCase()}_${suffix}`;
}

/** Run `fn` against a throwaway direct connection (never the SDK pool). */
async function withClient<T>(fn: (client: RawClient) => Promise<T>): Promise<T> {
  const mod = (await import("pg")) as unknown as {
    Client?: new (config: Record<string, unknown>) => RawClient;
    default?: { Client: new (config: Record<string, unknown>) => RawClient };
  };
  const Ctor = mod.Client ?? mod.default?.Client;
  if (!Ctor) {
    throw new Error("pg is not installed; live Postgres helpers are unavailable");
  }
  const client = new Ctor({ connectionString: LIVE_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** Drop a test schema and everything in it. Safe to call when absent. */
export async function dropSchema(schema: string): Promise<void> {
  if (!hasLivePostgres) {
    return;
  }
  await withClient(async (client) => {
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  });
}

/** True when `schema.memories` holds a row with this id. */
export async function memoryExistsInSchema(
  schema: string,
  id: string,
): Promise<boolean> {
  return withClient(async (client) => {
    const present = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = 'memories' LIMIT 1`,
      [schema],
    );
    if (present.rows.length === 0) {
      return false;
    }
    const res = await client.query(
      `SELECT 1 FROM ${schema}.memories WHERE id = $1 LIMIT 1`,
      [id],
    );
    return res.rows.length > 0;
  });
}

/** Names of tables present in `schema`. */
export async function tablesInSchema(schema: string): Promise<string[]> {
  return withClient(async (client) => {
    const res = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 ORDER BY table_name`,
      [schema],
    );
    return res.rows.map((r) => String(r.table_name));
  });
}
