import { createDatabaseClient } from "@boss/db";
import { userVenue } from "@boss/db/schema/venues";
import { inVenue } from "@boss/shared/domain/authz";
import type { ChangeEvent } from "@boss/shared/domain/realtime";
import type { Result } from "@boss/shared/domain/result";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createUser } from "../../platform/auth";
import { sse } from "../../platform/sse";
import { membershipWindows, venueMembers } from "./queries";
import {
  archiveVenue,
  assignMembership,
  closeMembership,
  createVenue,
  removeMembership,
  renameVenue,
  restoreVenue,
} from "./service";

const { db, pool } = createDatabaseClient();
let actorId = "";

beforeAll(async () => {
  await sse.install();
  actorId = await createUser({
    email: `${crypto.randomUUID()}@venues.test`,
    password: "sufficiently-long-venue-password",
    name: "Venue Admin",
    level: "admin",
  });
});

afterAll(async () => {
  await sse.stop();
  await pool.end();
});

function nextEvent(timeoutMs: number): Promise<ChangeEvent | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);
    const unsubscribe = sse.subscribe((event) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(event);
    });
  });
}

// Notifications from earlier commits arrive asynchronously; a short settle
// keeps a fresh subscriber from catching a previous test step's event.
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

async function createMember(): Promise<string> {
  return createUser({
    email: `${crypto.randomUUID()}@venues.test`,
    password: "sufficiently-long-member-password",
    name: "Venue Member",
    level: "manager",
  });
}

function expectOk<T>(outcome: Result<T, "name_taken">): T {
  if (!outcome.ok) {
    throw new Error(`expected ok, got ${outcome.error}`);
  }
  return outcome.value;
}

describe("createVenue", () => {
  it("creates a venue and returns it", async () => {
    const name = `The Copper Still ${crypto.randomUUID()}`;
    const created = expectOk(await createVenue(name));
    expect(created.name).toBe(name);
    expect(created.disabledAt).toBeNull();
    expect(created.disabledBy).toBeNull();
  });

  it("returns name_taken for a duplicate differing only in case, punctuation and spacing", async () => {
    const suffix = crypto.randomUUID();
    expectOk(await createVenue(`The Velvet Fox ${suffix}`));

    const duplicate = await createVenue(`  the  VELVET  Fox!  ${suffix} `);
    expect(duplicate).toEqual({ ok: false, error: "name_taken" });
  });
});

describe("renameVenue", () => {
  it("renames a venue when the name is free", async () => {
    const created = expectOk(
      await createVenue(`The Gilded Lily ${crypto.randomUUID()}`),
    );
    const freshName = `The Second Gilding ${crypto.randomUUID()}`;
    const renamed = expectOk(await renameVenue(created.id, freshName));
    expect(renamed.name).toBe(freshName);
  });

  it("returns name_taken when renaming into a taken name", async () => {
    const suffix = crypto.randomUUID();
    expectOk(await createVenue(`The Iron Anchor ${suffix}`));
    const other = expectOk(await createVenue(`The Brass Bell ${suffix}`));

    const renamed = await renameVenue(other.id, `the iron anchor ${suffix}`);
    expect(renamed).toEqual({ ok: false, error: "name_taken" });
  });
});

describe("archiveVenue / restoreVenue", () => {
  it("sets the archive marks and touches no membership row", async () => {
    const created = expectOk(
      await createVenue(`The Old Vault ${crypto.randomUUID()}`),
    );
    const memberId = await createMember();
    const membership = await assignMembership({
      venueId: created.id,
      userId: memberId,
      from: new Date("2026-01-01T00:00:00Z"),
      to: null,
    });

    const archived = await archiveVenue(created.id, actorId);
    expect(archived.disabledAt).not.toBeNull();
    expect(archived.disabledBy).toBe(actorId);

    const rows = await db
      .select()
      .from(userVenue)
      .where(eq(userVenue.id, membership.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.validTo).toBeNull();

    const restored = await restoreVenue(created.id);
    expect(restored.disabledAt).toBeNull();
    expect(restored.disabledBy).toBeNull();
  });
});

describe("memberships", () => {
  it("assigns an open-ended window, closes it, and removes a mistaken one", async () => {
    const created = expectOk(
      await createVenue(`The Night Owl ${crypto.randomUUID()}`),
    );
    const memberId = await createMember();

    const open = await assignMembership({
      venueId: created.id,
      userId: memberId,
      from: new Date("2026-02-01T00:00:00Z"),
      to: null,
    });
    expect(open.validTo).toBeNull();

    const listed = await venueMembers(db, created.id);
    expect(listed.some((row) => row.membershipId === open.id)).toBe(true);

    const closeInstant = new Date("2026-03-01T00:00:00Z");
    const closed = await closeMembership(open.id, closeInstant);
    expect(closed.validTo?.getTime()).toBe(closeInstant.getTime());

    const mistaken = await assignMembership({
      venueId: created.id,
      userId: memberId,
      from: new Date("2026-04-01T00:00:00Z"),
      to: null,
    });
    expect(await removeMembership(mistaken.id)).toBe(true);
    const remaining = await venueMembers(db, created.id);
    expect(remaining.some((row) => row.membershipId === mistaken.id)).toBe(
      false,
    );
  });

  it("a committed rename delivers a venues event to a live subscriber", async () => {
    const created = expectOk(
      await createVenue(`The Signal House ${crypto.randomUUID()}`),
    );
    await settle();
    const waiting = nextEvent(3000);
    expectOk(
      await renameVenue(created.id, `The Signal Loft ${crypto.randomUUID()}`),
    );
    expect(await waiting).toEqual({ channel: "venues" });
  });

  it("a duplicate create rolls back and delivers nothing", async () => {
    const suffix = crypto.randomUUID();
    expectOk(await createVenue(`The Quiet Room ${suffix}`));
    await settle();
    const waiting = nextEvent(1200);
    const duplicate = await createVenue(`the quiet room ${suffix}`);
    expect(duplicate).toEqual({ ok: false, error: "name_taken" });
    expect(await waiting).toBeNull();
  });

  it("membership assign delivers venue_members with the venue id", async () => {
    const created = expectOk(
      await createVenue(`The Member Hall ${crypto.randomUUID()}`),
    );
    const memberId = await createMember();
    await settle();
    const waiting = nextEvent(3000);
    await assignMembership({
      venueId: created.id,
      userId: memberId,
      from: new Date("2026-07-01T00:00:00Z"),
      to: null,
    });
    expect(await waiting).toEqual({
      channel: "venue_members",
      venueId: created.id,
    });
  });

  it("windows read through queries agree with inVenue at the [from, to) boundary instants", async () => {
    const created = expectOk(
      await createVenue(`The Boundary House ${crypto.randomUUID()}`),
    );
    const memberId = await createMember();
    const from = new Date("2026-05-01T00:00:00Z");
    const to = new Date("2026-06-01T00:00:00Z");
    await assignMembership({
      venueId: created.id,
      userId: memberId,
      from,
      to,
    });

    const windows = await membershipWindows(db, memberId);
    expect(inVenue(windows, created.id, new Date(from.getTime() - 1))).toBe(
      false,
    );
    expect(inVenue(windows, created.id, from)).toBe(true);
    expect(inVenue(windows, created.id, new Date(to.getTime() - 1))).toBe(true);
    expect(inVenue(windows, created.id, to)).toBe(false);
  });
});
