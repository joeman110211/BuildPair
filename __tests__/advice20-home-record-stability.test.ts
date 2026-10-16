import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const batch = JSON.parse(
  read('lib/advice-october-batch.ts')
    .split(' = [')[1]
    .split('];')[0]
    .replace(/^/, '[') + ']',
) as Array<{ slug: string; audience: string; keyPoints: string[]; sections: unknown[]; sources: Array<{ url: string }> }>;

describe('October advice guides and public indexing', () => {
  it('adds exactly 20 distinct substantive guides for both audiences', () => {
    expect(batch).toHaveLength(20);
    expect(new Set(batch.map((guide) => guide.slug)).size).toBe(20);
    expect(batch.filter((guide) => guide.audience === 'homeowner')).toHaveLength(10);
    expect(batch.filter((guide) => guide.audience === 'tradesperson')).toHaveLength(10);
    for (const guide of batch) {
      expect(guide.keyPoints.length).toBeGreaterThanOrEqual(3);
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
      expect(guide.sources.length).toBeGreaterThanOrEqual(1);
      expect(guide.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    }
  });

  it('does not reuse a slug from the existing advice library, SEO batch or previous expansion', () => {
    const existing = [
      read('lib/advice-library.ts'),
      read('lib/seo-advice-batch.ts'),
      read('lib/advice-expansion.ts'),
    ].flatMap((source) =>
      [...source.matchAll(/["']?slug["']?\s*:\s*["']([^"']+)["']/g)].map((match) => match[1]),
    );
    for (const guide of batch) expect(existing).not.toContain(guide.slug);
    const catalog = read('lib/advice-catalog.ts');
    expect(catalog).toContain('...ADVICE_2026_OCTOBER_BATCH');
  });

  it('publishes a real route and both sitemap entries for every new guide', () => {
    const xml = read('public/sitemap-advice.xml');
    const txt = read('public/sitemap.txt');
    const index = read('public/sitemap.xml');
    const robots = read('public/robots.txt');
    expect(index).toContain('sitemap-advice.xml');
    expect(index).toContain('<lastmod>2026-10-16</lastmod>');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://www.buildpair.co.uk/sitemap.xml');
    for (const guide of batch) {
      const url = 'https://www.buildpair.co.uk/advice/' + guide.slug;
      const route = 'app/(public)/advice/' + guide.slug + '.tsx';
      expect(existsSync(route), route).toBe(true);
      expect(read(route)).toContain('slug="' + guide.slug + '"');
      expect(xml.split('<loc>' + url + '</loc>').length - 1, url).toBe(1);
      expect(txt.split('\n').filter((line) => line === url)).toHaveLength(1);
    }
  });

  it('keeps the Home Record stable between session token refreshes', () => {
    const screen = read('app/customer/home-record.tsx');
    expect(screen).toContain('const getTokenRef = useRef(getToken)');
    expect(screen).toContain('getTokenRef.current()');
    expect(screen).toContain('[isLoaded, isSignedIn, load]');
    expect(screen).not.toContain('}, [getToken]);');
  });

  it('serves sitemap children directly from the production server', () => {
    const server = read('server.mjs');
    expect(server).toContain("'/sitemap-pages.xml'");
    expect(server).toContain("'/sitemap-advice.xml'");
    expect(server).toContain("file.candidate.startsWith('sitemap')");
  });
});
