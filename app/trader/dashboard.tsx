import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Chip, ProgressBar, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { SUBSCRIPTION_TIERS } from '@/constants/options';
import { colors, controlHeights, spacing } from '@/constants/theme';
import { apiFetch, ApiError, errorMessage } from '@/lib/api';
import { MARKETPLACE_OPEN, BUILDPAY_OPEN } from '@/lib/launch';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { Job, Quote, TraderProfile } from '@/types';

type ReferralState = {
  referralCode: string;
  referralCount: number;
  referralUrl: string;
};

export default function TraderDashboard() {
  const { getToken } = useAuth();
  const { user: currentUser } = useCurrentUser();
  const marketplaceEnabled = MARKETPLACE_OPEN || Boolean(currentUser?.isAdmin);
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [profile, setProfile] = useState<TraderProfile>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [referral, setReferral] = useState<ReferralState>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const tokenGetter = () => getTokenRef.current();
      const ownProfile = await apiFetch<TraderProfile>('/api/me/profile', {}, tokenGetter);
      setProfile(ownProfile);
      const referralState = await apiFetch<ReferralState>('/api/trader-referral', { method: 'POST' }, tokenGetter).catch(() => undefined);
      setReferral(referralState);
      if (marketplaceEnabled) {
        const [jobRows, quoteRows] = await Promise.all([
          apiFetch<Job[]>('/api/jobs', {}, tokenGetter),
          apiFetch<Quote[]>('/api/quotes', {}, tokenGetter),
        ]);
        setJobs(jobRows);
        setQuotes(quoteRows);
      } else {
        setJobs([]);
        setQuotes([]);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setProfile(undefined);
      else setError(errorMessage(e));
    } finally { setLoading(false); }
  }, [marketplaceEnabled]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function shareOneGoodTrade() {
    if (!referral?.referralUrl) return;
    const text = `I’m getting BuildPair ready before launch. They’re asking each founding trade to invite one decent Surrey trade they’d genuinely be happy to work alongside. I’m passing my One Good Trade invite to you: ${referral.referralUrl}`;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: 'BuildPair · One Good Trade', text, url: referral.referralUrl });
        return;
      }
      await Share.share({ title: 'BuildPair · One Good Trade', message: text, url: referral.referralUrl });
    } catch {
      // Cancelling the native share sheet is not an error.
    }
  }

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
  // Stripe charges and Stripe payouts are separate capabilities. BuildPair payout readiness must
  // always be based on payouts_enabled so every screen reports the same financial state.
  const payoutsReady = Boolean(profile.stripeAccountId && profile.stripePayoutsEnabled);
  const serviceArea = profile.locationLabel || profile.postcode || 'your saved service area';
  const profileChecks = [
    { label: 'Business and trade details', done: Boolean(profile.businessName.trim() && profile.tradeCategory) },
    { label: 'Working area', done: Boolean(profile.postcode && profile.radiusMiles > 0) },
    { label: 'About your business', done: profile.bio.trim().length >= 50 },
    { label: 'Examples of your work', done: profile.photos.length > 0 || (profile.beforeAfterProjects?.length ?? 0) > 0 },
    { label: 'Qualifications or verified credentials', done: (profile.qualifications?.length ?? 0) > 0 || (profile.verifiedCredentialCount ?? 0) > 0 },
  ];
  const completedProfileChecks = profileChecks.filter((check) => check.done).length;
  const nextAction = !marketplaceEnabled
    ? { title: 'Get your profile launch-ready', body: 'Check your photos, services, working area and trust information so homeowners see the strongest version of your business when BuildPair opens.', label: 'Review profile', href: '/trader/profile' as Href }
    : activeJobs[0]
      ? { title: `Continue ${activeJobs[0].title}`, body: 'Keep the next stage, messages, changes and project record moving from one place.', label: 'Continue job', href: `/trader/jobs/${activeJobs[0].id}` as Href }
      : pendingQuotes[0]
        ? { title: 'Check your open quotes', body: 'Keep on top of quotes that are still waiting for the homeowner so nothing useful gets lost.', label: 'Open quotes', href: '/trader/quotes' as Href }
        : newLeads[0]
          ? { title: 'A suitable opportunity is waiting', body: 'Review matching work and only engage with jobs that suit your trade and service area.', label: 'Find work', href: '/trader/job-board' as Href }
          : { title: 'Keep your profile current', body: 'Fresh work, services and availability make your profile more useful when homeowners are comparing tradespeople.', label: 'Manage profile', href: '/trader/profile' as Href };

  return <Screen title={profile.businessName} subtitle={`${profile.tradeCategory}${profile.locationLabel ? ` · ${profile.locationLabel}` : ''}`}>
    {!marketplaceEnabled ? <AppCard style={styles.prelaunchCard}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.cardTitle}>Profile setup is live. Marketplace activity is not.</Text>
          <Text style={styles.muted}>BuildPair is launching soon. Jobs, marketplace messaging, BuildPay, subscriptions and payout setup stay locked until launch, so there is nothing missing from your account right now.</Text>
        </View>
        <Chip icon="rocket-launch-outline">Launch ready</Chip>
      </View>
    </AppCard> : BUILDPAY_OPEN && !payoutsReady ? <AppCard style={styles.payoutCard}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.cardTitle}>Payout verification incomplete</Text>
          <Text style={styles.muted}>Stripe has not yet confirmed that this account can receive BuildPair payouts. Your membership can still be active while payout verification is incomplete.</Text>
        </View>
        <Chip icon="alert-circle-outline">Action required</Chip>
      </View>
      <Link href="/trader/subscription" asChild><Button mode="contained" icon="bank-outline" contentStyle={styles.actionButton}>Check Stripe payout status</Button></Link>
    </AppCard> : BUILDPAY_OPEN ? <AppCard style={styles.payoutReadyCard}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.cardTitle}>BuildPair payouts ready</Text><Text style={styles.muted}>Stripe has confirmed that your connected account can receive materials, deposit and released staged payments.</Text></View><Chip icon="check-circle-outline">Ready</Chip></View>
    </AppCard> : null}

    <AppCard>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.cardTitle}>Strengthen your profile</Text>
          <Text style={styles.muted}>{completedProfileChecks} of {profileChecks.length} suggested details completed</Text>
        </View>
        <Chip icon={completedProfileChecks === profileChecks.length ? 'check-circle-outline' : 'progress-check'}>{Math.round(completedProfileChecks / profileChecks.length * 100)}%</Chip>
      </View>
      <ProgressBar progress={completedProfileChecks / profileChecks.length} color={colors.primary} style={styles.progress} />
      {profileChecks.map((check) => <Text key={check.label} style={styles.muted}>{check.done ? '✓' : '○'} {check.label}</Text>)}
      <Text style={styles.muted}>Photos and qualifications are optional. Qualifications are trader-declared unless BuildPair verifies them.</Text>
      {completedProfileChecks < profileChecks.length ? <Link href="/trader/onboarding" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Improve profile</Button></Link> : null}
    </AppCard>

    <AppCard style={styles.nextActionCard}>
      <View style={styles.row}><View style={styles.flex}><Text style={styles.nextActionEyebrow}>NEXT ACTION</Text><Text variant="titleLarge" style={styles.cardTitle}>{nextAction.title}</Text><Text style={styles.muted}>{nextAction.body}</Text></View><Chip icon="arrow-right-circle-outline">Next</Chip></View>
      <Button mode="contained" icon="arrow-right" onPress={() => router.push(nextAction.href)}>{nextAction.label}</Button>
    </AppCard>

    <AppCard style={[styles.membershipCard, paidActive && styles.membershipCardPaid]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.membershipEyebrow}>CURRENT MEMBERSHIP</Text>
          <Text variant="titleLarge" style={styles.cardTitle}>{plan.name}</Text>
          <Text style={styles.muted}>{!marketplaceEnabled && profile.subscriptionTier !== 'free'
            ? `${plan.name} is reserved for launch. Your launch offer starts when BuildPair opens, so pre-launch setup does not burn any paid or free membership time.`
            : profile.subscriptionTier === 'free'
              ? 'Your Starter profile can be shared externally and you can browse marketplace jobs. Upgrade to Core, Plus or Pro to appear in BuildPair search after launch and use marketplace opportunities.'
              : `${Math.max(0, offerLimit - offersUsed)} of ${offerLimit} marketplace offers remaining this month. An open-marketplace opportunity is counted when you first engage with a job. Core direct requests share its five-opportunity allowance; Plus and Pro direct requests do not use their open-market allowance.`}</Text>
        </View>
        <Chip>{!marketplaceEnabled && profile.subscriptionTier !== 'free' ? 'Reserved for launch' : paidActive ? 'Active' : profile.subscriptionTier === 'free' ? 'Starter' : 'Needs attention'}</Chip>
      </View>
      {offerLimit > 0 ? <><ProgressBar progress={offerProgress} color={colors.primary} style={styles.progress} /><Text style={styles.offerMeta}>{offersUsed} used · {offerLimit} monthly allowance</Text></> : null}
      <View style={styles.membershipActions}>
        <Link href="/trader/subscription" asChild><Button mode={profile.subscriptionTier === 'free' ? 'contained' : 'outlined'} contentStyle={styles.actionButton}>{profile.subscriptionTier === 'free' ? 'View pricing' : 'Plans & membership'}</Button></Link>
        <Link href="/trader/analytics" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Business analytics</Button></Link>
      </View>
    </AppCard>

    <AppCard>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleMedium" style={styles.cardTitle}>Profile & job matching</Text>
          <Text style={styles.muted}>Marketplace matching uses {serviceArea} and your saved {profile.radiusMiles || 0}-mile maximum radius. Manage your profile to update photos, business details, services and working area, or open the public version exactly as homeowners see it.</Text>
        </View>
        <Chip icon={paidActive ? 'eye-outline' : 'eye-off-outline'}>{paidActive ? 'Search visible' : 'Search hidden'}</Chip>
      </View>
      <Link href="/trader/profile" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Manage profile & service area</Button></Link>
    </AppCard>

    {!marketplaceEnabled && referral ? <AppCard style={styles.relayCard}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.membershipEyebrow}>ONE GOOD TRADE · BUILDPAIR RELAY</Text>
          <Text variant="titleLarge" style={styles.cardTitle}>One good trade brings one good trade.</Text>
          <Text style={styles.muted}>Don’t spam forty strangers. Pass this to one Surrey builder or tradesperson you genuinely rate and would be happy to work alongside. If they join through your link, BuildPair records the connection and the relay keeps moving.</Text>
        </View>
        <Chip icon={referral.referralCount > 0 ? 'check-circle-outline' : 'account-multiple-plus-outline'}>
          {referral.referralCount > 0 ? `${referral.referralCount} joined` : 'Your turn'}
        </Chip>
      </View>
      <Button mode="contained" icon="share-variant-outline" onPress={() => void shareOneGoodTrade()} contentStyle={styles.actionButton}>Pass my One Good Trade invite</Button>
      <Text selectable style={styles.relayLink}>{referral.referralUrl}</Text>
      <Text style={styles.relayNote}>No paid-lead nonsense and no cash-for-random-invites scheme. The point is to seed BuildPair with real local working networks before launch.</Text>
    </AppCard> : null}

    <View style={styles.stats}>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{newLeads.length}</Text><Text style={styles.statLabel}>New opportunities</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{pendingQuotes.length}</Text><Text style={styles.statLabel}>Quotes awaiting reply</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{activeJobs.length}</Text><Text style={styles.statLabel}>Active jobs</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{completedJobs.length}</Text><Text style={styles.statLabel}>Completed</Text></AppCard>
    </View>

    <View style={styles.sectionHeading}><Text variant="titleLarge" style={styles.cardTitle}>Quick actions</Text></View>
    <View style={styles.quickActions}>
      <Link href="/trader/job-board" asChild><Button mode="contained" contentStyle={styles.actionButton}>Find jobs</Button></Link>
      <Link href="/trader/my-jobs" asChild><Button mode="outlined" contentStyle={styles.actionButton}>My active jobs</Button></Link>
      <Link href="/trader/quotes" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Quote any customer</Button></Link>
      <Link href="/trader/invoices/new" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Create invoice</Button></Link>
      <Link href="/trader/customers" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Customer book</Button></Link>
      <Link href="/trader/calendar" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Working calendar</Button></Link>
      <Link href="/trader/attention" asChild><Button mode="outlined" icon="bell-alert-outline" contentStyle={styles.actionButton}>Needs attention</Button></Link>
      <Link href="/trader/profile" asChild><Button mode="outlined" contentStyle={styles.actionButton}>Manage profile</Button></Link>
      <Button mode="outlined" contentStyle={styles.actionButton} onPress={() => router.push(`/(public)/traders/${profile.id}` as Href)}>View public profile</Button>
    </View>

    {error ? <EmptyState title="Something needs attention" body={error} action={<Button mode="outlined" onPress={load}>Try again</Button>} /> : null}

    <View style={styles.sectionHeading}><Text variant="titleLarge" style={styles.cardTitle}>Active jobs</Text><Link href="/trader/my-jobs" asChild><Button mode="text">View all</Button></Link></View>
    {activeJobs.length ? activeJobs.slice(0, 3).map((job) => <AppCard key={job.id} style={styles.activeJobCard}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.cardTitle}>{job.title}</Text><Text style={styles.muted}>Accepted job · open this for payment stages, variations and completion.</Text></View><Chip icon="progress-clock">In progress</Chip></View><Button mode="contained" onPress={() => router.push(`/trader/jobs/${job.id}` as Href)}>Continue job</Button></AppCard>) : <EmptyState title="No active jobs" body="Accepted jobs will stay visible here so the workflow does not disappear after a quote is accepted." />}

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
  nextActionCard: { backgroundColor: colors.primarySoft, borderColor: '#F0C9AA' }, nextActionEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  payoutCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold }, payoutReadyCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, prelaunchCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, relayCard: { backgroundColor: '#FFF9F5', borderColor: colors.primary, borderWidth: 2 }, relayLink: { color: colors.primary, fontSize: 12, fontWeight: '700' }, relayNote: { color: colors.muted, fontSize: 12, lineHeight: 18 }, activeJobCard: { borderColor: colors.primary, borderWidth: 2 },
  membershipCard: { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, membershipCardPaid: { backgroundColor: colors.accentSoft, borderColor: '#CDE2DE' }, membershipEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: spacing.xxs }, membershipActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', justifyContent: 'flex-start' }, offerMeta: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }, cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }, flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: spacing.xxs }, cardTitle: { fontWeight: '900', color: colors.charcoal }, muted: { color: colors.muted, lineHeight: 21 }, progress: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceStrong }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, stat: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 145, minWidth: 135, paddingVertical: spacing.lg, alignItems: 'center' }, statNumber: { color: colors.primary, fontWeight: '900', textAlign: 'center' }, statLabel: { color: colors.muted, fontWeight: '700', textAlign: 'center' }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xxs }, quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }, actionButton: { minHeight: controlHeights.standard, paddingHorizontal: spacing.xs }, description: { color: colors.text, lineHeight: 21 },
});
