import { describe, expect, it } from "vitest";
import { gridTarget, tileInitials } from "./command";

describe("tileInitials", () => {
  it("takes the first letters of the first two words", () => {
    expect(tileInitials("Handover planners")).toBe("Hp");
    expect(tileInitials("Machines Refloats")).toBe("Mr");
    expect(tileInitials("Venue Health Check")).toBe("Vh");
  });

  it("takes the first two letters of a single word", () => {
    expect(tileInitials("Rota")).toBe("Ro");
    expect(tileInitials("KPIs")).toBe("Kp");
    expect(tileInitials("Users")).toBe("Us");
    expect(tileInitials("Venues")).toBe("Ve");
  });

  it("survives a one-letter label and an empty one", () => {
    expect(tileInitials("A")).toBe("A");
    expect(tileInitials("")).toBe("");
  });
});

describe("gridTarget", () => {
  const COLUMNS = 5;
  const COUNT = 12;

  it("walks the row by one and the column by a full row", () => {
    expect(gridTarget(0, "ArrowRight", COLUMNS, COUNT)).toBe(1);
    expect(gridTarget(1, "ArrowLeft", COLUMNS, COUNT)).toBe(0);
    expect(gridTarget(0, "ArrowDown", COLUMNS, COUNT)).toBe(5);
    expect(gridTarget(5, "ArrowUp", COLUMNS, COUNT)).toBe(0);
  });

  it("clamps at every edge instead of wrapping", () => {
    expect(gridTarget(0, "ArrowLeft", COLUMNS, COUNT)).toBe(0);
    expect(gridTarget(11, "ArrowRight", COLUMNS, COUNT)).toBe(11);
    expect(gridTarget(2, "ArrowUp", COLUMNS, COUNT)).toBe(2);
    expect(gridTarget(9, "ArrowDown", COLUMNS, COUNT)).toBe(9);
  });

  it("clamps a row shorter than the grid is wide", () => {
    expect(gridTarget(0, "ArrowRight", COLUMNS, 2)).toBe(1);
    expect(gridTarget(1, "ArrowRight", COLUMNS, 2)).toBe(1);
    expect(gridTarget(0, "ArrowDown", COLUMNS, 2)).toBe(0);
    expect(gridTarget(1, "ArrowUp", COLUMNS, 2)).toBe(1);
  });
});
