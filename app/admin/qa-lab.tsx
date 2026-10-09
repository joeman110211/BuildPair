import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Chip, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { BUILDPAY_OPEN } from '@/lib/launch-config';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch, errorMessage } from '@/lib/api';

type Area = 'homeowner' | 'trader' | 'public' | 'admin';
type Mode = 'customer' | 'trader';
type RouteKind = 'direct' | 'record';

type RouteItem = {
  area: Area;
  label: string;
  path: string;
  description: string;
  kind?: RouteKind;
  mode?: Mode;
  adminHref?: string;
  note?: string;
};

type Viewport = {
  key: 'mobile' | 'tablet' | 'desktop';
  label: string;
  width: number;
  height: number;
};

const VIEWPORTS: Viewport[] = [
  { key: 'mobile', label: 'Mobile · 390px', width: 390, height: 844 },
  { key: 'tablet', label: 'Tablet · 768px', width: 768, height: 1024 },
  { key: 'desktop', label: 'Desktop · 1440px', width: 1440, height: 960 },
];

const ROUTES: RouteItem[] = [
  { area: 'homeowner', label: 'Dashboard', path: '/customer/dashboard', description: 'Homeowner overview, next action, active jobs and shortcuts.', mode: 'customer' },
  { area: 'homeowner', label: 'My jobs', path: '/customer/jobs', description: 'All homeowner jobs and their current status.', mode: 'customer' },
  { area: 'homeowner', label: 'Post a job', path: '/customer/new-job', description: 'Full homeowner job-posting form and saved-property reuse.', mode: 'customer' },
  { area: 'homeowner', label: 'Saved trades', path: '/customer/saved-trades', description: 'Favourite trades and direct repeat-work shortcuts.', mode: 'customer' },
  { area: 'homeowner', label: 'Home Record / Property Passport', path: '/customer/home-record', description: 'Completed work, handover, warranty and aftercare history by property.', mode: 'customer' },
  { area: 'homeowner', label: 'Saved properties', path: '/customer/properties', description: 'Reusable private property details and access notes.', mode: 'customer' },
  { area: 'homeowner', label: 'Needs attention', path: '/customer/attention', description: 'Focused homeowner action centre.', mode: 'customer' },
  { area: 'homeowner', label: 'Messages', path: '/customer/messages', description: 'Homeowner conversation inbox.', mode: 'customer' },
  { area: 'homeowner', label: 'Notifications', path: '/customer/notifications', description: 'Homeowner alerts and action notifications.', mode: 'customer' },
  { area: 'homeowner', label: 'Profile', path: '/customer/profile', description: 'Homeowner profile details.', mode: 'customer' },
  { area: 'homeowner', label: 'Settings', path: '/customer/settings', description: 'Homeowner account and security settings.', mode: 'customer' },
  { area: 'homeowner', label: 'Project+ planner', path: '/customer/project-plus', description: 'Optional homeowner planning surface.', mode: 'customer' },
  { area: 'homeowner', label: 'Claim accepted quote', path: '/customer/claim-quote', description: 'Bring an accepted outside quote into a managed BuildPair project.', mode: 'customer' },
  { area: 'homeowner', label: 'Job details', path: '/customer/jobs/:jobId', description: 'Quote, payment, project, variation and completion state for one job.', kind: 'record', mode: 'customer', adminHref: '/admin/jobs', note: 'Choose a job in Admin Jobs, then open its homeowner record.' },
  { area: 'homeowner', label: 'Compare quotes', path: '/customer/compare/:jobId', description: 'Side-by-side homeowner quote comparison.', kind: 'record', mode: 'customer', adminHref: '/admin/jobs', note: 'Requires a job with two or more quotes.' },
  { area: 'homeowner', label: 'Project start / payment choice', path: '/customer/jobs/:jobId/start', description: 'Accepted-job setup and available direct-payment arrangements; BuildPay stays unavailable.', kind: 'record', mode: 'customer', adminHref: '/admin/jobs', note: 'Requires an accepted quote.' },
  { area: 'homeowner', label: 'Site visit', path: '/customer/jobs/:jobId/visit', description: 'Homeowner view of an arranged site visit.', kind: 'record', mode: 'customer', adminHref: '/admin/jobs' },
  { area: 'homeowner', label: 'Handover', path: '/customer/jobs/:jobId/handover', description: 'Completed-project handover, warranty and aftercare pack.', kind: 'record', mode: 'customer', adminHref: '/admin/jobs' },
  { area: 'homeowner', label: 'Conversation', path: '/customer/messages/:conversationId', description: 'Individual homeowner/trade conversation.', kind: 'record', mode: 'customer', adminHref: '/admin/messages' },

  { area: 'trader', label: 'Dashboard', path: '/trader/dashboard', description: 'Tradesperson overview, next actions, jobs and business shortcuts.', mode: 'trader' },
  { area: 'trader', label: 'Job board', path: '/trader/job-board', description: 'Matching BuildPair marketplace jobs.', mode: 'trader' },
  { area: 'trader', label: 'My jobs', path: '/trader/my-jobs', description: 'Quoted, accepted, active and completed BuildPair work.', mode: 'trader' },
  { area: 'trader', label: 'Needs attention', path: '/trader/attention', description: 'Focused trade action centre.', mode: 'trader' },
  { area: 'trader', label: 'Quotes', path: '/trader/quotes', description: 'Quote list covering marketplace and direct customers.', mode: 'trader' },
  { area: 'trader', label: 'Create quote', path: '/trader/quotes/new', description: 'Structured quote builder for BuildPair or outside work.', mode: 'trader' },
  { area: 'trader', label: 'Invoices', path: '/trader/invoices', description: 'Invoice list and payment status.', mode: 'trader' },
  { area: 'trader', label: 'Create invoice', path: '/trader/invoices/new', description: 'Standalone invoice creation.', mode: 'trader' },
  { area: 'trader', label: 'Customer book', path: '/trader/customers', description: 'Repeat customers, quote/invoice shortcuts and history.', mode: 'trader' },
  { area: 'trader', label: 'Working calendar', path: '/trader/calendar', description: 'Availability, jobs, visits and calendar subscription.', mode: 'trader' },
  { area: 'trader', label: 'Trade profile', path: '/trader/profile', description: 'Tradesperson profile and public-profile controls.', mode: 'trader' },
  { area: 'trader', label: 'Profile onboarding', path: '/trader/onboarding', description: 'Full trade profile setup journey.', mode: 'trader' },
  { area: 'trader', label: 'Templates', path: '/trader/templates', description: 'Reusable Pro quote and business templates.', mode: 'trader' },
  { area: 'trader', label: 'Analytics', path: '/trader/analytics', description: 'Trade profile and marketplace performance.', mode: 'trader' },
  { area: 'trader', label: 'Saved searches', path: '/trader/saved-searches', description: 'Saved job-search criteria.', mode: 'trader' },
  { area: 'trader', label: 'Stories', path: '/trader/stories', description: 'Trade story / showcase content.', mode: 'trader' },
  { area: 'trader', label: 'Trust & credentials', path: '/trader/trust', description: 'Qualification and trust evidence controls.', mode: 'trader' },
  { area: 'trader', label: 'Google reviews', path: '/trader/google-reviews', description: 'Google business review connection and verification.', mode: 'trader' },
  { area: 'trader', label: 'Messages', path: '/trader/messages', description: 'Tradesperson conversation inbox.', mode: 'trader' },
  { area: 'trader', label: 'Notifications', path: '/trader/notifications', description: 'Trade alerts and next-action notifications.', mode: 'trader' },
  { area: 'trader', label: 'Settings', path: '/trader/settings', description: 'Trade account and security settings.', mode: 'trader' },
  { area: 'trader', label: 'Project+ planner', path: '/trader/project-plus', description: 'Optional Project+ business planner.', mode: 'trader' },
  { area: 'trader', label: 'Plans & payouts', path: '/trader/subscription', description: 'Membership, subscription and payout setup.', mode: 'trader' },
  { area: 'trader', label: 'Job management', path: '/trader/jobs/:jobId', description: 'Full tradesperson project view for one BuildPair job.', kind: 'record', mode: 'trader', adminHref: '/admin/jobs' },
  { area: 'trader', label: 'Project handover', path: '/trader/jobs/:jobId/handover', description: 'Create and maintain handover, warranty and aftercare records.', kind: 'record', mode: 'trader', adminHref: '/admin/jobs' },
  { area: 'trader', label: 'Payment arrangement', path: '/trader/jobs/:jobId/payment-arrangement', description: 'Record direct-payment arrangements on a managed project.', kind: 'record', mode: 'trader', adminHref: '/admin/jobs' },
  { area: 'trader', label: 'Site visit', path: '/trader/visits/:visitId', description: 'Manage one scheduled site visit.', kind: 'record', mode: 'trader', adminHref: '/admin/activity' },
  { area: 'trader', label: 'Conversation', path: '/trader/messages/:conversationId', description: 'Individual tradesperson/homeowner conversation.', kind: 'record', mode: 'trader', adminHref: '/admin/messages' },

  { area: 'public', label: 'Homepage', path: '/', description: 'Main BuildPair public homepage.' },
  { area: 'public', label: 'Find a trade', path: '/directory', description: 'Public trade directory and filters.' },
  { area: 'public', label: 'Public jobs', path: '/jobs', description: 'Public job browsing surface.' },
  { area: 'public', label: 'Pricing', path: '/pricing', description: 'Trade membership pricing and plan comparison.' },
  { area: 'public', label: 'BuildPay', path: '/payments', description: 'Protected staged-payment explanation.' },
  { area: 'public', label: 'For homeowners', path: '/for-homeowners', description: 'Homeowner product proposition.' },
  { area: 'public', label: 'For tradespeople', path: '/for-tradespeople', description: 'Tradesperson product proposition.' },
  { area: 'public', label: 'How it works', path: '/how-it-works', description: 'Public product workflow explanation.' },
  { area: 'public', label: 'Founding trades', path: '/founding-trades', description: 'Founding-trade launch offer.' },
  { area: 'public', label: 'Updates', path: '/updates', description: 'Recently added and coming-soon product changes.' },
  { area: 'public', label: 'Legacy enquiry form', path: '/waitlist', description: 'Historical interest form, not the current account registration journey.' },
  { area: 'public', label: 'Advice Hub', path: '/advice', description: 'Homeowner/trade advice content.' },
  { area: 'public', label: 'About', path: '/about', description: 'BuildPair company/product introduction.' },
  { area: 'public', label: 'Trust & safety', path: '/trust-safety', description: 'Trust, moderation and safety explanation.' },
  { area: 'public', label: 'Marketplace standards', path: '/marketplace-standards', description: 'Marketplace conduct and quality standards.' },
  { area: 'public', label: 'Building regulations', path: '/building-regulations', description: 'Public building-regulations guidance.' },
  { area: 'public', label: 'Contact', path: '/contact', description: 'Public contact page.' },
  { area: 'public', label: 'System status', path: '/status', description: 'Public service-status page.' },
  { area: 'public', label: 'Download app', path: '/download', description: 'Mobile app download page.' },
  { area: 'public', label: 'Rewards', path: '/rewards', description: 'Referral/reward acquisition page.' },
  { area: 'public', label: 'Terms', path: '/terms', description: 'Terms and conditions.' },
  { area: 'public', label: 'Privacy', path: '/privacy', description: 'Privacy policy.' },
  { area: 'public', label: 'Cookies', path: '/cookies', description: 'Cookie information.' },
  { area: 'public', label: 'Disclaimer', path: '/disclaimer', description: 'Public disclaimer.' },
  { area: 'public', label: 'Delete account', path: '/delete-account', description: 'Account deletion guidance.' },
  { area: 'public', label: 'Public trade profile', path: '/traders/:profileId', description: 'Exact public listing seen by homeowners and visitors.', kind: 'record', adminHref: '/admin/profiles' },
  { area: 'public', label: 'Public job detail', path: '/jobs/:jobId', description: 'Public-facing job detail.', kind: 'record', adminHref: '/admin/jobs' },
  { area: 'public', label: 'External quote link', path: '/quote/:token', description: 'Public tokenised quote view for an outside customer.', kind: 'record', adminHref: '/admin/activity' },

  { area: 'admin', label: 'Owner overview', path: '/admin/dashboard', description: 'Headline owner metrics and action centre.' },
  { area: 'admin', label: 'QA Lab', path: '/admin/qa-lab', description: 'This screen catalogue and journey-testing control room.' },
  { area: 'admin', label: 'Admin Assistant', path: '/admin/assistant', description: 'Plain-English BuildPair admin assistant.' },
  { area: 'admin', label: 'Users & access', path: '/admin/users', description: 'User modes, activity, memberships and account actions.' },
  { area: 'admin', label: 'Trade profiles', path: '/admin/profiles', description: 'Profile inspection and public listing checks.' },
  { area: 'admin', label: 'Jobs', path: '/admin/jobs', description: 'All marketplace jobs and status inspection.' },
  { area: 'admin', label: 'Marketplace activity', path: '/admin/activity', description: 'Quotes, invoices, payments and major events.' },
  { area: 'admin', label: 'Messages', path: '/admin/messages', description: 'Conversation and flagged-message review.' },
  { area: 'admin', label: 'Photos & media', path: '/admin/media', description: 'Uploaded marketplace/profile media.' },
  { area: 'admin', label: 'Moderation', path: '/admin/moderation', description: 'Safety reports and administrator decisions.' },
  { area: 'admin', label: 'BuildPay issues', path: '/admin/payment-disputes', description: 'Escalated protected-payment cases.' },
  { area: 'admin', label: 'Credentials', path: '/admin/credentials', description: 'Qualification and evidence review.' },
  { area: 'admin', label: 'Google review checks', path: '/admin/google-reviews', description: 'Manual Google business matching review.' },
  { area: 'admin', label: 'Visitor intelligence', path: '/admin/visitors', description: 'Anonymous site traffic and acquisition sources.' },
  { area: 'admin', label: 'Product insights', path: '/admin/insights', description: 'Signed-in behaviour and marketplace trends.' },
  { area: 'admin', label: 'Historical contacts', path: '/admin/waitlist', description: 'Pre-launch interest records and invitation history.' },
  { area: 'admin', label: 'Live signed-in users', path: '/admin/presence', description: 'Recent authenticated activity.' },
  { area: 'admin', label: 'AI conversations', path: '/admin/ai-conversations', description: 'BuildPair AI conversation review.' },
  { area: 'admin', label: 'Admin access', path: '/admin/access', description: 'Owner-only administrator permissions.' },
  { area: 'admin', label: 'System health', path: '/admin/system', description: 'Live dependencies and operational configuration checks.' },
];

