import { describe, expect, it } from "vitest";
import { visibleNavItems } from "../navigation";
import { router } from "../router";
import { commandMenuGroups } from "./CommandMenu";

// The real registry, exactly as the shell consumes it.
const routes = Object.values(router.routesById);

describe("commandMenuGroups", () => {
  it("is exactly the visibleNavItems projection, level by level", () => {
    expect(commandMenuGroups(routes, "admin")).toEqual(
      visibleNavItems(routes, "admin"),
    );
    expect(commandMenuGroups(routes, "manager")).toEqual(
      visibleNavItems(routes, "manager"),
    );
    expect(commandMenuGroups(routes, null)).toEqual(
      visibleNavItems(routes, null),
    );
  });

  it("projects the admin exactly one Fleet group: Users, then Venues", () => {
    const groups = commandMenuGroups(routes, "admin");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.group).toBe("Fleet");
    expect(groups[0]?.items.map((item) => [item.label, item.path])).toEqual([
      ["Users", "/users"],
      ["Venues", "/venues"],
    ]);
  });

  it("projects nothing for a manager and for no session", () => {
    expect(commandMenuGroups(routes, "manager")).toEqual([]);
    expect(commandMenuGroups(routes, null)).toEqual([]);
  });
});
