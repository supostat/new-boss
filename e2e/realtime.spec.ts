import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "./credentials";

// The out-of-band mutation talks to the server directly: the watching tab
// must learn about it only through the event stream.
const SERVER_URL = "http://localhost:3000";

// Node's fetch serializes a missing browsing context as "Origin: null", which
// the auth layer rejects; a trusted origin makes the POST first-party.
const TRUSTED_ORIGIN = "http://localhost:5173";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function serverSignInCookie(): Promise<string> {
  const response = await fetch(`${SERVER_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: TRUSTED_ORIGIN },
    body: JSON.stringify({
      email: E2E_ADMIN.email,
      password: E2E_ADMIN.password,
    }),
  });
  if (!response.ok) {
    throw new Error(`server sign-in failed: ${response.status}`);
  }
  return (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

async function renameVenueOverHttp(
  cookie: string,
  currentName: string,
  freshName: string,
): Promise<void> {
  const listResponse = await fetch(`${SERVER_URL}/trpc/venues.list`, {
    headers: { cookie },
  });
  const listBody = (await listResponse.json()) as {
    result: { data: { json: Array<{ id: string; name: string }> } };
  };
  const target = listBody.result.data.json.find(
    (row) => row.name === currentName,
  );
  if (target === undefined) {
    throw new Error(`venue "${currentName}" not found over HTTP`);
  }
  const renameResponse = await fetch(`${SERVER_URL}/trpc/venues.rename`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ json: { venueId: target.id, name: freshName } }),
  });
  if (!renameResponse.ok) {
    throw new Error(`rename over HTTP failed: ${renameResponse.status}`);
  }
}

test("a rename lands in the watching tab without reload", async ({ page }) => {
  const suffix = crypto.randomUUID();
  const bornName = `The Live Wire ${suffix}`;
  const renamedName = `The Rewired Swan ${suffix}`;

  await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.waitForURL("**/users");

  await page.goto("/venues?venue=new");
  await page.getByRole("textbox", { name: "Name" }).fill(bornName);
  await page.getByRole("button", { name: "Create venue" }).click();
  await expect(page.locator("tr", { hasText: bornName })).toBeVisible();

  const cookie = await serverSignInCookie();
  await renameVenueOverHttp(cookie, bornName, renamedName);

  await expect(page.locator("tr", { hasText: renamedName })).toBeVisible();
  await expect(page.locator("tr", { hasText: bornName })).toBeHidden();
});
