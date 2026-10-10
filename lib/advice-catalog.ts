import {
  ADVICE_GUIDES,
  type AdviceAudience,
  type AdviceGuide,
  type AdviceSource,
  isOfficialAdviceSource,
} from '@/lib/advice-library';
import { SEO_ADVICE_BATCH } from '@/lib/seo-advice-batch';
import { SEO_ADVICE_BATCH_THREE } from '@/lib/seo-advice-batch-three';

const SEO_BATCH_AS_ADVICE: AdviceGuide[] = [...SEO_ADVICE_BATCH, ...SEO_ADVICE_BATCH_THREE].map((guide) => ({
  slug: guide.slug,
  audience: 'homeowner',
  category: guide.category,
  title: guide.title,
  summary: guide.summary,
  description: guide.summary,
  appliesTo: guide.appliesTo,
  reviewedAt: SEO_ADVICE_BATCH_THREE.includes(guide as never) ? '2026-10-10' : '2026-10-04',
  keywords: [guide.title, guide.category, ...guide.keyPoints],
  keyPoints: guide.keyPoints,
  sections: guide.sections,
  sources: guide.sources as AdviceSource[],
  relatedSlugs: guide.related,
}));

export const ALL_ADVICE_GUIDES: AdviceGuide[] = [...ADVICE_GUIDES, ...SEO_BATCH_AS_ADVICE];

export function allAdviceGuideBySlug(slug: string) {
  return ALL_ADVICE_GUIDES.find((guide) => guide.slug === slug);
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9£%]+/g, ' ').trim();
}

export function searchAllAdviceGuides(query: string, audience?: AdviceAudience | 'all') {
  const trimmed = normalise(query);
  const candidates = audience && audience !== 'all'
    ? ALL_ADVICE_GUIDES.filter((guide) => guide.audience === audience)
    : ALL_ADVICE_GUIDES;

  if (!trimmed) return candidates;

  const terms = trimmed.split(/\s+/).filter(Boolean);
  return candidates
    .map((guide) => {
      const title = normalise(guide.title);
      const summary = normalise(guide.summary);
      const category = normalise(guide.category);
      const keywords = normalise(guide.keywords.join(' '));
      const sections = normalise(guide.sections.map((section) => section.heading).join(' '));
      let score = 0;
      if (title.includes(trimmed)) score += 18;
      if (keywords.includes(trimmed)) score += 14;
      for (const term of terms) {
        if (title.includes(term)) score += 6;
        if (keywords.includes(term)) score += 5;
        if (summary.includes(term)) score += 3;
        if (category.includes(term)) score += 2;
        if (sections.includes(term)) score += 1;
      }
      return { guide, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.guide.title.localeCompare(b.guide.title))
    .map((item) => item.guide);
}

export { isOfficialAdviceSource };
