import fs from 'node:fs/promises';
import path from 'node:path';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://staging.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');

async function expectNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.scrollWidth, `${label}: document overflows horizontally`).toBeLessThanOrEqual(metrics.innerWidth + 2);
  expect(metrics.bodyWidth, `${label}: body overflows horizontally`).toBeLessThanOrEqual(metrics.innerWidth + 2);
}

async function expectActionReachable(page, action, label) {
  await expect(action).toBeVisible();
  await action.scrollIntoViewIfNeeded();
  const box = await action.boundingBox();
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(box, `${label}: action has no layout box`).not.toBeNull();
  expect((box?.y ?? viewportHeight) + (box?.height ?? 0), `${label}: action cannot be scrolled into the usable viewport`).toBeLessThanOrEqual(viewportHeight + 2);
  expect(box?.y ?? -1, `${label}: action remains above the usable viewport after scrolling`).toBeGreaterThanOrEqual(-2);
}

async function expectDashboardTopMenu(page, labels) {
  const menu = page.getByRole('button', { name: 'Menu', exact: true }).first();
  await expect(menu).toBeVisible();
  await menu.click();
  for (const label of labels) {
    await expect(page.getByText(label, { exact: true }).last()).toBeVisible();
  }
  await page.keyboard.press('Escape');
}

async function expectPublicTopMenu(page) {
  const menu = page.getByRole('button', { name: 'Menu', exact: true }).first();
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByText('Dashboard', { exact: true }).last()).toBeVisible();
  await page.keyboard.press('Escape');
}

async function getToken(page) {
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error('No Clerk token available in mobile layout test');
  return token;
}

async function api(token, pathName, options = {}) {
  const response = await fetch(`${baseURL}${pathName}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${pathName}: HTTP ${response.status} ${await response.text()}`);
  return response.json();
}

test('small Android public and auth surfaces fit without furniture-removal chaos', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel('BuildPair quick navigation')).toBeVisible();
  const heroCopy = page.getByTestId('home-hero-copy');
  const heroActions = page.getByTestId('home-hero-actions');
  const heroVisual = page.getByTestId('home-hero-visual');
  await expect(heroCopy).toBeVisible();
  await expect(heroActions).toBeVisible();
  await expect(heroVisual).toBeVisible();
  const actionsBox = await heroActions.boundingBox();
  const visualBox = await heroVisual.boundingBox();
  expect(actionsBox, 'homepage hero actions have no layout box').not.toBeNull();
  expect(visualBox, 'homepage hero visual has no layout box').not.toBeNull();
  expect((actionsBox?.y ?? 0) + (actionsBox?.height ?? 0), 'homepage image overlaps the hero action buttons').toBeLessThanOrEqual((visualBox?.y ?? 0) + 1);
  await expectNoHorizontalOverflow(page, 'homepage');

  await page.goto('/auth/account');
  const heading = page.getByText('One login. Two ways to use BuildPair.');
  await expect(heading).toBeVisible();
  const headingBox = await heading.boundingBox();
  expect(headingBox?.y ?? 9999).toBeLessThan(300);
  await expectNoHorizontalOverflow(page, 'account chooser');

  await page.goto('/auth/sign-in?mode=customer');
  await expect(page.getByText(/Homeowner Sign In/i)).toBeVisible();
  await expectNoHorizontalOverflow(page, 'customer sign in');

  await page.goto('/directory');
  await page.waitForLoadState('networkidle');
  await expectNoHorizontalOverflow(page, 'trader directory');

  await page.goto('/jobs');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/Latest job requests/i)).toBeVisible();
  await expectNoHorizontalOverflow(page, 'public jobs');

  await page.goto('/traders/demo-joe-loveridge-tiling');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/beta preview/i).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'preview trader profile');
});

test('small Android trader forms keep primary actions and top navigation reachable', async ({ page }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  await page.goto('/');
  await clerk.signIn({ page, emailAddress: state.traderEmail });
  const token = await getToken(page);
  await api(token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role: 'trader' }) });

  await page.goto('/trader/onboarding');
  await expect(page.getByText('Business Details', { exact: true }).first()).toBeVisible();
  const titleBox = await page.getByText('Business Details', { exact: true }).first().boundingBox();
  expect(titleBox?.y ?? 9999, 'Trader onboarding starts too far below the top of a small phone').toBeLessThan(300);
  await expectActionReachable(page, page.getByRole('button', { name: 'Continue' }), 'trader onboarding');
  await expectDashboardTopMenu(page, ['Home', 'Find work', 'Jobs', 'Messages', 'Profile']);
  await expectNoHorizontalOverflow(page, 'trader onboarding');

  await page.goto('/trader/invoices/new');
  await expect(page.getByText('Create invoice', { exact: true }).first()).toBeVisible();
  await expectActionReachable(page, page.getByRole('button', { name: 'Save and send invoice' }), 'create invoice');
  await expectDashboardTopMenu(page, ['Home', 'Find work', 'Jobs', 'Messages', 'Profile']);
  await expectNoHorizontalOverflow(page, 'create invoice');

  await page.goto('/trader/quotes/new?jobId=mobile-layout-check');
  await expect(page.getByText('Create an itemised quote', { exact: true }).first()).toBeVisible();
  await expectActionReachable(page, page.getByRole('button', { name: 'Send Quote & Open Conversation' }), 'create quote');
  await expectDashboardTopMenu(page, ['Home', 'Find work', 'Jobs', 'Messages', 'Profile']);
  await expectNoHorizontalOverflow(page, 'create quote');
});

test('small Android homeowner can post work and still browse the public website while signed in', async ({ page }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  await page.goto('/');
  await clerk.signIn({ page, emailAddress: state.customerEmail });
  const token = await getToken(page);
  await api(token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role: 'customer' }) });

  await page.goto('/customer/new-job');
  await expect(page.getByText('What do you need?', { exact: true }).first()).toBeVisible();
  await expectActionReachable(page, page.getByRole('button', { name: 'Continue' }), 'post a job');
  await expectDashboardTopMenu(page, ['Home', 'Find trades', 'Jobs', 'Messages', 'Profile']);
  await expectNoHorizontalOverflow(page, 'post a job');

  await page.goto('/advice');
  await expect(page.getByText(/Advice Hub/i).first()).toBeVisible();
  await expectPublicTopMenu(page);
  await expectNoHorizontalOverflow(page, 'signed-in advice hub');
});
