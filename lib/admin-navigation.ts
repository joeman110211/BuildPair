export type AdminNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
};

export type AdminNavGroup = {
  title: string;
  description: string;
  items: AdminNavItem[];
};

export const ADMIN_OVERVIEW_ITEM: AdminNavItem = {
  href: '/admin/dashboard',
  label: 'Overview',
  shortLabel: 'Overview',
  description: 'Headline numbers, items needing attention and shortcuts into the rest of the console.',
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Start here',
    description: 'The safest place to begin when you are not sure where something lives.',
    items: [
      ADMIN_OVERVIEW_ITEM,
      { href: '/admin/assistant', label: 'Admin Assistant', shortLabel: 'Assistant', description: 'Ask plain-English questions about the whole BuildPair product, live marketplace context, errors or changes you want to make.' },
    ],
  },
  {
    title: 'People',
    description: 'Accounts, live activity, trade businesses and evidence used for trust checks.',
    items: [
      { href: '/admin/users', label: 'Users & access', shortLabel: 'Users', description: 'Find accounts, inspect account modes, subscriptions, suspensions and account history.' },
      { href: '/admin/presence', label: 'Live users', shortLabel: 'Live', description: 'See who is active now or has been active recently.' },
      { href: '/admin/profiles', label: 'Trade profiles', shortLabel: 'Profiles', description: 'Review business profiles and the public marketplace information attached to them.' },
      { href: '/admin/credentials', label: 'Credentials', shortLabel: 'Credentials', description: 'Review uploaded qualifications, registrations and other submitted evidence.' },
    ],
  },
  {
    title: 'Marketplace',
    description: 'The work moving through BuildPair after people join.',
    items: [
      { href: '/admin/jobs', label: 'Jobs', shortLabel: 'Jobs', description: 'Inspect posted jobs, statuses and the project records attached to them.' },
      { href: '/admin/activity', label: 'Marketplace activity', shortLabel: 'Activity', description: 'See quotes, invoices, payment-related records and major marketplace events.' },
      { href: '/admin/messages', label: 'Messages', shortLabel: 'Messages', description: 'Review conversations and messages, including anything flagged for attention.' },
      { href: '/admin/media', label: 'Photos & media', shortLabel: 'Media', description: 'Inspect uploaded job and profile media without digging through individual records.' },
    ],
  },
  {
    title: 'Safety',
    description: 'Reports and decisions where a human administrator may need to intervene.',
    items: [
      { href: '/admin/moderation', label: 'Moderation', shortLabel: 'Safety', description: 'Handle reports, safety concerns and moderation actions with an audit trail.' },
      { href: '/admin/payment-disputes', label: 'BuildPay issues', shortLabel: 'BuildPay', description: 'Review paused or escalated unreleased BuildPay stages, responses, refund requests and admin notes.' },
    ],
  },
  {
    title: 'Growth & usage',
    description: 'Understand how people are finding and using BuildPair.',
    items: [
      { href: '/admin/insights', label: 'Product insights', shortLabel: 'Insights', description: 'Understand account behaviour, marketplace use and product-level trends.' },
      { href: '/admin/visitors', label: 'Visitor analytics', shortLabel: 'Visitors', description: 'See public-site visits and acquisition behaviour before a person creates an account.' },
    ],
  },
  {
    title: 'Platform',
    description: 'Check the services BuildPair depends on before assuming an app screen is broken.',
    items: [
      { href: '/admin/system', label: 'System health', shortLabel: 'System', description: 'Check database, authentication, AI, media, email and payment integrations.' },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export function adminNavItemForPath(pathname: string): AdminNavItem {
  return ADMIN_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? ADMIN_OVERVIEW_ITEM;
}