const STATES = [
  { side: 'Homeowner', state: 'Fresh account · no jobs', setup: 'Use a homeowner-enabled admin/test account with no current jobs.', href: '/admin/users' },
  { side: 'Homeowner', state: 'Job posted · no quotes', setup: 'Choose or create an open job with zero quotes.', href: '/admin/jobs' },
  { side: 'Homeowner', state: 'Quote comparison', setup: 'Use a job with at least two submitted quotes.', href: '/admin/jobs' },
  { side: 'Homeowner', state: 'Accepted · choose payment', setup: 'Use a job with an accepted quote before payment mode is chosen.', href: '/admin/jobs' },
  { side: 'Homeowner', state: 'BuildPay stage awaiting approval', setup: 'Use an in-progress protected job with a completed funded stage.', href: '/admin/activity' },
  { side: 'Homeowner', state: 'Variation pending', setup: 'Use an active project with an unresolved variation.', href: '/admin/jobs' },
  { side: 'Homeowner', state: 'Completed · review / hire again', setup: 'Use a completed job with its trade relationship intact.', href: '/admin/jobs' },
  { side: 'Trade', state: 'Matching new lead', setup: 'Use a trade profile whose categories and radius match an open job.', href: '/admin/jobs' },
  { side: 'Trade', state: 'Quote sent · waiting', setup: 'Use a submitted quote that has not been accepted.', href: '/admin/activity' },
  { side: 'Trade', state: 'Accepted project', setup: 'Use a job where the trade quote is accepted.', href: '/admin/jobs' },
  { side: 'Trade', state: 'Funded work stage', setup: 'Use an in-progress BuildPay job with an active funded stage.', href: '/admin/activity' },
  { side: 'Trade', state: 'Payment problem', setup: 'Use an escalated or disputed unreleased stage.', href: '/admin/payment-disputes' },
  { side: 'Trade', state: 'Handover / warranty', setup: 'Use a near-complete or completed project with handover records.', href: '/admin/jobs' },
] as const;

