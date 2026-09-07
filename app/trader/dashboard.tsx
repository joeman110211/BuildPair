import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, ProgressBar, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { SUBSCRIPTION_TIERS } from '@/constants/options';
import { colors, controlHeights, spacing } from '@/constants/theme';
import { apiFetch, ApiError, errorMessage } from '@/lib/api';
import type { Job, Quote, TraderProfile } from '@/types';

export default function TraderDashboard() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [profile, setProfile] = useState<TraderProfile>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const tokenGetter = () => getTokenRef.current();
      const ownProfile = await apiFetch<TraderProfile>('/api/me/profile', {}, tokenGetter);
      setProfile(ownProfile);
      const [jobRows, quoteRows] = await Promise.all([apiFetch<Job[]>('/api/jobs', {}, tokenGetter), apiFetch<Quote[]>('/api/quotes', {}, tokenGetter)]);
      setJobs(jobRows); setQuotes(quoteRows);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setProfile(undefined);
      else setError(errorMessage(e));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  if (loading) return <LoadingScreen />;
  if (!profile) return <Screen title="Build your tradesperson profile" subtitle="Your profile is your shop window on BuildPair."><EmptyState title="Your profile is waiting" body="Add your trade, service area, skills and business details so homeowners can find you." action={<Link href="/trader/onboarding" asChild><Button mode="contained" contentStyle={styles.actionButton}>Build my profile</Button></Link>} /></Screen>;

  const pendingQuoteJobIds = new Set(quotes.filter((quote) => quote.status === 'pending').map((quote) => quote.jobId));
  const newLeads = jobs.filter((job) => ['open', 'quoted'].includes(job.status) && !pendingQuoteJobIds.has(job.id));
  const activeJobs = jobs.filter((job) => job.status === 'in_progress');
  const completedJobs = jobs.filter((job) => job.status === 'completed');
  const pendingQuotes = quotes.filter((quote) => quote.status === 'pending');
  const plan = SUBSCRIPTION_TIERS[profile.subscriptionTier];
  const offerLimit = profile.monthlyQuoteLimit ?? plan.monthlyMarketplaceQuotes;
  const offersUsed = profile.monthlyQuotesUsed ?? 0;
  const offerProgress = offerLimit > 0 ? Math.min(1, offersUsed / offerLimit) : 0;
  const paidActive = profile.subscriptionTier !== 'free' && profile.isSubscriptionActive;

  return <Screen title={profile.businessName} subtitle={`${profile.tradeCategory}${profile.locationLabel ? ` · ${profile.locationLabel}` : ''}`}>
    <AppCard style={[styles.membershipCard, paidActive && styles.membershipCardPaid]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.membershipEyebrow}>CURRENT MEMBERSHIP</Text>
          <Text variant="titleLarge" style={styles.cardTitle}>{plan.name}</Text>
          <Text style={styles.muted}>{profile.subscriptionTier === 'free'
            ? 'Your Starter profile can be shared externally and you can browse marketplace jobs. Upgrade to appear in BuildPair search and submit marketplace offers.'
            : `${Math.max(0, offerLimit - offersUsed)} of ${offerLimit} marketplace offers remaining this month. Direct homeowner requests do not use this allowance.`}</Text>
        </View>
        <Chip>{paidActive ? 'Active' : profile.subscriptionTier === 'free' ? 'Starter' : 'Needs attention'}</Chip>
      </View>
      {offerLimit > 0 ? <>
        <ProgressBar progress={offerProgress} color={colors.primary} style={styles.progress} />
        <Text style={styles.offerMeta}>{offersUsed} used · {offerLimit} monthly allowance</Text>
      </> : null}
      <View style={styles.membershipActions}>
        <Link href="/trader/subscription" asChild><Button mode={profile.subscriptionTier === 'free' ? 'contained' : 'outlined'} contentStyle={styles.actionButton}>{profile.subscriptionTier === 'free' ? 'View membership options' : 'Manage membership'}</Button></Link>
        <Link href="/trader/analytics" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Business analytics</Button></Link>
      </View>
    </AppCard>

    <View style={styles.stats}>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{newLeads.length}</Text><Text style={styles.statLabel}>New opportunities</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{pendingQuotes.length}</Text><Text style={styles.statLabel}>Quotes awaiting reply</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{activeJobs.length}</Text><Text style={styles.statLabel}>Active jobs</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{completedJobs.length}</Text><Text style={styles.statLabel}>Completed</Text></AppCard>
    </View>

    <View style={styles.sectionHeading}><Text variant="titleLarge" style={styles.cardTitle}>Quick actions</Text></View>
    <View style={styles.quickActions}>
      <Link href="/trader/job-board" asChild><Button mode="contained" contentStyle={styles.actionButton}>Find jobs</Button></Link>
      <Link href="/trader/invoices/new" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Create invoice</Button></Link>
      <Link href="/trader/onboarding" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Edit profile</Button></Link>
      <Button mode="outlined" contentStyle={styles.actionButton} onPress={() => router.push(`/(public)/traders/${profile.id}` as Href)}>View public profile</Button>
    </View>

    {error ? <EmptyState title="Something needs attention" body={error} action={<Button mode="outlined" onPress={load}>Try again</Button>} /> : null}

    <View style={styles.sectionHeading}><Text variant="titleLarge" style={styles.cardTitle}>Recent opportunities</Text><Link href="/trader/job-board" asChild><Button mode="text">View all</Button></Link></View>
    {!newLeads.length ? <EmptyState title="No new opportunities right now" body={`New ${profile.tradeCategory.toLowerCase()} jobs matching your account will appear here.`} /> : newLeads.slice(0, 3).map((job) => <AppCard key={job.id}>
      <View style={styles.row}><Text variant="titleMedium" style={styles.cardTitle}>{job.title}</Text>{job.targetTraderId === profile.userId ? <Chip compact>Direct request</Chip> : <Chip compact>New</Chip>}</View>
      <Text style={styles.muted}>{job.postcode || job.locationLabel || 'Location available in job'} · {job.budgetRange}</Text>
      <Text numberOfLines={2} style={styles.description}>{job.description}</Text>
      <View style={styles.cardActions}><Button mode="contained" onPress={() => router.push('/trader/job-board')}>View opportunity</Button></View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  membershipCard: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  membershipCardPaid: { backgroundColor: colors.accentSoft, borderColor: '#CDE2DE' },
  membershipEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: spacing.xxs },
  membershipActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', justifyContent: 'flex-start' },
  offerMeta: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  flex: { flex: 1, minWidth: 220, gap: spacing.xxs },
  cardTitle: { fontWeight: '900', color: colors.charcoal },
  muted: { color: colors.muted, lineHeight: 21 },
  progress: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceStrong },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: 145, minWidth: 135, paddingVertical: spacing.lg, alignItems: 'center' },
  statNumber: { color: colors.primary, fontWeight: '900', textAlign: 'center' },
  statLabel: { color: colors.muted, fontWeight: '700', textAlign: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xxs },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  actionButton: { minHeight: controlHeights.standard, paddingHorizontal: spacing.xs },
  description: { color: colors.text, lineHeight: 21 },
});
