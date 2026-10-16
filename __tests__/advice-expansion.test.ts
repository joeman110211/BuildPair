import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_ADVICE_GUIDES, allAdviceGuideBySlug, searchAllAdviceGuides } from '@/lib/advice-catalog';
import { ADVICE_EXPANSION } from '@/lib/advice-expansion';

const xml = readFileSync('public/sitemap-advice.xml', 'utf8');
const sitemap = readFileSync('public/sitemap.txt', 'utf8');

describe('Advice Hub expansion', () => {
  it('has unique slugs', () => {
    const slugs = ALL_ADVICE_GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it('indexes each new guide and makes its route accessible', () => {
    expect(ADVICE_EXPANSION).toHaveLength(14);
    for (const guide of ADVICE_EXPANSION) {
      expect(allAdviceGuideBySlug(guide.slug)?.title).toBe(guide.title);
      const route = readFileSync('app/(public)/advice/' + guide.slug + '.tsx', 'utf8');
      expect(route).toContain('slug="' + guide.slug + '"');
      expect(xml).toContain('/advice/' + guide.slug + '</loc>');
      expect(sitemap).toContain('/advice/' + guide.slug);
      expect(guide.sections.length).toBeGreaterThanOrEqual(2);
      expect(guide.sources.length).toBeGreaterThan(0);
      expect(guide.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
      for (const related of guide.relatedSlugs ?? []) expect(allAdviceGuideBySlug(related)).toBeDefined();
    }
  });
  it('supports homeowner and tradesperson searches', () => {
    expect(searchAllAdviceGuides('bricklayer', 'homeowner').some((g) => g.slug === 'how-to-hire-bricklayer')).toBe(true);
    expect(searchAllAdviceGuides('silica', 'tradesperson').some((g) => g.slug === 'brick-cutting-silica-dust-safety')).toBe(true);
    expect(searchAllAdviceGuides('snagging', 'homeowner').some((g) => g.slug === 'home-improvement-snagging-checklist')).toBe(true);
  });
});
