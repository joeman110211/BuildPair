import fs from 'node:fs/promises';
import path from 'node:path';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://staging.buildpair.co.uk';
const stateFile = path.join(process.cwd(), 'playwright', '.e2e-users.json');
const storageKey = 'buildpair:draft:customer-job-open-v1';

async function selectOption(page, label, option) {
  await page.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
  await page.getByText(option, { exact: true }).last().click();
}

test('homeowner job draft restores the exact in-progress form after a reload', async ({ page }) => {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: state.customerEmail });
  await page.waitForFunction(() => Boolean(globalThis.Clerk?.session));
  const token = await page.evaluate(() => globalThis.Clerk.session.getToken());
  if (!token) throw new Error('No Clerk token for draft recovery test');
  await fetch(`${baseURL}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'customer' }),
  });

  await page.goto(`${baseURL}/customer/new-job`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await selectOption(page, 'Trade category', 'Tiling');
  await selectOption(page, 'Property type', 'House');
  await page.getByRole('button', { name: 'Continue' }).click();

  const title = `Draft survives reload ${Date.now()}`;
  const description = 'This bathroom tiling draft should survive a complete browser reload without losing the homeowner’s work or returning them to the beginning.';
  await page.getByLabel('Short job title').fill(title);
  await page.getByLabel('Detailed job description').fill(description);
  await expect(page.getByText('Draft saved automatically ✓', { exact: true })).toBeVisible({ timeout: 5000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Describe the job', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Short job title')).toHaveValue(title);
  await expect(page.getByLabel('Detailed job description')).toHaveValue(description);
  await expect(page.getByText('Draft restored ✓', { exact: true })).toBeVisible();

  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
});
