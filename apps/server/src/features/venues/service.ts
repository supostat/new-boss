import { createDatabaseClient } from "@boss/db";
import type { UserVenue, Venue } from "@boss/db/schema/venues";
import { userVenue, venue } from "@boss/db/schema/venues";
import type { Result } from "@boss/shared/domain/result";
import { err, ok } from "@boss/shared/domain/result";
import { eq } from "drizzle-orm";

const { db } = createDatabaseClient();

export type VenueNameError = "name_taken";

// The unique index on normalized_name IS the uniqueness check: only the
// database sees concurrent names race-free, so 23505 is the source of truth.
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ("code" in error && error.code === "23505") {
    return true;
  }
  return "cause" in error && isUniqueViolation(error.cause);
}

export async function createVenue(
  name: string,
): Promise<Result<Venue, VenueNameError>> {
  try {
    const inserted = await db.insert(venue).values({ name }).returning();
    const created = inserted[0];
    if (created === undefined) {
      throw new Error("venue insert returned no row");
    }
    return ok(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return err("name_taken");
    }
    throw error;
  }
}

export async function renameVenue(
  id: string,
  name: string,
): Promise<Result<Venue, VenueNameError>> {
  try {
    const updated = await db
      .update(venue)
      .set({ name })
      .where(eq(venue.id, id))
      .returning();
    const renamed = updated[0];
    if (renamed === undefined) {
      throw new Error(`venue ${id} not found`);
    }
    return ok(renamed);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return err("name_taken");
    }
    throw error;
  }
}

// Archiving marks the venue and nothing else: membership windows keep the
// history of who belonged when, and a window in an archived venue simply
// has no effect until the venue is restored.
export async function archiveVenue(
  id: string,
  actorId: string,
): Promise<Venue> {
  const updated = await db
    .update(venue)
    .set({ disabledAt: new Date(), disabledBy: actorId })
    .where(eq(venue.id, id))
    .returning();
  const archived = updated[0];
  if (archived === undefined) {
    throw new Error(`venue ${id} not found`);
  }
  return archived;
}

export async function restoreVenue(id: string): Promise<Venue> {
  const updated = await db
    .update(venue)
    .set({ disabledAt: null, disabledBy: null })
    .where(eq(venue.id, id))
    .returning();
  const restored = updated[0];
  if (restored === undefined) {
    throw new Error(`venue ${id} not found`);
  }
  return restored;
}

export interface AssignMembership {
  venueId: string;
  userId: string;
  from: Date;
  to: Date | null;
}

export async function assignMembership(
  input: AssignMembership,
): Promise<UserVenue> {
  const inserted = await db
    .insert(userVenue)
    .values({
      venueId: input.venueId,
      userId: input.userId,
      validFrom: input.from,
      validTo: input.to,
    })
    .returning();
  const assigned = inserted[0];
  if (assigned === undefined) {
    throw new Error("membership insert returned no row");
  }
  return assigned;
}

export async function closeMembership(
  id: string,
  to: Date,
): Promise<UserVenue> {
  const updated = await db
    .update(userVenue)
    .set({ validTo: to })
    .where(eq(userVenue.id, id))
    .returning();
  const closed = updated[0];
  if (closed === undefined) {
    throw new Error(`membership ${id} not found`);
  }
  return closed;
}

export async function removeMembership(id: string): Promise<boolean> {
  const deleted = await db
    .delete(userVenue)
    .where(eq(userVenue.id, id))
    .returning({ id: userVenue.id });
  return deleted.length > 0;
}
