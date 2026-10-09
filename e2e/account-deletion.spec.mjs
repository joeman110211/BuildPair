import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClerkClient } from '@clerk/backend';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://www.buildpair.co.uk';
const runId = (process.env.GITHUB_RUN_ID || Date.now().toString()).replace(/[^a-zA-Z0-9-]/g, '');
const email = `buildpair-delete+clerk_test_${runId}@example.com`;
const password = `Bp!Delete${crypto.randomUUID()}Aa9`;
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');

async function registerCleanupEmail() {
  let state = {};
  try {
    state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  } catch {
    // Global setup normally creates this file.
  }
  const cleanupEmails = new Set([
    ...(Array.isArray(state.cleanupEmails) ? state.cleanupEmails : []),
    email,
  ].filter(Boolean));
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify({ ...state, cleanupEmails: [...cleanupEmails] }), 'utf8');
}

async function createDisposableUser() {
  if (!process.env.CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY is required for account deletion E2E');
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const existing = await client.users.getUserList({ emailAddress: [email], limit: 10 });
  for (const user of existing.data) await client.users.deleteUser(user.id);
  return {
    client,
    user: await client.users.createUser({
      emailAddress: [email],
      password,
      firstName: 'Delete',
      lastName: 'BuildPair E2E',
    }),
  };
}

test('a homeowner can permanently delete the BuildPair account from the profile screen', async ({ page }) => {
  await registerCleanupEmail();
  const { client } = await createDisposableUser();
  await setupClerkTestingToken({ page });

  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  expect(token).toBeTruthy();

  const activate = await fetch(`${baseURL}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'customer' }),
  });
  expect(activate.ok, `PATCH /api/me returned HTTP ${activate.status}`).toBe(true);

  await page.goto(`${baseURL}/customer/profile`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Delete account', { exact: true })).toBeVisible();
  await page.getByLabel('Type DELETE MY ACCOUNT').fill('DELETE MY ACCOUNT');
  const removeButton = page.getByRole('button', { name: 'Permanently delete account' });
  await expect(removeButton).toBeEnabled();

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Permanently delete BuildPair account?');
    await dialog.accept();
  });
  await removeButton.click();

  await page.waitForURL(new RegExp(`${baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`), { timeout: 25_000 });
  await page.waitForFunction(() => !globalThis.Clerk?.session, null, { timeout: 20_000 });

  const remaining = await client.users.getUserList({ emailAddress: [email], limit: 10 });
  expect(remaining.data).toHaveLength(0);
});
