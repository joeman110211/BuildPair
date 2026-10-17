import { describe, expect, it } from 'vitest';
import { TRADE_CATEGORIES } from '@/constants/options';
import { ALL_ADVICE_GUIDES } from '@/lib/advice-catalog';
import { adviceNextStep, relatedAdviceGuides, tradeForAdvice } from '@/lib/advice-growth';

describe('Advice Hub guide acquisition', () => {
  it('routes every guide to the appropriate live customer journey', () => {
    for (const guide of ALL_ADVICE_GUIDES) {
      const next = adviceNextStep(guide);
      const href = String(next.href);
      expect(href).toContain('source=advice&guide=');
      expect(href).toContain(encodeURIComponent(guide.slug));
      if (guide.audience === 'homeowner') {
        expect(href).toContain('/(public)/directory?');
        const trade = tradeForAdvice(guide);
        if (trade) {
          expect(TRADE_CATEGORIES).toContain(trade);
          expect(href).toContain('trade=' + encodeURIComponent(trade));
        }
      } else {
        expect(href).toContain('/(public)/for-tradespeople?');
        expect(tradeForAdvice(guide)).toBeNull();
      }
    }
  });

  it('uses related guide links without broken slugs, duplicates or self-links', () => {
    for (const guide of ALL_ADVICE_GUIDES) {
      const related = relatedAdviceGuides(guide, ALL_ADVICE_GUIDES);
      expect(related.length).toBeLessThanOrEqual(4);
      expect(new Set(related.map((item) => item.slug)).size).toBe(related.length);
      for (const item of related) {
        expect(item.slug).not.toBe(guide.slug);
        expect(ALL_ADVICE_GUIDES).toContain(item);
      }
    }
  });

  it('offers relevant local trade categories for known high-intent topics', () => {
    const bathroom = ALL_ADVICE_GUIDES.find((guide) => guide.audience === 'homeowner' && /bathroom.*cost|cost.*bathroom/i.test(guide.title));
    const brickwork = ALL_ADVICE_GUIDES.find((guide) => guide.slug === 'how-to-hire-bricklayer');
    if (bathroom) expect(tradeForAdvice(bathroom)).toBe('Bathrooms');
    if (brickwork) expect(tradeForAdvice(brickwork)).toBe('Brickwork & Masonry');
  });
});
