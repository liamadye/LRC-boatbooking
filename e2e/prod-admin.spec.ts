import { test, expect, type Page } from "@playwright/test";

const hasAuth = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const userEmail = process.env.E2E_USER_EMAIL ?? "";
const userPassword = process.env.E2E_USER_PASSWORD ?? "";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(userEmail);
  await page.getByLabel("Password").fill(userPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/bookings/, { timeout: 15_000 });
}

async function openTab(page: Page, name: RegExp) {
  const tab = page.getByRole("tab", { name });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(tab).toHaveAttribute("data-state", "active");
}

test.describe("Production-safe admin smoke checks", () => {
  test.skip(!hasAuth, "Skipping: auth env vars not set");

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin");
    await expect(page.getByText("Admin Panel")).toBeVisible();
  });

  test("admin tabs render on mobile iPhone layout", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /Boats/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Members/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Invitations/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /All Bookings/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Squads/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Audit Log/ })).toBeVisible();
  });

  test("invitations and squads tabs load their admin forms", async ({ page }) => {
    await openTab(page, /Invitations/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /send invite/i })).toBeVisible();

    await openTab(page, /Squads/);
    await expect(page.getByLabel("New Squad")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Create$/ })).toBeVisible();
  });

  test("bookings and audit log tabs load read-only admin controls", async ({ page }) => {
    await openTab(page, /All Bookings/);
    await expect(page.getByLabel("From")).toBeVisible();
    await expect(page.getByLabel("To")).toBeVisible();
    await expect(page.getByRole("button", { name: /search/i })).toBeVisible();

    await openTab(page, /Audit Log/);
    await expect(page.getByLabel("Action")).toBeVisible();
    await expect(page.getByLabel("Target Type")).toBeVisible();
  });

  test("members tab loads management controls", async ({ page }) => {
    await openTab(page, /Members/);
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Grant Black|Revoke Black/ }).first()).toBeVisible();
  });
});
