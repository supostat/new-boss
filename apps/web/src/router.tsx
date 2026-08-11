import {
  createRoute,
  createRouter,
  Navigate,
  useRouter,
} from "@tanstack/react-router";
import { loginRoute } from "./features/session/routes";
import { acceptInviteRoute, usersRoute } from "./features/users/routes";
import { venuesRoute } from "./features/venues/routes";
import { accessGuard, signedInAccess, visibleNavItems } from "./navigation";
import { rootRoute } from "./rootRoute";
import { useSession } from "./session";
import { Frame } from "./shell/Frame";

// The home is derived like the menu: forward to the first section this level
// may see, or say quietly that there is none.
function Landing() {
  const session = useSession();
  const activeRouter = useRouter();
  if (session.data == null) {
    return null;
  }
  const groups = visibleNavItems(
    Object.values(activeRouter.routesById),
    session.data.user.level,
  );
  const first = groups[0]?.items[0];
  if (first !== undefined) {
    return <Navigate to={first.path} />;
  }
  return (
    <Frame user={session.data.user}>
      <div className="rounded-base border border-line bg-surface p-5">
        <p className="text-sm">No sections available.</p>
        <p className="mt-1 text-sm text-muted">
          Your account has no portal sections yet — ask an admin.
        </p>
      </div>
    </Frame>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  staticData: { access: signedInAccess },
  beforeLoad: accessGuard(signedInAccess),
  component: Landing,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  usersRoute,
  venuesRoute,
  acceptInviteRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
