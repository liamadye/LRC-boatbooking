import { test, expect } from "@playwright/test";

test.describe("Production-safe smoke checks", () => {
  test("public auth pages load", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Leichhardt Rowing Club")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();

    await page.goto("/reset-password");
    await expect(page.getByText("Reset Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("protected routes redirect unauthenticated users to login", async ({ page }) => {
    for (const path of ["/", "/bookings", "/profile", "/my-bookings", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    }
  });

  test("register page rejects invalid invitation token", async ({ page }) => {
    await page.goto("/register?token=invalid-token-for-prod-smoke");
    await expect(page.getByText("Invalid Invitation", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/invalid invitation link/i)).toBeVisible();
  });

  test("password update page enforces matching passwords client-side", async ({ page }) => {
    await page.goto("/reset-password/update");
    await page.getByLabel("New Password").fill("Rowing!Aa1");
    await page.getByLabel("Confirm Password").fill("Boats!Bb2C");
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("register validation API returns 404 for an invalid token", async ({ request }) => {
    const response = await request.get("/api/register/validate?token=invalid-token-for-prod-smoke", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(404);
  });

  test("admin invitation APIs reject unauthenticated access", async ({ request }) => {
    const getResponse = await request.get("/api/admin/invitations", {
      maxRedirects: 0,
    });
    expect(getResponse.status()).toBe(307);
    expect(getResponse.headers().location).toContain("/login");

    const postResponse = await request.post("/api/admin/invitations", {
      data: { email: "prod-smoke@example.com" },
      maxRedirects: 0,
    });
    expect(postResponse.status()).toBe(307);
    expect(postResponse.headers().location).toContain("/login");
  });
});
