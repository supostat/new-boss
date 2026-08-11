import type { createDatabaseClient } from "@boss/db";
import { user } from "@boss/db/schema/auth";
import type { Venue } from "@boss/db/schema/venues";
import { userVenue, venue } from "@boss/db/schema/venues";
import type { VenueMembership } from "@boss/shared/domain/authz";
import { eq } from "drizzle-orm";

type Database = ReturnType<typeof createDatabaseClient>["db"];

export async function listVenues(db: Database): Promise<Venue[]> {
  return db.select().from(venue).orderBy(venue.name);
}

export async function venueById(
  db: Database,
  id: string,
): Promise<Venue | undefined> {
  const rows = await db.select().from(venue).where(eq(venue.id, id));
  return rows[0];
}

// Everything above SQL speaks the primitive's language: windows come back
// as { venueId, from, to }, ready to feed inVenue.
export async function membershipWindows(
  db: Database,
  userId: string,
): Promise<VenueMembership[]> {
  return db
    .select({
      venueId: userVenue.venueId,
      from: userVenue.validFrom,
      to: userVenue.validTo,
    })
    .from(userVenue)
    .where(eq(userVenue.userId, userId));
}

export interface VenueMemberRow {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  from: Date;
  to: Date | null;
}

export async function venueMembers(
  db: Database,
  venueId: string,
): Promise<VenueMemberRow[]> {
  return db
    .select({
      membershipId: userVenue.id,
      userId: userVenue.userId,
      name: user.name,
      email: user.email,
      from: userVenue.validFrom,
      to: userVenue.validTo,
    })
    .from(userVenue)
    .innerJoin(user, eq(userVenue.userId, user.id))
    .where(eq(userVenue.venueId, venueId))
    .orderBy(userVenue.validFrom);
}
