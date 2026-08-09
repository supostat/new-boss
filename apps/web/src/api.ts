import type { AppRouter } from "@boss/server/src/router";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

// The one tRPC client of the app: server types enter as types only.
export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/trpc" })],
});
