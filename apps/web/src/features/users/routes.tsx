import { canManageUsers } from "@boss/shared/domain/users";
import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import { accessGuard, PUBLIC_ACCESS } from "../../navigation";
import { rootRoute } from "../../rootRoute";
import { AcceptInvitePage } from "./components/AcceptInvitePage";
import { UsersPage } from "./components/UsersPage";

export const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  validateSearch: z.object({ invite: z.literal("new").optional() }),
  staticData: {
    access: canManageUsers,
    nav: { group: "Fleet", label: "Users" },
  },
  beforeLoad: accessGuard(canManageUsers),
  component: UsersPage,
});

// Public by construction: the invited person has no session, so this route
// carries no session guard.
export const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accept-invite",
  validateSearch: z.object({ token: z.string().optional() }),
  staticData: { access: PUBLIC_ACCESS },
  component: AcceptInvitePage,
});
