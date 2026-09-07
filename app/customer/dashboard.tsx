import { useAuth, useUser } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { Job } from '@/types';

type TraderListItem = { id: string; businessName: string; tradeCategory: string; locationLabel?: string | null; averageRating: number; reviewCount: number; radiusMiles: number };

export default function CustomerDashboard() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [traders, setTraders] = useState<TraderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const tokenGetter = () => getTokenRef.current();
      const [jobRows, traderRows] = await Promise.all([apiFetch<Job[]>('/api/jobs', {}, tokenGetter), apiFetch<TraderListItem[]>('/api/traders')]);
      setJobs(jobRows); setTraders(traderRows.slice(0, 4));
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (loading) return <LoadingScreen />;
  const firstName = clerkUser?.firstName || 'there';
  const openJobs = jobs.filter((job) => ['open', 'quoted'].includes(job.status));
  const activeJobs = jobs.filter((job) => job.status === 'in_progress');
  const completedJobs = jobs.filter((job) => job.status === 'completed');

  return <Screen title={`Good to see you, ${firstName}`} subtitle="Find trades, post work, compare quotes and keep each project organised from one place.">
    <View style={styles.heroActions}>
      <Link href="/customer/new-job" asChild><Button mode="contained" contentStyle={styles.actionButton}>Post a job</Button></Link>
      <Link href="/(public)/directory" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Find local trades</Button></Link>
      <Link href="/customer/saved-trades" asChild><Button mode="text" contentStyle={styles.actionButton}>Saved trades</Button></Link>
    </View>

    <View style={styles.stats}>
      <AppCard style={[styles.stat, styles.statOrange]}><Text style={styles.statEyebrow}>QUOTING</Text><Text variant="headlineMedium" style={styles.statNumber}>{openJobs.length}</Text><Text style={styles.statLabel}>Jobs receiving quotes</Text></AppCard>
      <AppCard style={[styles.stat, styles.statTeal]}><Text style={styles.statEyebrow}>IN PROGRESS</Text><Text variant="headlineMedium" style={styles.statNumber}>{activeJobs.length}</Text><Text style={styles.statLabel}>Active projects</Text></AppCard>
      <AppCard style={[styles.stat, styles.statBlue]}><Text style={styles.statEyebrow}>HISTORY</Text><Text variant="headlineMedium" style={styles.statNumber}>{completedJobs.length}</Text><Text style={styles.statLabel}>Completed jobs</Text></AppCard>
    </View>

    {error ? <EmptyState title="Couldn’t load your dashboard" body={error} action={<Button onPress={load}>Try again</Button>} /> : null}

    <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>YOUR PROJECTS</Text><Text variant="titleLarge" style={styles.title}>Current jobs</Text></View><Link href="/customer/jobs" asChild><Button compact>View all</Button></Link></View>
    {!jobs.length ? <EmptyState title="No jobs yet" body="Post what you need once and BuildPair will keep the quotes, messages and project history together." action={<Link href="/customer/new-job" asChild><Button mode="contained">Post your first job</Button></Link>} /> : jobs.slice(0, 3).map((job) => <AppCard key={job.id}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>{job.title}</Text><Text style={styles.muted}>{job.category}{job.locationLabel ? ` · ${job.locationLabel}` : ''}{job.postcode ? ` · ${job.postcode}` : ''}</Text></View><Chip>{job.status.replace('_', ' ')}</Chip></View>
      <Text style={styles.meta}>{job.budgetRange} · {job.urgency}</Text>
      <Text numberOfLines={2} style={styles.description}>{job.description}</Text>
      <View style={styles.row}><Button onPress={() => router.push(`/customer/jobs/${job.id}` as Href)}>View job</Button>{['open', 'quoted'].includes(job.status) ? <Button mode="outlined" onPress={() => router.push(`/customer/compare/${job.id}` as Href)}>Compare quotes</Button> : null}</View>
    </AppCard>)}

    <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>DISCOVER</Text><Text variant="titleLarge" style={styles.title}>Trades to explore</Text></View><Link href="/(public)/directory" asChild><Button compact>Browse all</Button></Link></View>
    <Text style={styles.sectionIntro}>A few profiles currently available on BuildPair. Always make the checks appropriate to your job before appointing somebody.</Text>
    <View style={styles.traderGrid}>{traders.map((trader) => <AppCard key={trader.id} style={styles.traderCard}>
      <Text variant="titleMedium" style={styles.title}>{trader.businessName}</Text>
      <Text style={styles.muted}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text>
      <View style={styles.row}><Text style={styles.rating}>{trader.reviewCount ? `${trader.averageRating.toFixed(1)} ★ · ${trader.reviewCount} review${trader.reviewCount === 1 ? '' : 's'}` : 'New to BuildPair'}</Text><Button compact onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)}>View profile</Button></View>
    </AppCard>)}</View>
  </Screen>;
}

const styles = StyleSheet.create({
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { minHeight: 48 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 180, minWidth: 155, paddingVertical: 17 },
  statOrange: { backgroundColor: colors.primarySoft, borderColor: '#F2D7C3' },
  statTeal: { backgroundColor: colors.accentSoft, borderColor: '#CDE2DE' },
  statBlue: { backgroundColor: colors.blueSoft, borderColor: '#D4E1E9' },
  statEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statNumber: { color: colors.charcoal, fontWeight: '900' },
  statLabel: { color: colors.charcoalSoft, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  sectionEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginBottom: 3 },
  sectionIntro: { color: colors.muted, lineHeight: 21, marginTop: -12 },
  title: { fontWeight: '900', color: colors.charcoal },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220, gap: 4 },
  muted: { color: colors.muted, lineHeight: 21 },
  meta: { color: colors.primaryDark, fontWeight: '700' },
  rating: { color: colors.charcoalSoft, fontWeight: '700', fontSize: 12 },
  description: { color: colors.text, lineHeight: 22 },
  traderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  traderCard: { flexGrow: 1, flexBasis: 250, minWidth: 230 },
});
