import { createDatabaseClient } from "@boss/db";
import type { ChangeEvent } from "@boss/shared/domain/realtime";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../app";
import { createUser } from "./auth";
import { emitChange, sse } from "./sse";

const { pool } = createDatabaseClient();

beforeAll(async () => {
  await sse.install();
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

describe("emitChange", () => {
  it("delivers the event when the transaction commits", async () => {
    const waiting = nextEvent(3000);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await emitChange(client, { channel: "venues" });
      await client.query("COMMIT");
    } finally {
      client.release();
    }
    expect(await waiting).toEqual({ channel: "venues" });
  });

  it("a rolled-back transaction leaves silence", async () => {
    const waiting = nextEvent(1200);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await emitChange(client, { channel: "venues" });
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
    expect(await waiting).toBeNull();
  });
});

describe("/api/events", () => {
  it("refuses a sessionless stream", async () => {
    const response = await app.request("/api/events");
    expect(response.status).toBe(401);
  });

  it("streams the connect comment for a signed-in session", async () => {
    const email = `${crypto.randomUUID()}@sse.test`;
    const password = "sufficiently-long-sse-password";
    await createUser({ email, password, name: "SSE Watcher", level: "admin" });
    const signIn = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const cookie = (signIn.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

    const response = await app.request("/api/events", {
      headers: { cookie },
    });
    expect(response.status).toBe(200);
    if (response.body === null) {
      throw new Error("event stream carried no body");
    }
    const reader = response.body.getReader();
    const chunk = await reader.read();
    const text = new TextDecoder().decode(chunk.value);
    expect(text).toContain(": connected");
    await reader.cancel();
  });
});
