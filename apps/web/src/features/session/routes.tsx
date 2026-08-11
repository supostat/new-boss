import { createRoute, redirect } from "@tanstack/react-router";
import { PUBLIC_ACCESS } from "../../navigation";
import { rootRoute } from "../../rootRoute";
import { fetchSession } from "../../session";
import { LoginPage } from "./components/LoginPage";

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  staticData: { access: PUBLIC_ACCESS },
  // A signed-in visitor has no business on the login page: plain UX, not access.
  beforeLoad: async () => {
    const session = await fetchSession();
    if (session !== null) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});
