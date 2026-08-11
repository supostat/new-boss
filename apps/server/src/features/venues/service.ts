import { createDatabaseClient } from "@boss/db";
import type { UserVenue, Venue } from "@boss/db/schema/venues";
import { userVenue, venue } from "@boss/db/schema/venues";
import type { Result } from "@boss/shared/domain/result";
import { err, ok } from "@boss/shared/domain/result";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { emitChange } from "../../platform/sse";

const { pool } = createDatabaseClient();

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

// Every mutation rides one dedicated-client transaction: the change and its
// pg_notify commit together, and a rollback leaves no event.
async function inTransaction<T>(
  work: (transactionDb: NodePgDatabase, client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(drizzle(client), client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createVenue(
  name: string,
): Promise<Result<Venue, VenueNameError>> {
  try {
    return await inTransaction(async (transactionDb, client) => {
      const inserted = await transactionDb
        .insert(venue)
        .values({ name })
        .returning();
      const created = inserted[0];
      if (created === undefined) {
        throw new Error("venue insert returned no row");
      }
      await emitChange(client, { channel: "venues" });
      return ok(created);
    });
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
    return await inTransaction(async (transactionDb, client) => {
      const updated = await transactionDb
        .update(venue)
        .set({ name })
        .where(eq(venue.id, id))
        .returning();
      const renamed = updated[0];
      if (renamed === undefined) {
        throw new Error(`venue ${id} not found`);
      }
      await emitChange(client, { channel: "venues" });
      return ok(renamed);
    });
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
  return inTransaction(async (transactionDb, client) => {
    const updated = await transactionDb
      .update(venue)
      .set({ disabledAt: new Date(), disabledBy: actorId })
      .where(eq(venue.id, id))
      .returning();
    const archived = updated[0];
    if (archived === undefined) {
      throw new Error(`venue ${id} not found`);
    }
    await emitChange(client, { channel: "venues" });
    return archived;
  });
}

export async function restoreVenue(id: string): Promise<Venue> {
  return inTransaction(async (transactionDb, client) => {
    const updated = await transactionDb
      .update(venue)
      .set({ disabledAt: null, disabledBy: null })
      .where(eq(venue.id, id))
      .returning();
    const restored = updated[0];
    if (restored === undefined) {
      throw new Error(`venue ${id} not found`);
    }
    await emitChange(client, { channel: "venues" });
    return restored;
  });
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
  return inTransaction(async (transactionDb, client) => {
    const inserted = await transactionDb
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
    await emitChange(client, {
      channel: "venue_members",
      venueId: assigned.venueId,
    });
    return assigned;
  });
}

export async function closeMembership(
  id: string,
  to: Date,
): Promise<UserVenue> {
  return inTransaction(async (transactionDb, client) => {
    const updated = await transactionDb
      .update(userVenue)
      .set({ validTo: to })
      .where(eq(userVenue.id, id))
      .returning();
    const closed = updated[0];
    if (closed === undefined) {
      throw new Error(`membership ${id} not found`);
    }
    await emitChange(client, {
      channel: "venue_members",
      venueId: closed.venueId,
    });
    return closed;
  });
}

export async function removeMembership(id: string): Promise<boolean> {
  return inTransaction(async (transactionDb, client) => {
    const deleted = await transactionDb
      .delete(userVenue)
      .where(eq(userVenue.id, id))
      .returning({ id: userVenue.id, venueId: userVenue.venueId });
    const removed = deleted[0];
    if (removed === undefined) {
      return false;
    }
    await emitChange(client, {
      channel: "venue_members",
      venueId: removed.venueId,
    });
    return true;
  });
}
