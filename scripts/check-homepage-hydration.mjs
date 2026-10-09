import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
// Playwright is installed only in the browser-smoke workflow, not the application bundle.
// eslint-disable-next-line import/no-unresolved
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

    // Force a quiet, newly opened marketplace to verify its honest empty state.
    await page.route('**/api/public/jobs', (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: '[]',
    }));
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
    const latestEmpty = page.getByTestId('bp-home-latest-jobs-empty');
    await latestEmpty.waitFor({ state: 'visible', timeout: 20_000 });
    assert.ok((await latestEmpty.innerText()).includes('Our job marketplace has just opened.'),
      size.name + ': latest jobs placeholder is missing');
    assert.ok(await latestEmpty.getByRole('button', { name: 'Browse job board' }).isVisible(),
      size.name + ': empty job board navigation missing');
    assert.ok(await latestEmpty.getByRole('button', { name: 'Post a job' }).isVisible(),
      size.name + ': post-job action missing');
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

    // A second, entirely synthetic response tests live-job cards without seeding production.
    if (size.width === 390 || size.width === 1366) {
      const withJobs = await browser.newPage({ viewport: { width: size.width, height: size.height } });
      const jobErrors = [];
      withJobs.on('pageerror', (error) => jobErrors.push(String(error.message)));
      const fixtureJobs = [
        { id: 'homepage-smoke-job-1', title: 'Repair a leaking kitchen tap', category: 'Plumbing', locationLabel: 'Surrey', postcode: 'KT11', budgetRange: '£100–£250', urgency: 'Within a week', status: 'open', targetTraderId: null, acceptedQuoteId: null },
        { id: 'homepage-smoke-job-2', title: 'Tiling a small bathroom', category: 'Tiling', locationLabel: 'Sussex', postcode: 'PO21', budgetRange: 'To be agreed', urgency: 'Flexible', status: 'open', targetTraderId: null, acceptedQuoteId: null },
      ];
      await withJobs.route('**/api/public/jobs', (route) => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(fixtureJobs),
      }));
      await withJobs.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      const carousel = withJobs.getByTestId('bp-home-latest-jobs-carousel');
      await carousel.waitFor({ state: 'visible', timeout: 30_000 });
      assert.equal(await withJobs.getByTestId('bp-home-latest-job-card').count(), 2,
        size.name + ': recent public job cards missing');
      assert.ok(await withJobs.getByText('Repair a leaking kitchen tap').isVisible(),
        size.name + ': genuine-job presentation missing');
      await withJobs.waitForTimeout(2_000);
      assert.deepEqual(jobErrors, [], size.name + ': job carousel JavaScript error: ' + jobErrors.join('; '));
      await withJobs.screenshot({ path: 'homepage-smoke-artifacts/' + size.name + '-recent-jobs.png', fullPage: true });
      await withJobs.close();
      console.log('PASS ' + size.name + ': synthetic live-job carousel renders with no client errors');
    }
  }
} finally {
  await browser.close();
}
