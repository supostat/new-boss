import type { createDatabaseClient } from "@boss/db";
import { user } from "@boss/db/schema/auth";
import type { Invite } from "@boss/db/schema/invites";
import { invite } from "@boss/db/schema/invites";
import { eq, isNull } from "drizzle-orm";

type Database = ReturnType<typeof createDatabaseClient>["db"];

export async function inviteById(
  db: Database,
  id: string,
): Promise<Invite | undefined> {
  const rows = await db.select().from(invite).where(eq(invite.id, id));
  return rows[0];
}

export async function inviteByTokenHash(
  db: Database,
  tokenHash: string,
): Promise<Invite | undefined> {
  const rows = await db
    .select()
    .from(invite)
    .where(eq(invite.tokenHash, tokenHash));
  return rows[0];
}

export async function pendingInvites(db: Database): Promise<Invite[]> {
  return db.select().from(invite).where(isNull(invite.acceptedAt));
}

export async function listUsers(db: Database) {
  return db.select().from(user).orderBy(user.createdAt);
}
