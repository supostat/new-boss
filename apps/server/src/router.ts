import { usersRouter } from "./features/users/router";
import { router } from "./platform/trpc";

export const appRouter = router({
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
