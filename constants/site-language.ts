import type { Href } from 'expo-router';

export const PUBLIC_NAV_ITEMS: { label: string; href: Href }[] = [
  { label: 'Find a trade', href: '/(public)/directory' },
  { label: 'How it works', href: '/(public)/how-it-works' },
  { label: 'For tradespeople', href: '/(public)/for-tradespeople' },
  { label: 'Pricing', href: '/(public)/pricing' },
  { label: 'Advice', href: '/(public)/advice' },
];

export const SITE_LANGUAGE = {
  launchingSoon: 'Launching soon',
  joinBuildPair: 'Join BuildPair',
  signIn: 'Sign in',
  pricing: 'Pricing',
  findTrade: 'Find a trade',
  postJob: 'Post a job',
  requestQuote: 'Request a quote',
  compareQuotes: 'Compare quotes',
  manageProject: 'Manage project',
  createProfile: 'Create profile',
  findWork: 'Find work',
  sendQuote: 'Send quote',
  manageJobs: 'Manage jobs',
} as const;

export const LAUNCH_OFFER = {
  badge: '3 months Pro free',
  short: 'Join before launch and get 3 months of BuildPair Pro free from launch.',
  trade: 'Tradespeople can join free and build their profile now. Your 3 months of BuildPair Pro starts when the marketplace opens.',
  homeowner: 'Homeowners can join the launch list now. We’ll notify you when BuildPair opens and you can start posting jobs.',
} as const;

export const WHY_BUILDPAIR = [
  'No pay per lead',
  'No bidding wars',
  'Clear quotes',
  'Local matching',
  'Manage the whole job',
  'Staged payments',
  'Direct payment allowed',
  'Business tools included',
] as const;
