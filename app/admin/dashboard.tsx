import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Metrics = {
  totalUsers: number;
  homeownerMode: number;
  traderMode: number;
  homeownerOnly: number;
  traderOnly: number;
  dualMode: number;
  noMode: number;
  suspendedUsers: number;
  newUsers24h: number;
  onlineNow: number;
  active15m: number;
  jobs: number;
  openJobs: number;
  quotedJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  profiles: number;
  quotes: number;
  acceptedQuotes: number;
  conversations: number;
  messages: number;
  flaggedMessages: number;
  openReports: number;
  reviews: number;
  invoices: number;
  overdueInvoices: number;
  payments: number;
  paidPayments: number;
  grossPaymentsPence: number | string;
  platformFeesPence: number | string;
  pendingCredentials: number;
  verifiedCredentials: number;
  mediaItems: number;
};

type DataQuality = {
  identitySource: 'clerk' | 'database';
  databaseActiveRows: number;
  orphanedDbAccounts: number;
  testFixturesExcluded: number;
};

type RecentUser = {
  id: string;
  email: string | null;
  name: string | null;
  businessName: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  lastPath: string | null;
  onlineNow: boolean;
  isSuspended: boolean;
  customerEnabled: boolean;
  traderEnabled: boolean;
};

type FlaggedMessage = { id: string; body: string; riskLevel: string; reason: string | null; createdAt: string; senderEmail: string | null; jobTitle: string | null };
type Report = { id: string; reason: string; status: string; createdAt: string; reporterEmail: string | null; subjectEmail: string | null };
type Overview = { metrics: Metrics; dataQuality: DataQuality; recentUsers: RecentUser[]; flaggedMessages: FlaggedMessage[]; recentReports: Report[]; generatedAt: string };

