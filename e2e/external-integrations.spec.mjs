import fs from 'node:fs/promises';
import path from 'node:path';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://www.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');

async function signIn(browser, email, role) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error(`No Clerk token for ${email}`);
  await api(token, '/api/me', { method: 'PATCH', body: JSON.stringify({ role }) });
  return { context, page, token };
}

async function api(token, pathName, options = {}) {
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
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${pathName} -> HTTP ${response.status}: ${text}`);
  return body;
}

test.describe('external integrations', () => {
  test.skip(process.env.E2E_EXTERNAL !== '1', 'External AI/media checks run nightly, on main pushes or when explicitly requested.');

  test('all Gemini assistants and Cloudinary signing are healthy', async ({ browser }) => {
    const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    const customer = await signIn(browser, state.customerEmail, 'customer');
    const trader = await signIn(browser, state.traderEmail, 'trader');
    try {
      const traderMe = await api(trader.token, '/api/me');

      const tradeMatch = await api(null, '/api/ai/trade-match', {
        method: 'POST',
        body: JSON.stringify({ problem: 'The shower walls need removing, waterproofing and retiling because the grout and tiles are failing.' }),
      });
      expect(tradeMatch.source).toBe('ai');
      expect(typeof tradeMatch.primaryTrade).toBe('string');
      expect(tradeMatch.primaryTrade.length).toBeGreaterThan(1);

      const spec = await api(customer.token, '/api/ai/job-spec', {
        method: 'POST',
        body: JSON.stringify({
          category: 'Tiling',
          propertyType: 'House',
          answers: [
            { question: 'What area needs work?', answer: 'Bathroom shower walls and floor.' },
            { question: 'What is the current condition?', answer: 'Existing tiles and grout are failing and will need removal.' },
            { question: 'When would you like the work?', answer: 'Within the next month if possible.' },
          ],
        }),
      });
      expect(typeof spec.spec).toBe('string');
      expect(spec.spec.length).toBeGreaterThan(80);

      const quoteDraft = await api(trader.token, '/api/ai/quote-assistant', {
        method: 'POST',
        body: JSON.stringify({
          jobTitle: 'Bathroom shower retiling',
          jobDescription: 'Remove failed shower tiles, prepare and waterproof the substrate, retile, grout and silicone the shower area.',
          tradeCategory: 'Tiling',
          labourDays: 4,
          dayRate: 30000,
          materialsEstimate: 25000,
          vatRegistered: false,
        }),
      });
      expect(quoteDraft.source).toBe('ai');
      expect(quoteDraft.laborCost).toBe(120000);
      expect(quoteDraft.materialsCost).toBe(25000);
      expect(typeof quoteDraft.scope).toBe('string');
      expect(quoteDraft.scope.length).toBeGreaterThan(20);

      const aiJob = await api(customer.token, '/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          targetTraderId: traderMe.id,
          title: `AI assistant verification ${Date.now()}`,
          category: 'Tiling',
          propertyType: 'House',
          postcode: 'TW18 4AB',
          urgency: 'Flexible',
          description: 'Retile a bathroom shower area, waterproof the substrate, grout and silicone the finished work.',
          aiGeneratedSpec: null,
          budgetRange: '£1,500–£5,000',
          photos: [],
        }),
      });
      expect(aiJob.conversationId).toBeTruthy();

      await api(customer.token, `/api/conversations/${aiJob.conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: 'Could you confirm when you could inspect the bathroom and what information you need before quoting?' }),
      });

      const messageDraft = await api(trader.token, '/api/ai/message-assistant', {
        method: 'POST',
        body: JSON.stringify({ conversationId: aiJob.conversationId, draft: 'Thanks for the details.' }),
      });
      expect(messageDraft.source).toBe('ai');
      expect(typeof messageDraft.summary).toBe('string');
      expect(messageDraft.summary.length).toBeGreaterThan(10);
      expect(Array.isArray(messageDraft.suggestions)).toBe(true);
      expect(messageDraft.suggestions).toHaveLength(3);
      expect(messageDraft.suggestions.every((suggestion) => typeof suggestion === 'string' && suggestion.length > 10)).toBe(true);

      const customerUpload = await api(customer.token, '/api/uploads/sign', { method: 'POST', body: JSON.stringify({ kind: 'job' }) });
      expect(customerUpload.assetFolder).toBe('buildpair/job-photos');
      expect(customerUpload.signature).toMatch(/^[a-f0-9]{40}$/i);

      const traderUpload = await api(trader.token, '/api/uploads/sign', { method: 'POST', body: JSON.stringify({ kind: 'trader' }) });
      expect(traderUpload.assetFolder).toBe('buildpair/trader-gallery');
      expect(traderUpload.signature).toMatch(/^[a-f0-9]{40}$/i);

      await customer.page.goto(`${baseURL}/customer/new-job`, { waitUntil: 'domcontentloaded' });
      await expect(customer.page.getByText(/Post|job/i).first()).toBeVisible();
      await trader.page.goto(`${baseURL}/trader/subscription`, { waitUntil: 'domcontentloaded' });
      const subscriptionBody = await trader.page.locator('body').innerText();
      expect(subscriptionBody).not.toMatch(/Internal server error|Unmatched Route/i);
    } finally {
      await customer.context.close();
      await trader.context.close();
    }
  });
});
