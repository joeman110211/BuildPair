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
  analyticsLevel: 'basic' | 'standard' | 'advanced';
  profileViews30d: number;
  profileViewsPrevious30d?: number;
  savedByHomeowners?: number;
  directLeads: number;
  quotesSent: number;
  quotesWon: number;
  averageQuote?: number;
  wonJobValue?: number;
  completedJobs?: number;
  averageRating?: number;
  reviewCount?: number;
  averageQuoteResponseHours?: number;
  activeSavedSearches?: number;
  verifiedCredentials?: number;
  quoteWinRate?: number;
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
  if (locked) return <Screen title="Business Analytics" subtitle="Business analytics start with BuildPair Core.">
    <AppCard style={styles.proGate}>
      <Chip icon="chart-box-outline">Paid membership</Chip>
      <Text variant="headlineSmall" style={styles.title}>See whether BuildPair is turning into work</Text>
      <Text style={styles.muted}>Core includes basic profile, enquiry and quote numbers. Plus adds conversion and value metrics. Pro adds response performance, reputation and deeper business insight.</Text>
      <Button mode="contained" icon="arrow-up-circle-outline" onPress={() => router.push('/trader/subscription')}>Compare plans</Button>
    </AppCard>
  </Screen>;
  if (!metrics) return <Screen title="Business Analytics"><EmptyState title="Analytics unavailable" body={error || 'No metrics were returned.'} action={<Button onPress={() => void load()}>Try again</Button>} /></Screen>;

  const previousViews = metrics.profileViewsPrevious30d ?? 0;
  const viewChange = previousViews ? Math.round(((metrics.profileViews30d - previousViews) / previousViews) * 100) : null;
  const levelLabel = metrics.analyticsLevel === 'advanced' ? 'Pro advanced analytics' : metrics.analyticsLevel === 'standard' ? 'Plus business analytics' : 'Core basic analytics';
  return <Screen title="Business Analytics" subtitle="Real BuildPair marketplace activity, with more detail as your membership grows.">
    <Chip icon="chart-box-outline">{levelLabel}</Chip>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.grid}>
      <MetricCard value={metrics.profileViews30d.toLocaleString()} label="Profile views · 30 days" detail={viewChange == null ? 'Current 30-day activity' : `${viewChange >= 0 ? '+' : ''}${viewChange}% vs previous 30 days`} />
      <MetricCard value={metrics.directLeads.toLocaleString()} label="Direct enquiries" detail="Jobs sent directly to you" />
      <MetricCard value={metrics.quotesSent.toLocaleString()} label="Quotes sent" detail="BuildPair quotes submitted" />
      <MetricCard value={metrics.quotesWon.toLocaleString()} label="Jobs won" detail="Accepted BuildPair quotes" />
      {metrics.analyticsLevel !== 'basic' ? <>
        <MetricCard value={(metrics.savedByHomeowners ?? 0).toLocaleString()} label="Homeowner shortlists" detail="People who saved your profile" />
        <MetricCard value={`${metrics.quoteWinRate ?? 0}%`} label="Quote win rate" detail={`${metrics.quotesWon} won from ${metrics.quotesSent} quotes`} />
        <MetricCard value={formatMoney(Number(metrics.averageQuote || 0))} label="Average quote" detail="Across quotes sent" />
        <MetricCard value={formatMoney(Number(metrics.wonJobValue || 0))} label="Value of jobs won" detail="Accepted quote value" />
        <MetricCard value={(metrics.completedJobs ?? 0).toLocaleString()} label="Completed jobs" detail="BuildPair jobs finished" />
      </> : null}
      {metrics.analyticsLevel === 'advanced' ? <>
        <MetricCard value={metrics.averageRating ? metrics.averageRating.toFixed(1) : '—'} label="Verified rating" detail={`${metrics.reviewCount ?? 0} verified reviews`} />
        <MetricCard value={metrics.averageQuoteResponseHours ? `${metrics.averageQuoteResponseHours.toFixed(1)}h` : '—'} label="Average quote response" detail="Job posted to your quote" />
        <MetricCard value={(metrics.verifiedCredentials ?? 0).toLocaleString()} label="Verified credentials" detail="Current verified trust evidence" />
      </> : null}
    </View>
    {metrics.analyticsLevel !== 'basic' ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Conversion</Text>
      <Text style={styles.muted}>Quotes won</Text>
      <ProgressBar progress={Math.max(0, Math.min(1, (metrics.quoteWinRate ?? 0) / 100))} color={colors.primary} style={styles.progress} />
      <Text style={styles.muted}>{metrics.activeSavedSearches ?? 0} active saved job search{(metrics.activeSavedSearches ?? 0) === 1 ? '' : 'es'} helping you spot suitable work.</Text>
    </AppCard> : <AppCard>
      <Text variant="titleMedium" style={styles.title}>More detail on Plus</Text>
      <Text style={styles.muted}>Plus adds quote conversion, average quote value, won-job value, homeowner saves and saved-search performance. Pro adds response and reputation metrics.</Text>
      <Button mode="outlined" onPress={() => router.push('/trader/subscription')}>Compare analytics levels</Button>
    </AppCard>}
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
