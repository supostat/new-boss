import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { QueueAdapter } from "./queue";
import { defineJob } from "./queue";
import { pgbossAdapter } from "./queue.pgboss";

// Local compose database.
const DATABASE_URL = "postgres://boss:boss@localhost:5432/boss";

interface InvitePayload {
  to: string;
  role: string;
  token: string;
}

const candidates: readonly QueueAdapter[] = [pgbossAdapter];

async function withTransaction(
  outcome: "COMMIT" | "ROLLBACK",
  run: (tx: Client) => Promise<void>,
): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await run(client);
    await client.query(outcome);
  } finally {
    await client.end();
  }
}

async function eventually(
  check: () => Promise<boolean> | boolean,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return check();
}

for (const adapter of candidates) {
  describe(`queue contract: ${adapter.label}`, () => {
    const inviteLog: InvitePayload[] = [];
    let failCalls = 0;
    let stoppedByDrainCase = false;

    const inviteEmail = defineJob<InvitePayload>(
      "auth.invite_email",
      async (payload) => {
        inviteLog.push(payload);
      },
    );
    const alwaysFails = defineJob<unknown>("auth.always_fails", async () => {
      failCalls += 1;
      throw new Error("boom");
    });

    beforeAll(async () => {
      await adapter.install();
      // Production work() never wipes queues, so suite determinism is owned
      // here: leftovers of the probe queues are deleted before subscribing.
      const cleaner = new Client({ connectionString: DATABASE_URL });
      await cleaner.connect();
      await cleaner.query("DELETE FROM pgboss.job WHERE name = ANY($1)", [
        [inviteEmail.name, alwaysFails.name, "auth.slow_drain"],
      ]);
      await cleaner.end();
      await adapter.work([inviteEmail, alwaysFails]);
    }, 30_000);

    afterAll(async () => {
      if (!stoppedByDrainCase) {
        await adapter.stop();
      }
    }, 15_000);

    it("leaves nothing behind when the enqueueing transaction rolls back", async () => {
      await withTransaction("ROLLBACK", async (tx) => {
        await adapter.enqueue(tx, inviteEmail.name, {
          to: "ghost@boss.example",
          role: "manager",
          token: "rollback-token",
        });
      });
      expect(await adapter.pending(inviteEmail.name)).toBe(0);
      const delivered = await eventually(
        () => inviteLog.some((entry) => entry.token === "rollback-token"),
        1_500,
      );
      expect(delivered).toBe(false);
    }, 15_000);

    it("executes the job with its payload when the transaction commits", async () => {
      await withTransaction("COMMIT", async (tx) => {
        await adapter.enqueue(tx, inviteEmail.name, {
          to: "new.manager@boss.example",
          role: "manager",
          token: "commit-token",
        });
      });
      const delivered = await eventually(
        () => inviteLog.some((entry) => entry.token === "commit-token"),
        10_000,
      );
      expect(delivered).toBe(true);
    }, 20_000);

    it("retries a failing job and lands it dead after maxAttempts", async () => {
      await withTransaction("COMMIT", async (tx) => {
        await adapter.enqueue(
          tx,
          alwaysFails.name,
          { reason: "bakeoff" },
          { maxAttempts: 2 },
        );
      });
      const died = await eventually(
        async () => (await adapter.dead(alwaysFails.name)) === 1,
        20_000,
      );
      expect(died).toBe(true);
      expect(failCalls).toBeGreaterThanOrEqual(2);
    }, 30_000);

    it("answers pending and dead counts from raw SQL", async () => {
      expect(await adapter.pending(inviteEmail.name)).toBe(0);
      expect(await adapter.dead(alwaysFails.name)).toBe(1);
    }, 10_000);

    // Runs last and owns the final stop: stopping the singleton boss ends
    // processing for the whole file.
    it("graceful stop drains the active job before resolving", async () => {
      let releaseLatch = (): void => {};
      const latch = new Promise<void>((resolve) => {
        releaseLatch = resolve;
      });
      let handlerStarted = false;
      let handlerCompleted = false;
      const slowDrain = defineJob<unknown>("auth.slow_drain", async () => {
        handlerStarted = true;
        await latch;
        handlerCompleted = true;
      });
      await adapter.work([slowDrain]);
      await withTransaction("COMMIT", async (tx) => {
        await adapter.enqueue(tx, slowDrain.name, { reason: "drain" });
      });
      expect(await eventually(() => handlerStarted, 10_000)).toBe(true);

      const stopping = adapter.stop({ graceful: true });
      expect(handlerCompleted).toBe(false);
      releaseLatch();
      await stopping;
      stoppedByDrainCase = true;
      expect(handlerCompleted).toBe(true);
    }, 30_000);
  });
}