function fmt(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function money(value: number | string | undefined) {
  const pounds = Number(value ?? 0) / 100;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(Number.isFinite(pounds) ? pounds : 0);
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <View style={styles.stat}>
    <Text variant="headlineSmall" style={styles.statValue}>{value}</Text>
    <Text variant="labelLarge" style={styles.statLabel}>{label}</Text>
    {hint ? <Text variant="bodySmall" style={styles.muted}>{hint}</Text> : null}
  </View>;
}

function NavButton({ href, label, detail }: { href: string; label: string; detail: string }) {
  return <Link href={href as never} asChild>
    <Button mode="text" contentStyle={styles.navButtonContent} style={styles.navButton} labelStyle={styles.navButtonLabel}>
      {label} · {detail}
    </Button>
  </Link>;
}

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await apiFetch<Overview>('/api/admin/overview', {}, getToken));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (!data && !error) return <LoadingScreen label="Loading owner console…" />;

  const metrics = data?.metrics;
  const actions = metrics ? [
    { show: metrics.pendingCredentials > 0, href: '/admin/credentials', label: `${metrics.pendingCredentials} credential${metrics.pendingCredentials === 1 ? '' : 's'} waiting` },
    { show: metrics.openReports > 0, href: '/admin/moderation', label: `${metrics.openReports} open report${metrics.openReports === 1 ? '' : 's'}` },
    { show: metrics.flaggedMessages > 0, href: '/admin/messages', label: `${metrics.flaggedMessages} flagged message${metrics.flaggedMessages === 1 ? '' : 's'}` },
    { show: metrics.overdueInvoices > 0, href: '/admin/activity', label: `${metrics.overdueInvoices} overdue invoice${metrics.overdueInvoices === 1 ? '' : 's'}` },
  ].filter((item) => item.show) : [];

  return <Screen title="BuildPair Owner Console" subtitle="A cleaner operational view of real accounts, marketplace activity, trust & safety and BuildPair services.">
    <View style={styles.toolbar}>
      <Button mode="contained" loading={loading} disabled={loading} onPress={() => void load()}>Refresh console</Button>
      {data ? <Chip>{`Updated ${fmt(data.generatedAt)}`}</Chip> : null}
      {data?.dataQuality.identitySource === 'clerk' ? <Chip>Clerk-backed account totals</Chip> : <Chip>Database fallback totals</Chip>}
    </View>

    {error ? <HelperText type="error" visible>{error}</HelperText> : null}

    {data?.dataQuality.orphanedDbAccounts ? <AppCard style={styles.warningCard}>
      <Text variant="titleMedium" style={styles.title}>Data quality warning</Text>
      <Text style={styles.muted}>
        {data.dataQuality.orphanedDbAccounts} active database record{data.dataQuality.orphanedDbAccounts === 1 ? '' : 's'} no longer exist in Clerk. They are excluded from the headline account and marketplace totals so old automated-test records do not inflate the console.
      </Text>
      <View style={styles.inlineChips}>
        <Chip>{data.dataQuality.databaseActiveRows} active DB rows</Chip>
        {data.dataQuality.testFixturesExcluded ? <Chip>{data.dataQuality.testFixturesExcluded} live test fixtures excluded</Chip> : null}
      </View>
      <Link href="/admin/users" asChild><Button mode="text">Review account records</Button></Link>
    </AppCard> : null}

    <AppCard>
      <View style={styles.sectionHeading}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Action centre</Text>
          <Text style={styles.muted}>Things that currently need an administrator decision.</Text>
        </View>
      </View>
      {!actions.length ? <Text style={styles.good}>Nothing is waiting for review.</Text> : <View style={styles.actionRow}>
        {actions.map((item) => <Link key={item.href} href={item.href as never} asChild><Button mode="outlined">{item.label}</Button></Link>)}
      </View>}
    </AppCard>

    {metrics ? <>
      <Text variant="titleLarge" style={styles.sectionTitle}>Accounts</Text>
      <AppCard>
        <View style={styles.statsGrid}>
          <Stat label="Real accounts" value={metrics.totalUsers} hint="Current non-test Clerk identities" />
          <Stat label="Homeowner mode" value={metrics.homeownerMode} hint={`${metrics.homeownerOnly} homeowner-only`} />
          <Stat label="Trade mode" value={metrics.traderMode} hint={`${metrics.traderOnly} trade-only`} />
          <Stat label="Dual mode" value={metrics.dualMode} hint="Both account modes enabled" />
          <Stat label="Mode not chosen" value={metrics.noMode} />
          <Stat label="New in 24h" value={metrics.newUsers24h} />
          <Stat label="Online now" value={metrics.onlineNow} hint={`${metrics.active15m} active in 15 min`} />
          <Stat label="Suspended" value={metrics.suspendedUsers} />
        </View>
      </AppCard>

      <Text variant="titleLarge" style={styles.sectionTitle}>Marketplace</Text>
      <AppCard>
        <View style={styles.statsGrid}>
          <Stat label="Jobs" value={metrics.jobs} hint={`${metrics.openJobs} open`} />
          <Stat label="In progress" value={metrics.inProgressJobs} />
          <Stat label="Completed" value={metrics.completedJobs} />
          <Stat label="Cancelled" value={metrics.cancelledJobs} />
          <Stat label="Trade profiles" value={metrics.profiles} />
          <Stat label="Quotes" value={metrics.quotes} hint={`${metrics.acceptedQuotes} accepted`} />
          <Stat label="Messages" value={metrics.messages} hint={`${metrics.conversations} conversations`} />
          <Stat label="Reviews" value={metrics.reviews} />
          <Stat label="Photos / media" value={metrics.mediaItems} />
          <Stat label="Verified credentials" value={metrics.verifiedCredentials} />
        </View>
      </AppCard>

      <Text variant="titleLarge" style={styles.sectionTitle}>Money</Text>
      <AppCard>
        <View style={styles.statsGrid}>
          <Stat label="Invoices" value={metrics.invoices} hint={`${metrics.overdueInvoices} overdue`} />
          <Stat label="Payments" value={metrics.payments} hint={`${metrics.paidPayments} paid`} />
          <Stat label="Paid volume" value={money(metrics.grossPaymentsPence)} />
          <Stat label="BuildPair fees" value={money(metrics.platformFeesPence)} />
        </View>
      </AppCard>
    </> : null}

    <Text variant="titleLarge" style={styles.sectionTitle}>Navigate</Text>
    <View style={styles.navGrid}>
      <AppCard style={styles.navGroup}>
        <Text variant="titleMedium" style={styles.title}>People</Text>
        <Text style={styles.muted}>Accounts, who is online, trade profiles and trust evidence.</Text>
        <NavButton href="/admin/users" label="Users" detail="accounts & access" />
        <NavButton href="/admin/presence" label="Live users" detail="current activity" />
        <NavButton href="/admin/profiles" label="Trade profiles" detail="business listings" />
        <NavButton href="/admin/credentials" label="Credentials" detail="verification queue" />
      </AppCard>

      <AppCard style={styles.navGroup}>
        <Text variant="titleMedium" style={styles.title}>Marketplace</Text>
        <Text style={styles.muted}>Jobs, messages, media and the marketplace timeline.</Text>
        <NavButton href="/admin/jobs" label="Jobs" detail="status & job records" />
        <NavButton href="/admin/activity" label="Activity" detail="quotes, invoices & events" />
        <NavButton href="/admin/messages" label="Messages" detail="message moderation" />
        <NavButton href="/admin/media" label="Media" detail="uploaded photos" />
      </AppCard>

      <AppCard style={styles.navGroup}>
        <Text variant="titleMedium" style={styles.title}>Safety & system</Text>
        <Text style={styles.muted}>Moderation decisions and the services BuildPair relies on.</Text>
        <NavButton href="/admin/moderation" label="Moderation" detail="reports & actions" />
        <NavButton href="/admin/system" label="System health" detail="live dependency checks" />
      </AppCard>
    </View>

    {data ? <AppCard>
      <View style={styles.sectionHeading}>
        <View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Newest accounts</Text><Text style={styles.muted}>Current Clerk identities, newest first.</Text></View>
        <Link href="/admin/users" asChild><Button compact>All users</Button></Link>
      </View>
      {!data.recentUsers.length ? <Text style={styles.muted}>No accounts yet.</Text> : data.recentUsers.map((user) => <View key={user.id} style={styles.row}>
        <View style={styles.flex}>
          <Text variant="labelLarge">{user.businessName || user.name || user.email || user.id}</Text>
          <Text style={styles.muted}>Joined {fmt(user.createdAt)} · last seen {fmt(user.lastSeenAt)}{user.lastPath ? ` · ${user.lastPath}` : ''}</Text>
        </View>
        <View style={styles.inlineChips}>
          {user.onlineNow ? <Chip>Online</Chip> : null}
          {user.customerEnabled ? <Chip>Homeowner</Chip> : null}
          {user.traderEnabled ? <Chip>Trade</Chip> : null}
          {user.isSuspended ? <Chip>Suspended</Chip> : null}
        </View>
      </View>)}
    </AppCard> : null}

    {data?.flaggedMessages.length ? <AppCard>
      <View style={styles.sectionHeading}><Text variant="titleLarge" style={styles.title}>Flagged messages</Text><Link href="/admin/messages" asChild><Button compact>Review messages</Button></Link></View>
      {data.flaggedMessages.map((message) => <View key={message.id} style={styles.alert}>
        <View style={styles.row}><Text variant="labelLarge">{message.senderEmail ?? 'Unknown sender'}</Text><Chip>{message.riskLevel}</Chip></View>
        <Text numberOfLines={3}>{message.body}</Text>
        <Text style={styles.muted}>{message.jobTitle ?? 'Conversation'} · {fmt(message.createdAt)}{message.reason ? ` · ${message.reason}` : ''}</Text>
      </View>)}
    </AppCard> : null}

    {data?.recentReports.length ? <AppCard>
      <View style={styles.sectionHeading}><Text variant="titleLarge" style={styles.title}>Recent reports</Text><Link href="/admin/moderation" asChild><Button compact>Moderation queue</Button></Link></View>
      {data.recentReports.map((report) => <View key={report.id} style={styles.row}>
        <View style={styles.flex}><Text variant="labelLarge">{report.reason.replaceAll('_', ' ')}</Text><Text style={styles.muted}>{report.reporterEmail ?? 'Unknown'} → {report.subjectEmail ?? 'No account target'} · {fmt(report.createdAt)}</Text></View><Chip>{report.status}</Chip>
      </View>)}
    </AppCard> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  warningCard: { borderColor: '#E8B36B' },
  good: { color: '#287A52', fontWeight: '800' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', marginTop: 4 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 145, minWidth: 135, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, gap: 2, backgroundColor: colors.surfaceSoft },
  statValue: { color: colors.primary, fontWeight: '900' },
  statLabel: { color: colors.charcoal, fontWeight: '800' },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  navGroup: { flexGrow: 1, flexBasis: 280, minWidth: 260 },
  navButton: { alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: colors.border, borderRadius: 0 },
  navButtonContent: { justifyContent: 'flex-start', minHeight: 46 },
  navButtonLabel: { textAlign: 'left' },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  flex: { flex: 1, minWidth: 220 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, paddingVertical: 7 },
  inlineChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  alert: { gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, backgroundColor: colors.surfaceSoft },
});
