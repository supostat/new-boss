import { describe, expect, it } from "vitest";
import { atLeast, LEVELS } from "./levels";

describe("atLeast", () => {
  it("holds for the same level at both tuple edges", () => {
    expect(atLeast("manager", "manager")).toBe(true);
    expect(atLeast("admin", "admin")).toBe(true);
  });

  it("holds downward requirement from the senior edge", () => {
    expect(atLeast("admin", "manager")).toBe(true);
  });

  it("fails upward requirement from the junior edge", () => {
    expect(atLeast("manager", "admin")).toBe(false);
  });

  it("keeps the tuple ordered junior to senior", () => {
    expect(LEVELS).toEqual(["manager", "admin"]);
  });
});
