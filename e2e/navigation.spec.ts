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

test("the menu derives from the registry: admin sees the fleet, manager sees the empty home and a guarded deep link", async ({
  page,
  browser,
}) => {
  const managerEmail = `${crypto.randomUUID()}@nav.test`;
  const managerPassword = "manager-sufficiently-long-pass";

  await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.waitForURL("**/users");
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Venues" })).toBeVisible();

  await page.goto("/users?invite=new");
  await page.getByLabel("Email").fill(managerEmail);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(managerEmail)).toBeVisible();

  const token = new URL(inviteLinkFor(managerEmail)).searchParams.get("token");
  expect(token).not.toBeNull();

  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await managerPage.goto(`/accept-invite?token=${token}`);
  await managerPage.getByLabel("Your name").fill("Nav Manager");
  await managerPage.getByLabel("Choose a password").fill(managerPassword);
  await managerPage.getByRole("button", { name: "Accept invite" }).click();

  await expect(managerPage.getByText("No sections available.")).toBeVisible();
  await expect(managerPage.getByRole("link", { name: "Users" })).toBeHidden();
  await expect(managerPage.getByRole("link", { name: "Venues" })).toBeHidden();

  await managerPage.goto("/venues");
  await managerPage.waitForURL((url) => url.pathname === "/");
  await expect(managerPage.getByText("No sections available.")).toBeVisible();
  await expect(
    managerPage.getByRole("heading", { name: "Venues" }),
  ).toBeHidden();

  await managerContext.close();
});
