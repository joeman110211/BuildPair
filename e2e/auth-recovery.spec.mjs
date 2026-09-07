import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClerkClient } from '@clerk/backend';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://staging.buildpair.co.uk';
const runId = (process.env.GITHUB_RUN_ID || Date.now().toString()).replace(/[^a-zA-Z0-9-]/g, '');
const email = `buildpair-recovery+clerk_test_${runId}@example.com`;
const initialPassword = `Bp!Old${crypto.randomUUID()}Aa9`;
const replacementPassword = `Bp!New${crypto.randomUUID()}Aa9`;
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');

async function registerCleanupEmail() {
  let state = {};
  try {
    state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  } catch {
    // Global setup normally owns this file.
  }
  const cleanupEmails = new Set([
    ...(Array.isArray(state.cleanupEmails) ? state.cleanupEmails : []),
    email,
  ].filter(Boolean));
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify({ ...state, cleanupEmails: [...cleanupEmails] }), 'utf8');
}

async function ensureRecoveryUser() {
  if (!process.env.CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY is required for password-recovery E2E');
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const existing = await client.users.getUserList({ emailAddress: [email], limit: 10 });
  for (const user of existing.data) await client.users.deleteUser(user.id);
  await client.users.createUser({
    emailAddress: [email],
    password: initialPassword,
    firstName: 'Recovery',
    lastName: 'BuildPair E2E',
  });
}

async function finishEmailSignInIfNeeded(page) {
  const verification = page.getByLabel('Verification code');
  if (await verification.isVisible().catch(() => false)) {
    await verification.fill('424242');
    await page.getByRole('button', { name: 'Verify and sign in' }).click();
  }
}

async function submitCurrentClerkStep(page) {
  const root = page.locator('.cl-signIn-root');
  const submit = root.locator('button[type="submit"]').first();
  await expect(submit).toBeVisible({ timeout: 20_000 });
  await expect(submit).toBeEnabled();
  await submit.click();
}

test('a user can reset a forgotten password and sign in with the replacement password', async ({ page }) => {
  await registerCleanupEmail();
  await ensureRecoveryUser();
  await setupClerkTestingToken({ page });

  await page.goto(`${baseURL}/auth/forgot-password?mode=customer`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Reset your password', { exact: true })).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send reset code' }).click();

  await expect(page.getByText('Check your email', { exact: true })).toBeVisible();
  await page.getByLabel('Reset code').fill('424242');
  await page.getByRole('button', { name: 'Verify code' }).click();

  await expect(page.getByText('Choose a new password', { exact: true })).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill(replacementPassword);
  await page.getByLabel('Confirm new password', { exact: true }).fill(replacementPassword);
  await page.getByRole('button', { name: 'Set new password' }).click();
  await page.waitForURL(/\/(auth\/choose-role|customer\/dashboard)/, { timeout: 25_000 });

  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  expect(token).toBeTruthy();
  const me = await fetch(`${baseURL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
  expect(me.ok, `GET /api/me after password reset returned HTTP ${me.status}`).toBe(true);

  await page.evaluate(() => globalThis.Clerk?.signOut());
  await page.goto(`${baseURL}/auth/sign-in?mode=customer`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(replacementPassword);
  await submitCurrentClerkStep(page);
  await finishEmailSignInIfNeeded(page);
  await page.waitForURL(/\/(auth\/choose-role|customer\/dashboard)/, { timeout: 25_000 });
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
});
