import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, SegmentedButtons, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { Job } from '@/types';

type Tab = 'active' | 'pending' | 'completed';

export default function CustomerJobs() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tab, setTab] = useState<Tab>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try { setLoading(true); setError(''); setJobs(await apiFetch<Job[]>('/api/jobs', {}, () => getTokenRef.current())); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (loading) return <LoadingScreen />;

  const visible = jobs.filter((job) => tab === 'active' ? job.status === 'in_progress' : tab === 'pending' ? ['open', 'quoted'].includes(job.status) : job.status === 'completed');
  return <Screen title="My Jobs" subtitle="Everything you’ve posted, hired and completed on BuildPair.">
    <View style={styles.topRow}><SegmentedButtons style={styles.tabs} value={tab} onValueChange={(value) => setTab(value as Tab)} buttons={[{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Getting Quotes' }, { value: 'completed', label: 'Completed' }]} /><Link href="/customer/new-job" asChild><Button mode="contained" icon="plus">Post Job</Button></Link></View>
    {error ? <EmptyState title="Couldn’t load your jobs" body={error} action={<Button onPress={load}>Try again</Button>} /> : null}
    {!error && !visible.length ? <EmptyState title={`No ${tab === 'pending' ? 'jobs getting quotes' : tab} jobs`} body={tab === 'pending' ? 'Post a job and incoming quotes will be kept together here.' : 'Jobs will move here automatically as their status changes.'} /> : visible.map((job) => <AppCard key={job.id}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>{job.title}</Text><Text style={styles.muted}>📍 {job.postcode || job.locationLabel || 'Location available'} · {job.category}</Text></View><Chip>{job.status.replace('_', ' ')}</Chip></View>
      <Text style={styles.muted}>{job.budgetRange} · {job.urgency}</Text><Text numberOfLines={3} style={styles.description}>{job.description}</Text>
      <View style={styles.row}><Button onPress={() => router.push(`/customer/jobs/${job.id}` as Href)}>View Job</Button>{['open','quoted'].includes(job.status) ? <Button mode="outlined" onPress={() => router.push(`/customer/compare/${job.id}` as Href)}>Compare Quotes</Button> : null}</View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  tabs: { flex: 1, minWidth: 0, flexBasis: 280, flexShrink: 1, maxWidth: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 4 },
  title: { fontWeight: '900', color: colors.charcoal },
  muted: { color: colors.muted, lineHeight: 21 },
  description: { color: colors.text, lineHeight: 22 },
});
