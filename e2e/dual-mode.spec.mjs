import fs from 'node:fs/promises';
import path from 'node:path';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://www.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');

async function tokenFor(page) {
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error('No active Clerk token for dual-mode test');
  return token;
}

async function api(token, pathName, options = {}) {
  const response = await fetch(`${baseURL}${pathName}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${pathName} -> HTTP ${response.status}: ${text}`);
  return body;
}

test('one BuildPair login can add both profiles and switch cleanly between homeowner and tradesperson', async ({ page }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: state.traderEmail });
  const token = await tokenFor(page);

  await api(token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role: 'trader' }) });
  let me = await api(token, '/api/me');
  expect(me.traderEnabled).toBe(true);

  await page.goto(`${baseURL}/auth/choose-role`, { waitUntil: 'domcontentloaded' });
  const homeownerChoice = page.getByText(/Homeowner$/, { exact: false }).last();
  await expect(homeownerChoice).toBeVisible();
  await homeownerChoice.click();
  const addHomeowner = page.getByRole('button', { name: /Add Homeowner Profile|Continue as Homeowner/ });
  await expect(addHomeowner).toBeEnabled();
  await addHomeowner.click();
  await page.waitForURL(/\/customer\/dashboard/, { timeout: 25_000 });

  me = await api(token, '/api/me');
  expect(me.customerEnabled).toBe(true);
  expect(me.traderEnabled).toBe(true);
  expect(me.activeMode).toBe('customer');

  await page.goto(`${baseURL}/auth/choose-role`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Tradesperson$/, { exact: false }).last().click();
  const switchTrader = page.getByRole('button', { name: /Continue as Tradesperson|Add Tradesperson Profile/ });
  await expect(switchTrader).toBeEnabled();
  await switchTrader.click();
  await page.waitForURL(/\/trader\/(dashboard|onboarding)/, { timeout: 25_000 });

  me = await api(token, '/api/me');
  expect(me.customerEnabled).toBe(true);
  expect(me.traderEnabled).toBe(true);
  expect(me.activeMode).toBe('trader');
});
