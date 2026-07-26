/**
 * Postgres LISTEN/NOTIFY backend for cross-process subscribe().
 *
 * Uses a dedicated connection (not the pool). Payload is IDs + metadata only.
 */

import type { Pool, PoolClient } from "pg";
import type {
  MemoryChangeCallback,
  MemoryChangeEvent,
  SubscribeBackend,
  SubscribeFilter,
  SubscribableEvent,
  Unsubscribe,
} from "./types.js";

/** Postgres `LISTEN` channel name for cross-process memory change events. */
export const WOLBARG_NOTIFY_CHANNEL = "wolbarg_events";

/**
 * Channel name for a deployment pinned to `schema`.
 *
 * NOTIFY is database-wide, not schema-scoped, so two Wolbarg deployments
 * sharing one database would cross-deliver events whenever their organization
 * names collide. Suffixing the channel keeps schema isolation real.
 *
 * The default (`public` / unset) schema keeps the bare channel name so
 * existing deployments and older SDK versions stay interoperable.
 */
export function notifyChannelForSchema(schema?: string): string {
  if (!schema || schema === "public") {
    return WOLBARG_NOTIFY_CHANNEL;
  }
  return `${WOLBARG_NOTIFY_CHANNEL}_${schema}`;
}

interface Subscription {
  filter: SubscribeFilter;
  callback: MemoryChangeCallback;
}

function matchesFilter(
  filter: SubscribeFilter,
  event: MemoryChangeEvent,
): boolean {
  if (filter.organization !== event.organization) {
    return false;
  }
  if (filter.agent !== undefined && filter.agent !== event.agent) {
    return false;
  }
  if (filter.event === undefined) {
    return true;
  }
  const events = Array.isArray(filter.event) ? filter.event : [filter.event];
  return events.some(
    (e: SubscribableEvent) => e === "*" || e === event.event,
  );
}

/**
 * Serialize a {@link MemoryChangeEvent} for `pg_notify` (≤ ~7900 bytes).
 *
 * @param event - Change event emitted after a memory write.
 */
export function serializeNotifyPayload(event: MemoryChangeEvent): string {
  const payload = JSON.stringify({
    event: event.event,
    organization: event.organization,
    agent: event.agent,
    memoryId: event.memoryId,
    timestamp: event.timestamp,
    traceId: event.traceId,
    sessionId: event.sessionId,
    upsertAction: event.upsertAction,
  });
  if (payload.length > 7900) {
    // Hard Postgres NOTIFY limit is 8000 bytes — drop optional fields.
    return JSON.stringify({
      event: event.event,
      organization: event.organization,
      agent: event.agent,
      memoryId: Array.isArray(event.memoryId)
        ? event.memoryId.slice(0, 20)
        : event.memoryId,
      timestamp: event.timestamp,
    });
  }
  return payload;
}

/**
 * Parse a NOTIFY payload back into a {@link MemoryChangeEvent}.
 *
 * @param raw - JSON string from `pg_notify`.
 * @returns Parsed event or `null` when invalid.
 */
