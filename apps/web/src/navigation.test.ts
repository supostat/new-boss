import { describe, expect, it } from "vitest";
import { visibleNavItems } from "./navigation";
import { router } from "./router";

// The real registry, exactly as the shell consumes it.
const routes = Object.values(router.routesById);

describe("visibleNavItems", () => {
  it("shows a manager nothing — the whole fleet group vanishes", () => {
    expect(visibleNavItems(routes, "manager")).toEqual([]);
  });

  it("shows an admin both fleet sections in one group", () => {
    const groups = visibleNavItems(routes, "admin");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.group).toBe("Fleet");
    expect(groups[0]?.items.map((item) => item.label)).toEqual([
      "Users",
      "Venues",
    ]);
    expect(groups[0]?.items.map((item) => item.path)).toEqual([
      "/users",
      "/venues",
    ]);
  });

  it("never lists public routes, whatever the level", () => {
    const paths = visibleNavItems(routes, "admin").flatMap((group) =>
      group.items.map((item) => item.path),
    );
    expect(paths).not.toContain("/login");
    expect(paths).not.toContain("/accept-invite");
  });

  it("shows nothing without a session", () => {
    expect(visibleNavItems(routes, null)).toEqual([]);
  });
});
