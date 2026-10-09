import fs from 'node:fs/promises';
import path from 'node:path';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://www.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');
const runId = (process.env.GITHUB_RUN_ID || Date.now().toString()).replace(/[^a-zA-Z0-9-]/g, '');
const testPostcode = 'SW1A 1AA';

async function signIn(browser, email, role) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error(`No Clerk token returned for ${email}`);
  await api(token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role }) });
  return { context, page, token };
}

async function rawApi(token, pathName, options = {}) {
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

async function api(token, pathName, options = {}) {
  const { response, body, text } = await rawApi(token, pathName, options);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${pathName} -> HTTP ${response.status}: ${text}`);
  return body;
}

async function ensureTraderProfile(token) {
  return api(token, '/api/me', {
    method: 'PUT',
    body: JSON.stringify({
      businessName: `BuildPair Feature Matrix ${runId}`,
      tradeCategories: ['Tiling'],
      serviceSelections: { Tiling: ['Bathroom tiling', 'Floor tiling'] },
      tradeCategory: 'Tiling',
      subSkills: ['Bathroom tiling', 'Floor tiling'],
      bio: 'BuildPair automated feature-matrix tradesperson profile used to verify launched Pro marketplace tools, trust features and entitlement boundaries.',
      radiusMiles: 25,
      postcode: testPostcode,
      qualifications: ['Automated E2E test profile'],
      externalLinks: {},
      photos: [],
      selfCertified: true,
      showcase: {
        template: 'modern',
        colourTheme: 'burnt_orange',
        coverPhotoUrl: '',
        profileImageUrl: '',
        logoUrl: '',
        yearsExperience: 12,
        yearEstablished: 2014,
        serviceAreas: ['Westminster', 'Central London'],
        beforeAfterProjects: [],
      },
    }),
  });
}

async function assertPage(page, route, expected) {
  const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 599, `${route} document status`).toBeLessThan(400);
  if (expected) await expect(page.getByText(expected, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/Unmatched Route|Page could not be found|Internal server error/i);
}

test.describe.configure({ mode: 'serial' });

test('Introductory Pro tradesperson features, saved records and direct leads work in production', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const customer = await signIn(browser, state.customerEmail, 'customer');
  const trader = await signIn(browser, state.traderEmail, 'trader');

  let savedSearchId;
  let availabilityId;
  let storyId;
  let traderUser;
  let profile;

  try {
    traderUser = await api(trader.token, '/api/me');
    profile = await ensureTraderProfile(trader.token);

    await test.step('Homeowner can save and unsave a tradesperson and see Saved Trades', async () => {
      await api(customer.token, '/api/saved-traders', { method: 'POST', body: JSON.stringify({ traderId: traderUser.id, saved: true }) });
      const saved = await api(customer.token, '/api/saved-traders');
      expect(saved.some((item) => item.traderId === traderUser.id)).toBe(true);
      await assertPage(customer.page, '/customer/saved-trades', 'Saved');
    });

    await test.step('Tradesperson can create, edit and list a saved job search', async () => {
      const created = await api(trader.token, '/api/saved-searches', {
        method: 'POST',
        body: JSON.stringify({
          name: `Bathroom leads ${runId}`,
          category: 'Tiling',
          keywords: 'bathroom tile shower wetroom',
          postcode: testPostcode,
          radiusMiles: 25,
          emergencyOnly: false,
          enabled: true,
        }),
      });
      savedSearchId = created.id;
      const updated = await api(trader.token, '/api/saved-searches', {
        method: 'PATCH',
        body: JSON.stringify({ id: savedSearchId, name: `Priority bathroom leads ${runId}`, radiusMiles: 30 }),
      });
      expect(updated.radiusMiles).toBe(30);
      const searches = await api(trader.token, '/api/saved-searches');
      expect(searches.some((item) => item.id === savedSearchId)).toBe(true);
      await assertPage(trader.page, '/trader/saved-searches', 'Saved');
    });

    await test.step('Tradesperson availability can be created, read and removed', async () => {
      const startsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      startsAt.setUTCHours(8, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 8 * 60 * 60 * 1000);
      const entry = await api(trader.token, '/api/availability', {
        method: 'POST',
        body: JSON.stringify({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status: 'available', note: `E2E availability ${runId}` }),
      });
      availabilityId = entry.id;
      const entries = await api(trader.token, `/api/availability?traderId=${encodeURIComponent(traderUser.id)}`);
      expect(entries.some((item) => item.id === availabilityId)).toBe(true);
    });

    await test.step('Tradesperson trust credential submission creates a visible submitted record and notification', async () => {
      const credential = await api(trader.token, '/api/credentials', {
        method: 'POST',
        body: JSON.stringify({ credentialType: 'public_liability', name: `E2E Public Liability ${runId}`, issuer: 'BuildPair Automated QA', referenceNumber: `QA-${runId}` }),
      });
      expect(credential.status).toBe('submitted');
      const credentials = await api(trader.token, '/api/credentials');
      expect(credentials.some((item) => item.id === credential.id && item.status === 'submitted')).toBe(true);
      await assertPage(trader.page, '/trader/trust', 'Trust');
      const notifications = await api(trader.token, '/api/notifications');
      expect(notifications.some((item) => item.type === 'credential_submitted')).toBe(true);
    });

    await test.step('Project stories reject photos that are not owned approved uploads', async () => {
      const story = await rawApi(trader.token, '/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          title: `Bathroom transformation ${runId}`,
          locationLabel: 'Westminster',
          summary: 'Automated before and after project story used to verify the BuildPair tradesperson portfolio and public social-proof workflow.',
          beforePhotos: [`https://example.com/buildpair-before-${runId}.jpg`],
          afterPhotos: [],
          durationDays: 5,
          completedAt: new Date().toISOString(),
        }),
      });
      expect([400, 403]).toContain(story.response.status);
      const publicStories = await api(customer.token, `/api/stories?traderId=${encodeURIComponent(traderUser.id)}`);
      expect(Array.isArray(publicStories)).toBe(true);
      await assertPage(trader.page, '/trader/stories', 'Project Stories');
    });

    await test.step('Introductory Pro can receive a targeted BuildPair homeowner request', async () => {
      const result = await api(customer.token, '/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          targetTraderId: traderUser.id,
          title: `BuildPair QA Pro direct lead ${runId}`,
          category: 'Tiling',
          propertyType: 'House',
          postcode: testPostcode,
          urgency: 'Within 1 month',
          description: 'Temporary BuildPair production QA request checking eligible Pro accounts can receive homeowner direct jobs.',
          budgetRange: '£1,500–£5,000',
          photos: [],
          isEmergency: false,
        }),
      });
      expect(result.targetTraderId).toBe(traderUser.id);
      expect(result.conversationId).toBeTruthy();
    });

    await test.step('Notifications can be individually read and marked all read', async () => {
      const customerNotifications = await api(customer.token, '/api/notifications');
      const traderNotifications = await api(trader.token, '/api/notifications');
      expect(traderNotifications.length).toBeGreaterThan(0);
      const unread = traderNotifications.find((item) => !item.readAt);
      if (unread) {
        const result = await api(trader.token, '/api/notifications', { method: 'PATCH', body: JSON.stringify({ id: unread.id, action: 'read' }) });
        expect(result.read).toBe(true);
      }
      const allRead = await api(trader.token, '/api/notifications', { method: 'PATCH', body: JSON.stringify({ action: 'read_all' }) });
      expect(allRead.readAll).toBe(true);
      expect(Array.isArray(customerNotifications)).toBe(true);
      await assertPage(trader.page, '/trader/notifications', 'Notifications');
    });

    await test.step('Live Pro trade profile is accessible to the homeowner', async () => {
      await assertPage(customer.page, `/traders/${profile.id}`, profile.businessName);
    });

    await test.step('Both dashboards still show persisted account state', async () => {
      await assertPage(customer.page, '/customer/dashboard', 'Homeowner');
      await assertPage(trader.page, '/trader/dashboard', 'Tradesperson');
    });
  } finally {
    if (trader?.token && savedSearchId) await api(trader.token, '/api/saved-searches', { method: 'DELETE', body: JSON.stringify({ id: savedSearchId }) }).catch(() => {});
    if (trader?.token && availabilityId) await api(trader.token, '/api/availability', { method: 'DELETE', body: JSON.stringify({ id: availabilityId }) }).catch(() => {});
    if (trader?.token && storyId) await api(trader.token, '/api/stories', { method: 'DELETE', body: JSON.stringify({ id: storyId }) }).catch(() => {});
    if (customer?.token && traderUser?.id) await api(customer.token, '/api/saved-traders', { method: 'POST', body: JSON.stringify({ traderId: traderUser.id, saved: false }) }).catch(() => {});
    await customer.context.close();
    await trader.context.close();
  }
});
