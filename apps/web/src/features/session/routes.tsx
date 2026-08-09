import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "../../rootRoute";
import { fetchSession } from "../../session";
import { LoginPage } from "./components/LoginPage";

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async () => {
    const session = await fetchSession();
    if (session !== null) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});
