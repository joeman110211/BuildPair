import type { Href } from 'expo-router';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { Job } from '@/types';

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function joinJobHref(job: Job): Href {
  const location = job.locationLabel ?? job.postcode ?? '';
  return `/auth/sign-up?mode=trader&jobId=${encodeURIComponent(job.id)}&jobTitle=${encodeURIComponent(job.title)}&jobCategory=${encodeURIComponent(job.category)}&jobLocation=${encodeURIComponent(location)}` as Href;
}

export default function PublicJobDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = scalar(params.id);
  const [job, setJob] = useState<Job | null>();
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const jobs = await apiFetch<Job[]>('/api/public/jobs');
      setJob(jobs.find((candidate) => candidate.id === id) ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
    // The route id is the only input that changes which public job is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <Screen><EmptyState title="Job unavailable" body={error} action={<Button onPress={load}>Try again</Button>} /></Screen>;
  if (job === undefined) return <LoadingScreen label="Loading job request..." />;
  if (job === null) return <Screen><EmptyState title="Job not found" body="This job is no longer available in the public jobs list." action={<Link href="/(public)/jobs" asChild><Button>Back to jobs</Button></Link>} /></Screen>;

  return <Screen title={job.title} subtitle="Public job request · Full address and private customer details stay hidden until appropriate.">
    <AppCard>
      <View style={styles.meta}>
        <Text style={styles.metaPrimary}>{job.category} · {job.propertyType} · {job.locationLabel ?? job.postcode}</Text>
        <Text style={styles.metaSecondary}>{job.budgetRange} · {job.urgency} · {job.isPreview ? 'Preview job' : job.status.replace('_', ' ')}</Text>
      </View>

      <View style={styles.section}>
        <Text variant="titleLarge" style={styles.title}>What needs doing</Text>
        <Text style={styles.description}>{job.description}</Text>
      </View>

      {job.photos?.length ? <Text style={styles.muted}>{job.photos.length} job photo{job.photos.length === 1 ? '' : 's'} attached. Photos are available to signed-in tradespeople where appropriate.</Text> : null}

      <View style={styles.actions}>
        <Link href="/(public)/jobs" asChild><Button mode="outlined">Back to jobs</Button></Link>
        {job.isPreview
          ? <Button mode="outlined" icon="flask-outline" disabled>Example job only</Button>
          : <Link href={joinJobHref(job)} asChild><Button mode="contained" icon="account-plus-outline">Join to quote</Button></Link>}
      </View>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  meta: { gap: 4, paddingBottom: 4 },
  metaPrimary: { color: colors.charcoal, fontWeight: '800', lineHeight: 21 },
  metaSecondary: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  section: { gap: 8 },
  title: { color: colors.charcoal, fontWeight: '900' },
  description: { color: colors.text, lineHeight: 24, fontSize: 16 },
  muted: { color: colors.muted, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
});
