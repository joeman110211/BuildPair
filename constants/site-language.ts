import type { Href } from 'expo-router';

export const PUBLIC_NAV_ITEMS: { label: string; href: Href }[] = [
  { label: 'Find a trade', href: '/(public)/directory' },
  { label: 'How it works', href: '/(public)/how-it-works' },
  { label: 'For tradespeople', href: '/(public)/for-tradespeople' },
  { label: 'Advice Hub', href: '/(public)/advice' },
];

export const SITE_LANGUAGE = {
  launchingSoon: 'Open for homeowners and tradespeople',
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
  short: 'Tradespeople get 3 months of BuildPair Pro free from signup. No payment details required.',
  trade: 'Create your tradesperson profile and use BuildPair Pro free for three months from signup. No automatic subscription or payment details required.',
  homeowner: 'Create a homeowner account, post work, compare quotes and manage your job.',
} as const;

export const FAIR_FOR_BOTH = {
  eyebrow: 'Fair for both sides',
  homeownerTitle: 'Clear quotes. More control.',
  homeownerBody: 'Find local tradespeople, compare the important details clearly and keep the project record together.',
  tradeTitle: 'Fair access. Better tools.',
  tradeBody: 'No pay per lead or bidding wars. Build your reputation, quote professionally and manage the work after you win it.',
  bridge: 'One project. Both sides connected.',
} as const;

export const PLAN_POSITIONING = {
  Starter: 'Get established',
  'BuildPair Core': 'Win work',
  'BuildPair Plus': 'Run more jobs',
  'BuildPair Pro': 'Run your business',
} as const;

export const PAYMENT_LANGUAGE = {
  title: 'Pay your way',
  short: 'Arrange payment directly with your tradesperson. BuildPay protected stages are coming soon.',
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
