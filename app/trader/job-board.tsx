import { useAuth } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, ProgressBar, Searchbar, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { Job, Quote, TraderProfile } from '@/types';

type Conversation = { id: string; jobId: string; traderId: string; customerId: string };

export default function TraderJobBoard() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [profile, setProfile] = useState<TraderProfile>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [directOnly, setDirectOnly] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openingJobId, setOpeningJobId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const tokenGetter = () => getTokenRef.current();
      const [ownProfile, jobRows, quoteRows, conversationRows] = await Promise.all([
        apiFetch<TraderProfile>('/api/me/profile', {}, tokenGetter),
        apiFetch<Job[]>('/api/jobs', {}, tokenGetter),
        apiFetch<Quote[]>('/api/quotes', {}, tokenGetter),
        apiFetch<Conversation[]>('/api/conversations', {}, tokenGetter),
      ]);
      setProfile(ownProfile); setJobs(jobRows); setQuotes(quoteRows); setConversations(conversationRows);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const opportunities = useMemo(() => jobs.filter((job) => {
    const belongsToActiveJob = ['open', 'quoted'].includes(job.status) || Boolean(job.acceptedQuoteId);
    if (!belongsToActiveJob) return false;
    if (directOnly && job.targetTraderId !== profile?.userId) return false;
    if (urgentOnly && !job.urgency.toLowerCase().includes('urgent') && !job.urgency.toLowerCase().includes('asap') && !job.isEmergency) return false;
    const haystack = `${job.title} ${job.category} ${job.description} ${job.postcode ?? ''} ${job.locationLabel ?? ''}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }), [directOnly, jobs, profile?.userId, search, urgentOnly]);

  async function openOffer(job: Job) {
    if (job.isPreview) return;
    const existing = conversations.find((conversation) => conversation.jobId === job.id);
    if (existing) {
      router.push(`/trader/messages/${existing.id}` as Href);
      return;
    }
    try {
      setOpeningJobId(job.id); setError('');
      const conversation = await apiFetch<Conversation>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ jobId: job.id }),
      }, () => getTokenRef.current());
      setConversations((current) => current.some((item) => item.id === conversation.id) ? current : [conversation, ...current]);
      await load();
      router.push(`/trader/messages/${conversation.id}` as Href);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setOpeningJobId(null);
    }
  }

  if (loading) return <LoadingScreen label="Finding suitable jobs…" />;

  const paid = Boolean(profile?.isSubscriptionActive && profile.subscriptionTier !== 'free');
  const used = profile?.monthlyQuotesUsed ?? 0;
  const limit = profile?.monthlyQuoteLimit ?? 0;
  const allowanceUsed = limit > 0 && used >= limit;
  const resetLabel = profile?.monthlyQuoteResetAt ? new Date(profile.monthlyQuoteResetAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'next month';

  return <Screen title="Job Board" subtitle="Browse work matching your trades and service area. Direct requests can move straight to a quote or to a site visit first when the job needs inspecting.">
    <AppCard>
      <View style={styles.usageTop}>
        <View style={styles.flex}>
          <Text variant="titleMedium" style={styles.title}>{profile?.subscriptionTier === 'featured' ? 'BuildPair Pro' : profile?.subscriptionTier === 'basic' ? 'BuildPair Plus' : 'Starter Free'}</Text>
          <Text style={styles.muted}>{paid ? `${used} of ${limit} open-marketplace offers used this month. Direct homeowner requests do not count.` : 'You can browse matching jobs. Upgrade to Plus or Pro when you want to offer or message.'}</Text>
        </View>
        {paid ? <Chip icon="message-text-outline">{used}/{limit} used</Chip> : <Chip icon="eye-outline">Browse only</Chip>}
      </View>
      {paid ? <><ProgressBar progress={limit ? Math.min(1, used / limit) : 0} color={allowanceUsed ? colors.danger : colors.primary} style={styles.progress} /><Text variant="bodySmall" style={styles.muted}>Resets {resetLabel}{allowanceUsed ? ' · You can still browse jobs and reply to direct requests.' : ''}</Text></> : <Button mode="contained" onPress={() => router.push('/trader/subscription')}>See Plus and Pro</Button>}
    </AppCard>

    <Searchbar placeholder="Search jobs or locations" value={search} onChangeText={setSearch} style={styles.search} />
    <View style={styles.filters}>
      <Chip selected={!directOnly && !urgentOnly} showSelectedCheck onPress={() => { setDirectOnly(false); setUrgentOnly(false); }}>All</Chip>
      <Chip selected={directOnly} showSelectedCheck onPress={() => setDirectOnly((value) => !value)}>Direct Requests</Chip>
      <Chip selected={urgentOnly} showSelectedCheck onPress={() => setUrgentOnly((value) => !value)}>Urgent</Chip>
      {(profile?.tradeCategories?.length ? profile.tradeCategories : profile?.tradeCategory ? [profile.tradeCategory] : []).slice(0, 3).map((category) => <Chip key={category} icon="tools">{category}</Chip>)}
      {profile?.radiusMiles ? <Chip icon="map-marker-radius">Within {profile.radiusMiles} miles</Chip> : null}
    </View>

    {error ? <Text style={styles.error}>{error}</Text> : null}
    {!opportunities.length ? <EmptyState title="No matching jobs right now" body="Try clearing the filters. New jobs matching your selected trades and area will appear here automatically." /> : opportunities.map((job) => {
      const direct = job.targetTraderId === profile?.userId;
      const ownQuote = job.isPreview ? undefined : quotes.find((quote) => quote.jobId === job.id && quote.status === 'pending');
      const conversation = job.isPreview ? undefined : conversations.find((item) => item.jobId === job.id);
      const firstMarketplaceOffer = !direct && !conversation && !ownQuote;
      const blockedByPlan = !paid && !conversation && !ownQuote;
      const blockedByAllowance = paid && firstMarketplaceOffer && allowanceUsed;
      const canOpen = !job.isPreview && !blockedByPlan && !blockedByAllowance;

      return <AppCard key={job.id}>
        <View style={styles.cardTop}><View style={styles.titleBlock}><Text variant="titleLarge" style={styles.title}>{job.title}</Text><Text style={styles.muted}>📍 {job.postcode || job.locationLabel || 'Location available'} · {job.budgetRange}</Text></View><View style={styles.badges}>{job.isPreview ? <Chip compact icon="flask-outline">Preview job</Chip> : null}{direct ? <Chip compact icon="account-arrow-left">Direct request</Chip> : null}{conversation ? <Chip compact icon="message-check-outline">Conversation open</Chip> : ownQuote ? <Chip compact icon="check">Quoted</Chip> : !job.isPreview ? <Chip compact>New</Chip> : null}</View></View>
        {job.photos?.[0] ? <Image source={{ uri: job.photos[0] }} style={styles.photo} /> : null}
        <View style={styles.meta}><Chip compact icon="home-outline">{job.propertyType}</Chip><Chip compact icon="clock-outline">{job.urgency}</Chip><Chip compact>{job.category}</Chip></View>
        <Text numberOfLines={4} style={styles.description}>{job.description}</Text>
        {direct && !ownQuote ? <Text variant="bodySmall" style={styles.nextHint}>Next step: quote now if you have enough information, or arrange a site visit before quoting if you need to inspect the job.</Text> : null}
        <View style={styles.actions}>
          {job.isPreview ? <Button mode="outlined" disabled>Example only</Button> : <>
            <Button
              mode="contained"
              icon={conversation ? 'message-text-outline' : direct ? 'account-arrow-left' : 'handshake-outline'}
              loading={openingJobId === job.id}
              disabled={!canOpen || openingJobId === job.id}
              onPress={() => void openOffer(job)}
            >{conversation ? 'Open Conversation' : direct ? 'Open Direct Request' : blockedByPlan ? 'Plus or Pro required' : blockedByAllowance ? `${used}/${limit} offers used` : 'Offer / Message'}</Button>
            {conversation || ownQuote ? <Button mode="outlined" icon="file-document-edit-outline" onPress={() => router.push({ pathname: '/trader/quotes/new', params: { jobId: job.id, title: job.title } })}>{ownQuote ? 'Update Quote' : 'Quote now'}</Button> : null}
            {conversation && !ownQuote ? <Button mode="outlined" icon="calendar-account-outline" onPress={() => router.push({ pathname: '/trader/visits/new', params: { jobId: job.id, conversationId: conversation.id, title: job.title } } as Href)}>Visit before quote</Button> : null}
            {(blockedByPlan || blockedByAllowance) ? <Button mode="text" onPress={() => router.push('/trader/subscription')}>{blockedByAllowance && profile?.subscriptionTier === 'basic' ? 'Upgrade to Pro' : 'View plans'}</Button> : null}
          </>}
        </View>
        {blockedByAllowance ? <Text variant="bodySmall" style={styles.limitText}>Your open-marketplace allowance resets {resetLabel}. Direct homeowner requests remain available and do not count.</Text> : null}
      </AppCard>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  search: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  usageTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  progress: { height: 9, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  titleBlock: { flex: 1, minWidth: 220, gap: 4 },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  title: { fontWeight: '900', color: colors.charcoal },
  muted: { color: colors.muted, lineHeight: 21 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  photo: { width: '100%', height: 210, borderRadius: 14, backgroundColor: colors.border },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  description: { color: colors.text, lineHeight: 22 },
  nextHint: { color: colors.primaryDark, fontWeight: '800', lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { color: colors.danger },
  limitText: { color: colors.warning, fontWeight: '700' },
});
