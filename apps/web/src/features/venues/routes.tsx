import { canManageVenues } from "@boss/shared/domain/venues";
import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import { accessGuard } from "../../navigation";
import { rootRoute } from "../../rootRoute";
import { VenuesPage } from "./components/VenuesPage";

export const venuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/venues",
  validateSearch: z.object({
    venue: z.literal("new").optional(),
    rename: z.uuid().optional(),
    members: z.uuid().optional(),
  }),
  staticData: {
    access: canManageVenues,
    nav: { group: "Fleet", label: "Venues" },
  },
  beforeLoad: accessGuard(canManageVenues),
  component: VenuesPage,
});
