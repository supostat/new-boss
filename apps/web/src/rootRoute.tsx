import { createRootRoute, Outlet } from "@tanstack/react-router";
import { PUBLIC_ACCESS } from "./navigation";

// The route tree's single root; slices hang their routes off it and the
// assembly lives in router.tsx. The root wraps public pages too, so its own
// access is the public marker — children declare their real access.
export const rootRoute = createRootRoute({
  staticData: { access: PUBLIC_ACCESS },
  component: Outlet,
});
