import fs from 'node:fs/promises';
import path from 'node:path';
import { createClerkClient } from '@clerk/backend';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { test as teardown } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://www.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');

async function deleteBuildPairAccount(browser, email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await setupClerkTestingToken({ page });
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await clerk.signIn({ page, emailAddress: email });
    await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
    const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
    if (!token) throw new Error(`No session token for cleanup account ${email}`);
    const response = await fetch(`${baseURL}/api/me/delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
    });
    if (!response.ok) throw new Error(`Cleanup failed for ${email}: HTTP ${response.status} ${await response.text()}`);
    return true;
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
    return false;
  } finally {
    await context.close();
  }
}

async function deleteRemainingClerkUsers(client, email) {
  try {
    const result = await client.users.getUserList({ emailAddress: [email], limit: 10 });
    for (const user of result.data) {
      await client.users.deleteUser(user.id);
    }
  } catch (error) {
    console.warn(`Could not remove remaining Clerk test user ${email}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

teardown('remove disposable homeowner and tradesperson test accounts', async ({ browser }) => {
  let state;
  try {
    state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  } catch {
    console.warn('No E2E account state file found; nothing to clean up.');
    return;
  }

  const emails = [...new Set([
    ...(Array.isArray(state.cleanupEmails) ? state.cleanupEmails : []),
    state.customerEmail,
    state.traderEmail,
  ].filter(Boolean))];

  const clerkClient = process.env.CLERK_SECRET_KEY
    ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    : null;

  const failures = [];
  for (const email of emails) {
    // A broken or malicious state file must never delete an actual BuildPair customer.
    const disposable = /^buildpair-[a-z0-9-]+\+clerk_test_[a-zA-Z0-9-]+@example\.com$/.test(email);
    if (!disposable) {
      failures.push(`Refused non-test cleanup address: ${email}`);
      continue;
    }
    if (!await deleteBuildPairAccount(browser, email)) {
      failures.push(`BuildPair account deletion failed for disposable fixture ${email}`);
      continue;
    }
    if (clerkClient) await deleteRemainingClerkUsers(clerkClient, email);
  }

  if (failures.length) throw new Error(`Production fixture cleanup needs attention: ${failures.join('; ')}`);
  await fs.rm(stateFile, { force: true });
});
