import { ClerkLoaded, ClerkProvider, useAuth, useClerk, useSignIn } from '@clerk/expo';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { tokenCache } from './token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const API_URL = (process.env.EXPO_PUBLIC_ADMIN_API_URL || 'https://www.buildpair.co.uk').replace(/\/$/, '');

const C = {
  orange: '#D35400',
  charcoal: '#252A31',
  background: '#F3F4F5',
  surface: '#FFFFFF',
  soft: '#ECEFF1',
  border: '#D8DDE1',
  muted: '#66707A',
  danger: '#B3261E',
  green: '#2E7D32',
};

type Tier = 'free' | 'basic' | 'featured';
type Filter = 'all' | 'homeowners' | 'trades' | 'suspended';
type UserSummary = {
  id: string;
  email: string | null;
  name: string | null;
  customerEnabled: boolean;
  traderEnabled: boolean;
  isAdmin: boolean;
  isSuspended: boolean;
  suspensionReason: string;
  isDeleted: boolean;
  createdAt?: string | null;
  clerkCreatedAt: string | null;
  profileId: string | null;
  businessName: string | null;
  subscriptionTier: Tier | null;
  complimentaryTier: Tier | null;
  complimentaryGrantedAt: string | null;
  jobsCount: number;
  quotesCount: number;
  messagesCount: number;
  reviewsCount: number;
  invoicesCount: number;
  reportsCount: number;
  storiesCount: number;
  lastActivityAt: string | null;
};

type ActivityItem = {
  createdAt: string;
  kind: string;
  label: string;
  detail: string;
  href: string | null;
};

type UserDetail = { activity: ActivityItem[] };

type TokenGetter = () => Promise<string | null>;

function messageFor(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

function fmt(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function tierName(tier?: Tier | null) {
  if (tier === 'featured') return 'Pro';
  if (tier === 'basic') return 'Plus';
  return 'Starter';
}

async function api<T>(getToken: TokenGetter, path: string, init: RequestInit = {}) {
  const token = await getToken();
  if (!token) throw new Error('Your admin session has expired. Sign in again.');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : `BuildPair returned ${response.status}`);
  return body as T;
}

function Button({ label, onPress, danger = false, disabled = false, filled = false }: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean; filled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, filled && styles.buttonFilled, danger && styles.buttonDanger, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={[styles.buttonText, filled && styles.buttonFilledText, danger && styles.buttonDangerText]}>{label}</Text>
    </Pressable>
  );
}

function SignIn() {
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';

  async function finish() {
    await signIn.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) throw new Error('Your Clerk account needs another setup step before admin access can continue.');
      },
    });
  }

  async function submit() {
    try {
      setError('');
      const result = await signIn.password({ emailAddress: email.trim().toLowerCase(), password });
      if (result.error) throw result.error;
      if (signIn.status === 'complete') return void (await finish());
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        const factor = signIn.supportedSecondFactors?.find((item) => item.strategy === 'email_code');
        if (!factor) throw new Error('This account needs a second factor that the admin app cannot complete by email.');
        await signIn.mfa.sendEmailCode();
        setVerifying(true);
        return;
      }
      throw new Error(`Sign-in is incomplete (${signIn.status}).`);
    } catch (e) { setError(messageFor(e)); }
  }

  async function verify() {
    try {
      setError('');
      await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (signIn.status !== 'complete') throw new Error(`Verification is incomplete (${signIn.status}).`);
      await finish();
    } catch (e) { setError(messageFor(e)); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.loginWrap}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>BP</Text></View>
        <Text style={styles.loginTitle}>BuildPair Admin</Text>
        <Text style={styles.loginSub}>Private control app. Sign in with your BuildPair administrator account.</Text>
        {verifying ? (
          <>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Verification code" keyboardType="number-pad" placeholderTextColor={C.muted} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label={busy ? 'Checking…' : 'Verify'} filled disabled={busy || !code.trim()} onPress={() => void verify()} />
            <Button label="Start again" disabled={busy} onPress={() => { signIn.reset(); setVerifying(false); setCode(''); setError(''); }} />
          </>
        ) : (
          <>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Admin email" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.muted} />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry placeholderTextColor={C.muted} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label={busy ? 'Signing in…' : 'Sign in'} filled disabled={busy || !email.trim() || !password} onPress={() => void submit()} />
          </>
        )}
        <Text style={styles.securityNote}>Admin access is still checked by BuildPair on every API request. Installing this APK does not make an ordinary account an administrator.</Text>
      </View>
    </SafeAreaView>
  );
}

