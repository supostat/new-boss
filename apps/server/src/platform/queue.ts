import type { ClientBase } from "pg";
import { pgbossAdapter } from "./queue.pgboss";

export interface JobDefinition<TPayload> {
  readonly name: string;
  handle(payload: TPayload): Promise<void>;
}

export function defineJob<TPayload>(
  name: string,
  handle: (payload: TPayload) => Promise<void>,
): JobDefinition<TPayload> {
  return { name, handle: (payload) => handle(payload) };
}

export interface EnqueueOptions {
  readonly maxAttempts?: number;
}

// enqueue rides the CALLER's transaction: the job becomes visible only if
// that transaction commits. pending/dead answer from raw SQL over the
// adapter's own tables.
export interface QueueAdapter {
  readonly label: string;
  install(): Promise<void>;
  enqueue(
    tx: ClientBase,
    name: string,
    payload: unknown,
    options?: EnqueueOptions,
  ): Promise<void>;
  work(jobs: readonly JobDefinition<never>[]): Promise<void>;
  stop(): Promise<void>;
  pending(name: string): Promise<number>;
  dead(name: string): Promise<number>;
}

export const queue: QueueAdapter = pgbossAdapter;
