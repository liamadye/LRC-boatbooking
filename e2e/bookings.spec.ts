import { test, expect } from "@playwright/test";

/**
 * Booking page tests. These require authentication.
 * Set E2E_USER_EMAIL and E2E_USER_PASSWORD env vars and run auth.setup.ts first.
 * If running without auth, these tests will be skipped.
 */

const hasAuth = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe("Booking grid", () => {
  test.skip(!hasAuth, "Skipping: auth env vars not set");

  test.use({ storageState: "e2e/.auth/user.json" });

  test("bookings page loads with grid", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page.getByText(/Bookings — W\/C/)).toBeVisible();

    // Week nav should show day buttons
    await expect(page.getByRole("button", { name: /Mon|Tue|Wed|Thu|Fri|Sat|Sun/ }).first()).toBeVisible();
  });

  test("can navigate between weeks", async ({ page }) => {
    await page.goto("/bookings");
    const heading = page.getByText(/Bookings — W\/C/);
    const initialText = await heading.textContent();

    // Click next week arrow
    await page.locator("button").filter({ has: page.locator("svg") }).last().click();
    await expect(heading).not.toHaveText(initialText!);
  });

  test("can click a day to switch", async ({ page }) => {
    await page.goto("/bookings");
    const dayButtons = page.getByRole("button", { name: /Mon|Tue|Wed|Thu|Fri|Sat|Sun/ });
    const count = await dayButtons.count();
    expect(count).toBe(7);

    // Click a different day
    await dayButtons.nth(2).click();
    await page.waitForURL(/date=/);
  });

  test("refresh button works", async ({ page }) => {
    await page.goto("/bookings");
    const refreshBtn = page.getByRole("button", { name: /Refresh/ });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });
});

test.describe("Booking grid - mobile", () => {
  test.skip(!hasAuth, "Skipping: auth env vars not set");

  test.use({
    storageState: "e2e/.auth/user.json",
    viewport: { width: 375, height: 812 },
  });

  test("mobile view shows time slot cards", async ({ page }) => {
    await page.goto("/bookings");

    // Mobile view should be visible (md:hidden)
    // Desktop table should be hidden
    await expect(page.locator(".md\\:hidden").first()).toBeVisible();
  });

  test("mobile nav hamburger works", async ({ page }) => {
    await page.goto("/bookings");

    // Hamburger menu button should exist on mobile
    const menuBtn = page.locator("button").filter({ has: page.locator("svg") }).first();
    await menuBtn.click();

    // Nav links should appear
    await expect(page.getByRole("link", { name: "Bookings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Bookings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  });
});
