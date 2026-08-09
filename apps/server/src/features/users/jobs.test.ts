import { createDatabaseClient } from "@boss/db";
import { invite } from "@boss/db/schema/invites";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createUser } from "../../platform/auth";
import { inviteEmailJob } from "./jobs";
import { hashToken } from "./service";

const { db, pool } = createDatabaseClient();

afterAll(async () => {
  await pool.end();
});

const mailpitApi = "http://localhost:8026/api/v1";

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

async function insertPendingInvite(): Promise<{ id: string; email: string }> {
  const email = `${crypto.randomUUID()}@jobs.test`;
  const invitedBy = await createUser({
    email: `${crypto.randomUUID()}@jobs.test`,
    password: "sufficiently-long-inviter-password",
    name: "Inviting Admin",
    level: "admin",
  });
  const inserted = await db
    .insert(invite)
    .values({
      email,
      level: "manager",
      tokenHash: hashToken(crypto.randomUUID()),
      invitedBy,
      expiresAt: new Date(Date.now() + 60_000),
    })
    .returning({ id: invite.id });
  const created = inserted[0];
  if (created === undefined) {
    throw new Error("test invite insert returned no row");
  }
  return { id: created.id, email };
}

describe("inviteEmailJob", () => {
  it("delivers once and survives replay", async () => {
    const pending = await insertPendingInvite();
    const payload = {
      inviteId: pending.id,
      to: pending.email,
      inviteUrl: "https://portal.test/accept-invite?token=raw",
    };

    await inviteEmailJob.handle(payload);

    const afterFirst = await db
      .select()
      .from(invite)
      .where(eq(invite.id, pending.id));
    expect(afterFirst[0]?.sentAt).not.toBeNull();
    await expect.poll(() => countLettersFor(pending.email)).toBe(1);

    await inviteEmailJob.handle(payload);
    expect(await countLettersFor(pending.email)).toBe(1);
  });
});
