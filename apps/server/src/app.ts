import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { auth } from "./platform/auth";
import { HEARTBEAT_INTERVAL_MS, sse } from "./platform/sse";
import { createTrpcContext } from "./platform/trpc";
import { appRouter } from "./router";

// Assembled without listen: tests drive the full HTTP surface via
// app.request(); the listening entrypoint arrives with the first spec that
// needs a running server.
export const app = new Hono();

app.on(["GET", "POST"], "/api/auth/*", (context) =>
  auth.handler(context.req.raw),
);

app.get("/api/events", async (context) => {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  if (session === null) {
    return context.json({ error: "unauthorized" }, 401);
  }
  context.header("X-Accel-Buffering", "no");
  return streamSSE(context, async (stream) => {
    await stream.write(": connected\n\n");
    const unsubscribe = sse.subscribe((event) => {
      void stream.writeSSE({ data: JSON.stringify(event) });
    });
    const heartbeat = setInterval(() => {
      // A dead socket surfaces here as a write failure; closing unsubscribes.
      stream.write(`: hb\n\n`).catch(() => stream.close());
    }, HEARTBEAT_INTERVAL_MS);
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        clearInterval(heartbeat);
        unsubscribe();
        resolve();
      });
    });
  });
});

app.all("/trpc/*", (context) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: context.req.raw,
    router: appRouter,
    createContext: ({ req }) => createTrpcContext(req),
  }),
);
