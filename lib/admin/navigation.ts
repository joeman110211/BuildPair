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
  description: 'Headline numbers, live traffic, items needing attention and shortcuts into the rest of the console.',
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Start here',
    description: 'The fastest route to the owner overview or a plain-English answer.',
    items: [
      ADMIN_OVERVIEW_ITEM,
      { href: '/admin/qa-lab', label: 'QA Lab', shortLabel: 'QA Lab', description: 'Preview homeowner, trade, public and admin screens, then jump to the real records needed for transactional states.' },
      { href: '/admin/assistant', label: 'Admin Assistant', shortLabel: 'Assistant', description: 'Ask plain-English questions about BuildPair, marketplace context, errors or changes you want to make.' },
    ],
  },
  {
    title: 'Growth & usage',
    description: 'Track visits, new registrations, conversion and earlier enquiries.',
    items: [
      { href: '/admin/ai-conversations', label: 'AI conversations', shortLabel: 'AI chats', description: 'Read BuildPair AI conversations, filter by visitor type and spot questions the assistant failed to answer well.' },
      { href: '/admin/visitors', label: 'Visitor intelligence', shortLabel: 'Visitors', description: 'Live anonymous visitors, new versus returning traffic, sources, landing pages and conversion journeys.' },
      { href: '/admin/insights', label: 'Product insights', shortLabel: 'Insights', description: 'Understand signed-in account behaviour, marketplace use and product-level trends.' },
      { href: '/admin/waitlist', label: 'Historical contacts', shortLabel: 'Contacts', description: 'Archived pre-launch enquiries, consent choices and invitation history. New users register directly.' },
    ],
  },
  {
    title: 'People',
    description: 'Accounts, administrator permissions, live signed-in activity, trade businesses and evidence used for trust checks.',
    items: [
      { href: '/admin/access', label: 'Administrator access', shortLabel: 'Admins', description: 'Owner-only controls for inviting, approving and removing administrator accounts.' },
      { href: '/admin/users', label: 'Users & access', shortLabel: 'Users', description: 'Find accounts, inspect account modes, subscriptions, suspensions and account history.' },
      { href: '/admin/presence', label: 'Live signed-in users', shortLabel: 'Live', description: 'See which registered accounts are active now or have been active recently.' },
      { href: '/admin/profiles', label: 'Trade profiles', shortLabel: 'Profiles', description: 'Review business profiles and the public marketplace information attached to them.' },
      { href: '/admin/google-reviews', label: 'Google review checks', shortLabel: 'Google', description: 'Approve or reject Google business listings that did not pass automatic profile matching.' },
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
    title: 'Safety & payments',
    description: 'Reports and money-related cases where a human administrator may need to intervene.',
    items: [
      { href: '/admin/moderation', label: 'Moderation', shortLabel: 'Safety', description: 'Handle reports, safety concerns and moderation actions with an audit trail.' },
      { href: '/admin/payment-disputes', label: 'BuildPay records', shortLabel: 'BuildPay', description: 'Internal BuildPay case records. Protected payments are not yet available to customers.' },
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
