import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://staging.buildpair.co.uk';
const runId = (process.env.GITHUB_RUN_ID || Date.now().toString()).replace(/[^a-zA-Z0-9-]/g, '');
const traderEmail = `buildpair-journey-trader+clerk_test_${runId}@example.com`;
const customerEmail = `buildpair-journey-homeowner+clerk_test_${runId}@example.com`;
const traderPassword = `Bp!${crypto.randomUUID()}Aa9`;
const customerPassword = `Bp!${crypto.randomUUID()}Aa9`;
const businessName = `BuildPair Real Journey ${runId}`;
const jobTitle = `Bathroom tiling real journey ${runId}`;
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');
const testPostcode = 'SW1A 1AA';

async function registerCleanupEmails() {
  let state = {};
  try {
    state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  } catch {
    // Global setup normally creates this file. Keep the journey recoverable if it was removed.
  }

  const cleanupEmails = new Set([
    ...(Array.isArray(state.cleanupEmails) ? state.cleanupEmails : []),
    state.customerEmail,
    state.traderEmail,
    traderEmail,
    customerEmail,
  ].filter(Boolean));

  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify({ ...state, cleanupEmails: [...cleanupEmails] }), 'utf8');
}

async function rawApi(page, pathName, options = {}) {
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error(`No active Clerk token for ${pathName}`);
  const response = await fetch(`${baseURL}${pathName}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body, text };
}

async function api(page, pathName, options = {}) {
  const { response, body, text } = await rawApi(page, pathName, options);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${pathName} -> HTTP ${response.status}: ${text}`);
  return body;
}

async function selectOption(page, label, option) {
  await page.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
  await page.getByText(option, { exact: true }).last().click();
}

async function chooseModeIfNeeded(page, mode) {
  const target = mode === 'trader' ? /\/trader\/onboarding/ : /\/customer\/dashboard/;
  try {
    await page.waitForURL(target, { timeout: 12_000 });
    return;
  } catch {
    // Automatic mode activation can take a moment after Clerk establishes the session.
  }

  await page.waitForURL(/\/auth\/choose-role/, { timeout: 20_000 });
  const title = mode === 'trader' ? 'Tradesperson' : 'Homeowner';
  const action = mode === 'trader' ? /Add Tradesperson Profile|Continue as Tradesperson/ : /Add Homeowner Profile|Continue as Homeowner/;
  await page.getByText(title, { exact: true }).last().click();
  const button = page.getByRole('button', { name: action });
  await expect(button).toBeEnabled();
  await button.click();
  await page.waitForURL(target, { timeout: 25_000 });
}

async function fillIfVisible(locator, value) {
  if (await locator.isVisible().catch(() => false)) await locator.fill(value);
}

async function realEmailSignup(page, mode, email, password) {
  await setupClerkTestingToken({ page });
  await page.goto(`${baseURL}/auth/sign-up?mode=${mode}`, { waitUntil: 'domcontentloaded' });

  if (mode === 'trader') {
    const tiling = page.getByRole('checkbox', { name: 'Tiling', exact: true });
    await expect(tiling).toBeVisible();
    await tiling.check();
  }

  await page.waitForSelector('.cl-signUp-root', { state: 'attached', timeout: 20_000 });
  const root = page.locator('.cl-signUp-root');

  await fillIfVisible(root.locator('input[name="firstName"]'), 'BuildPair');
  await fillIfVisible(root.locator('input[name="lastName"]'), 'E2E');
  await fillIfVisible(root.locator('input[name="username"]'), `buildpair_${mode}_${runId}`.toLowerCase().replace(/[^a-z0-9_]/g, ''));

  const emailInput = root.locator('input[name="emailAddress"]');
  const passwordInput = root.locator('input[name="password"]');
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const phoneInput = root.locator('input[name="phoneNumber"]');
  if (await phoneInput.isVisible().catch(() => false)) await phoneInput.fill('+15555550100');
  const legalCheckbox = root.locator('input[name="legalAccepted"]');
  if (await legalCheckbox.isVisible().catch(() => false)) await legalCheckbox.check();

  await root.getByRole('button', { name: 'Continue', exact: true }).click();

  const code = page.getByRole('textbox', { name: 'Enter verification code' });
  await expect(code).toBeVisible({ timeout: 20_000 });
  await code.pressSequentially('424242');
  await chooseModeIfNeeded(page, mode);
}

