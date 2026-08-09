import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createDatabaseClient } from "@boss/db";
import { invite } from "@boss/db/schema/invites";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inviteEmailJob } from "./features/users/jobs";
import { createInvite } from "./features/users/service";
import { createUser } from "./platform/auth";
import { queue } from "./platform/queue";

const { db, pool } = createDatabaseClient();

const WORKER_TEST_PORT = 3101;
const mailpitApi = "http://localhost:8026/api/v1";

beforeAll(async () => {
  await queue.install();
  // The child worker must only ever process jobs this test creates:
  // accumulated queue rows are deleted before the spawn.
  await db.execute(
    sql`delete from pgboss.job where name = ${inviteEmailJob.name}`,
  );
});

afterAll(async () => {
  await queue.stop();
  await pool.end();
});

async function healthzStatus(): Promise<number> {
  try {
    const response = await fetch(
      `http://localhost:${WORKER_TEST_PORT}/healthz`,
    );
    return response.status;
  } catch {
    return 0;
  }
}

async function countLettersFor(email: string): Promise<number> {
  const response = await fetch(
    `${mailpitApi}/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  if (!response.ok) {
    throw new Error(`mailpit search failed: ${response.status}`);
  }
  const result = (await response.json()) as { messages: unknown[] };
  return result.messages.length;
}

describe("worker entrypoint", () => {
  it("drains the queue end to end and shuts down cleanly on SIGTERM", async () => {
    const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
    const child = spawn("bun", ["apps/server/src/worker.ts"], {
      cwd: repositoryRoot,
      env: { ...process.env, WORKER_PORT: String(WORKER_TEST_PORT) },
      stdio: "ignore",
    });
    const exited = new Promise<number | null>((resolve) => {
      child.on("exit", (code) => resolve(code));
    });
    try {
      await expect
        .poll(() => healthzStatus(), { timeout: 20_000, interval: 250 })
        .toBe(200);

      const invitedBy = await createUser({
        email: `${crypto.randomUUID()}@worker.test`,
        password: "sufficiently-long-inviter-password",
        name: "Worker Admin",
        level: "admin",
      });
      const created = await createInvite({
        email: `${crypto.randomUUID()}@worker.test`,
        level: "manager",
        invitedBy,
      });

      await expect
        .poll(() => countLettersFor(created.email), {
          timeout: 20_000,
          interval: 250,
        })
        .toBe(1);
      await expect
        .poll(async () => {
          const rows = await db
            .select({ sentAt: invite.sentAt })
            .from(invite)
            .where(eq(invite.id, created.id));
          return rows[0]?.sentAt != null;
        })
        .toBe(true);

      child.kill("SIGTERM");
      expect(await exited).toBe(0);
    } finally {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }
  }, 60_000);
});
