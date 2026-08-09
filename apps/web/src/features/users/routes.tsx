import { createRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { rootRoute } from "../../rootRoute";
import { fetchSession } from "../../session";
import { AcceptInvitePage } from "./components/AcceptInvitePage";
import { UsersPage } from "./components/UsersPage";

export const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  validateSearch: z.object({ invite: z.literal("new").optional() }),
  beforeLoad: async () => {
    const session = await fetchSession();
    if (session === null) {
      throw redirect({ to: "/login" });
    }
  },
  component: UsersPage,
});

// Public by construction: the invited person has no session, so this route
// carries no session guard.
export const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accept-invite",
  validateSearch: z.object({ token: z.string().optional() }),
  component: AcceptInvitePage,
});
