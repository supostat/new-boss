import { databaseUrl } from "@boss/db";
import type { ClientBase } from "pg";
import { Client } from "pg";
import { PgBoss } from "pg-boss";
import type { EnqueueOptions, JobDefinition, QueueAdapter } from "./queue";

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

  async work(jobs: readonly JobDefinition<never>[]): Promise<void> {
    for (const job of jobs) {
      await this.boss.createQueue(job.name);
      await this.boss.deleteAllJobs(job.name);
      await this.boss.work(
        job.name,
        { pollingIntervalSeconds: 0.5 },
        async (batch) => {
          for (const item of batch) {
            await job.handle(item.data as never);
          }
        },
      );
    }
  }

  async stop(): Promise<void> {
    await this.boss.stop({ graceful: false, timeout: 5000 });
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
