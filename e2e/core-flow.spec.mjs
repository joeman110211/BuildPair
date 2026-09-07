import fs from 'node:fs/promises';
import path from 'node:path';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://staging.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');
const testPostcode = 'SW1A 1AA';

async function signInAndGetToken(browser, email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error(`No Clerk session token returned for ${email}`);
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

test('Homeowner and Starter tradesperson core journey obeys the current product contract', async ({ browser }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const customer = await signInAndGetToken(browser, state.customerEmail);
  const trader = await signInAndGetToken(browser, state.traderEmail);

  try {
    await api(customer.token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role: 'customer' }) });
    const customerUser = await api(customer.token, '/api/me');
    expect(customerUser.customerEnabled).toBe(true);

    await api(trader.token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role: 'trader' }) });
    const traderUser = await api(trader.token, '/api/me');
    expect(traderUser.traderEnabled).toBe(true);

    const profile = await api(trader.token, '/api/me', {
      method: 'PUT',
      body: JSON.stringify({
        businessName: 'BuildPair Automated QA Trade',
        tradeCategories: ['Tiling'],
        serviceSelections: { Tiling: ['Bathroom tiling', 'Floor tiling'] },
        tradeCategory: 'Tiling',
        subSkills: ['Bathroom tiling', 'Floor tiling'],
        bio: 'Automated BuildPair end-to-end test tradesperson profile used only to verify the current Starter customer and trader workflow.',
        radiusMiles: 20,
        postcode: testPostcode,
        qualifications: ['Automated test profile - not a public trader'],
        externalLinks: {},
        photos: [],
        selfCertified: true,
        showcase: {
          template: 'modern',
          colourTheme: 'burnt_orange',
          coverPhotoUrl: '',
          profileImageUrl: '',
          logoUrl: '',
          yearsExperience: 10,
          yearEstablished: 2016,
          serviceAreas: ['Westminster', 'Central London'],
          beforeAfterProjects: [],
        },
      }),
    });
    expect(profile.subscriptionTier).toBe('free');
    expect(profile.isSubscriptionActive).toBe(false);
    expect(profile.categoryLimit).toBe(2);

    const unique = Date.now();
    const job = await api(customer.token, '/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        targetTraderId: null,
        title: `BuildPair E2E bathroom tiling ${unique}`,
        category: 'Tiling',
        propertyType: 'House',
        postcode: testPostcode,
        urgency: 'Flexible',
        description: 'Automated end-to-end test job to retile a bathroom, prepare the walls, waterproof the wet area and complete the finish.',
        aiGeneratedSpec: null,
        budgetRange: '£1,500–£5,000',
        photos: [],
      }),
    });
    expect(job.customerId).toBe(customerUser.id);
    expect(job.targetTraderId).toBeNull();
    expect(job.status).toBe('open');

    const traderJobs = await api(trader.token, '/api/jobs');
    expect(traderJobs.some((item) => item.id === job.id)).toBe(true);

    const quoteAttempt = await rawApi(trader.token, '/api/quotes', {
      method: 'POST',
      body: JSON.stringify({
        jobId: job.id,
        laborCost: 120000,
        materialsCost: 30000,
        vatAmount: 0,
        depositAmount: 20000,
        paymentTerms: '£200 deposit, remaining balance after the completed work is checked by the customer.',
        scope: 'Preparation, waterproofing, tiling, grouting, silicone and final clean.',
        notes: 'Automated BuildPair Starter entitlement check.',
      }),
    });
    expect(quoteAttempt.response.status).toBe(402);
    expect(String(quoteAttempt.body?.error ?? quoteAttempt.text)).toMatch(/Plus or Pro is required/i);

    const directLeadAttempt = await rawApi(customer.token, '/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        targetTraderId: traderUser.id,
        title: `BuildPair direct lead guard ${unique}`,
        category: 'Tiling',
        propertyType: 'House',
        postcode: testPostcode,
        urgency: 'Flexible',
        description: 'This direct request must be rejected while the target tradesperson remains on Starter Free.',
        aiGeneratedSpec: null,
        budgetRange: '£1,500–£5,000',
        photos: [],
      }),
    });
    expect(directLeadAttempt.response.status).toBe(409);
    expect(String(directLeadAttempt.body?.error ?? directLeadAttempt.text)).toMatch(/not currently accepting direct BuildPair leads/i);
  } finally {
    await customer.context.close();
    await trader.context.close();
  }
});
