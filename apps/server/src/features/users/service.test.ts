import { createDatabaseClient } from "@boss/db";
import { user } from "@boss/db/schema/auth";
import { invite } from "@boss/db/schema/invites";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createUser } from "../../platform/auth";
import { queue } from "../../platform/queue";
import { inviteEmailJob } from "./jobs";
import {
  acceptInvite,
  createInvite,
  hashToken,
  InviteError,
  resendInvite,
  revokeInvite,
} from "./service";

const { db, pool } = createDatabaseClient();
let adminId = "";

beforeAll(async () => {
  await queue.install();
  adminId = await createUser({
    email: `${crypto.randomUUID()}@service.test`,
    password: "sufficiently-long-admin-password",
    name: "Inviting Admin",
    level: "admin",
  });
});

afterAll(async () => {
  await queue.stop();
  await pool.end();
});

async function jobRowsByInviteId(inviteId: string): Promise<number> {
  const result = await db.execute(
    sql`select id from pgboss.job where name = ${inviteEmailJob.name} and data->>'inviteId' = ${inviteId}`,
  );
  return result.rows.length;
}

async function rawTokenFromJobPayload(inviteId: string): Promise<string> {
  const result = await db.execute(
    sql`select data->>'inviteUrl' as url from pgboss.job where name = ${inviteEmailJob.name} and data->>'inviteId' = ${inviteId}`,
  );
  const url = result.rows[0]?.url as string | undefined;
  if (url === undefined) {
    throw new Error("no job payload found for invite");
  }
  return new URL(url).searchParams.get("token") ?? "";
}

describe("createInvite", () => {
  it("commits the invite row and the job row together", async () => {
    const created = await createInvite({
      email: `${crypto.randomUUID()}@service.test`,
      level: "manager",
      invitedBy: adminId,
    });

    const rows = await db
      .select()
      .from(invite)
      .where(eq(invite.id, created.id));
    expect(rows).toHaveLength(1);
    expect(await jobRowsByInviteId(created.id)).toBe(1);

    const rawToken = await rawTokenFromJobPayload(created.id);
    expect(rawToken).not.toBe("");
    expect(hashToken(rawToken)).toBe(created.tokenHash);
  });

  it("a rolled-back transaction leaves neither the invite nor the job", async () => {
    const markerId = crypto.randomUUID();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const transactionDb = drizzle(client);
      await transactionDb.insert(invite).values({
        email: `${crypto.randomUUID()}@service.test`,
        level: "manager",
        tokenHash: hashToken(markerId),
        invitedBy: adminId,
        expiresAt: new Date(Date.now() + 60_000),
      });
      await queue.enqueue(client, inviteEmailJob.name, {
        inviteId: markerId,
        to: "nobody@service.test",
        inviteUrl: "https://portal.test/accept-invite?token=rollback",
      });
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    const rows = await db
      .select()
      .from(invite)
      .where(eq(invite.tokenHash, hashToken(markerId)));
    expect(rows).toHaveLength(0);
    expect(await jobRowsByInviteId(markerId)).toBe(0);
  });
});

describe("acceptInvite", () => {
  it("creates the user with the invite's level, exactly once", async () => {
    const created = await createInvite({
      email: `${crypto.randomUUID()}@service.test`,
      level: "manager",
      invitedBy: adminId,
    });
    const rawToken = await rawTokenFromJobPayload(created.id);

    const userId = await acceptInvite({
      token: rawToken,
      password: "sufficiently-long-invited-password",
      name: "Invited Manager",
    });

    const userRows = await db.select().from(user).where(eq(user.id, userId));
    expect(userRows[0]?.level).toBe("manager");

    await expect(
      acceptInvite({
        token: rawToken,
        password: "sufficiently-long-invited-password",
        name: "Invited Manager",
      }),
    ).rejects.toThrowError(new InviteError("already-accepted"));
  });

  it("rejects an expired invite", async () => {
    const rawToken = crypto.randomUUID();
    await db.insert(invite).values({
      email: `${crypto.randomUUID()}@service.test`,
      level: "manager",
      tokenHash: hashToken(rawToken),
      invitedBy: adminId,
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      acceptInvite({
        token: rawToken,
        password: "sufficiently-long-invited-password",
        name: "Too Late",
      }),
    ).rejects.toThrowError(new InviteError("expired"));
  });

  it("rejects a revoked invite as invalid", async () => {
    const created = await createInvite({
      email: `${crypto.randomUUID()}@service.test`,
      level: "manager",
      invitedBy: adminId,
    });
    const rawToken = await rawTokenFromJobPayload(created.id);

    expect(await revokeInvite(created.id)).toBe(true);

    await expect(
      acceptInvite({
        token: rawToken,
        password: "sufficiently-long-invited-password",
        name: "Revoked Guest",
      }),
    ).rejects.toThrowError(new InviteError("invalid"));
  });
});

describe("resendInvite", () => {
  it("rotates the hash, resets delivery, and enqueues again", async () => {
    const created = await createInvite({
      email: `${crypto.randomUUID()}@service.test`,
      level: "manager",
      invitedBy: adminId,
    });

    const rotated = await resendInvite(created.id);

    expect(rotated.tokenHash).not.toBe(created.tokenHash);
    expect(rotated.sentAt).toBeNull();
    expect(await jobRowsByInviteId(created.id)).toBe(2);
  });
});
