import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, ProgressBar, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { ApiError, apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type Metrics = {
  profileViews30d: number;
  profileViewsPrevious30d: number;
  savedByHomeowners: number;
  directLeads: number;
  quotesSent: number;
  quotesWon: number;
  averageQuote: number;
  wonJobValue: number;
  completedJobs: number;
  averageRating: number;
  reviewCount: number;
  averageQuoteResponseHours: number;
  activeSavedSearches: number;
  verifiedCredentials: number;
  quoteWinRate: number;
};

export default function TraderAnalyticsScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const getTokenRef = useRef(getToken);
  const [metrics, setMetrics] = useState<Metrics>();
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      setMetrics(await apiFetch<Metrics>('/api/analytics/trader', {}, () => getTokenRef.current()));
      setLocked(false);
      setError('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setLocked(true);
        setMetrics(undefined);
        setError('');
      } else setError(errorMessage(e));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <LoadingScreen label="Calculating business performance…" />;
  if (locked) return <Screen title="Business Analytics" subtitle="Advanced performance analytics are included with BuildPair Pro.">
    <AppCard style={styles.proGate}>
      <Chip icon="chart-box-outline">BuildPair Pro</Chip>
      <Text variant="headlineSmall" style={styles.title}>See what is actually turning into work</Text>
      <Text style={styles.muted}>Pro unlocks 30-day profile trends, homeowner shortlists, direct enquiries, quote win rate, average quote value, jobs won, response time, verified-review performance and other marketplace conversion metrics.</Text>
      <Button mode="contained" icon="arrow-up-circle-outline" onPress={() => router.push('/trader/subscription')}>View BuildPair Pro</Button>
    </AppCard>
  </Screen>;
  if (!metrics) return <Screen title="Business Analytics"><EmptyState title="Analytics unavailable" body={error || 'No metrics were returned.'} action={<Button onPress={() => void load()}>Try again</Button>} /></Screen>;

  const viewChange = metrics.profileViewsPrevious30d ? Math.round(((metrics.profileViews30d - metrics.profileViewsPrevious30d) / metrics.profileViewsPrevious30d) * 100) : null;
  return <Screen title="Business Analytics" subtitle="Real BuildPair marketplace activity, so you can see what is turning into enquiries and won work.">
    <Chip icon="shield-star-outline">BuildPair Pro analytics</Chip>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.grid}>
      <MetricCard value={metrics.profileViews30d.toLocaleString()} label="Profile views · 30 days" detail={viewChange == null ? 'Building your baseline' : `${viewChange >= 0 ? '+' : ''}${viewChange}% vs previous 30 days`} />
      <MetricCard value={metrics.savedByHomeowners.toLocaleString()} label="Homeowner shortlists" detail="People who saved your profile" />
      <MetricCard value={metrics.directLeads.toLocaleString()} label="Direct enquiries" detail="Jobs sent directly to you" />
      <MetricCard value={`${metrics.quoteWinRate}%`} label="Quote win rate" detail={`${metrics.quotesWon} won from ${metrics.quotesSent} quotes`} />
      <MetricCard value={formatMoney(Number(metrics.averageQuote || 0))} label="Average quote" detail="Across quotes sent" />
      <MetricCard value={formatMoney(Number(metrics.wonJobValue || 0))} label="Value of jobs won" detail="Accepted quote value" />
      <MetricCard value={metrics.completedJobs.toLocaleString()} label="Completed jobs" detail="BuildPair jobs finished" />
      <MetricCard value={metrics.averageRating ? metrics.averageRating.toFixed(1) : '—'} label="Verified rating" detail={`${metrics.reviewCount} verified reviews`} />
      <MetricCard value={metrics.averageQuoteResponseHours ? `${metrics.averageQuoteResponseHours.toFixed(1)}h` : '—'} label="Average quote response" detail="Job posted to your quote" />
      <MetricCard value={metrics.verifiedCredentials.toLocaleString()} label="Verified credentials" detail="Current verified trust evidence" />
    </View>
    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Conversion</Text>
      <Text style={styles.muted}>Quotes won</Text>
      <ProgressBar progress={Math.max(0, Math.min(1, metrics.quoteWinRate / 100))} color={colors.primary} style={styles.progress} />
      <Text style={styles.muted}>{metrics.activeSavedSearches} active saved job search{metrics.activeSavedSearches === 1 ? '' : 'es'} helping you spot suitable work.</Text>
    </AppCard>
  </Screen>;
}

function MetricCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return <AppCard style={styles.metric}><Text variant="headlineMedium" style={styles.number}>{value}</Text><Text variant="titleSmall" style={styles.title}>{label}</Text><Text variant="bodySmall" style={styles.muted}>{detail}</Text></AppCard>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: 210, minWidth: 190 },
  proGate: { backgroundColor: '#FFF8F3', maxWidth: 720 },
  number: { color: colors.primary, fontWeight: '900' },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  progress: { height: 9, borderRadius: 9, backgroundColor: colors.surfaceStrong },
  error: { color: colors.danger },
});
