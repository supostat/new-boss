import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { auth } from "./platform/auth";
import { createTrpcContext } from "./platform/trpc";
import { appRouter } from "./router";

// Assembled without listen: tests drive the full HTTP surface via
// app.request(); the listening entrypoint arrives with the first spec that
// needs a running server.
export const app = new Hono();

app.on(["GET", "POST"], "/api/auth/*", (context) =>
  auth.handler(context.req.raw),
);

app.all("/trpc/*", (context) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: context.req.raw,
    router: appRouter,
    createContext: ({ req }) => createTrpcContext(req),
  }),
);
