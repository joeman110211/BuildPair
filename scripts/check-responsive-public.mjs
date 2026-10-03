// Read-only UI regression checks. API fixtures are confined to this browser session.
// Run against a locally built export; never creates accounts, jobs or payments.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.BUILDPAIR_PLAYWRIGHT_MODULE || '@playwright/test');
const output = process.env.RESPONSIVE_OUTPUT || '/tmp/buildpair-responsive';
const port = process.env.RESPONSIVE_PORT || '3101';
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: port, APP_URL: base }, stdio: 'ignore' });
const routes = (await readdir('app/(public)'))
  .filter((file) => file.endsWith('.tsx') && !file.startsWith('_') && !['founding-trades.tsx', 'status.tsx'].includes(file))
  .map((file) => file === 'index.tsx' ? '/' : `/${file.replace('.tsx', '')}`);
const screens = [
  [320, 568], [360, 640], [375, 667], [390, 844], [414, 896], [430, 932],
  [568, 320], [768, 1024], [1024, 768], [1100, 800], [1280, 800], [1440, 900],
];
const fixtureTrades = Array.from({ length: 3 }, (_, index) => ({
  id: `responsive-fixture-${index}`, businessName: `Example ${index + 1} Property Maintenance & Bathroom Specialists`,
  tradeCategory: 'Tiling', tradeCategories: ['Tiling'], subSkills: ['Bathroom tiling', 'Wall tiling'],
  bio: 'A deliberately long example business description used only to check responsive card layout.',
  radiusMiles: 20, locationLabel: 'Surrey', photos: [], averageRating: 0, reviewCount: 0,
  completedJobs: 0, galleryCount: 0, verifiedCredentialCount: 0,
  subscriptionTier: 'featured', isSubscriptionActive: true, foundingTrade: false,
}));
const results = [];
let browser;

async function layoutProblems(page) {
  return page.evaluate(() => {
    const width = innerWidth;
    const problems = [];
    const horizontalAncestor = (element) => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const css = getComputedStyle(node);
        if (['auto', 'scroll'].includes(css.overflowX) && node.scrollWidth > node.clientWidth + 2) return true;
      }
      return false;
    };
    for (const element of document.querySelectorAll('[dir="auto"], input, textarea, [role="button"]')) {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || horizontalAncestor(element)) continue;
      if (rect.left < -2 || rect.right > width + 2) {
        problems.push({ kind: 'outside-screen', text: (element.textContent || element.getAttribute('aria-label') || '').slice(0, 90), left: rect.left, right: rect.right });
      }
      if (element.closest('[data-testid="brand-button"]') && element.getAttribute('dir') === 'auto' && element.scrollWidth > element.clientWidth + 2) {
        problems.push({ kind: 'clipped-button-label', text: element.textContent?.slice(0, 90) });
      }
    }
    if (document.documentElement.scrollWidth > width + 2) problems.push({ kind: 'document-overflow' });
    return problems;
  });
}

try {
  await mkdir(output, { recursive: true });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(base)).ok; } catch { /* Wait for local server. */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, 'Local production server did not start');
  browser = await chromium.launch({
    headless: true,
    ...(process.env.RESPONSIVE_BROWSER_EXECUTABLE ? { executablePath: process.env.RESPONSIVE_BROWSER_EXECUTABLE } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  // Independent viewport checks share no browser state.
  for (let first = 0; first < screens.length; first += 3) {
    await Promise.all(screens.slice(first, first + 3).map(async ([width, height]) => {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 768, reducedMotion: 'reduce' });
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const data = url.pathname === '/api/featured-trader' ? { trader: fixtureTrades[0], traders: fixtureTrades }
          : url.pathname === '/api/traders' ? fixtureTrades
          : url.pathname === '/api/contact-options' ? { smsEnabled: false } : [];
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
      });
      if (process.env.RESPONSIVE_LOGO) {
        await page.route('**/buildpair-logo-transparent.png', async (route) => route.fulfill({ contentType: 'image/png', body: await readFile(process.env.RESPONSIVE_LOGO) }));
      }
      for (const route of routes) {
        runtimeErrors.length = 0;
        await page.goto(base + route, { waitUntil: 'load' });
        await page.waitForTimeout(150);
        assert((await page.locator('body').innerText()).trim(), `${route}: blank page`);
        const problems = await layoutProblems(page);
        if (width === 320 || width === 1440) await page.screenshot({ path: path.join(output, `${route === '/' ? 'home' : route.slice(1)}-${width}.png`) });
        // Scroll every vertical host so offscreen Reveal sections are exercised too.
        await page.evaluate(() => {
          for (const node of document.querySelectorAll('*')) {
            if (['auto', 'scroll'].includes(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) node.scrollTop = node.scrollHeight;
          }
        });
        await page.waitForTimeout(100);
        const allProblems = [...problems, ...await layoutProblems(page)];
        results.push({ route, width, height, problems: allProblems, runtimeErrors: [...runtimeErrors] });
      }
      // Both audience tabs and second-card controls must remain usable on a small phone.
      await page.goto(base);
      await page.getByRole('button', { name: 'For tradespeople', exact: true }).last().click();
      await page.getByText('Turn enquiries into clear quotes.', { exact: true }).waitFor();
      if (width < 720) {
        await page.getByRole('button', { name: 'Show card 2: Keep the admin moving.', exact: true }).click();
        await page.getByText('2 of 2 · Swipe to explore trade tools', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'For homeowners', exact: true }).click();
        await page.getByText('1 of 2 · Swipe to explore homeowner benefits', { exact: true }).waitFor();
      }
      if (width < 1280) {
        await page.getByRole('button', { name: 'Menu', exact: true }).first().click();
        const menuBox = await page.getByRole('menu').boundingBox();
        assert(menuBox && menuBox.x >= -1 && menuBox.x + menuBox.width <= width + 1 && menuBox.y + menuBox.height <= height + 1, 'Menu does not fit viewport');
        await page.getByRole('button', { name: 'Menu', exact: true }).first().click();
      }
      await page.getByRole('button', { name: 'Open BuildPair AI helper', exact: true }).click();
      const panel = await page.getByTestId('ai-helper-panel').boundingBox();
      assert(panel, 'AI helper panel did not open');
      if (panel) assert(panel.x >= -1 && panel.y >= -1 && panel.x + panel.width <= width + 1 && panel.y + panel.height <= height + 1, 'AI panel does not fit viewport');
      await page.close();
    }));
    console.log(`Checked ${Math.min(first + 3, screens.length)} of ${screens.length} screen sizes`);
  }
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  const failures = results.filter((item) => item.problems.length || item.runtimeErrors.length);
  console.log(JSON.stringify({ routes: routes.length, screenSizes: screens.length, checks: results.length, failures }, null, 2));
  assert.equal(failures.length, 0, 'Responsive route checks found problems; see results.json');
} finally {
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  await browser?.close();
  server.kill();
}
