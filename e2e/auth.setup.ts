import { mkdirSync } from "fs";
import { dirname } from "path";
import { test as setup, expect } from "@playwright/test";

/**
 * Authentication setup for E2E tests.
 *
 * To run E2E tests against a live environment, set these env vars:
 *   E2E_BASE_URL     — e.g. https://your-app.vercel.app
 *   E2E_USER_EMAIL   — test user email
 *   E2E_USER_PASSWORD — test user password
 *
 * This setup logs in once and saves the auth state for all tests.
 * If env vars are not set, tests that require auth will be skipped.
 */

const storageStatePath = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    console.log("Skipping auth setup: E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    return;
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to bookings page
  await expect(page).toHaveURL(/\/bookings/, { timeout: 15_000 });

  mkdirSync(dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
});
