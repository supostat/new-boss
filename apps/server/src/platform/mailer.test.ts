import { afterEach, describe, expect, it, vi } from "vitest";
import { mailer } from "./mailer";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logging mailer", () => {
  it("delivers the invite into the log with recipient and link", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await mailer.sendInvite({
      to: "someone@mailer.test",
      inviteUrl: "https://portal.test/accept?token=raw-token",
    });

    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0]?.[0] as string;
    expect(line).toContain("someone@mailer.test");
    expect(line).toContain("https://portal.test/accept?token=raw-token");
  });
});
