import { useAuth, useUser } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { NextActionCard } from '@/components/NextActionCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, controlHeights, spacing } from '@/constants/theme';
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
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  if (loading) return <LoadingScreen />;
  const firstName = clerkUser?.firstName || 'there';
  const openJobs = jobs.filter((job) => ['open', 'quoted'].includes(job.status));
  const activeJobs = jobs.filter((job) => job.status === 'in_progress');
  const completedJobs = jobs.filter((job) => job.status === 'completed');
  const priority: Record<Job['status'], number> = { in_progress: 0, quoted: 1, open: 2, completed: 3, cancelled: 4 };
  const orderedJobs = [...jobs].sort((a, b) => priority[a.status] - priority[b.status] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const attentionJob = jobs.find((job) => job.status === 'quoted')
    ?? jobs.find((job) => job.status === 'in_progress' && (job.paymentMode ?? 'undecided') === 'undecided')
    ?? jobs.find((job) => job.status === 'in_progress')
    ?? jobs.find((job) => job.status === 'open');
  const attention = attentionJob ? dashboardNextAction(attentionJob) : null;

  return <Screen title={`Good to see you, ${firstName}`} subtitle="Your jobs, quotes, messages and project stages stay connected here.">
    <View style={styles.heroActions}>
      <Link href="/customer/jobs" asChild><Button mode="contained" icon="briefcase-outline" contentStyle={styles.actionButton}>My jobs & payments</Button></Link>
      <Link href="/customer/new-job" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Post a job</Button></Link>
      <Link href="/(public)/directory" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Find local trades</Button></Link>
      <Link href="/customer/saved-trades" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Saved trades</Button></Link>
      <Link href="/customer/home-record" asChild><Button mode="outlined" icon="home-heart" contentStyle={styles.actionButton}>Home Record</Button></Link>
      <Link href="/customer/attention" asChild><Button mode="outlined" icon="bell-alert-outline" contentStyle={styles.actionButton}>Needs attention</Button></Link>
    </View>

    <View style={styles.stats}>
      <AppCard style={[styles.stat, styles.statOrange]}><Text style={styles.statEyebrow}>QUOTING</Text><Text variant="headlineMedium" style={styles.statNumber}>{openJobs.length}</Text><Text style={styles.statLabel}>Jobs receiving quotes</Text></AppCard>
      <AppCard style={[styles.stat, styles.statTeal]}><Text style={styles.statEyebrow}>IN PROGRESS</Text><Text variant="headlineMedium" style={styles.statNumber}>{activeJobs.length}</Text><Text style={styles.statLabel}>Active projects</Text></AppCard>
      <AppCard style={[styles.stat, styles.statBlue]}><Text style={styles.statEyebrow}>COMPLETED</Text><Text variant="headlineMedium" style={styles.statNumber}>{completedJobs.length}</Text><Text style={styles.statLabel}>Finished jobs</Text></AppCard>
    </View>

    {error ? <EmptyState title="Couldn’t load your dashboard" body={error} action={<Button mode="outlined" onPress={load}>Try again</Button>} /> : null}

    {attentionJob && attention ? <NextActionCard
      title={attention.title}
      body={attention.body}
      action={<Button mode="contained" icon="arrow-right" onPress={() => router.push(attention.href)}>{attention.label}</Button>}
    /> : null}

    <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>YOUR PROJECTS</Text><Text variant="titleLarge" style={styles.title}>Continue where you left off</Text></View><Link href="/customer/jobs" asChild><Button mode="text">View all jobs</Button></Link></View>
    {!jobs.length ? <EmptyState title="No jobs yet" body="Post what you need once. BuildPair keeps quotes, messages and project history together." action={<Link href="/customer/new-job" asChild><Button mode="contained" contentStyle={styles.actionButton}>Post your first job</Button></Link>} /> : orderedJobs.slice(0, 4).map((job) => <AppCard key={job.id} style={job.status === 'in_progress' ? styles.activeJob : undefined}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>{job.title}</Text><Text style={styles.muted}>{job.category}{job.locationLabel ? ` · ${job.locationLabel}` : ''}{job.postcode ? ` · ${job.postcode}` : ''}</Text></View><Chip icon={job.status === 'in_progress' ? 'progress-clock' : undefined}>{job.status.replace('_', ' ')}</Chip></View>
      <Text style={styles.meta}>{job.status === 'in_progress' ? 'Active project · open this for payments and next steps' : `${job.budgetRange} · ${job.urgency}`}</Text>
      <Text numberOfLines={2} style={styles.description}>{job.description}</Text>
      <View style={styles.cardActions}><Button mode={job.status === 'in_progress' ? 'contained' : 'outlined'} onPress={() => router.push(`/customer/jobs/${job.id}` as Href)}>{job.status === 'in_progress' ? 'Continue job' : 'View job'}</Button>{['open', 'quoted'].includes(job.status) ? <Button mode="contained" onPress={() => router.push(`/customer/compare/${job.id}` as Href)}>Review quotes</Button> : null}</View>
    </AppCard>)}

    {traders.length ? <>
      <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>DISCOVER</Text><Text variant="titleLarge" style={styles.title}>Trades to explore</Text></View><Link href="/(public)/directory" asChild><Button mode="text">Browse all</Button></Link></View>
      <Text style={styles.sectionIntro}>Explore tradespeople on BuildPair and make the checks appropriate to your job before appointing anyone.</Text>
      <View style={styles.traderGrid}>{traders.map((trader) => <AppCard key={trader.id} style={styles.traderCard}><Text variant="titleMedium" style={styles.title}>{trader.businessName}</Text><Text style={styles.muted}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text><View style={styles.row}><Text style={styles.rating}>{trader.reviewCount ? `${trader.averageRating.toFixed(1)} ★ · ${trader.reviewCount} review${trader.reviewCount === 1 ? '' : 's'}` : 'Profile live'}</Text><Button mode="text" onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)}>View profile</Button></View></AppCard>)}</View>
    </> : null}
  </Screen>;
}

