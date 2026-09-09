import fs from 'node:fs/promises';
import path from 'node:path';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://staging.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');

const publicRoutes = [
  '/',
  '/about',
  '/advice',
  '/building-regulations',
  '/contact',
  '/cookies',
  '/directory',
  '/disclaimer',
  '/download',
  '/for-homeowners',
  '/for-tradespeople',
  '/how-it-works',
  '/jobs',
  '/marketplace-standards',
  '/payments',
  '/pricing',
  '/privacy',
  '/report',
  '/status',
  '/terms',
  '/trust-safety',
  '/auth/account',
  '/auth/sign-in?mode=customer',
  '/auth/sign-in?mode=trader',
  '/auth/sign-up?mode=customer',
  '/auth/sign-up?mode=trader',
  '/auth/forgot-password?mode=customer',
  '/auth/forgot-password?mode=trader',
];

const signedInPublicRoutes = [
  '/',
  '/advice',
  '/directory',
  '/how-it-works',
  '/payments',
  '/pricing',
  '/trust-safety',
];

const homeownerRoutes = [
  '/customer/dashboard',
  '/customer/jobs',
  '/customer/new-job',
  '/customer/messages',
  '/customer/notifications',
  '/customer/profile',
  '/customer/saved-trades',
  '/customer/settings',
];

const tradespersonRoutes = [
  '/trader/dashboard',
  '/trader/analytics',
  '/trader/invoices',
  '/trader/invoices/new',
  '/trader/job-board',
  '/trader/messages',
  '/trader/my-jobs',
  '/trader/notifications',
  '/trader/onboarding',
  '/trader/profile',
  '/trader/saved-searches',
  '/trader/settings',
  '/trader/stories',
  '/trader/subscription',
  '/trader/trust',
];

async function signIn(page, email, role) {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error(`No Clerk token for ${email}`);
  const response = await fetch(`${baseURL}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error(`Could not enable ${role}: HTTP ${response.status} ${await response.text()}`);
}

async function assertMobileLayout(page, label) {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width > 600) return;

  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const interactive = [...document.querySelectorAll('button, [role="button"], input, textarea, select')];
    const protrudingControls = interactive.flatMap((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const hidden = style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0 || rect.width === 0 || rect.height === 0;
      if (hidden) return [];
      if (rect.left < -2 || rect.right > viewportWidth + 2) {
        return [{
          tag: element.tagName,
          text: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }];
      }
      return [];
    });

    return {
      viewportWidth,
      documentWidth: root.scrollWidth,
      bodyWidth: body.scrollWidth,
      protrudingControls: protrudingControls.slice(0, 8),
    };
  });

  expect(layout.documentWidth, `${label}: document overflows the mobile viewport`).toBeLessThanOrEqual(layout.viewportWidth + 2);
  expect(layout.bodyWidth, `${label}: body overflows the mobile viewport`).toBeLessThanOrEqual(layout.viewportWidth + 2);
  expect(layout.protrudingControls, `${label}: visible controls protrude beyond the mobile viewport`).toEqual([]);
}

async function assertHealthyRoute(page, route, label) {
  const apiFailures = [];
  const listener = (response) => {
    try {
      const url = new URL(response.url());
      if (url.origin === new URL(baseURL).origin && url.pathname.startsWith('/api/') && response.status() >= 500) {
        apiFailures.push(`${response.status()} ${url.pathname}${url.search}`);
      }
    } catch {
      // Ignore browser-internal/non-URL responses.
    }
  };
  page.on('response', listener);
  try {
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    expect(response, `${label}: navigation returned no response`).toBeTruthy();
    expect(response.status(), `${label}: document HTTP status`).toBeLessThan(400);
    await page.waitForTimeout(500);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(body, `${label}: unmatched route`).not.toMatch(/Unmatched Route|Page could not be found/i);
    expect(body, `${label}: server error rendered to user`).not.toMatch(/Internal server error/i);
    expect(apiFailures, `${label}: same-origin API 5xx responses`).toEqual([]);
    await assertMobileLayout(page, label);
  } finally {
    page.off('response', listener);
  }
}

test('every public and authentication surface remains routable', async ({ page }) => {
  for (const route of publicRoutes) {
    await test.step(`public route ${route}`, async () => assertHealthyRoute(page, route, route));
  }
});

test('a signed-in homeowner can still use the public BuildPair website', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, state.customerEmail, 'customer');
    for (const route of signedInPublicRoutes) {
      await test.step(`signed-in public route ${route}`, async () => assertHealthyRoute(page, route, route));
    }
  } finally {
    await context.close();
  }
});

test('every homeowner surface opens for a real homeowner session', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, state.customerEmail, 'customer');
    for (const route of homeownerRoutes) {
      await test.step(`homeowner route ${route}`, async () => assertHealthyRoute(page, route, route));
    }
    await expect(page.getByText(/Owner console/i)).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('every tradesperson surface opens for a real tradesperson session', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, state.traderEmail, 'trader');
    for (const route of tradespersonRoutes) {
      await test.step(`tradesperson route ${route}`, async () => assertHealthyRoute(page, route, route));
    }
    await expect(page.getByText(/Owner console/i)).toHaveCount(0);
  } finally {
    await context.close();
  }
});
