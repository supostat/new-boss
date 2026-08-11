import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "./credentials";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("the venue loop closes in the browser: duplicate hits the field, archive flips the pill, a window opens and closes", async ({
  page,
}) => {
  const suffix = crypto.randomUUID();
  const venueName = `The Painted Swan ${suffix}`;
  const renamedName = `The Gilded Swan ${suffix}`;

  await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.waitForURL("**/");

  await page.goto("/venues?venue=new");
  await expect(page.getByRole("heading", { name: "New venue" })).toBeVisible();
  await page.getByRole("textbox", { name: "Name" }).fill(venueName);
  await page.getByRole("button", { name: "Create venue" }).click();
  const venueRow = page.locator("tr", { hasText: venueName });
  await expect(venueRow.getByText("Active")).toBeVisible();

  await page.goto("/venues?venue=new");
  await page.getByRole("textbox", { name: "Name" }).fill(venueName);
  await page.getByRole("button", { name: "Create venue" }).click();
  await expect(
    page.getByText("A venue with this name already exists"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await venueRow.getByRole("button", { name: "Rename" }).click();
  await expect(
    page.getByRole("heading", { name: "Rename venue" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Name" }).fill(renamedName);
  await page.getByRole("button", { name: "Rename venue" }).click();
  const renamedRow = page.locator("tr", { hasText: renamedName });
  await expect(renamedRow).toBeVisible();

  await renamedRow.getByRole("button", { name: "Archive" }).click();
  await expect(renamedRow.getByText("Archived")).toBeVisible();

  await renamedRow.getByRole("button", { name: "Restore" }).click();
  await expect(renamedRow.getByText("Active")).toBeVisible();

  await renamedRow.getByRole("button", { name: "Manage members" }).click();
  await expect(
    page.getByRole("heading", { name: `Members — ${renamedName}` }),
  ).toBeVisible();
  await expect(page.getByText("No members yet.")).toBeVisible();

  const adminOption = page.locator("#member-user option", {
    hasText: E2E_ADMIN.email,
  });
  const adminValue = await adminOption.getAttribute("value");
  expect(adminValue).not.toBeNull();
  await page.getByLabel("User").selectOption(adminValue ?? "");
  await page.getByRole("button", { name: "Assign member" }).click();

  await expect(page.getByText("→ open")).toBeVisible();

  await page.getByRole("button", { name: "Close window" }).click();
  await expect(page.getByRole("button", { name: "Close window" })).toBeHidden();
  await expect(page.getByText("→ open")).toBeHidden();
});
