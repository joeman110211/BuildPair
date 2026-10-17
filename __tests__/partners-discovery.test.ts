import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PARTNERSHIP_ADVICE_GUIDES } from '@/lib/advice-partnership-guides';
import { ALL_ADVICE_GUIDES, allAdviceGuideBySlug } from '@/lib/advice-catalog';

const source = (p: string) => readFileSync(p, 'utf8');

describe('review-stage partnership discovery', () => {
  it('adds a compact partner section after the existing homepage FAQ without rearranging other sections', () => {
    const homepage = source('components/LandingPageRefined.tsx');
    expect(homepage).toContain('bp-home-partners-section');
    expect(homepage.indexOf('bp-home-partners-section')).toBeGreaterThan(homepage.indexOf('faqList'));
    expect(homepage.indexOf('bp-home-partners-section')).toBeLessThan(homepage.indexOf('<PublicFooter />'));
    expect(homepage).toContain('paid promotions, not independent recommendations');
    

  it('keeps partners discoverable in the footer and main menu', () => {
    expect(source('components/PublicFooter.tsx')).toContain("['Partners', '/(public)/partners']");
    expect(source('components/PublicHeader.tsx')).toContain("label: 'Partners', sectionLabel: 'Work with us'");
  });

  it('includes approved partnership guides in canonical sitemaps', () => {
    expect(PARTNERSHIP_ADVICE_GUIDES).toHaveLength(2);
    const page = source('components/AdviceGuidePage.tsx');
    for (const guide of PARTNERSHIP_ADVICE_GUIDES) {
      expect(allAdviceGuideBySlug(guide.slug)).toBeDefined();
      expect(ALL_ADVICE_GUIDES.filter((g) => g.slug === guide.slug)).toHaveLength(1);
      expect(source(`app/(public)/advice/${guide.slug}.tsx`)).toContain(`slug="${guide.slug}"`);
      expect(source('public/sitemap-advice.xml')).toContain(guide.slug);
      expect(source('public/sitemap.txt')).toContain(guide.slug);
      expect(page).toContain(guide.slug);
    }
    expect(page).not.toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it('discloses partnerships and protects customer choice and enquiry data', () => {
    const terms = source('app/(public)/terms.tsx');
    const privacy = source('app/(public)/privacy.tsx');
    const disclaimer = source('app/(public)/disclaimer.tsx');
    expect(terms).toContain('Commercial partners, advertising and optional offers');
    expect(privacy).toContain('Commercial partner enquiries and advertisements');
    expect(disclaimer).toContain('Commercial partners and sponsored suggestions');
    expect(source('app/(public)/partners.tsx')).toContain('No guaranteed leads or sales.');
    expect(source('public/sitemap-pages.xml')).toContain('/partners');
    expect(source('app/(public)/partners.tsx')).not.toContain('noindex, nofollow');
  });
});
