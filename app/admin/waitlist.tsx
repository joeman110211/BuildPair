import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Searchbar, SegmentedButtons, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type ContactPreference = 'email' | 'sms' | 'both';
type Entry = {
  id: string; name: string; email: string | null; phone: string | null; postcode: string; audience: 'homeowner' | 'trader'; trade: string | null;
  preferredContact: ContactPreference; testerInterest: boolean; smsOptIn: boolean; marketingOptIn: boolean; source: string; status: string; createdAt: string; traderPosition: number | null;
  registeredAt: string | null; proRewardGrantedAt: string | null;
};
type Data = { summary: { total: number; traders: number; homeowners: number; testers: number; registered: number; rewarded: number; textContacts: number }; entries: Entry[] };

type EarlyInvite = {
  id: string;
  waitlistId: string | null;
  email: string | null;
  phone: string | null;
  audience: 'homeowner' | 'trader';
  deliveryChannel: ContactPreference;
  grantedAt: string;
  emailSentAt: string | null;
  smsSentAt: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  waitlistName: string | null;
  trade: string | null;
  accountCreated: boolean;
};
type EarlyData = { invites: EarlyInvite[]; emailSent?: boolean; smsSent?: boolean; smsEnabled?: boolean };
type Filter = 'all' | 'trader' | 'homeowner' | 'tester' | 'early';

function contactLabel(preference: ContactPreference) {
  if (preference === 'sms') return 'Text';
  if (preference === 'both') return 'Email + text';
  return 'Email';
}

export default function AdminWaitlist() {
  const { getToken } = useAuth();
  const [data, setData] = useState<Data>();
  const [earlyData, setEarlyData] = useState<EarlyData>({ invites: [], smsEnabled: false });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');

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

  const inviteByWaitlist = useMemo(() => new Map(earlyData.invites.filter((invite) => invite.waitlistId).map((invite) => [invite.waitlistId as string, invite])), [earlyData.invites]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.entries ?? []).filter((entry) => {
      if (filter === 'trader' && entry.audience !== 'trader') return false;
      if (filter === 'homeowner' && entry.audience !== 'homeowner') return false;
      if (filter === 'tester' && !entry.testerInterest) return false;
      if (filter === 'early' && !inviteByWaitlist.has(entry.id)) return false;
      if (!needle) return true;
      return [entry.name, entry.email ?? '', entry.phone ?? '', entry.postcode, entry.trade ?? '', entry.source].some((value) => value.toLowerCase().includes(needle));
    });
  }, [data?.entries, filter, inviteByWaitlist, query]);

  if (!data && !error) return <LoadingScreen label="Loading historical contacts…" />;

  return <Screen title="Historical contacts" subtitle="Read-only archive of enquiries and invitations collected before the marketplace opened. Live registrations are managed under Users.">
    <View style={styles.stats}>
      <Stat label="Archived enquiries" value={data?.summary.total ?? 0} />
      <Stat label="Trade enquiries" value={data?.summary.traders ?? 0} />
      <Stat label="Homeowner enquiries" value={data?.summary.homeowners ?? 0} />
      <Stat label="SMS contacts" value={data?.summary.textContacts ?? 0} />
      <Stat label="Previous invites" value={earlyData.invites.length} />
      <Stat label="Tester enquiries" value={data?.summary.testers ?? 0} />
    </View>

    <AppCard style={styles.earlyCard}>
      <Text variant="titleLarge" style={styles.heading}>Pre-launch history</Text>
      <Text style={styles.body}>BuildPair is open for homeowner and tradesperson registration, job posting and quoting. These contacts and invitation records are kept for reference; there is no longer an early-access gate.</Text>
      <Text style={styles.muted}>{earlyData.invites.length} historical invitation records retained. Contact preferences and marketing consent are shown below.</Text>
    </AppCard>

    <Searchbar placeholder="Search name, email, mobile, postcode or trade" value={query} onChangeText={setQuery} />
    <SegmentedButtons value={filter} onValueChange={(value) => setFilter(value as Filter)} buttons={[{ value: 'all', label: 'All' }, { value: 'trader', label: 'Trades' }, { value: 'homeowner', label: 'Homeowners' }, { value: 'tester', label: 'Testers' }, { value: 'early', label: 'Invited' }]} />
    <Text style={styles.muted}>Showing {rows.length} of {data?.summary.total ?? 0} · updates automatically every 30 seconds.</Text>

    {rows.map((entry) => {
      const invite = inviteByWaitlist.get(entry.id);
      const accessUsed = Boolean(invite?.usedAt || invite?.accountCreated || entry.registeredAt);
      return <AppCard key={entry.id}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="titleMedium" style={styles.heading}>{entry.name || entry.email || entry.phone || 'Historical contact'}</Text>
            <Text>{entry.email || 'No email supplied'}</Text>
            <Text>{entry.phone || 'No mobile supplied'}{entry.postcode ? ` · ${entry.postcode}` : ''}</Text>
            {entry.trade ? <Text style={styles.strong}>{entry.trade}</Text> : null}
          </View>
          <View style={styles.badges}>
            <Chip icon={entry.preferredContact === 'sms' ? 'message-text-outline' : entry.preferredContact === 'both' ? 'email-multiple-outline' : 'email-outline'}>{contactLabel(entry.preferredContact)}</Chip>
            <Chip>{entry.audience === 'trader' ? `Trade${entry.traderPosition ? ` #${entry.traderPosition}` : ''}` : 'Homeowner'}</Chip>
            {entry.testerInterest ? <Chip icon="flask-outline">Tester</Chip> : null}
            {invite ? <Chip icon="history">Invited previously</Chip> : null}
            {entry.proRewardGrantedAt ? <Chip icon="gift-outline">Pro rewarded</Chip> : entry.registeredAt || accessUsed ? <Chip icon="account-check-outline">Registered</Chip> : null}
          </View>
        </View>

        <View style={styles.meta}>
          <Text style={styles.muted}>Recorded {new Date(entry.createdAt).toLocaleString('en-GB')}</Text>
          <Text style={styles.muted}>Source: {entry.source}</Text>
          <Text style={styles.muted}>Service SMS: {entry.smsOptIn ? 'yes' : 'no'} · Marketing: {entry.marketingOptIn ? 'yes' : 'no'}</Text>
          {invite?.grantedAt ? <Text style={styles.muted}>Invited {new Date(invite.grantedAt).toLocaleString('en-GB')}</Text> : null}
          {invite?.emailSentAt ? <Text style={styles.muted}>Invite emailed {new Date(invite.emailSentAt).toLocaleString('en-GB')}</Text> : null}
          {invite?.smsSentAt ? <Text style={styles.muted}>Invite texted {new Date(invite.smsSentAt).toLocaleString('en-GB')}</Text> : null}
        </View>
      </AppCard>;
    })}

    {!rows.length ? <AppCard><Text style={styles.muted}>No historical contacts match this filter.</Text></AppCard> : null}
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
  heading: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted, lineHeight: 19 },
  strong: { color: colors.text, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 0, flexBasis: 230, flexShrink: 1, maxWidth: '100%', gap: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'flex-end' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
});
