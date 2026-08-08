import { createDatabaseClient } from "@boss/db";
import { user } from "@boss/db/schema/auth";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createFirstAdmin } from "./bootstrap";

const { db, pool } = createDatabaseClient();

afterAll(async () => {
  await pool.end();
});

describe("createFirstAdmin", () => {
  it("creates the admin once and is a no-op on the repeated call", async () => {
    const email = `${crypto.randomUUID()}@bootstrap.test`;
    const password = "sufficiently-long-admin-password";

    expect(await createFirstAdmin({ email, password })).toBe("created");

    const created = await db.select().from(user).where(eq(user.email, email));
    expect(created).toHaveLength(1);
    expect(created[0]?.level).toBe("admin");

    expect(await createFirstAdmin({ email, password })).toBe("already-exists");

    const afterRepeat = await db
      .select()
      .from(user)
      .where(eq(user.email, email));
    expect(afterRepeat).toHaveLength(1);
  });
});
