import type { Level } from "@boss/shared/domain/authz";
import type { AnyRoute } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";
import { fetchSession } from "./session";

// Publicness is a named marker, never an absent field: every route declares
// its access, and the compiler refuses one that stays silent.
export const PUBLIC_ACCESS = "public";

export type RouteAccess = typeof PUBLIC_ACCESS | ((level: Level) => boolean);

// Any signed-in level may stand here; the page itself carries no level rule.
export function signedInAccess(): boolean {
  return true;
}

export type NavGroup = "Fleet";

export interface NavMeta {
  group: NavGroup;
  label: string;
}

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    access: RouteAccess;
    nav?: NavMeta;
  }
}

export interface NavItem {
  group: NavGroup;
  label: string;
  path: string;
}

export interface NavGroupItems {
  group: NavGroup;
  items: NavItem[];
}

// The menu is never data: it exists only as this filter over the route
// declarations. An empty group vanishes because no item survives for it.
export function visibleNavItems(
  routes: readonly AnyRoute[],
  level: Level | null,
): NavGroupItems[] {
  const groups: NavGroupItems[] = [];
  for (const route of routes) {
    const { access, nav } = route.options.staticData;
    if (nav === undefined || access === PUBLIC_ACCESS) {
      continue;
    }
    if (level === null || !access(level)) {
      continue;
    }
    const item: NavItem = {
      group: nav.group,
      label: nav.label,
      path: route.fullPath,
    };
    const group = groups.find((candidate) => candidate.group === item.group);
    if (group === undefined) {
      groups.push({ group: item.group, items: [item] });
    } else {
      group.items.push(item);
    }
  }
  return groups;
}

// The route guard runs the same declaration the menu filters by; the server
// stays the authority on data — this redirect is UX, not security.
export function accessGuard(access: RouteAccess) {
  return async () => {
    if (access === PUBLIC_ACCESS) {
      return;
    }
    const session = await fetchSession();
    if (session === null) {
      throw redirect({ to: "/login" });
    }
    if (!access(session.user.level)) {
      throw redirect({ to: "/" });
    }
  };
}