function dashboardNextAction(job: Job): { title: string; body: string; label: string; href: Href } {
  if (job.status === 'quoted') return { title: `Review quotes for ${job.title}`, body: 'A tradesperson has priced the job. Compare the active quotes, scope and payment stages while the details are fresh.', label: 'Review quotes', href: `/customer/compare/${job.id}` as Href };
  if (job.status === 'in_progress' && (job.paymentMode ?? 'undecided') === 'undecided') return { title: `Finish setting up ${job.title}`, body: 'The quote is accepted. Confirm the job setup and payment route so both sides know exactly what happens next.', label: 'Finish job setup', href: `/customer/jobs/${job.id}/start` as Href };
  if (job.status === 'in_progress') return { title: `Continue ${job.title}`, body: 'Keep the next payment stage, messages, changes and project record together instead of letting the job drift into separate chats.', label: 'Continue project', href: `/customer/jobs/${job.id}` as Href };
  return { title: `Check ${job.title}`, body: 'Your job is live. Keep questions, site-visit arrangements and quote decisions attached to the job.', label: 'Open job', href: `/customer/jobs/${job.id}` as Href };
}

const styles = StyleSheet.create({
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', alignItems: 'center' }, attentionCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 2 }, attentionEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, actionButton: { minHeight: controlHeights.standard, paddingHorizontal: spacing.xs }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, stat: { flexGrow: 1, flexBasis: 180, minWidth: 155, paddingVertical: spacing.lg, alignItems: 'center' }, statOrange: { backgroundColor: colors.primarySoft, borderColor: '#F2D7C3' }, statTeal: { backgroundColor: colors.accentSoft, borderColor: '#CDE2DE' }, statBlue: { backgroundColor: colors.blueSoft, borderColor: '#D4E1E9' }, statEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center' }, statNumber: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' }, statLabel: { color: colors.charcoalSoft, fontWeight: '700', textAlign: 'center' }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xxs }, sectionEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginBottom: spacing.xxs }, sectionIntro: { color: colors.muted, lineHeight: 21, marginTop: -spacing.md }, title: { fontWeight: '900', color: colors.charcoal }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }, cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }, flex: { flex: 1, minWidth: 220, gap: spacing.xxs }, muted: { color: colors.muted, lineHeight: 21 }, meta: { color: colors.primaryDark, fontWeight: '700' }, rating: { color: colors.charcoalSoft, fontWeight: '700', fontSize: 12 }, description: { color: colors.text, lineHeight: 22 }, traderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, traderCard: { flexGrow: 1, flexBasis: 250, minWidth: 230 }, activeJob: { borderColor: colors.primary, borderWidth: 2 },
});
