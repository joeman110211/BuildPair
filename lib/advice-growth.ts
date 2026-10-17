import type { Href } from 'expo-router';
import type { AdviceGuide } from '@/lib/advice-library';
import { TRADE_CATEGORIES, type TradeCategory } from '@/constants/options';

// Match broad guide topics to real directory categories, never invented trades.
// For rules, disputes and other non-trade topics we keep the directory unfiltered.
const tradeRules: { pattern: RegExp; trade: TradeCategory }[] = [
  { pattern: /brick|mason|repoint|garden.wall/, trade: 'Brickwork & Masonry' },
  { pattern: /bathroom|wet.room|shower.refit/, trade: 'Bathrooms' },
  { pattern: /tile|tiling|grout/, trade: 'Tiling' },
  { pattern: /kitchen/, trade: 'Kitchens' },
  { pattern: /boiler|central.heating|gas.safety/, trade: 'Heating & Gas' },
  { pattern: /electric|eicr|rewir|consumer.unit/, trade: 'Electrical' },
  { pattern: /solar|heat.pump|ev.charg/, trade: 'Renewables & EV' },
  { pattern: /loft|garage.conversion|basement.conversion/, trade: 'Conversions' },
  { pattern: /roof|gutter|soffit|fascia/, trade: 'Roofing & Roofline' },
  { pattern: /window|glazing|double.glaz/, trade: 'Windows, Doors & Glazing' },
  { pattern: /carpenter|joiner|wardrobe|internal.door/, trade: 'Carpentry & Joinery' },
  { pattern: /plaster|render|dry.lin/, trade: 'Plastering, Rendering & Dry Lining' },
  { pattern: /paint|decorat|wallpaper/, trade: 'Painting & Decorating' },
  { pattern: /damp|insulat|condensation/, trade: 'Damp Proofing & Insulation' },
  { pattern: /drain|sewer/, trade: 'Drainage & Sewage' },
  { pattern: /floor|screed|laminate|lvt/, trade: 'Flooring & Screeding' },
  { pattern: /fenc|decking/, trade: 'Fencing & Decking' },
  { pattern: /driveway|paving|groundwork/, trade: 'Driveways, Paving & Groundworks' },
  { pattern: /garden|landscap|patio/, trade: 'Landscaping & Gardening' },
  { pattern: /extension|renovat|building.cost/, trade: 'Building & Extensions' },
];

export function tradeForAdvice(guide: Pick<AdviceGuide, 'title' | 'slug' | 'category' | 'audience'>): TradeCategory | null {
  if (guide.audience !== 'homeowner') return null;
  const text = [guide.slug, guide.title, guide.category].join(' ').toLowerCase();
  return tradeRules.find(({ pattern }) => pattern.test(text))?.trade ?? null;
}

export function adviceNextStep(guide: AdviceGuide): { title: string; description: string; label: string; href: Href } {
  const source = 'source=advice&guide=' + encodeURIComponent(guide.slug);
  if (guide.audience === 'tradesperson') {
    return {
      title: 'Put the advice to work in your business',
      description: 'Discover BuildPair tools for quotes, customers and organising jobs.',
      label: 'BuildPair for tradespeople',
      href: ('/(public)/for-tradespeople?' + source) as Href,
    };
  }
  const trade = tradeForAdvice(guide);
  const params = (trade ? 'trade=' + encodeURIComponent(trade) + '&' : '') + source;
  return {
    title: trade ? 'Getting ready to arrange the work?' : 'Planning your next home project?',
    description: trade
      ? 'Search BuildPair for tradespeople who offer the services you need. Check profiles and discuss the details before agreeing to any work.'
      : 'Use BuildPair to find local tradespeople, check their profiles and compare your options.',
    label: trade ? 'Find relevant tradespeople' : 'Find a trade',
    href: ('/(public)/directory?' + params) as Href,
  };
}

export function relatedAdviceGuides(guide: AdviceGuide, allGuides: AdviceGuide[], max = 4): AdviceGuide[] {
  const matches: AdviceGuide[] = [];
  const used = new Set([guide.slug]);
  const add = (item?: AdviceGuide) => {
    if (item && !used.has(item.slug) && matches.length < max) {
      used.add(item.slug);
      matches.push(item);
    }
  };
  for (const slug of guide.relatedSlugs ?? []) add(allGuides.find((item) => item.slug === slug));
  // Fill sparse related lists with checked guides on the same topic and for the same audience.
  for (const item of allGuides) {
    if (item.audience === guide.audience && item.category === guide.category) add(item);
  }
  return matches;
}

// Compile-time guard: every mapped category exists in the current directory.
void TRADE_CATEGORIES;
