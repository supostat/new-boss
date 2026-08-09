import { describe, expect, it } from "vitest";
import { mailer } from "./mailer";

const mailpitApi = "http://localhost:8026/api/v1";

async function searchMessages(
  recipient: string,
): Promise<Array<{ ID: string }>> {
  const response = await fetch(
    `${mailpitApi}/search?query=${encodeURIComponent(`to:${recipient}`)}`,
  );
  if (!response.ok) {
    throw new Error(`mailpit search failed: ${response.status}`);
  }
  const result = (await response.json()) as { messages: Array<{ ID: string }> };
  return result.messages;
}

async function fetchMessage(
  id: string,
): Promise<{ Subject: string; Text: string }> {
  const response = await fetch(`${mailpitApi}/message/${id}`);
  if (!response.ok) {
    throw new Error(`mailpit message fetch failed: ${response.status}`);
  }
  return (await response.json()) as { Subject: string; Text: string };
}

describe("smtp mailer", () => {
  it("delivers the invite letter with the exact link", async () => {
    const recipient = `${crypto.randomUUID()}@mailer.test`;
    const inviteUrl = "https://portal.test/accept-invite?token=raw-token";

    await mailer.sendInvite({ to: recipient, inviteUrl });

    await expect
      .poll(() => searchMessages(recipient).then((messages) => messages.length))
      .toBe(1);
    const found = await searchMessages(recipient);
    const first = found[0];
    if (first === undefined) {
      throw new Error("mailpit lost the message between poll and read");
    }
    const message = await fetchMessage(first.ID);
    expect(message.Subject).toBe("Accept your invite");
    expect(message.Text).toContain(inviteUrl);
  });
});
