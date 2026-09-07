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
  totalUsers: number; homeowners: number; tradespeople: number; suspendedUsers: number; newUsers24h: number;
  onlineNow: number; active15m: number; jobs: number; openJobs: number; profiles: number; conversations: number;
  messages: number; flaggedMessages: number; openReports: number; reviews: number; quotes: number; invoices: number;
  payments: number; mediaItems: number;
};
type RecentUser = { id: string; email: string | null; businessName: string | null; createdAt: string; lastSeenAt: string | null; lastPath: string | null; onlineNow: boolean; isSuspended: boolean; customerEnabled: boolean; traderEnabled: boolean };
type FlaggedMessage = { id: string; body: string; riskLevel: string; reason: string | null; createdAt: string; senderEmail: string | null; jobTitle: string | null };
type Report = { id: string; reason: string; status: string; createdAt: string; reporterEmail: string | null; subjectEmail: string | null };
type Overview = { metrics: Metrics; recentUsers: RecentUser[]; flaggedMessages: FlaggedMessage[]; recentReports: Report[]; generatedAt: string };

const metricLabels: [keyof Metrics, string][] = [
  ['onlineNow', 'Online now'], ['active15m', 'Active 15m'], ['totalUsers', 'Users'], ['newUsers24h', 'New 24h'],
  ['homeowners', 'Homeowners'], ['tradespeople', 'Tradespeople'], ['jobs', 'Jobs'], ['openJobs', 'Open jobs'],
  ['profiles', 'Profiles'], ['messages', 'Messages'], ['mediaItems', 'Photos/media'], ['flaggedMessages', 'Flagged messages'],
  ['openReports', 'Open reports'], ['reviews', 'Reviews'], ['quotes', 'Quotes'], ['invoices', 'Invoices'],
];

function fmt(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Overview>('/api/admin/overview', {}, getToken));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (!data && !error) return <LoadingScreen label="Loading owner console…" />;

  return <Screen title="BuildPair Owner Console" subtitle="Live operational view of accounts, marketplace activity, content and moderation while BuildPair is in active testing.">
    <View style={styles.nav}>
      <Link href="/admin/presence" asChild><Button mode="contained" icon="access-point">Live users</Button></Link>
      <Link href="/admin/users" asChild><Button mode="outlined" icon="account-group-outline">Users</Button></Link>
      <Link href="/admin/jobs" asChild><Button mode="outlined" icon="briefcase-outline">Jobs</Button></Link>
      <Link href="/admin/profiles" asChild><Button mode="outlined" icon="account-hard-hat-outline">Profiles</Button></Link>
      <Link href="/admin/messages" asChild><Button mode="outlined" icon="message-text-outline">Messages</Button></Link>
      <Link href="/admin/media" asChild><Button mode="outlined" icon="image-multiple-outline">Media</Button></Link>
      <Link href="/admin/activity" asChild><Button mode="outlined" icon="timeline-clock-outline">Activity</Button></Link>
      <Link href="/admin/moderation" asChild><Button mode="outlined" icon="shield-alert-outline">Moderation</Button></Link>
      <Link href="/admin/credentials" asChild><Button mode="outlined" icon="shield-check-outline">Credentials</Button></Link>
      <Button mode="text" icon="refresh" onPress={() => void load()}>Refresh</Button>
    </View>

    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {data ? <>
      <View style={styles.metrics}>
        {metricLabels.map(([key, label]) => <AppCard key={key} style={styles.metricCard}>
          <Text variant="headlineSmall" style={styles.metricValue}>{data.metrics[key] ?? 0}</Text>
          <Text style={styles.muted}>{label}</Text>
        </AppCard>)}
      </View>

      <AppCard>
        <View style={styles.heading}><Text variant="titleLarge" style={styles.title}>Newest accounts</Text><Link href="/admin/users" asChild><Button compact>All users</Button></Link></View>
        {!data.recentUsers.length ? <Text style={styles.muted}>No accounts yet.</Text> : data.recentUsers.map((user) => <View key={user.id} style={styles.row}>
          <View style={styles.flex}>
            <Text variant="labelLarge">{user.businessName || user.email || user.id}</Text>
            <Text style={styles.muted}>Joined {fmt(user.createdAt)} · last seen {fmt(user.lastSeenAt)}{user.lastPath ? ` · ${user.lastPath}` : ''}</Text>
          </View>
          <View style={styles.chips}>{user.onlineNow ? <Chip icon="circle">Online</Chip> : null}{user.isSuspended ? <Chip>Suspended</Chip> : null}</View>
        </View>)}
      </AppCard>

      <AppCard>
        <View style={styles.heading}><Text variant="titleLarge" style={styles.title}>Flagged messages</Text><Link href="/admin/messages" asChild><Button compact>Review messages</Button></Link></View>
        {!data.flaggedMessages.length ? <Text style={styles.muted}>No medium-or-higher AI message flags.</Text> : data.flaggedMessages.map((message) => <View key={message.id} style={styles.alert}>
          <View style={styles.row}><Text variant="labelLarge">{message.senderEmail ?? 'Unknown sender'}</Text><Chip>{message.riskLevel}</Chip></View>
          <Text numberOfLines={3}>{message.body}</Text>
          <Text style={styles.muted}>{message.jobTitle ?? 'Conversation'} · {fmt(message.createdAt)}{message.reason ? ` · ${message.reason}` : ''}</Text>
        </View>)}
      </AppCard>

      <AppCard>
        <View style={styles.heading}><Text variant="titleLarge" style={styles.title}>Reports</Text><Link href="/admin/moderation" asChild><Button compact>Moderation queue</Button></Link></View>
        {!data.recentReports.length ? <Text style={styles.muted}>No reports have been submitted.</Text> : data.recentReports.map((report) => <View key={report.id} style={styles.row}>
          <View style={styles.flex}><Text variant="labelLarge">{report.reason.replaceAll('_', ' ')}</Text><Text style={styles.muted}>{report.reporterEmail ?? 'Unknown'} → {report.subjectEmail ?? 'No account target'} · {fmt(report.createdAt)}</Text></View><Chip>{report.status}</Chip>
        </View>)}
      </AppCard>
    </> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { minWidth: 145, flexGrow: 1, flexBasis: 155 },
  metricValue: { color: colors.primary, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  title: { color: colors.charcoal, fontWeight: '900' },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, paddingVertical: 6 },
  flex: { flex: 1, minWidth: 220 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  alert: { gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, backgroundColor: colors.surfaceSoft },
});
