import { describe, expect, it } from "vitest";
import { canInviteUsers } from "./policy";

describe("canInviteUsers", () => {
  it("allows an admin", () => {
    expect(canInviteUsers("admin")).toBe(true);
  });

  it("denies a manager", () => {
    expect(canInviteUsers("manager")).toBe(false);
  });
});
