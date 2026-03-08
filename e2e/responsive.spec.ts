import { test, expect } from "@playwright/test";

test.describe("Responsive layout - no auth", () => {
  test("login page is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    // Form should be fully visible without horizontal scroll
    const body = page.locator("body");
    const bodyBox = await body.boundingBox();
    expect(bodyBox!.width).toBeLessThanOrEqual(375);

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("login page works on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/login");
    await expect(page.getByText("Leichhardt Rowing Club")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("login page works on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");
    await expect(page.getByText("Leichhardt Rowing Club")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
