import "dotenv/config";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.E2E_USER_EMAIL ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.E2E_USER_PASSWORD ?? "";
const hasAdminAuth = !!(adminEmail && adminPassword);
const appBaseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const canGenerateRecoveryLink = !!(supabaseUrl && serviceRoleKey);

type InviteResponse = {
  inviteUrl: string;
};

async function login(page: Page, email: string, password: string) {
  await page.goto(`${appBaseUrl}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

async function loginAsAdmin(page: Page) {
  await login(page, adminEmail, adminPassword);
  await expect(page).toHaveURL(/\/bookings/, { timeout: 15_000 });
}

async function openInvitationsTab(page: Page) {
  await page.goto(`${appBaseUrl}/admin`);
  await expect(page.getByText("Admin Panel")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: /Invitations/ }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
}

async function createInvite(page: Page, email: string) {
  await openInvitationsTab(page);
  await page.getByLabel("Email").fill(email);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/invitations") &&
      response.request().method() === "POST"
  );

  await page.getByRole("button", { name: /send invite/i }).click();

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as InviteResponse;
  expect(data.inviteUrl).toBeTruthy();
  return data.inviteUrl;
}

async function registerInvitedUser(
  context: BrowserContext,
  inviteUrl: string,
  fullName: string,
  password: string
) {
  const page = await context.newPage();
  await page.goto(inviteUrl);
  await expect(page.getByText("Join Leichhardt Rowing Club")).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Full Name").fill(fullName);
  await page.getByLabel(/^Password$/).fill(password);
  await page.getByLabel(/^Confirm Password$/).fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/bookings/, { timeout: 20_000 });
  await expect(page.getByText(/Bookings — W\/C/)).toBeVisible({ timeout: 15_000 });
  return page;
}

function buildTestIdentity(prefix: string) {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `liam+${prefix}-${suffix}@liamdye.com`,
    fullName: `E2E ${prefix} ${suffix}`,
    password: `Rowing!${suffix}Aa1`,
    nextPassword: `Boats!${suffix}Bb2`,
  };
}

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

  return data.properties.action_link;
}

test.describe.serial("Invite signup and recovery flows", () => {
  test.skip(!hasAdminAuth, "Admin auth env vars are required");

  test("admin can invite a user who completes signup and signs in with the chosen password", async ({
    browser,
    page,
  }) => {
    const identity = buildTestIdentity("signup");
    await loginAsAdmin(page);
    const inviteUrl = await createInvite(page, identity.email);

    const userContext = await browser.newContext();
    const userPage = await registerInvitedUser(
      userContext,
      inviteUrl,
      identity.fullName,
      identity.password
    );

    await userPage.getByRole("button", { name: /sign out/i }).click();
    await expect(userPage).toHaveURL(/\/login/, { timeout: 15_000 });

    await login(userPage, identity.email, identity.password);
    await expect(userPage).toHaveURL(/\/bookings/, { timeout: 15_000 });
    await expect(userPage.getByText(/Bookings — W\/C/)).toBeVisible();

    await userContext.close();
  });

  test("user can request a password reset and sign in with the new password from a recovery link", async ({
    browser,
    page,
  }) => {
    test.skip(!canGenerateRecoveryLink, "SUPABASE_SERVICE_ROLE_KEY not available for recovery-link generation");

    const identity = buildTestIdentity("recovery");
    await loginAsAdmin(page);
    const inviteUrl = await createInvite(page, identity.email);

    const userContext = await browser.newContext();
    const userPage = await registerInvitedUser(
      userContext,
      inviteUrl,
      identity.fullName,
      identity.password
    );

    await userPage.getByRole("button", { name: /sign out/i }).click();
    await expect(userPage).toHaveURL(/\/login/, { timeout: 15_000 });

    await userPage.getByLabel("Email").fill(identity.email);
    await userPage.getByText(/forgot password/i).click();
    await expect(userPage.getByText(/password reset email sent|check your email/i)).toBeVisible({
      timeout: 15_000,
    });

    const recoveryUrl = await generateRecoveryLink(identity.email);
    await userPage.goto(recoveryUrl);
    await expect(userPage.getByText("Set New Password")).toBeVisible({ timeout: 15_000 });
    await userPage.getByLabel("New Password").fill(identity.nextPassword);
    await userPage.getByLabel("Confirm Password").fill(identity.nextPassword);
    await userPage.getByRole("button", { name: /update password/i }).click();

    await expect(userPage).toHaveURL(/\/bookings/, { timeout: 20_000 });
    await userPage.getByRole("button", { name: /sign out/i }).click();
    await expect(userPage).toHaveURL(/\/login/, { timeout: 15_000 });

    await login(userPage, identity.email, identity.nextPassword);
    await expect(userPage).toHaveURL(/\/bookings/, { timeout: 15_000 });

    await userContext.close();
  });
});
