import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Job = {
  id: string; title: string; category: string; propertyType: string; postcode: string | null; locationLabel: string | null;
  urgency: string; description: string; aiGeneratedSpec: string | null; budgetRange: string; photos: string[]; isEmergency: boolean;
  status: string; createdAt: string; updatedAt: string; customerId: string; customerEmail: string | null; targetTraderEmail: string | null;
  quotesCount: number; conversationsCount: number; reportsCount: number;
};

const statuses = ['all', 'open', 'quoted', 'in_progress', 'completed', 'cancelled'] as const;

function fmt(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminJobsScreen() {
  const { getToken } = useAuth();
  const [rows, setRows] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof statuses)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ q: search.trim(), status, limit: '300' });
      setRows(await apiFetch<Job[]>(`/api/admin/jobs?${params.toString()}`, {}, getToken));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken, search, status]);

  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  const photoCount = useMemo(() => rows.reduce((sum, row) => sum + (row.photos?.length ?? 0), 0), [rows]);
  if (loading) return <LoadingScreen label="Loading jobs…" />;

  return <Screen title="Jobs" subtitle="Inspect every posted job, its photos, owner, status, quotes, conversations and report count.">
    <AppCard>
      <TextInput mode="outlined" label="Search title, description, category or homeowner" value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
      <View style={styles.filters}>{statuses.map((value) => <Chip key={value} selected={status === value} onPress={() => setStatus(value)}>{value.replaceAll('_', ' ')}</Chip>)}</View>
      <Text style={styles.muted}>{rows.length} jobs · {photoCount} attached photos</Text>
      <Button icon="refresh" onPress={() => void load()}>Refresh</Button>
    </AppCard>

    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {rows.map((job) => <AppCard key={job.id}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>{job.title}</Text>
          <Text>{job.category} · {job.propertyType} · {job.budgetRange}</Text>
          <Text style={styles.muted}>Posted {fmt(job.createdAt)} by {job.customerEmail ?? job.customerId}</Text>
          <Text style={styles.muted}>{job.locationLabel ?? job.postcode ?? 'Location not recorded'} · urgency {job.urgency}</Text>
        </View>
        <View style={styles.chips}><Chip>{job.status.replaceAll('_', ' ')}</Chip>{job.isEmergency ? <Chip icon="alert">Emergency</Chip> : null}{job.reportsCount ? <Chip icon="flag">{job.reportsCount} reports</Chip> : null}</View>
      </View>
      <Text>{job.description}</Text>
      {job.aiGeneratedSpec ? <View style={styles.ai}><Text variant="labelLarge">AI job specification</Text><Text>{job.aiGeneratedSpec}</Text></View> : null}
      {job.photos?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>{job.photos.map((url) => <Image key={url} source={{ uri: url }} style={styles.photo} />)}</ScrollView> : <Text style={styles.muted}>No photos attached.</Text>}
      <View style={styles.chips}><Chip>{job.photos?.length ?? 0} photos</Chip><Chip>{job.quotesCount} quotes</Chip><Chip>{job.conversationsCount} conversations</Chip>{job.targetTraderEmail ? <Chip>Target: {job.targetTraderEmail}</Chip> : null}</View>
      <Text selectable style={styles.id}>{job.id}</Text>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  flex: { flex: 1, minWidth: 240, gap: 3 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photos: { gap: 8, paddingVertical: 4 },
  photo: { width: 180, height: 125, borderRadius: 12, backgroundColor: colors.border },
  ai: { gap: 5, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  id: { color: colors.muted, fontFamily: 'monospace', fontSize: 11 },
});
