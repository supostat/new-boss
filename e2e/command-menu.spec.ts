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

test("the palette projects the registry for an admin: open, filter, navigate, escape", async ({
  page,
}) => {
  await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.waitForURL("**/users");
  const searchButton = page.getByRole("button", { name: /^Search/ });
  await expect(searchButton).toBeVisible();

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  await expect(palette.getByText("Fleet")).toBeVisible();
  await expect(palette.getByRole("option", { name: "Users" })).toBeVisible();
  await expect(palette.getByRole("option", { name: "Venues" })).toBeVisible();

  await page.keyboard.type("ven");
  await expect(palette.getByRole("option", { name: "Users" })).toBeHidden();
  await expect(palette.getByRole("option", { name: "Venues" })).toBeVisible();

  await page.keyboard.press("Enter");
  await page.waitForURL("**/venues");
  await expect(palette).toBeHidden();
  await expect(page.getByRole("heading", { name: "Venues" })).toBeVisible();

  await searchButton.click();
  await expect(palette).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(palette).toBeHidden();
  await expect(searchButton).toBeFocused();
});

test("the palette opens quietly for a manager with no sections", async ({
  page,
  browser,
}) => {
  const managerEmail = `${crypto.randomUUID()}@palette.test`;
  const managerPassword = "manager-sufficiently-long-pass";

  await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.waitForURL("**/users");
  await page.goto("/users?invite=new");
  await page.getByLabel("Email").fill(managerEmail);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(managerEmail)).toBeVisible();

  const token = new URL(inviteLinkFor(managerEmail)).searchParams.get("token");
  expect(token).not.toBeNull();

  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await managerPage.goto(`/accept-invite?token=${token}`);
  await managerPage.getByLabel("Your name").fill("Palette Manager");
  await managerPage.getByLabel("Choose a password").fill(managerPassword);
  await managerPage.getByRole("button", { name: "Accept invite" }).click();
  await expect(managerPage.getByText("No sections available.")).toBeVisible();

  await managerPage.keyboard.press("Control+k");
  const palette = managerPage.getByRole("dialog");
  await expect(palette).toBeVisible();
  await expect(palette.getByText("No sections available.")).toBeVisible();

  await managerPage.keyboard.press("Escape");
  await expect(palette).toBeHidden();

  await managerContext.close();
});
