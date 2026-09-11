import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Searchbar, SegmentedButtons, Text } from 'react-native-paper';
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

type Filter = 'all' | 'trader' | 'homeowner' | 'tester';

export default function AdminWaitlist() {
  const { getToken } = useAuth();
  const [data, setData] = useState<Data>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setData(await apiFetch<Data>('/api/admin/waitlist', {}, getToken)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
  }, [getToken]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.entries ?? []).filter((entry) => {
      if (filter === 'trader' && entry.audience !== 'trader') return false;
      if (filter === 'homeowner' && entry.audience !== 'homeowner') return false;
      if (filter === 'tester' && !entry.testerInterest) return false;
      if (!needle) return true;
      return [entry.name, entry.email, entry.phone, entry.postcode, entry.trade ?? '', entry.source].some((value) => value.toLowerCase().includes(needle));
    });
  }, [data?.entries, filter, query]);

  if (!data && !error) return <LoadingScreen label="Loading launch list…" />;

  return <Screen title="Launch waitlist" subtitle="Pre-launch interest, Founding Trades candidates and real-world tester volunteers.">
    <View style={styles.stats}>
      <Stat label="Total" value={data?.summary.total ?? 0} />
      <Stat label="Trades" value={data?.summary.traders ?? 0} />
      <Stat label="Homeowners" value={data?.summary.homeowners ?? 0} />
      <Stat label="Tester interest" value={data?.summary.testers ?? 0} />
    </View>

    <AppCard style={styles.offerCard}>
      <Text variant="titleMedium" style={styles.heading}>Founding Trades offer</Text>
      <Text style={styles.body}>The reward is not based simply on being one of the first 50 names here. It goes to the first 50 eligible waiting-list tradespeople who complete BuildPair registration within 24 hours of the 1 October launch. This page keeps the original join time and trade-list position as evidence.</Text>
    </AppCard>

    <Searchbar placeholder="Search name, email, mobile, postcode or trade" value={query} onChangeText={setQuery} />
    <SegmentedButtons value={filter} onValueChange={(value) => setFilter(value as Filter)} buttons={[{ value: 'all', label: 'All' }, { value: 'trader', label: 'Trades' }, { value: 'homeowner', label: 'Homeowners' }, { value: 'tester', label: 'Testers' }]} />
    <Text style={styles.muted}>Showing {rows.length} of {data?.summary.total ?? 0} · updates automatically every 30 seconds.</Text>

    {rows.map((entry) => <AppCard key={entry.id}>
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
          {entry.proRewardGrantedAt ? <Chip icon="gift-outline">Pro rewarded</Chip> : entry.registeredAt ? <Chip icon="account-check-outline">Registered</Chip> : null}
        </View>
      </View>
      <View style={styles.meta}><Text style={styles.muted}>Joined {new Date(entry.createdAt).toLocaleString('en-GB')}</Text><Text style={styles.muted}>Source: {entry.source}</Text><Text style={styles.muted}>SMS: {entry.smsOptIn ? 'yes' : 'no'} · Marketing: {entry.marketingOptIn ? 'yes' : 'no'}</Text></View>
    </AppCard>)}

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
  offerCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  heading: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted, lineHeight: 19 },
  strong: { color: colors.text, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 230, gap: 3 },
  badges: { gap: 6, alignItems: 'flex-end' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
});
