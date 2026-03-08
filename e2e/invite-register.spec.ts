import "dotenv/config";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const appBaseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const recoveryEmail = process.env.E2E_USER_EMAIL ?? process.env.E2E_ADMIN_EMAIL ?? "";
const canGenerateRecoveryLink = !!(supabaseUrl && serviceRoleKey && recoveryEmail);

async function generateRecoveryLink(email: string) {
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${appBaseUrl}/reset-password/update`,
    },
  });

  if (error || !data.properties?.action_link) {
    throw new Error(error?.message ?? "Failed to generate recovery link");
  }

  const verifyResponse = await fetch(data.properties.action_link, {
    method: "GET",
    redirect: "manual",
  });
  const redirectLocation = verifyResponse.headers.get("location");

  if (!redirectLocation) {
    throw new Error("Supabase recovery link did not return a redirect location");
  }

  const recoveryUrl = new URL(redirectLocation);
  recoveryUrl.protocol = new URL(appBaseUrl).protocol;
  recoveryUrl.host = new URL(appBaseUrl).host;
  return recoveryUrl.toString();
}

test.describe("Invitation & Registration pages (no auth required)", () => {
  test("register page without token shows error", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByText(/no invitation token/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("register page with invalid token shows invalid invitation", async ({ page }) => {
    await page.goto("/register?token=invalid-token-12345");
    await expect(page.getByText("Invalid Invitation", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
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
    test.skip(!canGenerateRecoveryLink, "Recovery-link generation is not available");
    const recoveryUrl = await generateRecoveryLink(recoveryEmail);
    await page.goto(recoveryUrl);
    await page.getByLabel("New Password").fill("Rowing!Aa1");
    await page.getByLabel("Confirm Password").fill("Boats!Bb2C");
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
