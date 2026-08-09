import { databaseUrl } from "@boss/db";
import type { ClientBase } from "pg";
import { Client } from "pg";
import { PgBoss } from "pg-boss";
import type {
  EnqueueOptions,
  JobDefinition,
  QueueAdapter,
  StopOptions,
} from "./queue";

// pg-boss polls every 2s by default; tests and dev poll-wait on delivery,
// and the tighter interval keeps that latency low.
const POLLING_INTERVAL_SECONDS = 0.5;

// Hard-stop budget for fast teardown; the graceful path rides pg-boss
// defaults instead.
const FAST_STOP_TIMEOUT_MS = 5000;

class PgBossAdapter implements QueueAdapter {
  readonly label = "pg-boss";
  private readonly boss = new PgBoss(databaseUrl());
  private readonly probe = new Client({ connectionString: databaseUrl() });

  async install(): Promise<void> {
    await this.boss.start();
    await this.probe.connect();
  }

  async enqueue(
    tx: ClientBase,
    name: string,
    payload: unknown,
    options?: EnqueueOptions,
  ): Promise<void> {
    await this.boss.send(name, (payload ?? {}) as object, {
      db: {
        executeSql: async (text: string, values?: unknown[]) => {
          const result = await tx.query(text, values as unknown[]);
          return { rows: result.rows };
        },
      },
      retryLimit: Math.max(0, (options?.maxAttempts ?? 1) - 1),
      retryDelay: 0,
    });
  }

  // Accumulated jobs survive a worker restart: work() only ensures the
  // queues exist and subscribes — it never deletes.
  async work(jobs: readonly JobDefinition<never>[]): Promise<void> {
    for (const job of jobs) {
      await this.boss.createQueue(job.name);
      await this.boss.work(
        job.name,
        { pollingIntervalSeconds: POLLING_INTERVAL_SECONDS },
        async (batch) => {
          for (const item of batch) {
            await job.handle(item.data as never);
          }
        },
      );
    }
  }

  async stop(options?: StopOptions): Promise<void> {
    if (options?.graceful === true) {
      await this.boss.stop({ graceful: true });
    } else {
      await this.boss.stop({ graceful: false, timeout: FAST_STOP_TIMEOUT_MS });
    }
    await this.probe.end();
  }

  async pending(name: string): Promise<number> {
    const result = await this.probe.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM pgboss.job WHERE name = $1 AND state IN ('created', 'retry', 'active')",
      [name],
    );
    return result.rows[0]?.n ?? 0;
  }

  async dead(name: string): Promise<number> {
    const result = await this.probe.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM pgboss.job WHERE name = $1 AND state = 'failed'",
      [name],
    );
    return result.rows[0]?.n ?? 0;
  }
}

export const pgbossAdapter: QueueAdapter = new PgBossAdapter();
