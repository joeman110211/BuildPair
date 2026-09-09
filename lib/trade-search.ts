import type { TraderProfile } from '@/types';

const SEARCH_GROUPS = [
  ['tile', 'tiles', 'tiler', 'tilers', 'tiling', 'grout', 'grouting', 'ceramic', 'porcelain', 'splashback', 'wetroom', 'wet room', 'bathroom', 'kitchen', 'mosaic', 'large format'],
  ['bath', 'bathroom', 'bathrooms', 'shower', 'showers', 'wetroom', 'wet room', 'ensuite', 'toilet', 'wc', 'basin', 'sink', 'vanity', 'plumber', 'plumbing', 'tiler', 'tiling', 'bathroom fitting'],
  ['kitchen', 'kitchens', 'sink', 'worktop', 'worktops', 'cabinet', 'cabinets', 'units', 'splashback', 'joiner', 'carpenter', 'tiler', 'tiling', 'plumber', 'kitchen fitting'],
  ['plumber', 'plumbing', 'water', 'pipe', 'pipes', 'tap', 'taps', 'leak', 'leaks', 'drip', 'dripping', 'sink', 'toilet', 'radiator', 'shower', 'bath', 'drain', 'burst pipe', 'no water'],
  ['boiler', 'boilers', 'heating', 'gas', 'radiator', 'radiators', 'central heating', 'heat pump', 'underfloor heating', 'hot water'],
  ['electric', 'electrics', 'electrician', 'electrical', 'power', 'lighting', 'light', 'lights', 'rewire', 'rewiring', 'socket', 'sockets', 'consumer unit', 'fuse box', 'ev charger', 'flicker', 'flickering', 'no power'],
  ['builder', 'builders', 'building', 'renovation', 'renovations', 'refurbishment', 'extension', 'extensions', 'conversion', 'structural', 'open plan'],
  ['brick', 'bricks', 'bricklayer', 'bricklaying', 'blockwork', 'repointing', 'wall', 'walls', 'masonry'],
  ['plaster', 'plasterer', 'plastering', 'skim', 'skimming', 'render', 'rendering', 'dry lining'],
  ['paint', 'painter', 'painting', 'decorator', 'decorating', 'decoration', 'wallpaper', 'wallpapering'],
  ['carpenter', 'carpentry', 'joiner', 'joinery', 'wood', 'timber', 'woodwork', 'wooden', 'doors', 'stairs', 'skirting', 'architrave', 'cabinet', 'cabinetry', 'wardrobe', 'wardrobes', 'shelf', 'shelves', 'shelving', 'bespoke furniture'],
  ['roof', 'roofer', 'roofing', 'roof leak', 'slate', 'slates', 'roof tile', 'roof tiles', 'flat roof', 'gutter', 'guttering', 'fascia', 'soffit', 'leaking roof'],
  ['floor', 'floors', 'flooring', 'laminate', 'vinyl', 'lvt', 'wood floor', 'wooden floor', 'timber floor', 'carpet', 'carpet fitting', 'floor tiles'],
  ['garden', 'gardener', 'gardening', 'landscape', 'landscaper', 'landscaping', 'lawn', 'patio', 'planting', 'artificial grass'],
  ['tree', 'trees', 'tree surgeon', 'tree surgery', 'stump', 'pruning', 'hedge'],
  ['fence', 'fencing', 'gate', 'gates', 'deck', 'decking', 'garden fence', 'timber fence', 'wooden fence'],
  ['drive', 'driveway', 'driveways', 'paving', 'paver', 'patio', 'block paving', 'resin', 'tarmac', 'path'],
  ['groundwork', 'groundworks', 'foundation', 'foundations', 'excavation', 'concrete', 'footings', 'trench'],
  ['drain', 'drains', 'drainage', 'blocked drain', 'sewer', 'soakaway', 'cctv drain survey'],
  ['window', 'windows', 'door', 'doors', 'glazing', 'glazier', 'double glazing', 'upvc', 'bifold', 'bi-fold'],
  ['lock', 'locks', 'locksmith', 'locked out', 'security lock', 'door lock'],
  ['damp', 'damp proofing', 'mould', 'mold', 'rising damp', 'tanking', 'waterproofing'],
  ['insulation', 'insulate', 'loft insulation', 'wall insulation', 'soundproofing', 'thermal'],
  ['solar', 'solar panels', 'battery', 'battery storage', 'renewable', 'renewables', 'heat pump'],
  ['air conditioning', 'aircon', 'air con', 'ventilation', 'extractor', 'extractor fan', 'mvhr'],
  ['cctv', 'alarm', 'alarms', 'security', 'smart home', 'doorbell', 'video doorbell', 'access control'],
  ['handyman', 'odd jobs', 'small repairs', 'shelves', 'flat pack', 'assembly', 'picture hanging'],
  ['scaffold', 'scaffolder', 'scaffolding', 'access tower'],
  ['demolition', 'demolish', 'strip out', 'strip-out', 'site clearance'],
  ['waste', 'rubbish', 'clearance', 'builders waste', 'house clearance', 'skip'],
  ['pressure wash', 'pressure washing', 'jet wash', 'jet washing', 'exterior cleaning', 'driveway cleaning'],
  ['clean', 'cleaner', 'cleaning', 'deep clean', 'builders clean', 'window cleaning', 'carpet cleaning'],
  ['pest', 'pest control', 'rats', 'mice', 'wasps', 'insects', 'rodents'],
  ['garden room', 'garden rooms', 'outbuilding', 'outbuildings', 'summerhouse', 'shed', 'garden office'],
  ['conservatory', 'conservatories', 'orangery', 'orangeries'],
  ['pool', 'swimming pool', 'hot tub', 'spa', 'pool maintenance'],
  ['accessible', 'accessibility', 'disabled adaptation', 'adaptations', 'grab rail', 'ramp', 'mobility'],
  ['metalwork', 'welding', 'welder', 'steel', 'railings', 'balustrade'],
  ['architect', 'architecture', 'architectural', 'planning', 'planning drawings', 'planning application', 'building regulations'],
  ['structural engineer', 'structural engineering', 'calculations', 'steel beam', 'rsj', 'load bearing wall'],
  ['surveyor', 'surveying', 'building survey', 'snagging', 'party wall', 'condition report'],
  ['screed', 'screeding', 'floor screed', 'levelling compound', 'self levelling', 'floor preparation'],
  ['dry lining', 'dryliner', 'dryliners', 'plasterboard', 'stud wall', 'partition wall', 'suspended ceiling'],
  ['basement', 'cellar', 'basement conversion', 'cellar conversion', 'basement waterproofing', 'tanking'],
  ['concrete', 'formwork', 'reinforced concrete', 'concrete slab', 'concrete base', 'shuttering'],
  ['piling', 'piles', 'underpinning', 'mini piling', 'foundation piles', 'foundation repair'],
  ['garage door', 'garage doors', 'roller door', 'sectional door', 'garage door repair', 'garage door opener'],
  ['blind', 'blinds', 'shutter', 'shutters', 'plantation shutters', 'roller blinds'],
  ['property maintenance', 'maintenance', 'property repair', 'repairs', 'landlord maintenance', 'reactive maintenance'],
  ['commercial fit out', 'shop fit out', 'office fit out', 'shopfitting', 'shop fitter', 'office refurbishment'],
  ['septic tank', 'septic tanks', 'treatment plant', 'cesspit', 'sewage treatment', 'septic drainage'],
  ['asbestos', 'asbestos removal', 'asbestos survey', 'asbestos testing', 'asbestos disposal'],
  ['loft boarding', 'loft boards', 'loft storage', 'loft ladder', 'loft hatch', 'raised loft floor'],
];