function AdminHome() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [details, setDetails] = useState<Record<string, UserDetail>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const token = useCallback(() => getToken(), [getToken]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const result = await api<UserSummary[]>(token, '/api/admin/users');
      setUsers(result);
      setError('');
    } catch (e) { setError(messageFor(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (q && ![user.name, user.email, user.businessName, user.id].some((value) => value?.toLowerCase().includes(q))) return false;
      if (filter === 'homeowners') return user.customerEnabled;
      if (filter === 'trades') return user.traderEnabled || Boolean(user.profileId);
      if (filter === 'suspended') return user.isSuspended;
      return !user.isDeleted;
    });
  }, [filter, search, users]);

  const counts = useMemo(() => ({
    total: users.filter((u) => !u.isDeleted).length,
    trades: users.filter((u) => !u.isDeleted && (u.traderEnabled || u.profileId)).length,
    suspended: users.filter((u) => !u.isDeleted && u.isSuspended).length,
    complimentary: users.filter((u) => !u.isDeleted && Boolean(u.complimentaryTier)).length,
  }), [users]);

  async function detail(userId: string, force = false) {
    if (details[userId] && !force) return;
    try {
      const result = await api<UserDetail>(token, `/api/admin/users?userId=${encodeURIComponent(userId)}`);
      setDetails((current) => ({ ...current, [userId]: result }));
    } catch (e) { setError(messageFor(e)); }
  }

  async function toggle(userId: string) {
    const next = !expanded[userId];
    setExpanded((current) => ({ ...current, [userId]: next }));
    if (next) await detail(userId);
  }

  async function action(user: UserSummary, actionName: string, tier?: 'basic' | 'featured') {
    setBusyId(user.id);
    try {
      await api(token, '/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ action: actionName, userId: user.id, ...(tier ? { tier } : {}), reason: notes[user.id]?.trim() || '' }),
      });
      await load();
      if (expanded[user.id]) await detail(user.id, true);
      setError('');
    } catch (e) { setError(messageFor(e)); }
    finally { setBusyId(null); }
  }

  function suspend(user: UserSummary) {
    Alert.alert('Suspend account?', `Block ${user.email || user.businessName || 'this account'} from BuildPair until you restore it?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => void action(user, 'suspend') },
    ]);
  }

  function remove(user: UserSummary) {
    Alert.alert('Permanently remove user?', 'This deletes the Clerk login identity and scrubs account/profile data using BuildPair’s deletion process. This is deliberately harder to undo than suspension.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeConfirmed(user) },
    ]);
  }

  async function removeConfirmed(user: UserSummary) {
    setBusyId(user.id);
    try {
      await api(token, '/api/admin/users', { method: 'DELETE', body: JSON.stringify({ userId: user.id, confirmation: 'REMOVE USER' }) });
      await load();
    } catch (e) { setError(messageFor(e)); }
    finally { setBusyId(null); }
  }

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator size="large" color={C.orange} /><Text style={styles.muted}>Loading BuildPair accounts…</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={C.orange} />}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>PRIVATE CONTROL APP</Text>
            <Text style={styles.heading}>BuildPair Admin</Text>
            <Text style={styles.muted}>Users, access and recorded marketplace activity.</Text>
          </View>
          <Button label="Sign out" onPress={() => void signOut()} />
        </View>

        <View style={styles.statsRow}>
          <Stat label="Users" value={counts.total} />
          <Stat label="Trades" value={counts.trades} />
          <Stat label="Suspended" value={counts.suspended} />
          <Stat label="Free upgrades" value={counts.complimentary} />
        </View>

        <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Search name, email, business or user ID" placeholderTextColor={C.muted} />
        <View style={styles.filters}>
          {(['all', 'homeowners', 'trades', 'suspended'] as Filter[]).map((value) => (
            <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value[0]?.toUpperCase()}{value.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View> : null}
        <Text style={styles.resultCount}>{visible.length} account{visible.length === 1 ? '' : 's'} shown</Text>

        {visible.map((user) => {
          const busy = busyId === user.id;
          const userDetail = details[user.id];
          return (
            <View key={user.id} style={styles.card}>
              <View style={styles.identityRow}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{user.businessName || user.name || user.email || 'BuildPair user'}</Text>
                  <Text style={styles.body}>{user.email || 'No synchronised email'}</Text>
                  <Text style={styles.small}>{user.id}</Text>
                </View>
                <View style={styles.badges}>
                  {user.isAdmin ? <Badge text="Admin" /> : null}
                  {user.customerEnabled ? <Badge text="Homeowner" /> : null}
                  {user.traderEnabled || user.profileId ? <Badge text="Trade" /> : null}
                  {user.isSuspended ? <Badge text="Suspended" danger /> : null}
                  {user.subscriptionTier ? <Badge text={`${user.complimentaryTier ? 'Free ' : ''}${tierName(user.subscriptionTier)}`} /> : null}
                </View>
              </View>

              <View style={styles.metaBox}>
                <Text style={styles.meta}>Joined: {fmt(user.clerkCreatedAt || user.createdAt)}</Text>
                <Text style={styles.meta}>Last activity: {fmt(user.lastActivityAt)}</Text>
                {user.suspensionReason ? <Text style={styles.warning}>Reason: {user.suspensionReason}</Text> : null}
              </View>

              <View style={styles.counts}>
                <Mini text={`${user.jobsCount} jobs`} /><Mini text={`${user.quotesCount} quotes`} /><Mini text={`${user.messagesCount} messages`} />
                <Mini text={`${user.reviewsCount} reviews`} /><Mini text={`${user.invoicesCount} invoices`} /><Mini text={`${user.reportsCount} reports`} />
              </View>

              <TextInput
                style={styles.noteInput}
                value={notes[user.id] || ''}
                onChangeText={(value) => setNotes((current) => ({ ...current, [user.id]: value }))}
                placeholder="Admin note / reason for next action"
                placeholderTextColor={C.muted}
              />

              <View style={styles.actions}>
                {user.profileId ? <Button label="Public profile" onPress={() => void Linking.openURL(`${API_URL}/traders/${user.profileId}`)} /> : null}
                {user.profileId ? <Button label="Give Plus free" disabled={busy} onPress={() => void action(user, 'grant_complimentary', 'basic')} /> : null}
                {user.profileId ? <Button label="Give Pro free" disabled={busy} onPress={() => void action(user, 'grant_complimentary', 'featured')} /> : null}
                {user.complimentaryTier ? <Button label="Remove free upgrade" disabled={busy} onPress={() => void action(user, 'revoke_complimentary')} /> : null}
                {!user.isAdmin && !user.isSuspended ? <Button label="Suspend" danger disabled={busy} onPress={() => suspend(user)} /> : null}
                {user.isSuspended ? <Button label="Restore" disabled={busy} onPress={() => void action(user, 'unsuspend')} /> : null}
                {!user.isAdmin ? <Button label="Remove user" danger disabled={busy} onPress={() => remove(user)} /> : null}
              </View>

              <Pressable onPress={() => void toggle(user.id)} style={styles.activityToggle}>
                <Text style={styles.activityToggleText}>{expanded[user.id] ? 'Hide recorded activity' : 'View recorded activity'}</Text>
              </Pressable>

              {expanded[user.id] ? (
                <View style={styles.activityList}>
                  {!userDetail ? <ActivityIndicator color={C.orange} /> : userDetail.activity.length === 0 ? <Text style={styles.muted}>No recorded marketplace activity.</Text> : userDetail.activity.map((item, index) => (
                    <View style={styles.activity} key={`${item.createdAt}-${item.kind}-${index}`}>
                      <Text style={styles.activityTitle}>{item.label}</Text>
                      <Text style={styles.small}>{fmt(item.createdAt)}</Text>
                      {item.detail ? <Text style={styles.meta}>{item.detail}</Text> : null}
                    </View>
                  ))}
                  <Text style={styles.privacy}>This view shows BuildPair transactional records, not private message text, page views or keystrokes.</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function Badge({ text, danger = false }: { text: string; danger?: boolean }) {
  return <View style={[styles.badge, danger && styles.badgeDanger]}><Text style={[styles.badgeText, danger && styles.badgeDangerText]}>{text}</Text></View>;
}
function Mini({ text }: { text: string }) { return <View style={styles.mini}><Text style={styles.miniText}>{text}</Text></View>; }

function Shell() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator size="large" color={C.orange} /></View></SafeAreaView>;
  return isSignedIn ? <AdminHome /> : <SignIn />;
}

export default function App() {
  if (!publishableKey) {
    return <SafeAreaView style={styles.safe}><View style={styles.loginWrap}><Text style={styles.loginTitle}>BuildPair Admin</Text><Text style={styles.error}>This APK is missing its Clerk publishable key and cannot authenticate securely.</Text></View></SafeAreaView>;
  }
  return <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}><ClerkLoaded><Shell /></ClerkLoaded></ClerkProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  page: { padding: 14, gap: 12, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loginWrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  brandMark: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontWeight: '900', fontSize: 21 },
  loginTitle: { color: C.charcoal, fontSize: 30, fontWeight: '900' },
  loginSub: { color: C.muted, lineHeight: 21, marginBottom: 8 },
  securityNote: { color: C.muted, lineHeight: 19, fontSize: 12, marginTop: 8 },
  input: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 52, color: C.charcoal },
  search: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 50, color: C.charcoal },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headerText: { flex: 1 },
  eyebrow: { color: C.orange, fontWeight: '900', letterSpacing: 1.1, fontSize: 11 },
  heading: { color: C.charcoal, fontSize: 28, fontWeight: '900', marginTop: 2 },
  muted: { color: C.muted },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 10, minWidth: '47%', flexGrow: 1 },
  statValue: { fontSize: 22, fontWeight: '900', color: C.charcoal },
  statLabel: { color: C.muted, fontSize: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filter: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { borderColor: C.orange, backgroundColor: '#FFF3ED' },
  filterText: { color: C.charcoal, fontWeight: '700' },
  filterTextActive: { color: C.orange },
  resultCount: { color: C.muted, fontSize: 12 },
  card: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, gap: 11 },
  identityRow: { gap: 8 },
  flex: { flex: 1 },
  cardTitle: { color: C.charcoal, fontSize: 18, fontWeight: '900' },
  body: { color: C.charcoal, marginTop: 2 },
  small: { color: C.muted, fontSize: 11, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: C.soft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: C.charcoal, fontWeight: '800', fontSize: 11 },
  badgeDanger: { backgroundColor: '#FDECEA' },
  badgeDangerText: { color: C.danger },
  metaBox: { backgroundColor: C.background, borderRadius: 12, padding: 9, gap: 3 },
  meta: { color: C.muted, lineHeight: 18 },
  warning: { color: C.danger, fontWeight: '700' },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  mini: { backgroundColor: C.soft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  miniText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  noteInput: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, minHeight: 44, color: C.charcoal },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  button: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  buttonFilled: { backgroundColor: C.orange, borderColor: C.orange },
  buttonDanger: { borderColor: '#E4A29C', backgroundColor: '#FFF8F7' },
  buttonText: { color: C.charcoal, fontWeight: '800', fontSize: 12 },
  buttonFilledText: { color: '#fff' },
  buttonDangerText: { color: C.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  activityToggle: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  activityToggleText: { color: C.orange, fontWeight: '900' },
  activityList: { gap: 7 },
  activity: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 9, backgroundColor: C.background },
  activityTitle: { color: C.charcoal, fontWeight: '800' },
  privacy: { color: C.muted, fontSize: 11, lineHeight: 16 },
  errorBox: { backgroundColor: '#FDECEA', borderRadius: 10, padding: 10 },
  error: { color: C.danger, fontWeight: '700' },
});
