import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Searchbar, SegmentedButtons, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Entry = {
  id: string; name: string; email: string; phone: string; postcode: string; audience: 'homeowner' | 'trader'; trade: string | null;
  testerInterest: boolean; smsOptIn: boolean; marketingOptIn: boolean; source: string; status: string; createdAt: string; traderPosition: number | null;
  registeredAt: string | null; proRewardGrantedAt: string | null;
};
type Data = { summary: { total: number; traders: number; homeowners: number; testers: number; registered: number; rewarded: number }; entries: Entry[] };

type EarlyInvite = {
  id: string;
  waitlistId: string | null;
  email: string;
  audience: 'homeowner' | 'trader';
  grantedAt: string;
  emailSentAt: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  waitlistName: string | null;
  trade: string | null;
  accountCreated: boolean;
};
type EarlyData = { invites: EarlyInvite[]; emailSent?: boolean };
type Filter = 'all' | 'trader' | 'homeowner' | 'tester' | 'early';

export default function AdminWaitlist() {
  const { getToken } = useAuth();
  const [data, setData] = useState<Data>();
  const [earlyData, setEarlyData] = useState<EarlyData>({ invites: [] });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const [waitlist, early] = await Promise.all([
        apiFetch<Data>('/api/admin/waitlist', {}, getToken),
        apiFetch<EarlyData>('/api/admin/early-access', {}, getToken),
      ]);
      setData(waitlist);
      setEarlyData(early);
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken]);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 30_000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [load]);

  const activeInvites = useMemo(() => earlyData.invites.filter((invite) => !invite.revokedAt), [earlyData.invites]);
  const inviteByWaitlist = useMemo(() => new Map(activeInvites.filter((invite) => invite.waitlistId).map((invite) => [invite.waitlistId as string, invite])), [activeInvites]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.entries ?? []).filter((entry) => {
      if (filter === 'trader' && entry.audience !== 'trader') return false;
      if (filter === 'homeowner' && entry.audience !== 'homeowner') return false;
      if (filter === 'tester' && !entry.testerInterest) return false;
      if (filter === 'early' && !inviteByWaitlist.has(entry.id)) return false;
      if (!needle) return true;
      return [entry.name, entry.email, entry.phone, entry.postcode, entry.trade ?? '', entry.source].some((value) => value.toLowerCase().includes(needle));
    });
  }, [data?.entries, filter, inviteByWaitlist, query]);

  async function runEarlyAction(action: 'grant' | 'resend' | 'revoke', options: { waitlistId?: string; inviteId?: string }) {
    const key = options.inviteId || options.waitlistId || action;
    try {
      setBusyId(key);
      setError('');
      setNotice('');
      const result = await apiFetch<EarlyData>('/api/admin/early-access', {
        method: 'POST',
        body: JSON.stringify({ action, ...options }),
      }, getToken);
      setEarlyData(result);
      if (action === 'revoke') setNotice('Early access revoked. The previous invite link will no longer work.');
      else if (result.emailSent) setNotice(`Early access ${action === 'resend' ? 'email resent' : 'granted'} from info@buildpair.co.uk.`);
      else setNotice('Access was granted, but the invitation email could not be sent. You can use Resend invite to try again.');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId('');
    }
  }

  if (!data && !error) return <LoadingScreen label="Loading launch list…" />;

  return <Screen title="Launch waitlist" subtitle="Pre-launch interest, early-access controls, Founding Trades candidates and real-world tester volunteers.">
    <View style={styles.stats}>
      <Stat label="Total" value={data?.summary.total ?? 0} />
      <Stat label="Trades" value={data?.summary.traders ?? 0} />
      <Stat label="Homeowners" value={data?.summary.homeowners ?? 0} />
      <Stat label="Early access" value={activeInvites.length} />
      <Stat label="Tester interest" value={data?.summary.testers ?? 0} />
    </View>

    <AppCard style={styles.earlyCard}>
      <Text variant="titleLarge" style={styles.heading}>Early access</Text>
      <Text style={styles.body}>Grant a waiting-list person access immediately without opening registration to everyone. BuildPair creates a secure email-specific invite link and emails it from info@buildpair.co.uk. Replies come back to the same BuildPair inbox.</Text>
      <Text style={styles.muted}>Active early-access people: {activeInvites.length}. Used invites remain visible here for the audit trail.</Text>
      {activeInvites.length ? <View style={styles.earlyList}>
        {activeInvites.map((invite) => <View key={invite.id} style={styles.earlyRow}>
          <View style={styles.flex}>
            <Text style={styles.strong}>{invite.waitlistName || invite.email}</Text>
            <Text style={styles.muted}>{invite.email} · {invite.audience === 'trader' ? 'Tradesperson' : 'Homeowner'}</Text>
          </View>
          <View style={styles.badges}>
            <Chip icon={invite.usedAt || invite.accountCreated ? 'account-check-outline' : 'key-outline'}>{invite.usedAt || invite.accountCreated ? 'Account created' : 'Access allowed'}</Chip>
            <Chip icon={invite.emailSentAt ? 'email-check-outline' : 'email-alert-outline'}>{invite.emailSentAt ? 'Email sent' : 'Email pending'}</Chip>
          </View>
        </View>)}
      </View> : <Text style={styles.muted}>No early-access invites have been granted yet.</Text>}
    </AppCard>

    <AppCard style={styles.offerCard}>
      <Text variant="titleMedium" style={styles.heading}>Founding Trades offer</Text>
      <Text style={styles.body}>The reward is not based simply on being one of the first 50 names here. It goes to the first 50 eligible waiting-list tradespeople who complete BuildPair registration within 24 hours of the 1 October launch. Early-access testing does not remove their original waitlist position.</Text>
    </AppCard>

    <Searchbar placeholder="Search name, email, mobile, postcode or trade" value={query} onChangeText={setQuery} />
    <SegmentedButtons value={filter} onValueChange={(value) => setFilter(value as Filter)} buttons={[{ value: 'all', label: 'All' }, { value: 'trader', label: 'Trades' }, { value: 'homeowner', label: 'Homeowners' }, { value: 'tester', label: 'Testers' }, { value: 'early', label: 'Early access' }]} />
    <Text style={styles.muted}>Showing {rows.length} of {data?.summary.total ?? 0} · updates automatically every 30 seconds.</Text>
    {notice ? <AppCard style={styles.noticeCard}><Text style={styles.noticeText}>{notice}</Text></AppCard> : null}

    {rows.map((entry) => {
      const invite = inviteByWaitlist.get(entry.id);
      const accessUsed = Boolean(invite?.usedAt || invite?.accountCreated || entry.registeredAt);
      return <AppCard key={entry.id}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="titleMedium" style={styles.heading}>{entry.name}</Text>
            <Text>{entry.email}</Text>
            <Text>{entry.phone} · {entry.postcode}</Text>
            {entry.trade ? <Text style={styles.strong}>{entry.trade}</Text> : null}
          </View>
          <View style={styles.badges}>
            <Chip>{entry.audience === 'trader' ? `Trade${entry.traderPosition ? ` #${entry.traderPosition}` : ''}` : 'Homeowner'}</Chip>
            {entry.testerInterest ? <Chip icon="flask-outline">Tester</Chip> : null}
            {invite ? <Chip icon="key-outline">Early access</Chip> : null}
            {entry.proRewardGrantedAt ? <Chip icon="gift-outline">Pro rewarded</Chip> : entry.registeredAt || accessUsed ? <Chip icon="account-check-outline">Registered</Chip> : null}
          </View>
        </View>

        <View style={styles.actions}>
          {!invite && !entry.registeredAt ? <Button mode="contained" icon="key-plus" loading={busyId === entry.id} disabled={Boolean(busyId)} onPress={() => void runEarlyAction('grant', { waitlistId: entry.id })}>Grant early access & email</Button> : null}
          {invite && !accessUsed ? <Button mode="outlined" icon="email-sync-outline" loading={busyId === invite.id} disabled={Boolean(busyId)} onPress={() => void runEarlyAction('resend', { inviteId: invite.id })}>Resend invite</Button> : null}
          {invite && !accessUsed ? <Button mode="text" textColor={colors.danger} disabled={Boolean(busyId)} onPress={() => void runEarlyAction('revoke', { inviteId: invite.id })}>Revoke access</Button> : null}
        </View>

        <View style={styles.meta}>
          <Text style={styles.muted}>Joined {new Date(entry.createdAt).toLocaleString('en-GB')}</Text>
          <Text style={styles.muted}>Source: {entry.source}</Text>
          <Text style={styles.muted}>SMS: {entry.smsOptIn ? 'yes' : 'no'} · Marketing: {entry.marketingOptIn ? 'yes' : 'no'}</Text>
          {invite?.grantedAt ? <Text style={styles.muted}>Early access granted {new Date(invite.grantedAt).toLocaleString('en-GB')}</Text> : null}
          {invite?.emailSentAt ? <Text style={styles.muted}>Invite emailed {new Date(invite.emailSentAt).toLocaleString('en-GB')}</Text> : null}
        </View>
      </AppCard>;
    })}

    {!rows.length ? <AppCard><Text style={styles.muted}>No waiting-list entries match this filter yet.</Text></AppCard> : null}
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </Screen>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.number}>{value}</Text><Text style={styles.muted}>{label}</Text></AppCard>;
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { minWidth: 135, flexGrow: 1 },
  number: { color: colors.primary, fontWeight: '900' },
  earlyCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  earlyList: { gap: spacing.sm, marginTop: spacing.xs },
  earlyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  offerCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  noticeCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  noticeText: { color: colors.charcoal, fontWeight: '800' },
  heading: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted, lineHeight: 19 },
  strong: { color: colors.text, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 230, gap: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'flex-end' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
});
