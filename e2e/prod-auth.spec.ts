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

function isMobileLikeProject() {
  return /mobile|iphone/.test(test.info().project.name);
}

test.describe("Production-safe authenticated smoke checks", () => {
  test.skip(!hasAuth, "Skipping: auth env vars not set");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("authenticated user can view the bookings grid and switch booking days", async ({ page }) => {
    await expect(page.getByText(/Bookings — W\/C/)).toBeVisible();
    const dayButtons = page.getByRole("button", { name: /Mon|Tue|Wed|Thu|Fri|Sat|Sun/ });
    await expect(dayButtons.first()).toBeVisible();

    if (isMobileLikeProject()) {
      return;
    }

    await dayButtons.nth(2).click();
    await page.waitForURL(/date=/);
  });

  test("authenticated navigation works on the current viewport", async ({ page }) => {
    if (isMobileLikeProject()) {
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/profile/);
      await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
      return;
    }

    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
  });

  test("profile page loads current account details", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
    await expect(page.locator("input[disabled]").first()).toHaveValue(userEmail);
    await expect(page.getByText("Account Details")).toBeVisible();
    await expect(page.getByText("Change Password")).toBeVisible();

    await page.getByLabel("New Password").fill("Rowing!Aa1");
    await page.getByLabel("Confirm Password").fill("Boats!Bb2C");
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("my bookings page loads without changing data", async ({ page }) => {
    await page.goto("/my-bookings");
    await expect(page.getByRole("heading", { name: "My Bookings" })).toBeVisible();
    await expect(page.locator("body")).toContainText(/No upcoming bookings|in boat/);
  });

  test("admin route behaves correctly for the signed-in role", async ({ page }) => {
    await page.goto("/admin");

    if (page.url().includes("/admin")) {
      await expect(page.getByText("Admin Panel")).toBeVisible();
      await expect(page.getByText(/Boats \(/)).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/bookings/);
    await expect(page.getByText(/Bookings — W\/C/)).toBeVisible();
  });
});
