import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, SegmentedButtons, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Job, Quote } from '@/types';

type Tab = 'quoted' | 'active' | 'completed';

export default function TraderMyJobs() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [tab, setTab] = useState<Tab>('quoted');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const tokenGetter = () => getTokenRef.current();
      const [jobRows, quoteRows] = await Promise.all([apiFetch<Job[]>('/api/jobs', {}, tokenGetter), apiFetch<Quote[]>('/api/quotes', {}, tokenGetter)]);
      setJobs(jobRows); setQuotes(quoteRows);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function complete(jobId: string) {
    try { await apiFetch(`/api/jobs/${jobId}`, { method: 'PATCH', body: JSON.stringify({ action: 'complete' }) }, () => getTokenRef.current()); await load(); setTab('completed'); }
    catch (e) { setError(errorMessage(e)); }
  }

  if (loading) return <LoadingScreen />;
  const quotedJobIds = new Set(quotes.filter((quote) => ['pending', 'accepted'].includes(quote.status)).map((quote) => quote.jobId));
  const visible = jobs.filter((job) => tab === 'quoted'
    ? quotedJobIds.has(job.id) && ['open', 'quoted'].includes(job.status)
    : tab === 'active' ? job.status === 'in_progress' : job.status === 'completed');

  return <Screen title="My Jobs" subtitle="Your quoted, active and completed work in one clean pipeline.">
    <SegmentedButtons value={tab} onValueChange={(value) => setTab(value as Tab)} buttons={[{ value: 'quoted', label: 'Quoted' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
    {error ? <EmptyState title="Couldn’t load your jobs" body={error} action={<Button onPress={load}>Try again</Button>} /> : null}
    {!error && !visible.length ? <EmptyState title={`No ${tab} jobs`} body={tab === 'quoted' ? 'Quotes you send will be organised here while you wait for customers to respond.' : tab === 'active' ? 'Accepted work will appear here while the job is in progress.' : 'Completed BuildPair jobs will build up here over time.'} /> : visible.map((job) => {
      const ownQuote = quotes.find((quote) => quote.jobId === job.id && ['pending', 'accepted'].includes(quote.status));
      return <AppCard key={job.id}>
        <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>{job.title}</Text><Text style={styles.muted}>📍 {job.postcode || job.locationLabel || 'Location available'} · {job.category}</Text></View><View style={styles.badges}>{job.isEmergency ? <Chip compact icon="alert">Emergency</Chip> : null}<Chip>{job.status.replace('_', ' ')}</Chip></View></View>
        {ownQuote ? <View style={styles.priceLine}><Text style={styles.muted}>Your quote</Text><Text variant="titleLarge" style={styles.price}>{formatMoney(ownQuote.totalAmount)}</Text></View> : null}
        <Text numberOfLines={3} style={styles.description}>{job.description}</Text>
        <View style={styles.actions}>
          {tab === 'quoted' && ownQuote ? <Button mode="outlined" onPress={() => router.push({ pathname: '/trader/quotes/new', params: { jobId: job.id, title: job.title } })}>View / Update Quote</Button> : null}
          {tab !== 'quoted' ? <Button mode="outlined" icon="timeline-clock-outline" onPress={() => router.push(`/trader/jobs/${job.id}` as Href)}>Timeline & Variations</Button> : null}
          {tab === 'active' && job.paymentMode !== 'external' ? <Button mode="outlined" icon="bank-transfer-out" onPress={() => router.push(`/trader/jobs/${job.id}/payment-arrangement` as Href)}>Payment arrangement</Button> : null}
          {tab === 'active' ? <Button mode="contained" icon="check-circle-outline" onPress={() => void complete(job.id)}>Mark Work Complete</Button> : null}
          <Button mode="text" onPress={() => router.push('/trader/messages')}>Messages</Button>
        </View>
      </AppCard>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 4 }, badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  title: { fontWeight: '900', color: colors.charcoal }, muted: { color: colors.muted, lineHeight: 21 },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }, price: { color: colors.primary, fontWeight: '900' },
  description: { color: colors.text, lineHeight: 22 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
