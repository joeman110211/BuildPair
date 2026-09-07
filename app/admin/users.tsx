import { useAuth } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Tier = 'free' | 'basic' | 'featured';

type UserSummary = {
  id: string;
  email: string | null;
  name: string | null;
  role: 'customer' | 'trader' | null;
  customerEnabled: boolean;
  traderEnabled: boolean;
  activeMode: 'customer' | 'trader' | null;
  isAdmin: boolean;
  isSuspended: boolean;
  suspensionReason: string;
  isDeleted: boolean;
  createdAt?: string | null;
  clerkCreatedAt: string | null;
  profileId: string | null;
  businessName: string | null;
  subscriptionTier: Tier | null;
  paidSubscriptionTier: Tier | null;
  complimentaryTier: Tier | null;
  complimentaryGrantedAt: string | null;
  complimentaryReason: string | null;
  jobsCount: number;
  quotesCount: number;
  messagesCount: number;
  reviewsCount: number;
  invoicesCount: number;
  reportsCount: number;
  storiesCount: number;
  lastActivityAt: string | null;
};

type ActivityItem = { createdAt: string; kind: string; label: string; detail: string; href: string | null };
type UserDetail = { activity: ActivityItem[]; adminActions: { id: string; adminId: string | null; actionType: string; details: Record<string, unknown>; createdAt: string }[] };

type Filter = 'all' | 'homeowners' | 'trades' | 'suspended' | 'removed';

const TIER_NAMES: Record<Tier, string> = { free: 'Starter', basic: 'Plus', featured: 'Pro' };

