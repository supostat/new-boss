import { Hono } from "hono";
import { auth } from "./platform/auth";

// Assembled without listen: tests drive the full HTTP surface via
// app.request(); the listening entrypoint arrives with the first spec that
// needs a running server.
export const app = new Hono();

app.on(["GET", "POST"], "/api/auth/*", (context) =>
  auth.handler(context.req.raw),
);
