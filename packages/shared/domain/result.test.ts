import { describe, expect, it } from "vitest";
import { err, ok, type Result } from "./result";

function createOutcome(taken: boolean): Result<{ id: string }, "name_taken"> {
  return taken ? err("name_taken") : ok({ id: "venue-1" });
}

describe("Result", () => {
  it("narrows to the value branch on ok", () => {
    const outcome = createOutcome(false);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected ok");
    expect(outcome.value.id).toBe("venue-1");
  });

  it("narrows to the error branch on err", () => {
    const outcome = createOutcome(true);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("expected err");
    expect(outcome.error).toBe("name_taken");
  });
});