function fmtDate(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function UserControlCentre() {
  const { getToken } = useAuth();
  const router = useRouter();
  const getTokenRef = useRef(getToken);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [details, setDetails] = useState<Record<string, UserDetail>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const token = useCallback(() => getTokenRef.current(), []);

  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch<UserSummary[]>('/api/admin/users', {}, token));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !query || [user.name, user.email, user.businessName, user.id].some((value) => value?.toLowerCase().includes(query));
      if (!matchesSearch) return false;
      if (filter === 'homeowners') return user.customerEnabled;
      if (filter === 'trades') return user.traderEnabled || Boolean(user.profileId);
      if (filter === 'suspended') return user.isSuspended;
      if (filter === 'removed') return user.isDeleted;
      return true;
    });
  }, [filter, search, users]);

  async function loadDetail(userId: string, force = false) {
    if (details[userId] && !force) return;
    try {
      const detail = await apiFetch<UserDetail>(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {}, token);
      setDetails((current) => ({ ...current, [userId]: detail }));
    } catch (e) { setError(errorMessage(e)); }
  }

  async function toggleDetail(userId: string) {
    const next = !expanded[userId];
    setExpanded((current) => ({ ...current, [userId]: next }));
    if (next) await loadDetail(userId);
  }

  async function perform(user: UserSummary, action: string, tier?: 'basic' | 'featured') {
    setBusyId(user.id);
    try {
      await apiFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ action, userId: user.id, ...(tier ? { tier } : {}), reason: notes[user.id]?.trim() ?? '' }),
      }, token);
      await load();
      if (expanded[user.id]) await loadDetail(user.id, true);
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusyId(null); }
  }

  function confirmSuspend(user: UserSummary) {
    Alert.alert('Suspend this account?', `This blocks ${user.email ?? user.businessName ?? 'the account'} from authenticated BuildPair activity and removes a trade profile from public discovery while suspended.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => void perform(user, 'suspend') },
    ]);
  }

  function confirmRemove(user: UserSummary) {
    Alert.alert('Permanently remove this user?', 'BuildPair will delete the Clerk sign-in identity, scrub personal/profile data and cancel an attached Stripe subscription where possible. Transactional records that must remain auditable are pseudonymised rather than casually erased.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove user', style: 'destructive', onPress: () => void removeUser(user) },
    ]);
  }

  async function removeUser(user: UserSummary) {
    setBusyId(user.id);
    try {
      await apiFetch('/api/admin/users', { method: 'DELETE', body: JSON.stringify({ userId: user.id, confirmation: 'REMOVE USER' }) }, token);
      setDetails((current) => { const next = { ...current }; delete next[user.id]; return next; });
      await load();
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusyId(null); }
  }

  if (loading) return <LoadingScreen label="Loading BuildPair users…" />;

  return <Screen title="User Control Centre" subtitle="All signed-up accounts in one place: account state, public trade profile, membership access, marketplace activity and administrator actions.">
    <View style={styles.topActions}>
      <Button mode="contained" icon="account-cog-outline" onPress={() => void load()}>Refresh users</Button>
      <Link href="/admin/moderation" asChild><Button mode="outlined" icon="shield-alert-outline">Moderation</Button></Link>
      <Link href="/admin/credentials" asChild><Button mode="outlined" icon="shield-check-outline">Credentials</Button></Link>
    </View>

    <AppCard>
      <TextInput mode="outlined" label="Search name, email, business or user ID" value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
      <View style={styles.filters}>
        {(['all', 'homeowners', 'trades', 'suspended', 'removed'] as Filter[]).map((value) => <Chip key={value} selected={filter === value} onPress={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</Chip>)}
      </View>
      <Text style={styles.muted}>{visible.length} shown · {users.length} total account record{users.length === 1 ? '' : 's'}</Text>
    </AppCard>

    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {!visible.length ? <EmptyState title="No users match this view" body="Try another search or filter." /> : visible.map((user) => {
      const busy = busyId === user.id;
      const detail = details[user.id];
      const isExpanded = Boolean(expanded[user.id]);
      const joined = user.clerkCreatedAt ?? user.createdAt;
      const currentTier = user.subscriptionTier ? TIER_NAMES[user.subscriptionTier] : null;
      return <AppCard key={user.id}>
        <View style={styles.identityRow}>
          <View style={styles.flex}>
            <Text variant="titleLarge" style={styles.title}>{user.businessName || user.name || user.email || (user.isDeleted ? 'Removed account' : 'BuildPair user')}</Text>
            <Text>{user.email ?? 'Email removed / not synchronised'}</Text>
            <Text variant="bodySmall" selectable style={styles.userId}>{user.id}</Text>
          </View>
          <View style={styles.chips}>
            {user.isAdmin ? <Chip icon="shield-account">Admin</Chip> : null}
            {user.customerEnabled ? <Chip icon="home-outline">Homeowner</Chip> : null}
            {user.traderEnabled || user.profileId ? <Chip icon="account-hard-hat-outline">Trade</Chip> : null}
            {user.isSuspended ? <Chip icon="cancel">Suspended</Chip> : null}
            {user.isDeleted ? <Chip icon="delete-outline">Removed</Chip> : null}
            {currentTier ? <Chip icon="crown-outline">{user.complimentaryTier ? `Complimentary ${currentTier}` : currentTier}</Chip> : null}
          </View>
        </View>

        <View style={styles.metaGrid}>
          <Text style={styles.meta}>Joined: {fmtDate(joined)}</Text>
          <Text style={styles.meta}>Last recorded activity: {fmtDate(user.lastActivityAt)}</Text>
          {user.businessName ? <Text style={styles.meta}>Business: {user.businessName}</Text> : null}
          {user.isSuspended && user.suspensionReason ? <Text style={styles.warning}>Suspension reason: {user.suspensionReason}</Text> : null}
          {user.complimentaryTier ? <Text style={styles.meta}>Free access granted: {TIER_NAMES[user.complimentaryTier]} · {fmtDate(user.complimentaryGrantedAt)}{user.complimentaryReason ? ` · ${user.complimentaryReason}` : ''}</Text> : null}
        </View>

        <View style={styles.activityCounts}>
          <Chip compact>{user.jobsCount} jobs</Chip><Chip compact>{user.quotesCount} quotes</Chip><Chip compact>{user.messagesCount} messages</Chip><Chip compact>{user.reviewsCount} reviews</Chip><Chip compact>{user.invoicesCount} invoices</Chip><Chip compact>{user.reportsCount} reports</Chip><Chip compact>{user.storiesCount} stories</Chip>
        </View>

        {!user.isDeleted ? <>
          <TextInput mode="outlined" label="Admin reason / note for the next action" value={notes[user.id] ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [user.id]: value }))} maxLength={1000} />
          <View style={styles.actions}>
            {user.profileId ? <Button mode="outlined" icon="open-in-new" onPress={() => router.push(`/(public)/traders/${user.profileId}`)}>Public profile</Button> : null}
            {user.profileId ? <Button mode="outlined" disabled={busy} onPress={() => void perform(user, 'grant_complimentary', 'basic')}>Give Plus free</Button> : null}
            {user.profileId ? <Button mode="outlined" disabled={busy} onPress={() => void perform(user, 'grant_complimentary', 'featured')}>Give Pro free</Button> : null}
            {user.complimentaryTier ? <Button mode="text" disabled={busy} onPress={() => void perform(user, 'revoke_complimentary')}>Remove free upgrade</Button> : null}
            {!user.isAdmin && !user.isSuspended ? <Button mode="outlined" textColor={colors.danger} disabled={busy} onPress={() => confirmSuspend(user)}>Suspend</Button> : null}
            {user.isSuspended ? <Button mode="outlined" disabled={busy} onPress={() => void perform(user, 'unsuspend')}>Restore</Button> : null}
            {!user.isAdmin ? <Button mode="contained" buttonColor={colors.danger} disabled={busy} loading={busy} onPress={() => confirmRemove(user)}>Remove user</Button> : null}
          </View>
        </> : null}

        <Divider />
        <Button mode="text" icon={isExpanded ? 'chevron-up' : 'chevron-down'} onPress={() => void toggleDetail(user.id)}>{isExpanded ? 'Hide recorded activity' : 'View recorded activity'}</Button>
        {isExpanded ? <View style={styles.activityList}>
          {!detail ? <Text style={styles.muted}>Loading activity…</Text> : !detail.activity.length ? <Text style={styles.muted}>No recorded marketplace activity for this account.</Text> : detail.activity.map((item, index) => <View key={`${item.kind}-${item.createdAt}-${index}`} style={styles.activityItem}>
            <View style={styles.activityHeader}><Text variant="labelLarge" style={styles.activityLabel}>{item.label}</Text><Text variant="bodySmall" style={styles.muted}>{fmtDate(item.createdAt)}</Text></View>
            {item.detail ? <Text style={styles.muted}>{item.detail}</Text> : null}
            {item.href ? <Button compact mode="text" onPress={() => router.push(item.href as never)}>Open record</Button> : null}
          </View>)}
          <Text variant="bodySmall" style={styles.privacyNote}>Activity shows BuildPair transactional records. It does not expose private message text here and does not track page views or keystrokes.</Text>
        </View> : null}
      </AppCard>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1, minWidth: 240, gap: 3 },
  title: { color: colors.charcoal, fontWeight: '900' },
  userId: { color: colors.muted, fontFamily: 'monospace' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  metaGrid: { gap: 4 },
  meta: { color: colors.muted, lineHeight: 20 },
  warning: { color: colors.warning, fontWeight: '700' },
  muted: { color: colors.muted },
  activityCounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  activityList: { gap: 8 },
  activityItem: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, borderRadius: 14, padding: 10, gap: 4 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  activityLabel: { color: colors.charcoal, fontWeight: '800' },
  privacyNote: { color: colors.muted, lineHeight: 19, marginTop: 4 },
});
