import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { Job } from '@/types';

function jobDetailsHref(job: Job): Href {
  return `/(public)/jobs/${encodeURIComponent(job.id)}` as Href;
}

function joinJobHref(job: Job): Href {
  const location = job.locationLabel ?? job.postcode ?? '';
  return `/auth/sign-up?mode=trader&jobId=${encodeURIComponent(job.id)}&jobTitle=${encodeURIComponent(job.title)}&jobCategory=${encodeURIComponent(job.category)}&jobLocation=${encodeURIComponent(location)}` as Href;
}

export default function PublicJobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      setJobs(await apiFetch('/api/public/jobs'));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, []);

  return <Screen title="Latest job requests" subtitle="Browse open customer jobs being posted through BuildPair. Live requests appear here when they are available, with a clear status when the marketplace is quiet.">
    {loading ? <AppCard style={styles.loadingCard}>
      <Text variant="titleLarge" style={styles.loadingTitle}>Checking current job requests…</Text>
      <Text style={styles.muted}>BuildPair is checking for live customer jobs. If there are none, this page will say so instead of sitting on a loading screen.</Text>
    </AppCard> : null}
    {!loading && error ? <EmptyState title="Jobs unavailable" body={error} action={<Button onPress={load}>Try again</Button>} /> : null}
    {!loading && !error && !jobs.length ? <EmptyState title="No job requests yet" body="There are no live customer requests to show right now. New jobs will appear here automatically as homeowners post them." /> : null}
    {!loading && !error ? jobs.map((job) => <AppCard key={job.id}>
      <View style={styles.row}>
        <View style={styles.headingBlock}>
          <Link href={jobDetailsHref(job)} asChild>
            <Text variant="titleLarge" style={styles.linkTitle}>{job.title}</Text>
          </Link>
          <Text style={styles.muted}>{job.category} · {job.propertyType} · {job.locationLabel ?? job.postcode} · {job.budgetRange}</Text>
        </View>
        <Chip>{job.status.replace('_', ' ')}</Chip>
      </View>
      <Text numberOfLines={4} style={styles.description}>{job.description}</Text>
      <View style={styles.row}>
        <Chip icon="calendar-clock">{job.urgency}</Chip>
        <View style={styles.actions}>
          <Link href={jobDetailsHref(job)} asChild><Button mode="outlined">View job</Button></Link>
          <Link href={joinJobHref(job)} asChild><Button mode="contained">Join to quote</Button></Link>
        </View>
      </View>
    </AppCard>) : null}
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  headingBlock: { flex: 1, minWidth: 220, gap: 4 },
  linkTitle: { fontWeight: '900', color: colors.charcoal, textDecorationLine: 'underline' },
  muted: { color: colors.muted, lineHeight: 21 },
  description: { color: colors.text, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  loadingCard: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
});