const CURRENT_STATES = STATES.filter((item) => BUILDPAY_OPEN || !['BuildPay stage awaiting approval', 'Funded work stage', 'Payment problem'].includes(item.state));

function areaLabel(area: Area) {
  if (area === 'homeowner') return 'Homeowner';
  if (area === 'trader') return 'Tradesperson';
  if (area === 'public') return 'Public';
  return 'Admin';
}

function areaColour(area: Area) {
  if (area === 'homeowner') return '#EAF4FF';
  if (area === 'trader') return '#FFF0E6';
  if (area === 'public') return '#EEF8F0';
  return '#F3EEFF';
}

export default function AdminQaLab() {
  const router = useRouter();
  const { user, loading, error: userError, refresh, getToken } = useCurrentUser();
  const [area, setArea] = useState<Area | 'all'>('all');
  const [query, setQuery] = useState('');
  const [viewportKey, setViewportKey] = useState<Viewport['key']>('mobile');
  const [busyMode, setBusyMode] = useState<Mode | null>(null);
  const [actionError, setActionError] = useState('');

  const viewport = VIEWPORTS.find((item) => item.key === viewportKey) ?? VIEWPORTS[0]!;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ROUTES.filter((item) => {
      if (area !== 'all' && item.area !== area) return false;
      if (!needle) return true;
      return [item.label, item.path, item.description, item.note, areaLabel(item.area)]
        .some((value) => value?.toLowerCase().includes(needle));
    });
  }, [area, query]);

  async function enableMode(mode: Mode) {
    if (busyMode) return;
    setBusyMode(mode);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ role: mode }) }, getToken);
      await refresh();
      setActionError('');
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setBusyMode(null);
    }
  }

  function modeAvailable(mode?: Mode) {
    if (!mode) return true;
    return mode === 'customer' ? Boolean(user?.customerEnabled) : Boolean(user?.traderEnabled);
  }

  function openPreview(path: string) {
    if (Platform.OS === 'web') {
      const browser = globalThis as unknown as {
        open?: (url?: string, target?: string, features?: string) => unknown;
      };
      if (typeof browser.open === 'function') {
        browser.open(path, '_blank', `popup=yes,width=${viewport.width},height=${viewport.height},resizable=yes,scrollbars=yes`);
        return;
      }
    }
    router.push(path as Href);
  }

  if (loading && !user) return <LoadingScreen label="Loading QA Lab…" />;

  const directCount = filtered.filter((item) => (item.kind ?? 'direct') === 'direct').length;
  const recordCount = filtered.length - directCount;

  return <Screen
    title="QA Lab"
    subtitle="Owner-only screen catalogue for checking BuildPair as a homeowner, tradesperson, public visitor and administrator without hunting through the app."
  >
    <AppCard style={styles.hero}>
      <View style={styles.heroHeader}>
        <View style={styles.flex}>
          <Text variant="headlineSmall" style={styles.title}>Keep Admin open. Preview screens beside it.</Text>
          <Text style={styles.muted}>On web, direct screens open in a separate window using the selected viewport size. Screens that depend on a real job, message, visit, profile or quote token send you to the correct admin record first.</Text>
        </View>
        <Chip icon="shield-lock-outline">Admin only</Chip>
      </View>
      <View style={styles.stats}>
        <Chip>{ROUTES.length} catalogued screens</Chip>
        <Chip>{ROUTES.filter((item) => (item.kind ?? 'direct') === 'direct').length} direct previews</Chip>
        <Chip>{ROUTES.filter((item) => item.kind === 'record').length} record-driven screens</Chip>
      </View>
    </AppCard>

    {userError ? <HelperText type="error" visible>{userError}</HelperText> : null}
    {actionError ? <HelperText type="error" visible>{actionError}</HelperText> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Your preview access</Text>
      <Text style={styles.muted}>The QA Lab never bypasses authentication. It enables the normal account mode on your own administrator identity, then lets the existing role gates and permissions behave normally.</Text>
      <View style={styles.accessRow}>
        <View style={styles.accessBlock}>
          <Chip icon={user?.customerEnabled ? 'check-circle' : 'account-plus-outline'}>{user?.customerEnabled ? 'Homeowner mode enabled' : 'Homeowner mode not enabled'}</Chip>
          {!user?.customerEnabled ? <Button mode="contained-tonal" loading={busyMode === 'customer'} disabled={Boolean(busyMode)} onPress={() => void enableMode('customer')}>Enable homeowner preview</Button> : null}
        </View>
        <View style={styles.accessBlock}>
          <Chip icon={user?.traderEnabled ? 'check-circle' : 'account-plus-outline'}>{user?.traderEnabled ? 'Trade mode enabled' : 'Trade mode not enabled'}</Chip>
          {!user?.traderEnabled ? <Button mode="contained-tonal" loading={busyMode === 'trader'} disabled={Boolean(busyMode)} onPress={() => void enableMode('trader')}>Enable tradesperson preview</Button> : null}
        </View>
      </View>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Preview viewport</Text>
      <Text style={styles.muted}>Choose the window size before opening a screen. Browser chrome means the exact rendered viewport can vary slightly, but this catches the ugly mobile/tablet layout problems humans keep inventing.</Text>
      <SegmentedButtons
        value={viewportKey}
        onValueChange={(value) => setViewportKey(value as Viewport['key'])}
        buttons={VIEWPORTS.map((item) => ({ value: item.key, label: item.label }))}
      />
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Screen catalogue</Text>
      <TextInput
        mode="outlined"
        label="Search screen, route or feature"
        value={query}
        onChangeText={setQuery}
        left={<TextInput.Icon icon="magnify" />}
      />
      <View style={styles.filters}>
        {(['all', 'homeowner', 'trader', 'public', 'admin'] as const).map((value) =>
          <Chip key={value} selected={area === value} onPress={() => setArea(value)}>
            {value === 'all' ? 'All' : areaLabel(value)}
          </Chip>
        )}
      </View>
      <Text style={styles.muted}>{filtered.length} screens shown · {directCount} direct · {recordCount} need an existing record</Text>
    </AppCard>

    <View style={styles.routeGrid}>
      {filtered.map((item) => {
        const direct = (item.kind ?? 'direct') === 'direct';
        const enabled = modeAvailable(item.mode);
        return <AppCard key={`${item.area}-${item.path}`} style={styles.routeCard}>
          <View style={styles.routeTop}>
            <View style={styles.flex}>
              <Text variant="titleMedium" style={styles.title}>{item.label}</Text>
              <Text selectable style={styles.path}>{item.path}</Text>
            </View>
            <Chip style={{ backgroundColor: areaColour(item.area) }}>{areaLabel(item.area)}</Chip>
          </View>
          <Text style={styles.muted}>{item.description}</Text>
          <View style={styles.tags}>
            <Chip compact icon={direct ? 'open-in-new' : 'database-search-outline'}>{direct ? 'Direct preview' : 'Needs real record'}</Chip>
            {item.mode ? <Chip compact icon={enabled ? 'check-circle-outline' : 'lock-outline'}>{item.mode === 'customer' ? 'Homeowner mode' : 'Trade mode'}</Chip> : null}
          </View>
          {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
          {direct ? <Button
            mode="contained"
            icon="open-in-new"
            disabled={!enabled}
            onPress={() => openPreview(item.path)}
          >{enabled ? `Open · ${viewport.label}` : 'Enable account mode first'}</Button> : <Button
            mode="outlined"
            icon="database-search-outline"
            onPress={() => router.push((item.adminHref ?? '/admin/dashboard') as Href)}
          >Find a usable record</Button>}
        </AppCard>;
      })}
    </View>

    <Text variant="titleLarge" style={styles.sectionTitle}>Journey-state checklist</Text>
    <AppCard>
      <Text style={styles.muted}>These live user journeys should be checked regularly after launch. The QA Lab deliberately uses real BuildPair records for transactional states instead of inventing fake production data that could leak into counts, payments or notifications.</Text>
    </AppCard>
    <View style={styles.stateGrid}>
      {CURRENT_STATES.map((item) => <AppCard key={`${item.side}-${item.state}`} style={styles.stateCard}>
        <View style={styles.routeTop}>
          <Text variant="titleMedium" style={styles.title}>{item.state}</Text>
          <Chip>{item.side}</Chip>
        </View>
        <Text style={styles.muted}>{item.setup}</Text>
        <Button mode="outlined" icon="arrow-right" onPress={() => router.push(item.href as Href)}>Open setup records</Button>
      </AppCard>)}
    </View>

    <AppCard style={styles.footerCard}>
      <Text variant="titleMedium" style={styles.title}>QA rule</Text>
      <Text style={styles.muted}>Public and static account pages can be previewed freely. Anything involving money, private messages, job ownership, quote acceptance, variations or reviews should be tested against a deliberate test record, never by silently impersonating a real customer.</Text>
      <View style={styles.filters}>
        <Button mode="contained-tonal" onPress={() => router.push('/admin/jobs')}>Test records</Button>
        <Button mode="contained-tonal" onPress={() => router.push('/admin/users')}>Test accounts</Button>
        <Button mode="contained-tonal" onPress={() => router.push('/admin/system')}>System health</Button>
      </View>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#FFF7F0', borderColor: '#E8B37E' },
  heroHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 3 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  accessRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accessBlock: { flexShrink: 1, maxWidth: '100%', minWidth: 0, flexGrow: 1, flexBasis: 260, gap: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  routeCard: { flexShrink: 1, minWidth: 0, flexGrow: 1, flexBasis: 330, maxWidth: 620 },
  routeTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  path: { color: colors.primary, fontFamily: 'monospace', fontSize: 11 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  note: { color: colors.charcoalSoft, backgroundColor: colors.surfaceSoft, borderRadius: 10, padding: 8, lineHeight: 19 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', marginTop: 4 },
  stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stateCard: { flexShrink: 1, minWidth: 0, flexGrow: 1, flexBasis: 300, maxWidth: 520 },
  footerCard: { borderColor: colors.primary },
});
