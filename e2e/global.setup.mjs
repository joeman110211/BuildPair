import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClerkClient } from '@clerk/backend';
import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://staging.buildpair.co.uk';
const target = new URL(baseURL);
if (target.hostname !== 'staging.buildpair.co.uk') {
  throw new Error(`Mutating BuildPair E2E tests may only run against staging.buildpair.co.uk. Refusing target: ${target.hostname}`);
}

const runId = (process.env.GITHUB_RUN_ID || Date.now().toString()).replace(/[^a-zA-Z0-9-]/g, '');
const customerEmail = process.env.E2E_CUSTOMER_EMAIL || `buildpair-fixture-customer+clerk_test_${runId}@example.com`;
const traderEmail = process.env.E2E_TRADER_EMAIL || `buildpair-fixture-trader+clerk_test_${runId}@example.com`;
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');

async function ensureTestUser(client, email, firstName) {
  const existing = await client.users.getUserList({ emailAddress: [email], limit: 1 });
  if (existing.data[0]) return existing.data[0];
  return client.users.createUser({
    emailAddress: [email],
    password: `Bp!${crypto.randomUUID()}aA9`,
    firstName,
    lastName: 'BuildPair E2E',
  });
}

async function verifyTargetAuth(page, email, role) {
  await setupClerkTestingToken({ page });
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });

  try {
    await clerk.signIn({ page, emailAddress: email });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Staging Clerk contract failed for ${role}. The GitHub CLERK_SECRET_KEY must belong to the same Clerk development instance used by ${baseURL}. Clerk sign-in error: ${message}`,
    );
  }

  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error(`Staging Clerk contract returned no session token for ${role}`);

  const me = await fetch(`${baseURL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!me.ok) {
    throw new Error(`Staging auth contract GET /api/me failed for ${role}: HTTP ${me.status} ${await me.text()}`);
  }

  const activate = await fetch(`${baseURL}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!activate.ok) {
    throw new Error(`Staging auth contract PATCH /api/me failed for ${role}: HTTP ${activate.status} ${await activate.text()}`);
  }

  const body = await activate.json();
  const enabled = role === 'customer' ? body.customerEnabled : body.traderEnabled;
  if (enabled !== true || body.activeMode !== role) {
    throw new Error(`Staging auth contract returned incorrect ${role} mode state from PATCH /api/me`);
  }

  await page.evaluate(() => globalThis.Clerk?.signOut());
}

setup.describe.configure({ mode: 'serial' });

setup('prepare Clerk testing token, disposable users and verify the staging auth contract', async ({ page }) => {
  if (!process.env.CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY is required for authenticated E2E tests');

  const response = await fetch(`${baseURL}/api/client-config`);
  if (!response.ok) throw new Error(`Could not read BuildPair client config: HTTP ${response.status}`);
  const config = await response.json();
  if (!config.clerkPublishableKey) throw new Error('Target Clerk publishable key is missing');
  process.env.CLERK_PUBLISHABLE_KEY = config.clerkPublishableKey;

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const customer = await ensureTestUser(clerkClient, customerEmail, 'Customer');
  const trader = await ensureTestUser(clerkClient, traderEmail, 'Trader');
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify({
    customerEmail,
    traderEmail,
    customerClerkId: customer.id,
    traderClerkId: trader.id,
    cleanupEmails: [customerEmail, traderEmail],
  }), 'utf8');

  await clerkSetup();
  await verifyTargetAuth(page, customerEmail, 'customer');
  await verifyTargetAuth(page, traderEmail, 'trader');
});