async function createStarterTraderProfile(page) {
  await expect(page.getByText('Business Details', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Business or trading name').fill(businessName);

  const tiling = page.getByRole('checkbox', { name: 'Tiling', exact: true });
  if (!(await tiling.isChecked())) await tiling.click();
  const bathroomTiling = page.getByRole('checkbox', { name: 'Bathroom tiling', exact: true });
  await expect(bathroomTiling).toBeEnabled();
  await bathroomTiling.click();

  await page.getByLabel('Years of experience').fill('12');
  await page.getByLabel('Year established').fill('2014');
  await page.getByLabel('Base postcode').fill(testPostcode);
  await page.getByLabel('Other areas you cover').fill('Westminster, Central London');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Business bio').fill('Experienced bathroom and floor tiling contractor used for BuildPair automated real-user journey testing. Reliable quoting, clear communication and tidy workmanship.');
  await page.getByLabel('Qualifications, cards and certificates (one per line)').fill('NVQ Wall and Floor Tiling\nPublic liability insured');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Portfolio', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Confirm & publish')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Confirm profile information is accurate' }).click();
  const publish = page.getByRole('button', { name: 'Save & Publish Profile' });
  await expect(publish).toBeEnabled();
  await publish.click();
  await page.waitForURL(/\/trader\/dashboard/, { timeout: 25_000 });

  const me = await api(page, '/api/me');
  expect(me.traderEnabled).toBe(true);
  const profile = await api(page, '/api/me/profile');
  expect(profile.businessName).toBe(businessName);
  expect(profile.tradeCategory).toBe('Tiling');
  expect(profile.subscriptionTier).toBe('free');
  expect(profile.isSubscriptionActive).toBe(false);
  return { me, profile };
}

async function postOpenMarketplaceJob(page) {
  await page.goto(`${baseURL}/customer/new-job`, { waitUntil: 'domcontentloaded' });
  await selectOption(page, 'Trade category', 'Tiling');
  await selectOption(page, 'Property type', 'House');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Short job title').fill(jobTitle);
  await page.getByLabel('Detailed job description').fill('Retile the main bathroom floor and shower walls, prepare the surfaces, waterproof the wet area, grout and silicone everything ready for use.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Job postcode / area').fill(testPostcode);
  await selectOption(page, 'Budget bracket', '£1,500–£5,000');
  await selectOption(page, 'Urgency', 'Within 1 month');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(jobTitle, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Post Job' }).click();
  await page.waitForURL(/\/customer\/jobs/, { timeout: 25_000 });

  const jobs = await api(page, '/api/jobs');
  const job = jobs.find((item) => item.title === jobTitle);
  expect(job).toBeTruthy();
  expect(job.targetTraderId).toBeNull();
  return job;
}

test.describe.configure({ mode: 'serial' });

test('real browser journey: Clerk signup -> account mode -> Starter trader profile -> homeowner job', async ({ browser }) => {
  await registerCleanupEmails();

  const traderContext = await browser.newContext();
  const customerContext = await browser.newContext();
  const traderPage = await traderContext.newPage();
  const customerPage = await customerContext.newPage();

  try {
    await test.step('Tradesperson signs up through the real Clerk web component and verifies email', async () => {
      await realEmailSignup(traderPage, 'trader', traderEmail, traderPassword);
    });

    const { me: traderUser, profile } = await test.step('Tradesperson publishes a real Starter profile', async () => createStarterTraderProfile(traderPage));
    expect(profile.categoryLimit).toBe(2);

    await test.step('Homeowner signs up with a separate fresh account', async () => {
      await realEmailSignup(customerPage, 'customer', customerEmail, customerPassword);
      const me = await api(customerPage, '/api/me');
      expect(me.customerEnabled).toBe(true);
      expect(me.activeMode).toBe('customer');
    });

    await test.step('Homeowner can post a real open marketplace job', async () => {
      await postOpenMarketplaceJob(customerPage);
    });

    await test.step('Starter trader remains blocked from paid direct-lead access', async () => {
      const result = await rawApi(customerPage, '/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          targetTraderId: traderUser.id,
          title: `Starter direct lead guard ${runId}`,
          category: 'Tiling',
          propertyType: 'House',
          postcode: testPostcode,
          urgency: 'Within 1 month',
          description: 'This direct request is intentionally expected to be rejected because the target tradesperson is still on Starter Free.',
          budgetRange: '£1,500–£5,000',
          photos: [],
          isEmergency: false,
        }),
      });
      expect(result.response.status).toBe(409);
      expect(String(result.body?.error ?? result.text)).toMatch(/not currently accepting direct BuildPair leads/i);
    });
  } finally {
    await traderContext.close();
    await customerContext.close();
  }
});
