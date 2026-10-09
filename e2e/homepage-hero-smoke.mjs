// Read-only production-build browser smoke test for the homepage hero.
// This deliberately tests hydration after first paint so a white-screen crash fails CI.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = 'http://127.0.0.1:3000';
const viewports = [[320, 720], [360, 800], [390, 844], [768, 1024], [1440, 900]];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await mkdir('ui-evidence', { recursive: true });

try {
  for (const [width, height] of viewports) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: width < 768,
      reducedMotion: 'reduce',
    });
    const runtimeErrors = [];
    const browserConsoleErrors = [];
    const failedRequests = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.stack || error.message));
    page.on('console', (entry) => {
      if (entry.type() === 'error') browserConsoleErrors.push(entry.text());
    });
    page.on('response', (response) => {
      if (response.status() >= 400) failedRequests.push({ status: response.status(), url: response.url() });
    });
    try {
      const response = await page.goto(origin, { waitUntil: 'load', timeout: 30_000 });
      assert.equal(response?.status(), 200, `Homepage HTTP status at ${width}px`);

      // Check after hydration and delayed effects, not merely the static HTML.
      await page.waitForTimeout(4500);
      await page.screenshot({ path: `ui-evidence/home-hero-debug-${width}.png`, fullPage: false });
      const diagnostic = await page.evaluate(() => ({
        title: document.title,
        bodyText: document.body?.innerText?.slice(0, 500) ?? '',
        bodyHtmlLength: document.body?.innerHTML?.length ?? 0,
        rootChildren: document.getElementById('root')?.childElementCount ?? null,
      }));
      console.log(`DIAGNOSTIC ${width}px: ${JSON.stringify({ ...diagnostic, runtimeErrors, browserConsoleErrors, failedRequests })}`);
      const heading = page.getByText('Find local tradespeople. Keep the whole job together.', { exact: true });
      const hero = page.getByTestId('home-hero-actions');
      const home = page.getByTestId('home-hero-homeowner');
      const trade = page.getByTestId('home-hero-tradesperson');
      await heading.waitFor({ state: 'visible', timeout: 10_000 });
      await hero.waitFor({ state: 'visible', timeout: 10_000 });
      await home.waitFor({ state: 'visible', timeout: 10_000 });
      await trade.waitFor({ state: 'visible', timeout: 10_000 });
      await page.getByText('Browse local trades', { exact: true }).first().waitFor({ state: 'visible' });
      await page.getByText('See how it works', { exact: false }).first().waitFor({ state: 'visible' });

      const body = (await page.locator('body').innerText()).trim();
      assert(body.length > 200, `Homepage looks blank at ${width}px`);
      assert(body.includes('What needs doing?') && body.includes('Homeowner sign up') && body.includes('Tradesperson sign up'),
        `Homepage content disappears after hydration at ${width}px`);
      assert.deepEqual(runtimeErrors, [], `Browser runtime errors at ${width}px`);

      const geometry = await page.evaluate(() => {
        const rect = (id) => {
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (!el) return null;
          const { x, y, width, height } = el.getBoundingClientRect();
          return { x, y, width, height };
        };
        return {
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          home: rect('home-hero-homeowner'),
          trade: rect('home-hero-tradesperson'),
        };
      });
      assert(geometry.home && geometry.trade, `CTA geometry unavailable at ${width}px`);
      assert(geometry.pageWidth <= geometry.viewportWidth + 2, `Horizontal overflow at ${width}px`);
      assert(geometry.home.height >= 44 && geometry.trade.height >= 44,
        `Too-small signup buttons at ${width}px`);
      if (width < 720) {
        assert(geometry.home.width >= width - 36 && geometry.trade.width >= width - 36,
          `Signup buttons not full width at ${width}px: ${JSON.stringify(geometry)}`);
        assert(geometry.trade.y >= geometry.home.y + geometry.home.height - 1,
          `Mobile signups are not stacked at ${width}px`);
      } else {
        assert(Math.abs(geometry.home.width - geometry.trade.width) <= 2,
          `Desktop signup buttons are not equal width at ${width}px`);
      }
      await page.screenshot({ path: `ui-evidence/home-hero-${width}.png`, fullPage: false });
      console.log(`PASS homepage ${width}x${height}: hydrated, visible, accessible CTAs, no page errors`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
