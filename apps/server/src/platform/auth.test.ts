import { createDatabaseClient } from "@boss/db";
import { session, user } from "@boss/db/schema/auth";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../app";
import { auth, createUser } from "./auth";

const { db, pool } = createDatabaseClient();

afterAll(async () => {
  await pool.end();
});

describe("auth surface", () => {
  it("stores the session in our Postgres through our schema", async () => {
    const email = `${crypto.randomUUID()}@auth.test`;
    const password = "sufficiently-long-test-password";

    const userId = await createUser({
      email,
      password,
      name: "Auth Test Manager",
      level: "manager",
    });

    const signedIn = await auth.api.signInEmail({
      body: { email, password },
    });
    expect(signedIn.user.id).toBe(userId);

    const sessionRows = await db
      .select()
      .from(session)
      .where(eq(session.userId, userId));
    expect(sessionRows.length).toBeGreaterThan(0);

    const userRows = await db.select().from(user).where(eq(user.id, userId));
    expect(userRows).toHaveLength(1);
    expect(userRows[0]?.level).toBe("manager");
  });

  it("rejects sign-up over HTTP: registration is closed", async () => {
    const response = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `${crypto.randomUUID()}@auth.test`,
        password: "an-irrelevant-password",
        name: "Nobody",
      }),
    });
    expect(response.status).toBe(400);
  });
});
