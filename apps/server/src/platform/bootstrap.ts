import { createDatabaseClient } from "@boss/db";
import { user } from "@boss/db/schema/auth";
import { eq } from "drizzle-orm";
import { createUser } from "./auth";

export interface FirstAdmin {
  email: string;
  password: string;
}

export type BootstrapResult = "created" | "already-exists";

// Creating the first admin is an explicit act, repeatable without harm:
// an existing email means everything is already in place.
export async function createFirstAdmin(
  admin: FirstAdmin,
): Promise<BootstrapResult> {
  const email = admin.email.toLowerCase();
  const { db, pool } = createDatabaseClient();
  try {
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));
    if (existing.length > 0) {
      return "already-exists";
    }
    await createUser({
      email,
      password: admin.password,
      name: "Administrator",
      level: "admin",
    });
    return "created";
  } finally {
    await pool.end();
  }
}
