export type BuildPairAiAudience = 'homeowner' | 'tradesperson' | 'public';

export type BuildPairAiNavigationAction = {
  key: string;
  label: string;
  href: string;
};

type NavigationItem = BuildPairAiNavigationAction & {
  audiences: BuildPairAiAudience[];
};

const NAVIGATION_ITEMS: Record<string, NavigationItem> = {
  home: { key: 'home', label: 'Open BuildPair home', href: '/', audiences: ['public', 'homeowner', 'tradesperson'] },
  directory: { key: 'directory', label: 'Find a trade', href: '/directory', audiences: ['public', 'homeowner', 'tradesperson'] },
  how_it_works: { key: 'how_it_works', label: 'See how BuildPair works', href: '/how-it-works', audiences: ['public', 'homeowner', 'tradesperson'] },
  for_homeowners: { key: 'for_homeowners', label: 'For homeowners', href: '/for-homeowners', audiences: ['public', 'homeowner', 'tradesperson'] },
  for_tradespeople: { key: 'for_tradespeople', label: 'For tradespeople', href: '/for-tradespeople', audiences: ['public', 'homeowner', 'tradesperson'] },
  advice: { key: 'advice', label: 'Open BuildPair advice', href: '/advice', audiences: ['public', 'homeowner', 'tradesperson'] },
  contact: { key: 'contact', label: 'Contact BuildPair', href: '/contact', audiences: ['public', 'homeowner', 'tradesperson'] },

  customer_dashboard: { key: 'customer_dashboard', label: 'Open my dashboard', href: '/customer/dashboard', audiences: ['homeowner'] },
  customer_new_job: { key: 'customer_new_job', label: 'Post a job', href: '/customer/new-job', audiences: ['homeowner'] },
  customer_jobs: { key: 'customer_jobs', label: 'View my jobs', href: '/customer/jobs', audiences: ['homeowner'] },
  customer_messages: { key: 'customer_messages', label: 'Open my messages', href: '/customer/messages', audiences: ['homeowner'] },
  customer_saved_trades: { key: 'customer_saved_trades', label: 'View saved trades', href: '/customer/saved-trades', audiences: ['homeowner'] },
  customer_profile: { key: 'customer_profile', label: 'Open my profile', href: '/customer/profile', audiences: ['homeowner'] },

  trader_dashboard: { key: 'trader_dashboard', label: 'Open trade dashboard', href: '/trader/dashboard', audiences: ['tradesperson'] },
  trader_job_board: { key: 'trader_job_board', label: 'Open job board', href: '/trader/job-board', audiences: ['tradesperson'] },
  trader_my_jobs: { key: 'trader_my_jobs', label: 'View my jobs', href: '/trader/my-jobs', audiences: ['tradesperson'] },
  trader_quotes: { key: 'trader_quotes', label: 'Open my quotes', href: '/trader/quotes', audiences: ['tradesperson'] },
  trader_invoices: { key: 'trader_invoices', label: 'Open invoices', href: '/trader/invoices', audiences: ['tradesperson'] },
  trader_messages: { key: 'trader_messages', label: 'Open my messages', href: '/trader/messages', audiences: ['tradesperson'] },
  trader_profile: { key: 'trader_profile', label: 'Open my trade profile', href: '/trader/profile', audiences: ['tradesperson'] },
  trader_analytics: { key: 'trader_analytics', label: 'Open analytics', href: '/trader/analytics', audiences: ['tradesperson'] },
  trader_google_reviews: { key: 'trader_google_reviews', label: 'Open Google Reviews', href: '/trader/google-reviews', audiences: ['tradesperson'] },
  trader_saved_searches: { key: 'trader_saved_searches', label: 'Open saved searches', href: '/trader/saved-searches', audiences: ['tradesperson'] },
};

export const BUILDPAIR_AI_NAVIGATION_KEYS = Object.keys(NAVIGATION_ITEMS);

export function buildPairAiNavigationKeyGuide() {
  return Object.values(NAVIGATION_ITEMS)
    .map((item) => `${item.key} = ${item.label}`)
    .join('\n');
}

export function resolveBuildPairAiNavigation(keys: unknown, audience: BuildPairAiAudience) {
  if (!Array.isArray(keys)) return [];
  const seen = new Set<string>();
  const actions: BuildPairAiNavigationAction[] = [];

  for (const value of keys.slice(0, 3)) {
    if (typeof value !== 'string' || seen.has(value)) continue;
    const item = NAVIGATION_ITEMS[value];
    if (!item || !item.audiences.includes(audience)) continue;
    seen.add(value);
    actions.push({ key: item.key, label: item.label, href: item.href });
  }

  return actions;
}

export function extractBuildPairAiNavigation(rawAnswer: string, audience: BuildPairAiAudience) {
  const marker = /\[\[BUILDPAIR_NAV\]\]([\s\S]*?)\[\[\/BUILDPAIR_NAV\]\]\s*$/;
  const match = rawAnswer.match(marker);
  if (!match) {
    return {
      answer: rawAnswer.replace(/\s*\[\[BUILDPAIR_NAV\]\][\s\S]*$/g, '').trim(),
      navigation: [] as BuildPairAiNavigationAction[],
    };
  }

  let keys: unknown = [];
  try { keys = JSON.parse(match[1]?.trim() ?? '[]'); } catch { keys = []; }
  return {
    answer: rawAnswer.slice(0, match.index ?? rawAnswer.length).trim(),
    navigation: resolveBuildPairAiNavigation(keys, audience),
  };
}
