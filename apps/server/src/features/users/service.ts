import { createHash, randomBytes } from "node:crypto";
import { createDatabaseClient } from "@boss/db";
import { user } from "@boss/db/schema/auth";
import type { Invite } from "@boss/db/schema/invites";
import { invite } from "@boss/db/schema/invites";
import type { Level } from "@boss/shared/domain/authz";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { createUser, revokeUserSessions } from "../../platform/auth";
import { env } from "../../platform/env";
import { queue } from "../../platform/queue";
import type { InviteEmailPayload } from "./jobs";
import { inviteEmailJob } from "./jobs";
import { inviteByTokenHash } from "./queries";

export const INVITE_VALIDITY_DAYS = 7;

export type InviteRejection = "invalid" | "expired" | "already-accepted";

export class InviteError extends Error {
  constructor(readonly reason: InviteRejection) {
    super(`invite ${reason}`);
  }
}

const { db, pool } = createDatabaseClient();

function mintToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

function inviteUrl(token: string): string {
  const origin = env.TRUSTED_ORIGINS[0] ?? "http://localhost:5173";
  return `${origin}/accept-invite?token=${token}`;
}

export interface CreateInvite {
  email: string;
  level: Level;
  invitedBy: string;
}

// The job becomes visible only if the invite row commits: both ride one
// transaction on one dedicated client.
export async function createInvite(input: CreateInvite): Promise<Invite> {
  const token = mintToken();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const transactionDb = drizzle(client);
    const inserted = await transactionDb
      .insert(invite)
      .values({
        email: input.email.toLowerCase(),
        level: input.level,
        tokenHash: hashToken(token),
        invitedBy: input.invitedBy,
        expiresAt: inviteExpiry(),
      })
      .returning();
    const created = inserted[0];
    if (created === undefined) {
      throw new Error("invite insert returned no row");
    }
    const payload: InviteEmailPayload = {
      inviteId: created.id,
      to: created.email,
      inviteUrl: inviteUrl(token),
    };
    await queue.enqueue(client, inviteEmailJob.name, payload);
    await client.query("COMMIT");
    return created;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeInvite(id: string): Promise<boolean> {
  const deleted = await db
    .delete(invite)
    .where(and(eq(invite.id, id), isNull(invite.acceptedAt)))
    .returning({ id: invite.id });
  return deleted.length > 0;
}

// Rotation kills the old link: the stored hash changes with the token.
export async function resendInvite(id: string): Promise<Invite> {
  const token = mintToken();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const transactionDb = drizzle(client);
    const updated = await transactionDb
      .update(invite)
      .set({
        tokenHash: hashToken(token),
        expiresAt: inviteExpiry(),
        sentAt: null,
      })
      .where(and(eq(invite.id, id), isNull(invite.acceptedAt)))
      .returning();
    const rotated = updated[0];
    if (rotated === undefined) {
      throw new InviteError("invalid");
    }
    const payload: InviteEmailPayload = {
      inviteId: rotated.id,
      to: rotated.email,
      inviteUrl: inviteUrl(token),
    };
    await queue.enqueue(client, inviteEmailJob.name, payload);
    await client.query("COMMIT");
    return rotated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export interface AcceptInvite {
  token: string;
  password: string;
  name: string;
}

export interface AcceptedInvite {
  userId: string;
  email: string;
}

// The atomic claim guarantees one-time use before any user is created; a
// claim that lands after a createUser failure is resolved by resend, never
// by unclaiming. The email comes back so the accept page can sign the
// invited user straight in.
export async function acceptInvite(
  input: AcceptInvite,
): Promise<AcceptedInvite> {
  const found = await inviteByTokenHash(db, hashToken(input.token));
  if (found === undefined) {
    throw new InviteError("invalid");
  }
  if (found.acceptedAt !== null) {
    throw new InviteError("already-accepted");
  }
  if (found.expiresAt.getTime() <= Date.now()) {
    throw new InviteError("expired");
  }
  const claimed = await db
    .update(invite)
    .set({ acceptedAt: new Date() })
    .where(and(eq(invite.id, found.id), isNull(invite.acceptedAt)))
    .returning({ id: invite.id });
  if (claimed.length === 0) {
    throw new InviteError("already-accepted");
  }
  const userId = await createUser({
    email: found.email,
    password: input.password,
    name: input.name,
    level: found.level,
  });
  return { userId, email: found.email };
}

// Disabling is a security act: the mark lands, the auth seam revokes every
// live session, and the sign-in hook refuses new ones.
export async function disableUser(userId: string): Promise<void> {
  await db
    .update(user)
    .set({ disabledAt: new Date() })
    .where(eq(user.id, userId));
  await revokeUserSessions(userId);
}

export async function enableUser(userId: string): Promise<void> {
  await db.update(user).set({ disabledAt: null }).where(eq(user.id, userId));
}
