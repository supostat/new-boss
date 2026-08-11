import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../../app";
import type { Session } from "../../platform/auth";
import { auth, createUser } from "../../platform/auth";
import { createCallerFactory } from "../../platform/trpc";
import { appRouter } from "../../router";

const createCaller = createCallerFactory(appRouter);

async function signedInSession(level: "manager" | "admin"): Promise<Session> {
  const email = `${crypto.randomUUID()}@venues-router.test`;
  const password = "sufficiently-long-router-password";
  await createUser({ email, password, name: "Venues Router Test", level });

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
  adminSession = await signedInSession("admin");
  managerSession = await signedInSession("manager");
});

describe("venue procedures", () => {
  it("rejects sessionless calls as UNAUTHORIZED", async () => {
    const caller = createCaller({ session: null });
    await expect(caller.venues.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.venues.create({ name: "The Locked Door" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a manager as FORBIDDEN", async () => {
    const caller = createCaller({ session: managerSession });
    await expect(caller.venues.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.venues.create({ name: "The Managers Arms" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets an admin create, and the output carries the Result union", async () => {
    const caller = createCaller({ session: adminSession });
    const suffix = crypto.randomUUID();

    const created = await caller.venues.create({
      name: `The Router Tap ${suffix}`,
    });
    if (!created.ok) {
      throw new Error(`expected ok, got ${created.error}`);
    }
    expect(created.value.name).toBe(`The Router Tap ${suffix}`);

    const duplicate = await caller.venues.create({
      name: `the router tap ${suffix}`,
    });
    if (duplicate.ok) {
      throw new Error("expected the duplicate to be rejected");
    }
    expect(duplicate.error).toBe("name_taken");

    const listed = await caller.venues.list();
    expect(listed.some((row) => row.id === created.value.id)).toBe(true);
  });

  it("lets an admin walk the archive, restore and membership loop", async () => {
    const caller = createCaller({ session: adminSession });
    const created = await caller.venues.create({
      name: `The Full Circle ${crypto.randomUUID()}`,
    });
    if (!created.ok) {
      throw new Error(`expected ok, got ${created.error}`);
    }
    const venueId = created.value.id;

    const archived = await caller.venues.archive({ venueId });
    expect(archived.disabledAt).not.toBeNull();
    expect(archived.disabledBy).toBe(adminSession.user.id);

    const restored = await caller.venues.restore({ venueId });
    expect(restored.disabledAt).toBeNull();

    const assigned = await caller.venues.members.assign({
      venueId,
      userId: managerSession.user.id,
      from: new Date("2026-01-01T00:00:00Z"),
      to: null,
    });
    const members = await caller.venues.members.list({ venueId });
    expect(members.some((row) => row.membershipId === assigned.id)).toBe(true);

    const closed = await caller.venues.members.close({
      membershipId: assigned.id,
      to: new Date("2026-02-01T00:00:00Z"),
    });
    expect(closed.validTo).not.toBeNull();
  });
});
