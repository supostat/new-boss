import { createDatabaseClient } from "@boss/db";
import { invite } from "@boss/db/schema/invites";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../app";
import type { Session } from "../../platform/auth";
import { auth } from "../../platform/auth";
import { createFirstAdmin } from "../../platform/bootstrap";
import { queue } from "../../platform/queue";
import { createCallerFactory } from "../../platform/trpc";
import { appRouter } from "../../router";
import { inviteEmailJob } from "./jobs";

const { db, pool } = createDatabaseClient();
const createCaller = createCallerFactory(appRouter);

beforeAll(async () => {
  await queue.install();
  // Production work() never wipes queues; suite determinism is owned here:
  // leftovers of this queue are deleted before the worker subscribes.
  await db.execute(
    sql`delete from pgboss.job where name = ${inviteEmailJob.name}`,
  );
  await queue.work([inviteEmailJob]);
});

afterAll(async () => {
  await queue.stop();
  await pool.end();
});

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 15_000,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("condition not reached in time");
}

async function signInOverHttp(email: string, password: string) {
  const response = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response;
}

async function sessionFromResponse(response: Response): Promise<Session> {
  const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
  });
  if (session === null) {
    throw new Error("sign-in produced no session");
  }
  return session;
}

describe("the campaign closes: invite, deliver, accept, sign in", () => {
  it("holds end to end over real modules", async () => {
    const adminEmail = `${crypto.randomUUID()}@wire.test`;
    const adminPassword = "sufficiently-long-admin-password";
    expect(
      await createFirstAdmin({ email: adminEmail, password: adminPassword }),
    ).toBe("created");

    const adminSignIn = await signInOverHttp(adminEmail, adminPassword);
    expect(adminSignIn.status).toBe(200);
    const adminSession = await sessionFromResponse(adminSignIn);
    const adminCaller = createCaller({ session: adminSession });

    const invitedEmail = `${crypto.randomUUID()}@wire.test`;
    const created = await adminCaller.users.invite.create({
      email: invitedEmail,
      level: "manager",
    });

    const payloadRows = await db.execute(
      sql`select data->>'inviteUrl' as url from pgboss.job where name = ${inviteEmailJob.name} and data->>'inviteId' = ${created.id}`,
    );
    const inviteUrl = payloadRows.rows[0]?.url as string | undefined;
    expect(inviteUrl).toBeDefined();
    const rawToken = new URL(inviteUrl ?? "").searchParams.get("token") ?? "";
    expect(rawToken).not.toBe("");
    expect(created.tokenHash).not.toBe(rawToken);

    await waitFor(async () => {
      const rows = await db
        .select({ sentAt: invite.sentAt })
        .from(invite)
        .where(eq(invite.id, created.id));
      return rows[0]?.sentAt != null;
    });

    const publicCaller = createCaller({ session: null });
    const invitedPassword = "sufficiently-long-invited-password";
    await publicCaller.users.invite.accept({
      token: rawToken,
      password: invitedPassword,
      name: "Invited Manager",
    });

    const invitedSignIn = await signInOverHttp(invitedEmail, invitedPassword);
    expect(invitedSignIn.status).toBe(200);
    const invitedSession = await sessionFromResponse(invitedSignIn);
    expect(invitedSession.user.email).toBe(invitedEmail);
    expect(invitedSession.user.level).toBe("manager");
  }, 30_000);
});
