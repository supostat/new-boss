import { createRootRoute, Outlet } from "@tanstack/react-router";

// The route tree's single root; slices hang their routes off it and the
// assembly lives in router.tsx.
export const rootRoute = createRootRoute({
  component: Outlet,
});
