import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "./credentials";

test("signs in, shows the shell, signs out", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill("wrong-password-entirely");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Wrong email or password",
  );

  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/");
  await expect(page.getByText(E2E_ADMIN.email).first()).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
