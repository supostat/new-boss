import { usersRouter } from "./features/users/router";
import { venuesRouter } from "./features/venues/router";
import { router } from "./platform/trpc";

export const appRouter = router({
  users: usersRouter,
  venues: venuesRouter,
});

export type AppRouter = typeof appRouter;
