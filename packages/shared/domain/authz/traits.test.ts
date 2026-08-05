import { describe, expect, it } from "vitest";
import { hasTrait } from "./traits";

describe("hasTrait", () => {
  it("finds a granted trait", () => {
    expect(hasTrait(["payroll_manager", "chef"], "chef")).toBe(true);
  });

  it("rejects an absent trait", () => {
    expect(hasTrait(["payroll_manager"], "security_manager")).toBe(false);
  });

  it("rejects everything on the empty set", () => {
    expect(hasTrait([], "payroll_manager")).toBe(false);
  });
});
