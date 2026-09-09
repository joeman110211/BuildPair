import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

const ANALYTICS_NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

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
  profileBio: string | null;
  profileUpdatedAt?: string | null;
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
type JourneyEvent = { id: string; eventType: string; path: string | null; flow: string | null; step: string | null; details: Record<string, unknown>; createdAt: string };
type Draft = { flow: string; currentStep: string | null; status: string; fields: Record<string, unknown>; startedAt: string; updatedAt: string; completedAt: string | null };
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
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function timestamp(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function Metric({ value, label, help }: { value: number | string; label: string; help: string }) {
  return <View style={styles.metric}><Text variant="headlineSmall" style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.muted}>{help}</Text></View>;
}

function filterLabel(filter: Filter) {
  return ({ all: 'All users', homeowner: 'Homeowners', trade: 'Trades', profile: 'Has profile', 'no-profile': 'No profile', active24h: 'Active 24h', inactive30d: 'Inactive 30d+', suspended: 'Suspended' } as const)[filter];
}

export default function AdminInsights() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [response, setResponse] = useState<ListResponse | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void apiFetch<ListResponse>('/api/admin/insights', {}, getToken)
      .then((result) => { if (active) { setResponse(result); setError(''); } })
      .catch((cause) => { if (active) setError(errorMessage(cause)); });
    return () => { active = false; };
  }, [getToken]);

  const users = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const source = [...(response?.users ?? [])].filter((user) => {
      const searchMatch = !needle || [user.name, user.email, user.businessName, user.tradeCategory, user.id].some((value) => value?.toLowerCase().includes(needle));
      if (!searchMatch) return false;
      const lastSeen = timestamp(user.lastSeenAt ?? user.lastTrackedAt);
      if (filter === 'homeowner') return user.customerEnabled;
      if (filter === 'trade') return user.traderEnabled;
      if (filter === 'profile') return Boolean(user.profileId);
      if (filter === 'no-profile') return user.traderEnabled && !user.profileId;
      if (filter === 'active24h') return lastSeen >= ANALYTICS_NOW - DAY_MS;
      if (filter === 'inactive30d') return !lastSeen || lastSeen < ANALYTICS_NOW - 30 * DAY_MS;
      if (filter === 'suspended') return user.isSuspended;
      return true;
    });
    source.sort((a, b) => {
      if (sort === 'newest') return timestamp(b.clerkCreatedAt ?? b.createdAt) - timestamp(a.clerkCreatedAt ?? a.createdAt);
      if (sort === 'pageviews') return (b.pageViews30d ?? 0) - (a.pageViews30d ?? 0);
      return timestamp(b.lastSeenAt ?? b.lastTrackedAt) - timestamp(a.lastSeenAt ?? a.lastTrackedAt);
    });
    return source;
  }, [filter, query, response?.users, sort]);

  const totals = useMemo(() => {
    const all = response?.users ?? [];
    return {
      users: all.length,
      homeowners: all.filter((user) => user.customerEnabled).length,
      trades: all.filter((user) => user.traderEnabled).length,
      profiles: all.filter((user) => Boolean(user.profileId)).length,
      active24h: all.filter((user) => timestamp(user.lastSeenAt ?? user.lastTrackedAt) >= ANALYTICS_NOW - DAY_MS).length,
    };
  }, [response?.users]);

  const chooseUser = (userId: string) => {
    setSelectedId(userId);
    setDetailLoading(true);
    setError('');
    void apiFetch<DetailResponse>(`/api/admin/insights?userId=${encodeURIComponent(userId)}`, {}, getToken)
      .then((result) => { setDetail(result); setDetailLoading(false); })
      .catch((cause) => { setError(errorMessage(cause)); setDetailLoading(false); });
  };

  const refresh = () => {
    void apiFetch<ListResponse>('/api/admin/insights', {}, getToken)
      .then((result) => { setResponse(result); setError(''); })
      .catch((cause) => setError(errorMessage(cause)));
    if (selectedId) chooseUser(selectedId);
  };

  if (!response && !error) return <LoadingScreen label="Loading product insights…" />;

  return <Screen title="User & Product Insights" subtitle="See who is using BuildPair, where they go, which journeys stall and what trade profiles actually look like.">
    <AppCard>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Product behaviour, explained</Text>
          <Text style={styles.muted}>Signed-in page events tell you where a user went. Draft snapshots tell you where selected multi-step flows were left. “Possible friction” is a useful signal, not a claim that BuildPair has read somebody’s mind.</Text>
        </View>
        <Button mode="outlined" icon="refresh" onPress={refresh}>Refresh</Button>
      </View>
      <View style={styles.metrics}>
        <Metric value={totals.users} label="Accounts" help="Real Clerk/BuildPair accounts" />
        <Metric value={totals.homeowners} label="Homeowners" help="Homeowner mode enabled" />
        <Metric value={totals.trades} label="Trades" help="Trade mode enabled" />
        <Metric value={totals.profiles} label="Trade profiles" help="Profiles you can open below" />
        <Metric value={totals.active24h} label="Active 24h" help="Seen or tracked in the last day" />
      </View>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      {response && (!response.tracking.eventsAvailable || !response.tracking.draftsAvailable) ? <HelperText type="info" visible>Some product-analytics storage is unavailable, so parts of the journey view may be empty.</HelperText> : null}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Find & filter users</Text>
      <TextInput mode="outlined" label="Search name, email, business, trade or user ID" value={query} onChangeText={setQuery} />
      <View style={styles.chips}>{(['all', 'homeowner', 'trade', 'profile', 'no-profile', 'active24h', 'inactive30d', 'suspended'] as Filter[]).map((item) => <Chip key={item} selected={filter === item} onPress={() => setFilter(item)}>{filterLabel(item)}</Chip>)}</View>
      <View style={styles.sortRow}><Text style={styles.muted}>Sort:</Text>{(['recent', 'newest', 'pageviews'] as Sort[]).map((item) => <Button key={item} compact mode={sort === item ? 'contained' : 'text'} onPress={() => setSort(item)}>{item === 'recent' ? 'Recent activity' : item === 'newest' ? 'Newest' : 'Page views'}</Button>)}</View>
      <Text style={styles.muted}>Showing {users.length} of {response?.users.length ?? 0} users.</Text>
    </AppCard>

    <View style={styles.columns}>
      <AppCard style={styles.listPane}>
        <Text variant="titleLarge" style={styles.title}>Users</Text>
        {!users.length ? <Text style={styles.muted}>No users match those filters.</Text> : null}
        {users.slice(0, 300).map((user, index) => <View key={user.id}>
          <View style={[styles.userRow, selectedId === user.id && styles.selectedRow]}>
            <View style={styles.flex}>
              <View style={styles.lineBetween}>
                <Text style={styles.userName}>{user.businessName || user.name || user.email || 'Unnamed account'}</Text>
                {user.isSuspended ? <Chip compact icon="alert">Suspended</Chip> : user.isAdmin ? <Chip compact>Admin</Chip> : null}
              </View>
              <Text style={styles.muted}>{user.email ?? user.id}</Text>
              <View style={styles.chips}>
                {user.customerEnabled ? <Chip compact>Homeowner</Chip> : null}
                {user.traderEnabled ? <Chip compact>Trade</Chip> : null}
                {user.profileId ? <Chip compact icon="storefront-outline">Profile</Chip> : null}
              </View>
              <Text style={styles.muted}>Last seen {fmt(user.lastSeenAt ?? user.lastTrackedAt)} · {user.lastPath ?? user.lastTrackedPath ?? 'no page recorded'}</Text>
              <Text style={styles.muted}>{user.pageViews30d ?? 0} page views / 30d · {user.distinctPages30d ?? 0} distinct pages · {user.jobsCount} jobs · {user.quotesCount} quotes</Text>
            </View>
            <Button compact mode="outlined" onPress={() => chooseUser(user.id)}>Inspect</Button>
          </View>
          {index < users.length - 1 ? <Divider /> : null}
        </View>)}
      </AppCard>

      <AppCard style={styles.detailPane}>
        <Text variant="titleLarge" style={styles.title}>User detail</Text>
        {!selectedId ? <Text style={styles.muted}>Choose a user to see their profile, recent pages and possible unfinished journeys.</Text> : null}
        {detailLoading ? <Text style={styles.muted}>Loading this user’s journey…</Text> : null}
        {detail && !detailLoading ? <>
          <Text variant="headlineSmall" style={styles.title}>{detail.user?.businessName || detail.identity?.name || detail.identity?.email || selectedId}</Text>
          <Text style={styles.muted}>{detail.identity?.email ?? 'No Clerk email returned'} · joined {fmt(detail.identity?.createdAt ?? detail.user?.createdAt)}</Text>

          <View style={styles.metrics}>
            <Metric value={detail.user?.jobsCount ?? 0} label="Jobs" help="Saved job posts" />
            <Metric value={detail.user?.quotesCount ?? 0} label="Quotes" help="Quotes sent" />
            <Metric value={detail.user?.messagesCount ?? 0} label="Messages" help="Messages sent" />
            <Metric value={detail.events.filter((event) => event.eventType === 'page_view').length} label="Page events" help="Within the latest 200 events" />
          </View>

          <Divider />
          <Text variant="titleMedium" style={styles.subheading}>Account & trade profile</Text>
          <Text>Modes: {[detail.user?.customerEnabled ? 'Homeowner' : null, detail.user?.traderEnabled ? 'Trade' : null].filter(Boolean).join(' + ') || 'Not chosen'}</Text>
          <Text>Last seen: {fmt(detail.user?.lastSeenAt)} on {detail.user?.lastPath ?? 'unknown page'}</Text>
          {detail.user?.profileId ? <View style={styles.profileBox}>
            <Text variant="labelLarge">{detail.user.businessName || 'Trade profile'}</Text>
            <Text style={styles.muted}>{detail.user.tradeCategory ?? 'Trade category not set'} · {detail.user.subscriptionTier ?? 'plan not set'}</Text>
            <Text numberOfLines={5}>{detail.user.profileBio || 'No bio saved.'}</Text>
            <Button mode="outlined" onPress={() => router.push(`/(public)/traders/${detail.user?.profileId}` as never)}>Open public profile</Button>
          </View> : <Text style={styles.muted}>No active trade profile exists for this account.</Text>}

          <Divider />
          <Text variant="titleMedium" style={styles.subheading}>Possible friction / unfinished work</Text>
          {!detail.signals.length && !detail.drafts.some((draft) => draft.status === 'in_progress') ? <Text style={styles.muted}>No unfinished-flow signal has been recorded yet.</Text> : null}
          {detail.signals.map((signal, index) => <Text key={`${signal}-${index}`} style={styles.signal}>• {signal}</Text>)}
          {detail.drafts.map((draft) => <View key={`${draft.flow}-${draft.updatedAt}`} style={styles.draftBox}>
            <View style={styles.lineBetween}><Text variant="labelLarge">{draft.flow.replaceAll('_', ' ')}</Text><Chip compact>{draft.status}</Chip></View>
            <Text style={styles.muted}>Last step: {draft.currentStep ?? 'unknown'} · updated {fmt(draft.updatedAt)}</Text>
            {Object.keys(draft.fields ?? {}).length ? <Text selectable style={styles.draftText}>{JSON.stringify(draft.fields, null, 2)}</Text> : <Text style={styles.muted}>No autosaved field snapshot.</Text>}
          </View>)}

          <Divider />
          <Text variant="titleMedium" style={styles.subheading}>Recent journey</Text>
          {!detail.events.length ? <Text style={styles.muted}>No page journey has been recorded yet.</Text> : detail.events.slice(0, 80).map((event, index) => <View key={event.id}>
            <View style={styles.eventRow}>
              <Text style={styles.eventTime}>{fmt(event.createdAt)}</Text>
              <View style={styles.flex}><Text style={styles.userName}>{event.eventType.replaceAll('_', ' ')}</Text><Text style={styles.muted}>{event.path ?? event.flow ?? 'No route'}{event.step ? ` · ${event.step}` : ''}</Text></View>
            </View>
            {index < Math.min(detail.events.length, 80) - 1 ? <Divider /> : null}
          </View>)}
        </> : null}
      </AppCard>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontWeight: '900' },
  subheading: { color: colors.text, fontWeight: '900', marginTop: 4 },
  muted: { color: colors.muted, lineHeight: 21 },
  flex: { flex: 1, minWidth: 170 },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flex: 1, minWidth: 130, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  metricValue: { color: colors.primary, fontWeight: '900' },
  metricLabel: { color: colors.text, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  listPane: { flex: 1, minWidth: 320 },
  detailPane: { flex: 1, minWidth: 320 },
  userRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10 },
  selectedRow: { backgroundColor: '#FFF4EA' },
  userName: { color: colors.text, fontWeight: '800' },
  lineBetween: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  profileBox: { gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 },
  signal: { color: colors.text, lineHeight: 22 },
  draftBox: { gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10 },
  draftText: { color: colors.text, fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  eventRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  eventTime: { width: 124, color: colors.muted, fontSize: 12 },
});
