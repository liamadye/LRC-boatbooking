import { test, expect } from "@playwright/test";

test.describe("Smoke tests (no auth required)", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Leichhardt Rowing Club")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    // Should show either a registration form or a message
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