export function parseNotifyPayload(raw: string): MemoryChangeEvent | null {
  try {
    const parsed = JSON.parse(raw) as MemoryChangeEvent;
    if (
      !parsed ||
      typeof parsed.event !== "string" ||
      typeof parsed.organization !== "string" ||
      typeof parsed.agent !== "string" ||
      typeof parsed.timestamp !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface PostgresListenerOptions {
  /** Factory that returns a dedicated client (not from the write pool). */
  connect: () => Promise<PoolClient>;
  /** Optional reconnect delay in ms. Default 1000. */
  reconnectDelayMs?: number;
  onError?: (error: unknown) => void;
  /** LISTEN channel. Defaults to {@link WOLBARG_NOTIFY_CHANNEL}. */
  channel?: string;
}

/** Cross-process {@link SubscribeBackend} using Postgres LISTEN/NOTIFY. */
export class PostgresSubscribeListener implements SubscribeBackend {
  private readonly subscriptions = new Map<number, Subscription>();
  private nextId = 1;
  private client: PoolClient | null = null;
  private closed = false;
  private reconnecting = false;
  private listenInFlight: Promise<void> | null = null;
  private readonly reconnectDelayMs: number;
  private readonly connect: () => Promise<PoolClient>;
  private readonly onError?: (error: unknown) => void;
  private readonly channel: string;

  /**
   * @param options.connect - Factory returning a dedicated LISTEN client.
   * @param options.reconnectDelayMs - Delay before reconnect attempts (default 1000).
   * @param options.onError - Optional error hook for connection failures.
   * @param options.channel - LISTEN channel (default {@link WOLBARG_NOTIFY_CHANNEL}).
   */
  constructor(options: PostgresListenerOptions) {
    this.connect = options.connect;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 1000;
    this.onError = options.onError;
    this.channel = options.channel ?? WOLBARG_NOTIFY_CHANNEL;
  }

  /** Open the LISTEN connection (lazy — also started on first subscribe). */
  async start(): Promise<void> {
    if (this.closed) {
      return;
    }
    await this.ensureListening();
  }

  private async ensureListening(): Promise<void> {
    if (this.client || this.closed) {
      return;
    }
    if (this.listenInFlight) {
      await this.listenInFlight;
      return;
    }
    this.listenInFlight = this.openListenConnection();
    try {
      await this.listenInFlight;
    } finally {
      this.listenInFlight = null;
    }
  }

  private async openListenConnection(): Promise<void> {
    if (this.client || this.closed) {
      return;
    }
    const client = await this.connect();
    if (this.closed) {
      try {
        client.release(true);
      } catch {
        // ignore
      }
      return;
    }
    this.client = client;
    client.on("notification", (msg) => {
      if (msg.channel !== this.channel || !msg.payload) {
        return;
      }
      const event = parseNotifyPayload(msg.payload);
      if (!event) {
        return;
      }
      this.dispatch(event);
    });
    client.on("error", (error) => {
      this.onError?.(error);
      void this.handleDisconnect();
    });
    client.on("end", () => {
      void this.handleDisconnect();
    });
    // Quote the identifier: unquoted LISTEN case-folds, but pg_notify() takes a
    // literal string, so a mixed-case channel would never match.
    await client.query(`LISTEN "${this.channel.replace(/"/g, '""')}"`);
  }

  private async handleDisconnect(): Promise<void> {
    if (this.closed || this.reconnecting) {
      return;
    }
    this.reconnecting = true;
    const prev = this.client;
    this.client = null;
    if (prev) {
      try {
        prev.release(true);
      } catch {
        // ignore
      }
    }
    try {
      await new Promise((r) => setTimeout(r, this.reconnectDelayMs));
      if (!this.closed) {
        await this.ensureListening();
      }
    } catch (error) {
      this.onError?.(error);
      this.reconnecting = false;
      if (!this.closed) {
        void this.handleDisconnect();
      }
      return;
    }
    this.reconnecting = false;
  }

  private dispatch(event: MemoryChangeEvent): void {
    for (const sub of this.subscriptions.values()) {
      if (!matchesFilter(sub.filter, event)) {
        continue;
      }
      try {
        sub.callback(event);
      } catch (error) {
        console.error(
          "[wolbarg] subscribe callback error:",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  /**
   * Register a filtered callback for memory change events.
   *
   * @param filter - Organization / agent / event-type filter.
   * @param callback - Invoked synchronously on each matching NOTIFY.
   * @returns Unsubscribe function.
   */
  subscribe(
    filter: SubscribeFilter,
    callback: MemoryChangeCallback,
  ): Unsubscribe {
    if (this.closed) {
      throw new Error("Subscribe backend is closed");
    }
    const id = this.nextId++;
    this.subscriptions.set(id, { filter, callback });
    void this.ensureListening();
    return () => {
      this.subscriptions.delete(id);
    };
  }

  /** True when at least one subscribe() callback is registered. */
  hasSubscribers(): boolean {
    return this.subscriptions.size > 0;
  }

  /**
   * Local emit is a no-op for Postgres — writers use NOTIFY in-transaction.
   * Kept so the shared SubscribeBackend interface is uniform.
   */
  emit(_event: MemoryChangeEvent): void {
    // Cross-process delivery happens via NOTIFY from the storage layer.
  }

  /** Tear down LISTEN connection and clear subscriptions. */
  async close(): Promise<void> {
    this.closed = true;
    this.subscriptions.clear();
    const pending = this.listenInFlight;
    if (pending) {
      await pending.catch(() => undefined);
    }
    const client = this.client;
    this.client = null;
    if (!client) {
      return;
    }
    // Destroy the pooled LISTEN client — UNLISTEN+release can hang while the
    // connection sits in ClientRead waiting for notifications.
    try {
      client.release(true);
    } catch {
      try {
        (client as { end?: () => Promise<void> }).end?.();
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Issue NOTIFY inside an already-open transaction client.
 *
 * @param channel - Target channel (default {@link WOLBARG_NOTIFY_CHANNEL}).
 */
export async function notifyMemoryChange(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  event: MemoryChangeEvent,
  channel: string = WOLBARG_NOTIFY_CHANNEL,
): Promise<void> {
  const payload = serializeNotifyPayload(event);
  await client.query(`SELECT pg_notify($1, $2)`, [channel, payload]);
}

/**
 * Build a {@link PostgresSubscribeListener} from an existing `pg` Pool.
 *
 * @param pool - Postgres connection pool (uses `pool.connect()` for LISTEN).
 * @param onError - Optional connection error callback.
 * @param channel - LISTEN channel (default {@link WOLBARG_NOTIFY_CHANNEL}).
 */
export function createPostgresListenerFromPool(
  pool: Pool,
  onError?: (error: unknown) => void,
  channel?: string,
): PostgresSubscribeListener {
  return new PostgresSubscribeListener({
    connect: () => pool.connect(),
    onError,
    ...(channel ? { channel } : {}),
  });
}
