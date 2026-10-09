import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4010';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const sizes = [
  { name: 'android-small', width: 360, height: 740 },
  { name: 'android-standard', width: 390, height: 844 },
  { name: 'iphone-wide', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 900 },
];

await mkdir('homepage-smoke-artifacts', { recursive: true });
try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error.message)));

    const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    assert.ok(response?.ok(), size.name + ': initial document did not load');

    const heading = page.getByRole('heading', { name: /Find local tradespeople/ });
    await heading.waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByTestId('bp-home-join-homeowner').waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByTestId('bp-home-join-trader').waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(2_000);

    assert.ok(await heading.isVisible(), size.name + ': heading vanished after hydration');
    const homeowner = page.getByTestId('bp-home-join-homeowner');
    const trader = page.getByTestId('bp-home-join-trader');
    assert.ok(await homeowner.isVisible(), size.name + ': homeowner button vanished');
    assert.ok(await trader.isVisible(), size.name + ': tradesperson button vanished');
    assert.ok(await page.getByTestId('bp-home-browse').isVisible(), size.name + ': browse action missing');
    assert.ok(await page.getByRole('button', { name: 'Menu', exact: true }).isVisible() || size.width >= 1280,
      size.name + ': menu missing');

    const { innerWidth, scrollWidth } = await page.evaluate(() => ({
      innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(scrollWidth <= innerWidth + 2, size.name + ': horizontal overflow ' + scrollWidth + ' > ' + innerWidth);

    if (size.width < 720) {
      const a = await homeowner.boundingBox();
      const b = await trader.boundingBox();
      assert.ok(a && b, size.name + ': signup actions not laid out');
      assert.ok(a.width >= size.width - 65 && b.width >= size.width - 65,
        size.name + ': signup buttons not full width (' + a.width + ', ' + b.width + ')');
      assert.ok(b.y >= a.y + a.height - 1, size.name + ': signup buttons are not stacked');
      assert.equal(await page.getByTestId('bp-compact-quick-nav').isVisible(), false,
        size.name + ': redundant quick nav is visible');
      assert.equal(await page.getByTestId('bp-home-how').isVisible(), false,
        size.name + ': redundant fourth CTA is visible');
      assert.equal(await page.getByTestId('bp-home-benefits').isVisible(), false,
        size.name + ': redundant benefits line is visible');
    }

    await page.screenshot({ path: 'homepage-smoke-artifacts/' + size.name + '.png', fullPage: false });
    assert.deepEqual(errors, [], size.name + ': uncaught client errors: ' + errors.join('; '));
    console.log('PASS ' + size.name + ': hydrated, heading/buttons visible, responsive layout, no horizontal overflow');
    await page.close();
  }
} finally {
  await browser.close();
}
