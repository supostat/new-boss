import { describe, expect, it } from "vitest";
import { app } from "./app";
import { createFirstAdmin } from "./platform/bootstrap";

describe("app wire: bootstrap, sign-in, session", () => {
  it("holds the main path over real modules", async () => {
    const email = `${crypto.randomUUID()}@wire.test`;
    const password = "sufficiently-long-wire-password";

    expect(await createFirstAdmin({ email, password })).toBe("created");

    const signIn = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(signIn.status).toBe(200);

    const setCookie = signIn.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toBe("");
    expect(setCookie).toMatch(/httponly/i);
    expect(setCookie).toMatch(/samesite=lax/i);

    const sessionCookie = setCookie.split(";")[0] ?? "";
    const sessionResponse = await app.request("/api/auth/get-session", {
      headers: { cookie: sessionCookie },
    });
    expect(sessionResponse.status).toBe(200);

    const session = (await sessionResponse.json()) as {
      user?: { email?: string; level?: string };
    } | null;
    expect(session?.user?.email).toBe(email);
    expect(session?.user?.level).toBe("admin");
  });
});
