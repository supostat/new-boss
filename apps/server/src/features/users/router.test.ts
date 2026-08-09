import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../app";
import type { Session } from "../../platform/auth";
import { auth, createUser } from "../../platform/auth";
import { queue } from "../../platform/queue";
import { createCallerFactory } from "../../platform/trpc";
import { appRouter } from "../../router";

const createCaller = createCallerFactory(appRouter);

async function signedInSession(level: "manager" | "admin"): Promise<Session> {
  const email = `${crypto.randomUUID()}@router.test`;
  const password = "sufficiently-long-router-password";
  await createUser({ email, password, name: "Router Test", level });

  const signIn = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = (signIn.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
  });
  if (session === null) {
    throw new Error("test sign-in produced no session");
  }
  return session;
}

let adminSession: Session;
let managerSession: Session;

beforeAll(async () => {
  await queue.install();
  adminSession = await signedInSession("admin");
  managerSession = await signedInSession("manager");
});

afterAll(async () => {
  await queue.stop();
});

describe("invite procedures", () => {
  it("rejects a sessionless create as UNAUTHORIZED", async () => {
    const caller = createCaller({ session: null });
    await expect(
      caller.users.invite.create({
        email: "nobody@router.test",
        level: "manager",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a manager create as FORBIDDEN", async () => {
    const caller = createCaller({ session: managerSession });
    await expect(
      caller.users.invite.create({
        email: "nobody@router.test",
        level: "manager",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets an admin create and list invites", async () => {
    const caller = createCaller({ session: adminSession });
    const email = `${crypto.randomUUID()}@router.test`;

    const created = await caller.users.invite.create({
      email,
      level: "manager",
    });
    expect(created.email).toBe(email);

    const pending = await caller.users.invite.list();
    expect(pending.some((row) => row.id === created.id)).toBe(true);
  });

  it("rejects sessionless management as UNAUTHORIZED", async () => {
    const caller = createCaller({ session: null });
    await expect(caller.users.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.users.disable({ userId: "irrelevant" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects manager management as FORBIDDEN", async () => {
    const caller = createCaller({ session: managerSession });
    await expect(caller.users.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.users.disable({ userId: "irrelevant" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects self-disable as FORBIDDEN", async () => {
    const caller = createCaller({ session: adminSession });
    await expect(
      caller.users.disable({ userId: adminSession.user.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets an admin disable and enable another user, visible in the list", async () => {
    const caller = createCaller({ session: adminSession });
    const email = `${crypto.randomUUID()}@router.test`;
    const targetId = await createUser({
      email,
      password: "sufficiently-long-target-password",
      name: "Disable Target",
      level: "manager",
    });

    await caller.users.disable({ userId: targetId });
    const afterDisable = await caller.users.list();
    expect(
      afterDisable.find((row) => row.id === targetId)?.disabledAt,
    ).not.toBeNull();

    await caller.users.enable({ userId: targetId });
    const afterEnable = await caller.users.list();
    expect(
      afterEnable.find((row) => row.id === targetId)?.disabledAt,
    ).toBeNull();
  });

  it("lets a sessionless accept reach invite validation", async () => {
    const caller = createCaller({ session: null });
    await expect(
      caller.users.invite.accept({
        token: "not-a-real-token",
        password: "sufficiently-long-password",
        name: "Nobody",
      }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({ reason: "invalid" }),
    });
  });
});
