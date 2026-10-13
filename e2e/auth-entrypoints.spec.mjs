import { expect, test } from '@playwright/test';

function trackHydrationErrors(page) {
  const errors = [];
  const mismatch = /minified react error #418|hydration failed|server rendered.*didn't match|text content does not match/i;
  page.on('pageerror', (error) => {
    if (mismatch.test(error.message)) errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && mismatch.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function expectClerkEntryPoint(page, kind) {
  const root = page.locator('.cl-rootBox').first();
  await expect(root, `${kind} Clerk component did not render`).toBeVisible({ timeout: 20_000 });

  const inputs = root.locator('input');
  await expect.poll(async () => inputs.count(), { message: `${kind} did not expose an input` }).toBeGreaterThan(0);

  const body = await root.innerText();
  expect(body, `${kind} rendered an empty Clerk shell`).toMatch(/email|continue|sign|account/i);
}

test('Administrator web sign-in renders a usable administrator entrypoint and keeps admin context', async ({ page }) => {
  await page.goto('/auth/sign-in?admin=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/BuildPair Administrator Sign In$/)).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with email' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('admin')).toBe('1');
});

for (const [mode, label] of [['customer', 'Homeowner'], ['trader', 'Tradesperson']]) {
  test(`${label} web sign-in renders the real Clerk entrypoint and keeps mode context`, async ({ page }) => {
    const hydrationErrors = trackHydrationErrors(page);
    await page.goto(`/auth/sign-in?mode=${mode}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: `${label} sign in`, exact: true })).toBeVisible();
    await expectClerkEntryPoint(page, `${label} sign-in`);
    expect(new URL(page.url()).searchParams.get('mode')).toBe(mode);
    await page.waitForTimeout(1000);
    expect(hydrationErrors, `${label} sign-in triggered React hydration errors`).toEqual([]);
  });

  test(`${label} web sign-up renders the real Clerk entrypoint and keeps mode context`, async ({ page }) => {
    const hydrationErrors = trackHydrationErrors(page);
    await page.goto(`/auth/sign-up?mode=${mode}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: `${label} sign up`, exact: true })).toBeVisible();
    await expectClerkEntryPoint(page, `${label} sign-up`);
    expect(new URL(page.url()).searchParams.get('mode')).toBe(mode);
    await page.waitForTimeout(1000);
    expect(hydrationErrors, `${label} sign-up triggered React hydration errors`).toEqual([]);
  });
}
