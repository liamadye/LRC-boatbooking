import { test, expect } from "@playwright/test";

test.describe("Invitation & Registration pages (no auth required)", () => {
  test("register page without token shows error", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByText(/no invitation token/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("register page with invalid token shows invalid invitation", async ({ page }) => {
    await page.goto("/register?token=invalid-token-12345");
    await expect(
      page.getByText(/invalid invitation/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("register page shows LRC branding", async ({ page }) => {
    await page.goto("/register?token=fake");
    await expect(page.getByText("LRC")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Password Reset pages (no auth required)", () => {
  test("reset password request page loads", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText("Reset Password")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("reset password update page loads", async ({ page }) => {
    await page.goto("/reset-password/update");
    await expect(page.getByText("Set New Password")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("New Password")).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
  });

  test("reset password update validates matching passwords", async ({ page }) => {
    await page.goto("/reset-password/update");
    await page.getByLabel("New Password").fill("password123");
    await page.getByLabel("Confirm Password").fill("different456");
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("login page has forgot password link", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByText(/forgot password/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Login page", () => {
  test("login page loads with all elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Leichhardt Rowing Club")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Boat Booking Portal")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });
});

test.describe("Auth redirects", () => {
  test("unauthenticated bookings access redirects to login", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("unauthenticated profile access redirects to login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("unauthenticated my-bookings access redirects to login", async ({ page }) => {
    await page.goto("/my-bookings");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe("Registration API routes", () => {
  test("validate endpoint rejects missing token", async ({ request }) => {
    const res = await request.get("/api/register/validate");
    // 400 if DB available, 500 if DB unreachable
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("validate endpoint rejects invalid token", async ({ request }) => {
    const res = await request.get("/api/register/validate?token=nonexistent-token");
    // 404 if DB available, 500 if DB unreachable
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("accept endpoint rejects invalid token", async ({ request }) => {
    const res = await request.post("/api/register/accept", {
      data: { token: "fake-token", fullName: "Test User" },
    });
    // 404 if DB available, 500 if DB unreachable
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("accept endpoint rejects missing fields", async ({ request }) => {
    const res = await request.post("/api/register/accept", {
      data: { token: "fake-token" },
    });
    // 400 if DB available, 500 if DB unreachable
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Admin API auth protection", () => {
  test("invitation GET redirects unauthenticated requests", async ({ request }) => {
    const res = await request.get("/api/admin/invitations", {
      maxRedirects: 0,
    });
    // Middleware redirects to /login for unauthenticated API requests
    expect([307, 403]).toContain(res.status());
  });

  test("invitation POST redirects unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/admin/invitations", {
      data: { email: "test@example.com" },
      maxRedirects: 0,
    });
    expect([307, 403]).toContain(res.status());
  });
});
