import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "./credentials";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function inviteLinkFor(email: string): string {
  const result = spawnSync("bun", ["e2e/invite-link.ts", email], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`invite-link failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("the invite loop closes in the browser and disable locks out", async ({
  page,
  browser,
}) => {
  const invitedEmail = `${crypto.randomUUID()}@invited.test`;
  const invitedPassword = "invited-sufficiently-long-pass";

  await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.waitForURL("**/");

  await page.goto("/users?invite=new");
  await expect(
    page.getByRole("heading", { name: "Invite user" }),
  ).toBeVisible();
  await page.getByLabel("Email").fill(invitedEmail);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(invitedEmail)).toBeVisible();

  const inviteUrl = inviteLinkFor(invitedEmail);
  const token = new URL(inviteUrl).searchParams.get("token") ?? "";
  expect(token).not.toBe("");

  const invitedContext = await browser.newContext();
  const invitedPage = await invitedContext.newPage();
  await invitedPage.goto(`/accept-invite?token=${token}`);
  await invitedPage.getByLabel("Your name").fill("Invited Manager");
  await invitedPage.getByLabel("Choose a password").fill(invitedPassword);
  await invitedPage.getByRole("button", { name: "Accept invite" }).click();
  await invitedPage.waitForURL("**/");
  await expect(invitedPage.getByText(invitedEmail).first()).toBeVisible();

  await invitedPage.goto(`/accept-invite?token=${token}`);
  await invitedPage.getByLabel("Your name").fill("Second Try");
  await invitedPage
    .getByLabel("Choose a password")
    .fill("another-long-password");
  await invitedPage.getByRole("button", { name: "Accept invite" }).click();
  await expect(invitedPage.getByRole("alert")).toContainText("already used");

  await page.goto("/users");
  const invitedRow = page.locator("tr", { hasText: invitedEmail });
  await expect(invitedRow.getByText("Active")).toBeVisible();
  await invitedRow.getByRole("button", { name: "Disable" }).click();
  await expect(invitedRow.getByText("Disabled")).toBeVisible();

  const lockedContext = await browser.newContext();
  const lockedPage = await lockedContext.newPage();
  await signIn(lockedPage, invitedEmail, invitedPassword);
  await expect(lockedPage.getByRole("alert")).toBeVisible();

  await invitedRow.getByRole("button", { name: "Enable" }).click();
  await expect(invitedRow.getByText("Active")).toBeVisible();

  await signIn(lockedPage, invitedEmail, invitedPassword);
  await lockedPage.waitForURL("**/");
  await expect(lockedPage.getByText(invitedEmail).first()).toBeVisible();

  await invitedContext.close();
  await lockedContext.close();
});
