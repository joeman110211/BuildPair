import { expect, test } from '@playwright/test';

async function expectClerkEntryPoint(page, kind) {
  const root = page.locator('.cl-rootBox').first();
  await expect(root, `${kind} Clerk component did not render`).toBeVisible({ timeout: 20_000 });

  const inputs = root.locator('input');
  await expect.poll(async () => inputs.count(), { message: `${kind} did not expose an input` }).toBeGreaterThan(0);

  const body = await root.innerText();
  expect(body, `${kind} rendered an empty Clerk shell`).toMatch(/email|continue|sign|account/i);
}

for (const [mode, label] of [['customer', 'Homeowner'], ['trader', 'Tradesperson']]) {
  test(`${label} web sign-in renders the real Clerk entrypoint and keeps mode context`, async ({ page }) => {
    await page.goto(`/auth/sign-in?mode=${mode}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(new RegExp(`${label} Sign In$`))).toBeVisible();
    await expectClerkEntryPoint(page, `${label} sign-in`);
    expect(new URL(page.url()).searchParams.get('mode')).toBe(mode);
  });

  test(`${label} web sign-up renders the real Clerk entrypoint and keeps mode context`, async ({ page }) => {
    await page.goto(`/auth/sign-up?mode=${mode}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(new RegExp(`Create ${label} Account$`))).toBeVisible();
    await expectClerkEntryPoint(page, `${label} sign-up`);
    expect(new URL(page.url()).searchParams.get('mode')).toBe(mode);
  });
}
