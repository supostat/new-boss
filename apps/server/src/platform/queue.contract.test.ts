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
      await adapter.work([inviteEmail, alwaysFails]);
    }, 30_000);

    afterAll(async () => {
      await adapter.stop();
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
  });
}
