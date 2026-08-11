import { createRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { rootRoute } from "../../rootRoute";
import { fetchSession } from "../../session";
import { VenuesPage } from "./components/VenuesPage";

export const venuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/venues",
  validateSearch: z.object({
    venue: z.literal("new").optional(),
    rename: z.uuid().optional(),
    members: z.uuid().optional(),
  }),
  beforeLoad: async () => {
    const session = await fetchSession();
    if (session === null) {
      throw redirect({ to: "/login" });
    }
  },
  component: VenuesPage,
});
