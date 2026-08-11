import { createRoute, createRouter, redirect } from "@tanstack/react-router";
import { loginRoute } from "./features/session/routes";
import { acceptInviteRoute, usersRoute } from "./features/users/routes";
import { venuesRoute } from "./features/venues/routes";
import { rootRoute } from "./rootRoute";
import { fetchSession, useSession } from "./session";
import { Frame } from "./shell/Frame";

function Landing() {
  const session = useSession();
  if (session.data == null) {
    return null;
  }
  return (
    <Frame user={session.data.user}>
      <div className="rounded-base border border-line bg-surface p-5">
        <p className="text-sm">
          Signed in as{" "}
          <span className="font-mono text-[12.5px]">
            {session.data.user.email}
          </span>
        </p>
      </div>
    </Frame>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const session = await fetchSession();
    if (session === null) {
      throw redirect({ to: "/login" });
    }
  },
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
