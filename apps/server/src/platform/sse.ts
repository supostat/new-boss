import { databaseUrl } from "@boss/db";
import type { ChangeEvent } from "@boss/shared/domain/realtime";
import type { ClientBase } from "pg";
import { Client } from "pg";

export const CHANGE_NOTIFY_CHANNEL = "boss_changes";

// Keeps proxies from idling the socket out and surfaces a dead socket as a
// write failure on the next beat.
export const HEARTBEAT_INTERVAL_MS = 25_000;

type ChangeSubscriber = (event: ChangeEvent) => void;

class SseHub {
  // One dedicated LISTEN connection per process, never from the pool: the
  // pool recycles clients, and a LISTEN on a returned client silently dies.
  private listenClient: Client | null = null;
  private readonly subscribers = new Set<ChangeSubscriber>();

  async install(): Promise<void> {
    if (this.listenClient !== null) {
      return;
    }
    const client = new Client({ connectionString: databaseUrl() });
    await client.connect();
    client.on("notification", (message) => {
      if (
        message.channel !== CHANGE_NOTIFY_CHANNEL ||
        message.payload === undefined
      ) {
        return;
      }
      const event = JSON.parse(message.payload) as ChangeEvent;
      for (const subscriber of this.subscribers) {
        subscriber(event);
      }
    });
    await client.query(`LISTEN ${CHANGE_NOTIFY_CHANNEL}`);
    this.listenClient = client;
  }

  subscribe(subscriber: ChangeSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  async stop(): Promise<void> {
    if (this.listenClient === null) {
      return;
    }
    await this.listenClient.end();
    this.listenClient = null;
    this.subscribers.clear();
  }
}

export const sse = new SseHub();

// Rides the CALLER's transaction client: Postgres delivers on commit, and a
// rollback leaves no event.
export async function emitChange(
  tx: ClientBase,
  event: ChangeEvent,
): Promise<void> {
  await tx.query("SELECT pg_notify($1, $2)", [
    CHANGE_NOTIFY_CHANNEL,
    JSON.stringify(event),
  ]);
}
