import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type InsightUser = {
  id: string;
  email: string | null;
  name: string | null;
  clerkCreatedAt: string | null;
  createdAt?: string | null;
  customerEnabled: boolean;
  traderEnabled: boolean;
  activeMode?: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  profileId: string | null;
  businessName: string | null;
  tradeCategory: string | null;
  subscriptionTier: string | null;
  lastSeenAt: string | null;
  lastPath: string | null;
  platform: string | null;
  jobsCount: number;
  quotesCount: number;
  messagesCount: number;
  pageViews7d: number;
  pageViews30d: number;
  distinctPages30d: number;
  lastTrackedAt: string | null;
  lastTrackedPath: string | null;
};

type Tracking = { eventsAvailable: boolean; draftsAvailable: boolean };
type ListResponse = { users: InsightUser[]; tracking: Tracking };
type JourneyEvent = {
  id: string;
  eventType: string;
  path: string | null;
  flow: string | null;
  step: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
type Draft = {
  flow: string;
  currentStep: string | null;
  status: string;
  fields: Record<string, unknown>;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
};
type DetailResponse = {
  user: InsightUser | null;
  identity: { id: string; email: string | null; name: string | null; createdAt: string | null } | null;
  tracking: Tracking;
  events: JourneyEvent[];
  drafts: Draft[];
  signals: string[];
};

type Filter = 'all' | 'homeowner' | 'trade' | 'profile' | 'no-profile' | 'active24h' | 'inactive30d' | 'suspended';
type Sort = 'recent' | 'newest' | 'pageviews';

function fmt(value: string | null | undefined) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function ageMs(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Date.now() - new Date(value).getTime();
}

function labelFor(user: InsightUser) {
  return user.businessName || user.name || user.email || user.id;
}

function eventLabel(event: JourneyEvent) {
  if (event.eventType === 'page_view') return event.path ? `Viewed ${event.path}` : 'Viewed a page';
  if (event.eventType === 'flow_started') return `Started ${event.flow ?? 'a flow'}`;
  if (event.eventType === 'flow_progress') return `${event.flow ?? 'Flow'} · ${event.step ?? 'progress'}`;
  if (event.eventType === 'flow_completed') return `Completed ${event.flow ?? 'a flow'}`;
  if (event.eventType === 'flow_abandoned') return `Left ${event.flow ?? 'a flow'} unfinished`;
  return event.eventType.replaceAll('_', ' ');
}

function Metric({ value, label, help }: { value: string | number; label: string; help?: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="headlineSmall" style={styles.metricValue}>{value}</Text>
      <Text variant="labelLarge" style={styles.metricLabel}>{label}</Text>
      {help ? <Text variant="bodySmall" style={styles.muted}>{help}</Text> : null}
    </View>
  );
}

export default function AdminInsights() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await apiFetch<ListResponse>('/api/admin/insights', {}, getToken));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void load(); }, [load]);

  const chooseUser = useCallback(async (userId: string) => {
    setSelectedId(userId);
    setDetail(null);
    try {
      setDetailLoading(true);
      setDetail(await apiFetch<DetailResponse>(`/api/admin/insights?userId=${encodeURIComponent(userId)}`, {}, getToken));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  }, [getToken]);

  const users = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const source = [...(data?.users ?? [])].filter((user) => {
      if (needle) {
        const haystack = [user.email, user.name, user.businessName, user.tradeCategory, user.id].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (filter === 'homeowner' && !user.customerEnabled) return false;
      if (filter === 'trade' && !user.traderEnabled) return false;
      if (filter === 'profile' && !user.profileId) return false;
      if (filter === 'no-profile' && user.profileId) return false;
      if (filter === 'active24h' && ageMs(user.lastSeenAt) > 24 * 60 * 60 * 1000) return false;
      if (filter === 'inactive30d' && ageMs(user.lastSeenAt) <= 30 * 24 * 60 * 60 * 1000) return false;
      if (filter === 'suspended' && !user.isSuspended) return false;
      return true;
    });

    source.sort((a, b) => {
      if (sort === 'pageviews') return b.pageViews30d - a.pageViews30d;
      if (sort === 'newest') return new Date(b.clerkCreatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.clerkCreatedAt ?? a.createdAt ?? 0).getTime();
      return new Date(b.lastSeenAt ?? b.lastTrackedAt ?? b.clerkCreatedAt ?? 0).getTime() - new Date(a.lastSeenAt ?? a.lastTrackedAt ?? a.clerkCreatedAt ?? 0).getTime();
    });
    return source;
  }, [data?.users, filter, search, sort]);

  if (!data && loading && !error) return <LoadingScreen label="Loading product insights…" />;

  return (
    <Screen title="User & Product Insights" subtitle="See how real signed-in users move through BuildPair, where they stop and which parts of the product deserve attention.">
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>What the numbers actually mean</Text>
        <Text style={styles.muted}>
          Page views are signed-in route changes, not 45-second heartbeats. “Last page” is the most recent route reported by the presence service. A “possible drop-off” is a useful clue, not proof that somebody disliked a page. Drafts are intended to be explicit autosaved form values, never passwords, payment details or secret keystroke recording.
        </Text>
        <View style={styles.chips}>
          <Chip>{data?.tracking.eventsAvailable ? 'Journey tracking ready' : 'Journey database awaiting activation'}</Chip>
          <Chip>{data?.tracking.draftsAvailable ? 'Draft storage ready' : 'Draft storage awaiting activation'}</Chip>
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.toolbar}>
          <TextInput
            mode="outlined"
            label="Search users"
            placeholder="Email, name, business or user ID"
            value={search}
            onChangeText={setSearch}
            style={styles.search}
          />
          <Button mode="outlined" loading={loading} onPress={() => void load()}>Refresh</Button>
        </View>
        <Text variant="labelLarge" style={styles.subheading}>Filter</Text>
        <View style={styles.chips}>
          {([
            ['all', 'All'],
            ['homeowner', 'Homeowners'],
            ['trade', 'Trades'],
            ['profile', 'Has trade profile'],
            ['no-profile', 'No trade profile'],
            ['active24h', 'Active 24h'],
            ['inactive30d', 'Inactive 30d+'],
            ['suspended', 'Suspended'],
          ] as [Filter, string][]).map(([key, label]) => (
            <Chip key={key} selected={filter === key} onPress={() => setFilter(key)}>{label}</Chip>
          ))}
        </View>
        <Text variant="labelLarge" style={styles.subheading}>Sort</Text>
        <View style={styles.chips}>
          <Chip selected={sort === 'recent'} onPress={() => setSort('recent')}>Recently active</Chip>
          <Chip selected={sort === 'newest'} onPress={() => setSort('newest')}>Newest</Chip>
          <Chip selected={sort === 'pageviews'} onPress={() => setSort('pageviews')}>Most page views</Chip>
        </View>
        <Text style={styles.muted}>{users.length} matching account{users.length === 1 ? '' : 's'}.</Text>
      </AppCard>

      {error ? <HelperText visible type="error">{error}</HelperText> : null}

      <View style={styles.twoColumn}>
        <AppCard style={styles.listPane}>
          <Text variant="titleLarge" style={styles.title}>Users</Text>
          {!users.length ? <Text style={styles.muted}>No users match these filters.</Text> : users.map((user) => (
            <View key={user.id} style={[styles.userRow, selectedId === user.id && styles.selectedRow]}>
              <View style={styles.flex}>
                <Text variant="titleMedium" style={styles.title}>{labelFor(user)}</Text>
                {user.email && user.email !== labelFor(user) ? <Text style={styles.muted}>{user.email}</Text> : null}
                <Text style={styles.muted}>Last seen {fmt(user.lastSeenAt)} · {user.platform ?? 'platform unknown'}</Text>
                <Text numberOfLines={1} style={styles.path}>{user.lastPath ?? user.lastTrackedPath ?? 'No page recorded yet'}</Text>
                <View style={styles.chips}>
                  {user.customerEnabled ? <Chip compact>Homeowner</Chip> : null}
                  {user.traderEnabled ? <Chip compact>Trade</Chip> : null}
                  {user.profileId ? <Chip compact>Profile live</Chip> : null}
                  {user.isAdmin ? <Chip compact>Admin</Chip> : null}
                  {user.isSuspended ? <Chip compact>Suspended</Chip> : null}
                </View>
                <Text style={styles.muted}>{user.pageViews7d} views / 7d · {user.distinctPages30d} different pages / 30d · {user.jobsCount} jobs · {user.quotesCount} quotes</Text>
              </View>
              <View style={styles.rowActions}>
                <Button compact mode={selectedId === user.id ? 'contained' : 'outlined'} onPress={() => void chooseUser(user.id)}>Journey</Button>
                {user.profileId ? <Button compact onPress={() => router.push(`/(public)/traders/${user.profileId}` as never)}>Public profile</Button> : null}
              </View>
            </View>
          ))}
        </AppCard>

        <AppCard style={styles.detailPane}>
          <Text variant="titleLarge" style={styles.title}>User detail</Text>
          {!selectedId ? <Text style={styles.muted}>Choose a user to see their journey, profile status, possible unfinished flows and recent pages.</Text> : null}
          {detailLoading ? <Text style={styles.muted}>Loading this user’s journey…</Text> : null}
          {detail && !detailLoading ? (
            <>
              <Text variant="headlineSmall" style={styles.title}>{detail.user?.businessName || detail.identity?.name || detail.identity?.email || selectedId}</Text>
              <Text style={styles.muted}>{detail.identity?.email ?? 'No Clerk email returned'} · joined {fmt(detail.identity?.createdAt ?? detail.user?.createdAt)}</Text>

              <View style={styles.metrics}>
                <Metric value={detail.user?.jobsCount ?? 0} label="Jobs" help="Saved job posts" />
                <Metric value={detail.user?.quotesCount ?? 0} label="Quotes" help="Quotes sent" />
                <Metric value={detail.user?.messagesCount ?? 0} label="Messages" help="Messages sent" />
                <Metric value={detail.events.filter((event) => event.eventType === 'page_view').length} label="Recent page events" help="Up to the latest 200 events" />
              </View>

              <Divider />
              <Text variant="titleMedium" style={styles.subheading}>Account & trade profile</Text>
              <Text>Modes: {[
                detail.user?.customerEnabled ? 'Homeowner' : null,
                detail.user?.traderEnabled ? 'Trade' : null,
              ].filter(Boolean).join(' + ') || 'Not chosen'}</Text>
              <Text>Last seen: {fmt(detail.user?.lastSeenAt)} on {detail.user?.lastPath ?? 'unknown page'}</Text>
              {detail.user?.profileId ? (
                <View style={styles.profileBox}>
                  <Text variant="labelLarge">{detail.user.businessName || 'Trade profile'}</Text>
                  <Text style={styles.muted}>{detail.user.tradeCategory ?? 'Trade category not set'} · {detail.user.subscriptionTier ?? 'plan not set'}</Text>
                  <Text numberOfLines={4}>{detail.user.profileBio || 'No bio saved.'}</Text>
                  <Button mode="outlined" onPress={() => router.push(`/(public)/traders/${detail.user?.profileId}` as never)}>Open the public profile</Button>
                </View>
              ) : <Text style={styles.muted}>No active trade profile exists for this account.</Text>}

              <Divider />
              <Text variant="titleMedium" style={styles.subheading}>Possible friction / unfinished work</Text>
              {!detail.signals.length && !detail.drafts.some((draft) => draft.status === 'in_progress') ? (
                <Text style={styles.muted}>No unfinished-flow signal has been recorded yet.</Text>
              ) : null}
              {detail.signals.map((signal, index) => <Text key={`${signal}-${index}`} style={styles.signal}>• {signal}</Text>)}
              {detail.drafts.map((draft) => (
                <View key={draft.flow} style={styles.draftBox}>
                  <View style={styles.lineBetween}>
                    <Text variant="labelLarge">{draft.flow.replaceAll('_', ' ')}</Text>
                    <Chip compact>{draft.status}</Chip>
                  </View>
                  <Text style={styles.muted}>Last step: {draft.currentStep ?? 'unknown'} · updated {fmt(draft.updatedAt)}</Text>
                  {Object.keys(draft.fields ?? {}).length ? <Text selectable style={styles.draftText}>{JSON.stringify(draft.fields, null, 2)}</Text> : <Text style={styles.muted}>No autosaved field snapshot.</Text>}
                </View>
              ))}

              <Divider />
              <Text variant="titleMedium" style={styles.subheading}>Recent journey</Text>
              {!detail.tracking.eventsAvailable ? <Text style={styles.muted}>Historical page-by-page tracking was not enabled for this user yet.</Text> : null}
              {detail.events.slice(0, 80).map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <View style={styles.dot} />
                  <View style={styles.flex}>
                    <Text variant="labelLarge">{eventLabel(event)}</Text>
                    <Text style={styles.muted}>{fmt(event.createdAt)}{event.step ? ` · step ${event.step}` : ''}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </AppCard>
      </View>

      <AppCard>
        <Text variant="titleLarge" style={styles.title}>How to use this without fooling ourselves</Text>
        <Text style={styles.muted}>
          Treat this as product evidence, not mind reading. If several genuine users repeatedly reach the same page and stop, that is a strong signal to inspect the wording, layout, validation or next button. One person leaving a page could simply have gone to make tea, answer the door or lose interest in humanity for five minutes.
        </Text>
        <Button mode="text" onPress={() => router.push('/admin/users' as never)}>Open account controls</Button>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted },
  path: { color: colors.charcoal, fontFamily: 'monospace', fontSize: 12 },
  subheading: { color: colors.charcoal, fontWeight: '800', marginTop: 8 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  search: { flexGrow: 1, flexBasis: 260, minWidth: 220 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  twoColumn: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  listPane: { flexGrow: 1, flexBasis: 390, minWidth: 280 },
  detailPane: { flexGrow: 1, flexBasis: 430, minWidth: 280 },
  userRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12, gap: 8 },
  selectedRow: { backgroundColor: colors.surfaceSoft, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 },
  flex: { flex: 1, minWidth: 0 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  metric: { flexGrow: 1, flexBasis: 120, minWidth: 115, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surfaceSoft },
  metricValue: { color: colors.primary, fontWeight: '900' },
  metricLabel: { color: colors.charcoal, fontWeight: '800' },
  profileBox: { gap: 6, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  signal: { color: colors.charcoal, marginVertical: 2 },
  draftBox: { gap: 5, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginTop: 8 },
  draftText: { fontFamily: 'monospace', fontSize: 12, backgroundColor: colors.surfaceSoft, padding: 8, borderRadius: 8 },
  lineBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  eventRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.primary, marginTop: 6 },
});