const GROUP_ANCHOR_LIMIT = 6;
const GENERIC_TERMS = new Set(['repair', 'repairs', 'maintenance', 'work', 'job', 'problem']);

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordStems(word: string) {
  const stems = new Set([word]);
  if (word.length > 4 && word.endsWith('ies')) stems.add(`${word.slice(0, -3)}y`);
  if (word.length > 4 && word.endsWith('ers')) {
    const base = word.slice(0, -3);
    stems.add(base);
    stems.add(`${base}e`);
  }
  if (word.length > 3 && word.endsWith('er')) {
    const base = word.slice(0, -2);
    stems.add(base);
    stems.add(`${base}e`);
  }
  if (word.length > 4 && word.endsWith('ing')) {
    const base = word.slice(0, -3);
    stems.add(base);
    stems.add(`${base}e`);
  }
  if (word.length > 4 && word.endsWith('es')) stems.add(word.slice(0, -2));
  if (word.length > 3 && word.endsWith('s')) stems.add(word.slice(0, -1));
  return stems;
}

function editDistance(left: string, right: string) {
  if (left === right) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]!;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex]!;
      const beside = previous[rightIndex - 1]!;
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(above + 1, beside + 1, diagonal + cost);
      diagonal = above;
    }
  }

  return previous[right.length]!;
}

function fuzzyWordsRelated(left: string, right: string) {
  if (left.length < 4 || right.length < 4) return false;
  const longest = Math.max(left.length, right.length);
  const maxDistance = longest >= 8 ? 2 : 1;
  if (Math.abs(left.length - right.length) > maxDistance) return false;
  return editDistance(left, right) <= maxDistance;
}

