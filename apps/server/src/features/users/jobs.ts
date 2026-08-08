import { createDatabaseClient } from "@boss/db";
import { invite } from "@boss/db/schema/invites";
import { eq } from "drizzle-orm";
import { mailer } from "../../platform/mailer";
import { defineJob } from "../../platform/queue";

export interface InviteEmailPayload {
  inviteId: string;
  to: string;
  inviteUrl: string;
}

const { db } = createDatabaseClient();

// Survives replay: the delivery mark is read before anything is sent, so a
// repeated delivery of the same payload changes nothing.
export const inviteEmailJob = defineJob<InviteEmailPayload>(
  "auth.invite_email",
  async (payload) => {
    const rows = await db
      .select()
      .from(invite)
      .where(eq(invite.id, payload.inviteId));
    const found = rows[0];
    if (
      found === undefined ||
      found.sentAt !== null ||
      found.acceptedAt !== null
    ) {
      return;
    }
    await mailer.sendInvite({ to: payload.to, inviteUrl: payload.inviteUrl });
    await db
      .update(invite)
      .set({ sentAt: new Date() })
      .where(eq(invite.id, payload.inviteId));
  },
);
