import { describe, expect, it } from "vitest";
import { canManageVenues } from "./policy";

describe("canManageVenues", () => {
  it("allows an admin", () => {
    expect(canManageVenues("admin")).toBe(true);
  });

  it("denies a manager", () => {
    expect(canManageVenues("manager")).toBe(false);
  });
});
