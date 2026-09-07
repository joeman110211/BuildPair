import fs from 'node:fs/promises';
import path from 'node:path';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://staging.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');
const postcode = 'SW1A 1AA';

async function signIn(browser, email, role) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error(`No token for ${email}`);
  await api(token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role }) });
  return { context, page, token };
}

async function raw(token, pathName, options = {}) {
  const response = await fetch(`${baseURL}${pathName}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  const result = await raw(token, pathName, options);
  if (!result.response.ok) throw new Error(`${options.method || 'GET'} ${pathName} -> HTTP ${result.response.status}: ${result.text}`);
  return result.body;
}

async function ensureStarterProfile(token) {
  return api(token, '/api/me', {
    method: 'PUT',
    body: JSON.stringify({
      businessName: 'BuildPair Abuse Test Trade',
      tradeCategories: ['Tiling'],
      serviceSelections: { Tiling: ['Bathroom tiling'] },
      tradeCategory: 'Tiling',
      subSkills: ['Bathroom tiling'],
      bio: 'Disposable BuildPair security test profile used to prove server-side entitlement and permission boundaries remain enforced.',
      radiusMiles: 25,
      postcode,
      qualifications: ['Automated security test only'],
      externalLinks: {},
      photos: [],
      selfCertified: true,
      subscriptionTier: 'featured',
      isSubscriptionActive: true,
      showcase: {
        template: 'modern',
        colourTheme: 'burnt_orange',
        coverPhotoUrl: '',
        profileImageUrl: '',
        logoUrl: '',
        yearsExperience: 8,
        yearEstablished: 2018,
        serviceAreas: ['Westminster'],
        beforeAfterProjects: [],
      },
    }),
  });
}

test.describe.configure({ mode: 'serial' });

test('anonymous and ordinary users cannot enter administrator APIs', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const anonymousOverview = await raw(null, '/api/admin/overview');
  const anonymousHealth = await raw(null, '/api/admin/system-health');
  expect([401, 403]).toContain(anonymousOverview.response.status);
  expect([401, 403]).toContain(anonymousHealth.response.status);

  const customer = await signIn(browser, state.customerEmail, 'customer');
  try {
    const overview = await raw(customer.token, '/api/admin/overview');
    const systemHealth = await raw(customer.token, '/api/admin/system-health');
    expect(overview.response.status).toBe(403);
    expect(systemHealth.response.status).toBe(403);

    await customer.page.goto(`${baseURL}/admin`, { waitUntil: 'domcontentloaded' });
    await expect(customer.page.getByText('Administrator access required', { exact: true })).toBeVisible();
  } finally {
    await customer.context.close();
  }
});

test('account mode and upload APIs reject privilege and role abuse', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const customer = await signIn(browser, state.customerEmail, 'customer');
  try {
    const adminRole = await raw(customer.token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) });
    expect(adminRole.response.status).toBe(400);

    const traderUpload = await raw(customer.token, '/api/uploads/sign', { method: 'POST', body: JSON.stringify({ kind: 'trader' }) });
    expect(traderUpload.response.status).toBe(403);

    const invalidUpload = await raw(customer.token, '/api/uploads/sign', { method: 'POST', body: JSON.stringify({ kind: 'everything' }) });
    expect(invalidUpload.response.status).toBe(400);
  } finally {
    await customer.context.close();
  }
});

test('a tradesperson cannot self-upgrade by smuggling subscription fields into profile updates', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const trader = await signIn(browser, state.traderEmail, 'trader');
  try {
    await ensureStarterProfile(trader.token);
    const profile = await api(trader.token, '/api/me/profile');
    expect(profile.subscriptionTier).toBe('free');
    expect(profile.isSubscriptionActive).toBe(false);
    expect(profile.categoryLimit).toBe(2);
  } finally {
    await trader.context.close();
  }
});

test('malformed money, oversized content and expired trust evidence are rejected server-side', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const customer = await signIn(browser, state.customerEmail, 'customer');
  const trader = await signIn(browser, state.traderEmail, 'trader');
  try {
    await ensureStarterProfile(trader.token);
    const job = await api(customer.token, '/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        targetTraderId: null,
        title: `BuildPair abuse boundary ${Date.now()}`,
        category: 'Tiling',
        propertyType: 'House',
        postcode,
        urgency: 'Flexible',
        description: 'Security boundary test job with enough detail to prove malformed quote values are rejected before any marketplace action is created.',
        aiGeneratedSpec: null,
        budgetRange: '£1,500–£5,000',
        photos: [],
        isEmergency: false,
      }),
    });

    const negativeQuote = await raw(trader.token, '/api/quotes', {
      method: 'POST',
      body: JSON.stringify({
        jobId: job.id,
        laborCost: -1,
        materialsCost: 0,
        vatAmount: 0,
        depositAmount: 0,
        paymentTerms: 'No invalid negative pricing should ever be accepted.',
      }),
    });
    expect(negativeQuote.response.status).toBe(400);

    const impossibleDeposit = await raw(trader.token, '/api/quotes', {
      method: 'POST',
      body: JSON.stringify({
        jobId: job.id,
        laborCost: 10000,
        materialsCost: 0,
        vatAmount: 0,
        depositAmount: 10000,
        paymentTerms: 'Deposit equal to the entire quote must be rejected.',
      }),
    });
    expect(impossibleDeposit.response.status).toBe(400);

    const hugeJob = await raw(customer.token, '/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        targetTraderId: null,
        title: 'Oversized description boundary',
        category: 'Tiling',
        propertyType: 'House',
        postcode,
        urgency: 'Flexible',
        description: 'x'.repeat(5001),
        budgetRange: 'Not sure / discuss',
        photos: [],
        isEmergency: false,
      }),
    });
    expect(hugeJob.response.status).toBe(400);

    const expiredCredential = await raw(trader.token, '/api/credentials', {
      method: 'POST',
      body: JSON.stringify({
        credentialType: 'public_liability',
        name: 'Already expired evidence',
        issuer: 'BuildPair Security Test',
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      }),
    });
    expect(expiredCredential.response.status).toBe(400);
  } finally {
    await customer.context.close();
    await trader.context.close();
  }
});

test('unauthorised quote, review and conversation actions fail rather than leaking or mutating data', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const customer = await signIn(browser, state.customerEmail, 'customer');
  try {
    const fakeId = '00000000-0000-4000-8000-000000000001';
    const quoteAsCustomer = await raw(customer.token, '/api/quotes', {
      method: 'POST',
      body: JSON.stringify({
        jobId: fakeId,
        laborCost: 10000,
        materialsCost: 0,
        vatAmount: 0,
        depositAmount: 0,
        paymentTerms: 'Customer must not be able to act as a tradesperson.',
      }),
    });
    expect(quoteAsCustomer.response.status).toBe(403);

    const acceptUnknownQuote = await raw(customer.token, `/api/quotes/${fakeId}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) });
    expect(acceptUnknownQuote.response.status).toBe(404);

    const unknownConversation = await raw(customer.token, `/api/conversations/${fakeId}/messages`);
    expect(unknownConversation.response.status).toBe(404);

    const reviewWithoutRelationship = await raw(customer.token, '/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ jobId: fakeId, traderId: 'not-a-trader', rating: 5, comment: 'This review must never be accepted without a verified completed BuildPair job.' }),
    });
    expect(reviewWithoutRelationship.response.status).toBe(404);
  } finally {
    await customer.context.close();
  }
});
