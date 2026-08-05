import { describe, expect, it } from "vitest";
import type { VenueMembership } from "./membership";
import { inVenue } from "./membership";

const window: VenueMembership = {
  venueId: "v1",
  from: new Date("2026-01-01T00:00:00Z"),
  to: new Date("2026-02-01T00:00:00Z"),
};

describe("inVenue", () => {
  it("includes the from boundary", () => {
    expect(inVenue([window], "v1", new Date("2026-01-01T00:00:00Z"))).toBe(
      true,
    );
  });

  it("excludes the to boundary", () => {
    expect(inVenue([window], "v1", new Date("2026-02-01T00:00:00Z"))).toBe(
      false,
    );
  });

  it("includes a moment inside the window", () => {
    expect(inVenue([window], "v1", new Date("2026-01-15T12:00:00Z"))).toBe(
      true,
    );
  });

  it("excludes a moment before the window", () => {
    expect(inVenue([window], "v1", new Date("2025-12-31T23:59:59Z"))).toBe(
      false,
    );
  });

  it("treats a null to as open-ended", () => {
    const openEnded: VenueMembership = {
      venueId: "v1",
      from: new Date("2026-01-01T00:00:00Z"),
      to: null,
    };
    expect(inVenue([openEnded], "v1", new Date("2099-01-01T00:00:00Z"))).toBe(
      true,
    );
  });

  it("rejects another venue", () => {
    expect(inVenue([window], "v2", new Date("2026-01-15T12:00:00Z"))).toBe(
      false,
    );
  });

  it("rejects on no memberships", () => {
    expect(inVenue([], "v1", new Date("2026-01-15T12:00:00Z"))).toBe(false);
  });
});