function wordsRelated(left: string, right: string) {
  const leftStems = wordStems(left);
  if ([...wordStems(right)].some((stem) => leftStems.has(stem))) return true;
  return fuzzyWordsRelated(left, right);
}

function phraseIncludes(value: string, term: string) {
  const valueWords = normalise(value).split(' ').filter(Boolean);
  const termWords = normalise(term).split(' ').filter(Boolean);
  if (!termWords.length || termWords.length > valueWords.length) return false;

  for (let index = 0; index <= valueWords.length - termWords.length; index += 1) {
    const matches = termWords.every((word, offset) => {
      const candidate = valueWords[index + offset];
      return candidate !== undefined && wordsRelated(candidate, word);
    });
    if (matches) return true;
  }
  return false;
}

function exactPhraseIncludes(value: string, term: string) {
  const haystack = normalise(value);
  const needle = normalise(term);
  if (!needle) return false;
  return haystack === needle
    || haystack.startsWith(`${needle} `)
    || haystack.endsWith(` ${needle}`)
    || haystack.includes(` ${needle} `);
}

function matchedGroups(query: string) {
  const raw = normalise(query);
  if (!raw) return [];
  const rawWordCount = raw.split(' ').filter(Boolean).length;

  return SEARCH_GROUPS.filter((group) => group.some((term, index) => {
    const candidate = normalise(term);
    if (candidate.length <= 1) return false;
    if (raw === candidate) return true;
    if (rawWordCount > 1 && GENERIC_TERMS.has(candidate)) return false;

    if (index >= GROUP_ANCHOR_LIMIT) {
      return exactPhraseIncludes(raw, candidate);
    }

    return phraseIncludes(raw, candidate) || phraseIncludes(candidate, raw);
  }));
}

function bestFieldMatch(value: string, terms: string[], score: number) {
  return terms.some((term) => phraseIncludes(value, term)) ? score : 0;
}

function inferredCategoryScore(categoryValues: string[], inferredCategories: string[]) {
  const normalisedCategories = categoryValues.map(normalise);
  return inferredCategories.reduce((score, inferred, index) => {
    const normalisedInferred = normalise(inferred);
    const matches = normalisedCategories.some((category) => category === normalisedInferred || phraseIncludes(category, normalisedInferred) || phraseIncludes(normalisedInferred, category));
    if (!matches) return score;
    return score + Math.max(58, 125 - index * 25);
  }, 0);
}

export function scoreTraderSearch(trader: TraderProfile, query: string, inferredCategories: string[] = []) {
  const raw = normalise(query);
  if (!raw && !inferredCategories.length) return 1;

  const categoryValues = [...new Set([trader.tradeCategory, ...(trader.tradeCategories ?? [])].filter(Boolean))];
  const categories = normalise(categoryValues.join(' '));
  const business = normalise(trader.businessName);
  const selectedServices = Object.values(trader.serviceSelections ?? {}).flat();
  const skills = normalise([...new Set([...(trader.subSkills ?? []), ...selectedServices])].join(' '));
  const bio = normalise(trader.bio || '');

  let score = inferredCategoryScore(categoryValues, inferredCategories);

  if (raw) {
    if (phraseIncludes(business, raw)) score += 150;
    if (categoryValues.some((category) => normalise(category) === raw)) score += 145;
    else if (phraseIncludes(categories, raw) || phraseIncludes(raw, categories)) score += 115;
    if (phraseIncludes(skills, raw)) score += 95;
    if (phraseIncludes(bio, raw)) score += 18;

    for (const group of matchedGroups(query)) {
      const primaryTerms = group.slice(0, GROUP_ANCHOR_LIMIT).map(normalise);
      const relatedTerms = group.slice(GROUP_ANCHOR_LIMIT).map(normalise);

      score += bestFieldMatch(categories, primaryTerms, 95);
      score += bestFieldMatch(skills, primaryTerms, 62);
      score += bestFieldMatch(business, primaryTerms, 38);
      score += bestFieldMatch(bio, primaryTerms, 8);

      score += bestFieldMatch(categories, relatedTerms, 28);
      score += bestFieldMatch(skills, relatedTerms, 24);
      score += bestFieldMatch(business, relatedTerms, 12);
      score += bestFieldMatch(bio, relatedTerms, 3);
    }
  }

  return score;
}

export function searchTraders(traders: TraderProfile[], query: string, inferredCategories: string[] = []) {
  if (!query.trim() && !inferredCategories.length) return traders;
  return traders
    .map((trader) => ({ trader, score: scoreTraderSearch(trader, query, inferredCategories) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score
      || (b.trader.rankingScore ?? 0) - (a.trader.rankingScore ?? 0)
      || b.trader.averageRating - a.trader.averageRating)
    .map((result) => result.trader);
}
