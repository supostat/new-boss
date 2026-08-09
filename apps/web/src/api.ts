import type { AppRouter } from "@boss/server/src/router";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// The one tRPC client of the app: server types enter as types only, and
// superjson keeps Date a Date across the wire.
export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/trpc", transformer: superjson })],
});
