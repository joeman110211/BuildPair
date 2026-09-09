import { useAuth } from '@clerk/expo';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
// Metro and TypeScript resolve the .native/.web implementation; ESLint's generic resolver does not.
// eslint-disable-next-line import/no-unresolved
import { PayMilestoneButton } from '@/components/PayMilestoneButton';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Job, JobTimelineEvent, JobVariation, PaymentStageStatus, Quote, TraderProfile } from '@/types';

type Milestone = {
  id: string;
  title: string;
  amount: number;
  status: PaymentStageStatus;
  kind: 'materials' | 'deposit' | 'stage' | 'final';
  triggerDescription: string;
  sortOrder: number;
  fundedAt?: string | null;
  completedAt?: string | null;
  paidAt?: string | null;
  releaseRequestedAt?: string | null;
  disputedAt?: string | null;
  disputeReason?: string | null;
  paymentMethod?: string | null;
};

type Detail = {
  job: Job;
  acceptedQuote: Quote | null;
  milestones: Milestone[];
  trader: TraderProfile | null;
  existingReview: unknown;
  variations: JobVariation[];
  timeline: JobTimelineEvent[];
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [data, setData] = useState<Detail>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmExternal, setConfirmExternal] = useState(false);
  const [confirmBuildPairPayments, setConfirmBuildPairPayments] = useState(false);
  const [confirmReleaseId, setConfirmReleaseId] = useState<string>();
  const [issueMilestoneId, setIssueMilestoneId] = useState<string>();
  const [issueReason, setIssueReason] = useState('');

  const load = useCallback(async () => {
    try { setData(await apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
  }, [getToken, id]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function review() {
    if (!data?.acceptedQuote) return;
    try {
      setBusy(true);
      await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify({ jobId: id, traderId: data.acceptedQuote.traderId, rating, comment }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function cancelJob() {
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) }, getToken);
      setConfirmCancel(false);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function setPaymentMode(mode: 'buildpair' | 'external') {
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'set_payment_mode', mode, acknowledgedPaymentTerms: mode === 'buildpair' ? true : undefined }) }, getToken);
      setConfirmExternal(false);
      setConfirmBuildPairPayments(false);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function completeExternalJob() {
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'complete_external' }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function variationAction(variationId: string, action: 'accept' | 'decline') {
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/variations/${variationId}`, { method: 'PATCH', body: JSON.stringify({ action }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function releaseStage(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/payments/release', { method: 'POST', body: JSON.stringify({ milestoneId, action: 'release', acknowledgedReleaseResponsibility: true }) }, getToken);
      setConfirmReleaseId(undefined);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  async function disputeStage(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/payments/release', { method: 'POST', body: JSON.stringify({ milestoneId, action: 'dispute', reason: issueReason }) }, getToken);
      setIssueMilestoneId(undefined); setIssueReason(''); setConfirmReleaseId(undefined);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  if (error && !data) return <Screen><EmptyState title="Job unavailable" body={error} /></Screen>;
  if (!data) return <LoadingScreen />;

  const paymentMode = data.job.paymentMode ?? 'undecided';
  const reviewAllowed = data.job.status === 'completed' && data.milestones.some((m) => m.kind !== 'deposit' && m.status === 'paid') && !data.existingReview;
  const cancellable = !data.acceptedQuote && ['open', 'quoted'].includes(data.job.status);
  const location = [data.job.locationLabel, data.job.postcode].filter(Boolean).join(' · ');
  const reportedTraderId = data.acceptedQuote?.traderId ?? data.job.targetTraderId;
  const reportTraderHref = reportedTraderId ? ({ pathname: '/(public)/report', params: { subjectUserId: reportedTraderId, subjectLabel: data.trader?.businessName ?? 'Tradesperson on this job', subjectType: 'trader' } } as Href) : null;
  const orderedMilestones = [...data.milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  const nextMilestone = orderedMilestones.find((stage) => stage.status !== 'paid');

  return <Screen title={data.job.title} subtitle={`${data.job.category} · ${data.job.status.replace('_', ' ')}`}>
    <HomeownerNextStep data={data} jobId={id} reviewAllowed={reviewAllowed} />

    <AppCard>
      <View style={styles.row}><Chip>{data.job.propertyType}</Chip><Chip>{data.job.urgency}</Chip><Chip>{data.job.budgetRange}</Chip>{data.job.isEmergency ? <Chip icon="alert">Emergency</Chip> : null}</View>
      {location ? <Text variant="titleSmall">Job location: {location}</Text> : null}
      <Text>{data.job.description}</Text>
      {data.job.aiGeneratedSpec ? <Text variant="bodySmall" style={styles.muted}>Drafted with AI and approved by you.</Text> : null}
      {data.job.scheduledStartAt ? <Text style={styles.muted}>Scheduled start: {new Date(data.job.scheduledStartAt).toLocaleDateString('en-GB')}</Text> : null}
      {cancellable && !confirmCancel ? <Button mode="outlined" textColor={colors.danger} onPress={() => setConfirmCancel(true)}>Cancel job</Button> : null}
      {cancellable && confirmCancel ? <View style={styles.cancelBox}><Text variant="titleSmall">Cancel this job?</Text><Text style={styles.muted}>Pending quotes will be declined and the job will stop appearing to tradespeople.</Text><View style={styles.row}><Button onPress={() => setConfirmCancel(false)} disabled={busy}>Keep job</Button><Button mode="contained" buttonColor={colors.danger} loading={busy} disabled={busy} onPress={() => void cancelJob()}>Confirm cancellation</Button></View></View> : null}
    </AppCard>

    {data.job.photos?.length ? <View style={styles.gallery}>{data.job.photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.photo} />)}</View> : null}

    {data.acceptedQuote && data.job.status === 'in_progress' ? <AppCard style={paymentMode === 'external' ? styles.externalCard : styles.protectionCard}>
      <Text variant="titleLarge" style={styles.heading}>{paymentMode === 'undecided' ? 'Choose how this job will be paid' : paymentMode === 'buildpair' ? 'BuildPair payments' : 'Private payment arrangement'}</Text>
      {paymentMode === 'undecided' ? <>
        <Text style={styles.muted}>The quote and payment schedule are accepted. Choose whether payments will be processed through BuildPair or arranged privately.</Text>
        <AppCard elevated={false}>
          <Text variant="titleMedium" style={styles.heading}>Pay through BuildPair</Text>
          <Text>Stripe processes the agreed payments. Materials payments and deposits are transferred to the tradesperson when paid. Progress and final stages are transferred only after the tradesperson requests release and you approve it.</Text>
          <Text style={styles.muted}>BuildPair records the payment stages and release decisions but does not inspect the work. Check the agreed amount and completion point before making or approving a payment.</Text>
          <Text style={styles.muted}>BuildPair does not offer an escrow account or guarantee workmanship. Your legal and payment rights are not removed by using this workflow.</Text>
          {!confirmBuildPairPayments ? <Button mode="contained" icon="credit-card-check-outline" disabled={busy} onPress={() => setConfirmBuildPairPayments(true)}>Review & choose BuildPair payments</Button> : <AppCard elevated={false} style={styles.confirmBox}>
            <Text variant="titleSmall" style={styles.heading}>Confirm BuildPair payments</Text>
            <Text>I have reviewed the accepted quote and payment schedule. I understand that materials payments and deposits are transferred when paid, and that approving a progress or final stage instructs BuildPair to arrange transfer of that stage to the tradesperson.</Text>
            <View style={styles.row}><Button disabled={busy} onPress={() => setConfirmBuildPairPayments(false)}>Go back</Button><Button mode="contained" loading={busy} disabled={busy} onPress={() => void setPaymentMode('buildpair')}>Confirm & use BuildPair payments</Button></View>
          </AppCard>}
        </AppCard>
        {!confirmExternal ? <Button mode="outlined" onPress={() => setConfirmExternal(true)}>Arrange payments privately instead</Button> : <AppCard style={styles.externalCard} elevated={false}>
          <Text variant="titleMedium" style={styles.heading}>Use a private payment arrangement?</Text>
          <Text>Payments will be arranged directly between you and the tradesperson. BuildPair will keep the quote, messages, variations and project record but cannot process, pause, refund or recover money paid outside BuildPair.</Text>
          <View style={styles.row}><Button onPress={() => setConfirmExternal(false)}>Go back</Button><Button mode="contained" buttonColor={colors.danger} loading={busy} disabled={busy} onPress={() => void setPaymentMode('external')}>Use private payments</Button></View>
        </AppCard>}
      </> : paymentMode === 'buildpair' ? <Text style={styles.muted}>BuildPair processes one agreed stage at a time. Upfront materials payments and deposits are transferred when paid. For progress and final stages, pay the stage first, then approve transfer only after the tradesperson requests release and the agreed completion point has been reached.</Text> : <><Text style={styles.muted}>BuildPair is not processing this job’s payments. The agreed quote and project record remain here, but BuildPair payment-stage controls do not apply to money paid privately.</Text><Button mode="outlined" loading={busy} disabled={busy} onPress={() => void completeExternalJob()}>Mark privately managed job complete</Button></>}
    </AppCard> : null}

    {data.acceptedQuote ? <>
      <Text variant="titleLarge" style={styles.heading}>Awarded to {data.trader?.businessName ?? 'tradesperson'}</Text>
      <AppCard>
        <Text variant="headlineSmall">{formatMoney(data.acceptedQuote.totalAmount)}</Text>
        {data.acceptedQuote.scope ? <><Text variant="labelLarge">Agreed scope</Text><Text>{data.acceptedQuote.scope}</Text></> : null}
        {data.acceptedQuote.exclusions ? <><Text variant="labelLarge">Exclusions</Text><Text>{data.acceptedQuote.exclusions}</Text></> : null}
        <Text>{data.acceptedQuote.paymentTerms}</Text>
        <View style={styles.row}><Link href="/customer/messages" asChild><Button mode="outlined" icon="message-text-outline">Messages</Button></Link>{reportTraderHref ? <Link href={reportTraderHref} asChild><Button mode="text" icon="alert-outline" textColor={colors.danger}>Report this tradesperson</Button></Link> : null}</View>
      </AppCard>

      <Text variant="titleLarge" style={styles.heading}>Payment stages</Text>
      {orderedMilestones.map((milestone) => {
        const isNext = nextMilestone?.id === milestone.id;
        const canFund = paymentMode === 'buildpair' && isNext && milestone.status === 'pending';
        const canRelease = paymentMode === 'buildpair' && milestone.status === 'completed';
        const issueOpen = issueMilestoneId === milestone.id;
        const releaseConfirmOpen = confirmReleaseId === milestone.id;
        const minimumTooSmall = milestone.amount < 30;
        const immediateUpfront = milestone.kind === 'materials' || milestone.kind === 'deposit';
        return <AppCard key={milestone.id} style={isNext ? styles.currentStageCard : undefined}>
          <View style={styles.row}>
            <View style={styles.flex}><Text variant="titleMedium" style={styles.heading}>{milestone.title}</Text><Text style={styles.money}>{formatMoney(milestone.amount)}</Text>{milestone.triggerDescription ? <Text style={styles.muted}>{milestone.triggerDescription}</Text> : null}</View>
            <View style={styles.badges}>{isNext ? <Chip icon="arrow-right-circle-outline">Next</Chip> : null}<Chip>{milestone.kind}</Chip><Chip>{stageStatusLabel(milestone.status)}</Chip></View>
          </View>

          {paymentMode === 'buildpair' && immediateUpfront && milestone.status === 'pending' ? <Text style={styles.notice}>Upfront {milestone.kind === 'deposit' ? 'deposit' : 'materials'} payment. If you pay this through BuildPair, Stripe processes it and the amount is transferred to the tradesperson when payment succeeds. It is not subject to later stage approval.</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'pending' && !immediateUpfront ? <Text style={styles.muted}>{isNext ? 'Pay this stage through BuildPair. It will not be transferred to the tradesperson until they request release and you approve it.' : 'Complete the earlier stage first. BuildPair processes one payment stage at a time.'}</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'funded' ? <Text style={styles.notice}>Payment received ✓ No transfer to the tradesperson has been made for this stage. Waiting for a release request.</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'completed' ? <Text style={styles.notice}>Release requested. Check the agreed completion point before approving transfer.</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'paid' ? <Text style={styles.success}>Paid ✓ This stage has been transferred or released according to the agreed payment route.</Text> : null}
          {milestone.status === 'disputed' ? <Text style={styles.issue}>Release paused. {milestone.disputeReason || 'An issue has been raised and this stage needs resolving before any transfer is made.'}</Text> : null}
          {minimumTooSmall && canFund ? <HelperText type="error">Stripe’s minimum GBP charge is £0.30. This test stage is only {formatMoney(milestone.amount)}; use a test stage of at least £0.30.</HelperText> : null}
          {canFund && !minimumTooSmall ? <PayMilestoneButton milestoneId={milestone.id} onPaid={() => setTimeout(load, 1500)} /> : null}
          {canRelease && !releaseConfirmOpen ? <View style={styles.stageActions}><Button mode="contained" icon="check-circle-outline" disabled={Boolean(stageBusy)} onPress={() => { setConfirmReleaseId(milestone.id); setIssueMilestoneId(undefined); }}>Review release {formatMoney(milestone.amount)}</Button><Button mode="outlined" textColor={colors.danger} disabled={Boolean(stageBusy)} onPress={() => { setIssueMilestoneId(milestone.id); setIssueReason(''); setConfirmReleaseId(undefined); }}>Raise an issue</Button></View> : null}
          {canRelease && releaseConfirmOpen ? <AppCard elevated={false} style={styles.confirmBox}>
            <Text variant="titleSmall" style={styles.heading}>Approve release of {formatMoney(milestone.amount)}?</Text>
            <Text>By approving, you instruct BuildPair to arrange transfer of this stage to the tradesperson.</Text>
            <Text style={styles.muted}>Only approve if the agreed completion point has been reached. BuildPair does not inspect the work. Once transferred, the payment may not be reversible through BuildPair.</Text>
            <View style={styles.row}><Button disabled={Boolean(stageBusy)} onPress={() => setConfirmReleaseId(undefined)}>Go back</Button><Button mode="contained" icon="check-circle-outline" loading={stageBusy === milestone.id} disabled={Boolean(stageBusy)} onPress={() => void releaseStage(milestone.id)}>Approve & release {formatMoney(milestone.amount)}</Button></View>
          </AppCard> : null}
          {issueOpen ? <AppCard elevated={false} style={styles.issueBox}><Text variant="titleSmall" style={styles.heading}>Pause this release?</Text><Text style={styles.muted}>Explain what has not been completed or what needs resolving. BuildPair will record the issue and pause this unreleased stage.</Text><TextInput mode="outlined" label="What is the issue?" value={issueReason} onChangeText={setIssueReason} multiline /><View style={styles.row}><Button onPress={() => { setIssueMilestoneId(undefined); setIssueReason(''); }}>Cancel</Button><Button mode="contained" buttonColor={colors.danger} disabled={issueReason.trim().length < 10 || Boolean(stageBusy)} onPress={() => void disputeStage(milestone.id)}>Pause release</Button></View></AppCard> : null}
          {paymentMode === 'external' && milestone.status !== 'paid' ? <Text style={styles.externalText}>Private payment arrangement. BuildPair is not processing this stage.</Text> : null}
        </AppCard>;
      })}
    </> : data.job.status === 'cancelled' ? <EmptyState title="Job cancelled" body="This job is closed and will no longer receive quotes." /> : <EmptyState title="No quote accepted" body="Compare quotes when they arrive, then accept the best fit, not just the cheapest number." />}

    {data.timeline?.length ? <><Text variant="titleLarge" style={styles.heading}>Project timeline</Text><AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={styles.timelineCopy}><Text variant="titleSmall" style={styles.heading}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.timelineLine} /> : null}</View>)}</AppCard></> : null}

    {data.variations?.length ? <><Text variant="titleLarge" style={styles.heading}>Approved changes & variations</Text>{data.variations.map((variation) => <AppCard key={variation.id}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.heading}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View><View style={styles.row}><Text>Price change: <Text style={styles.money}>{variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)}</Text></Text><Text>Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} day{Math.abs(variation.durationDeltaDays) === 1 ? '' : 's'}</Text></View>{variation.status === 'pending' ? <View style={styles.row}><Button mode="outlined" textColor={colors.danger} disabled={busy} onPress={() => void variationAction(variation.id, 'decline')}>Decline</Button><Button mode="contained" disabled={busy} onPress={() => void variationAction(variation.id, 'accept')}>Approve variation</Button></View> : null}</AppCard>)}</> : null}

    {data.existingReview ? <AppCard><Text variant="titleMedium">Review submitted ✓</Text><Text style={styles.muted}>Your verified review is now on the tradesperson’s public profile.</Text></AppCard> : null}
    {reviewAllowed ? <AppCard><Text variant="titleMedium">Leave a verified review</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Button key={star} compact mode={rating === star ? 'contained' : 'outlined'} onPress={() => setRating(star)}>{star}★</Button>)}</View><TextInput label="What was the work and how did it go?" value={comment} onChangeText={setComment} mode="outlined" multiline /><Button mode="contained" loading={busy} disabled={comment.trim().length < 10 || busy} onPress={() => void review()}>Publish verified review</Button></AppCard> : null}
    {error ? <HelperText type="error">{error}</HelperText> : null}
    <Divider />
  </Screen>;
}

function stageStatusLabel(status: PaymentStageStatus) {
  if (status === 'pending') return 'Awaiting funding';
  if (status === 'funded') return 'Funded';
  if (status === 'completed') return 'Release requested';
  if (status === 'paid') return 'Released';
  return 'Issue raised';
}

function HomeownerNextStep({ data, jobId, reviewAllowed }: { data: Detail; jobId: string; reviewAllowed: boolean }) {
  if (data.job.status === 'cancelled') return <AppCard style={styles.nextCard}><Chip icon="close-circle-outline">Closed</Chip><Text variant="titleLarge" style={styles.heading}>This job is cancelled</Text><Text style={styles.muted}>The record remains here, but no further quote or project action is expected.</Text></AppCard>;
  if (!data.acceptedQuote) return <AppCard style={styles.nextCard}><Chip icon={data.job.status === 'quoted' ? 'file-document-check-outline' : 'clock-outline'}>{data.job.status === 'quoted' ? 'Quote received' : 'Awaiting response'}</Chip><Text variant="titleLarge" style={styles.heading}>{data.job.status === 'quoted' ? 'Next: review the quote and payment stages' : 'Next: quote now or a site visit first'}</Text><Text style={styles.muted}>{data.job.status === 'quoted' ? 'Compare total price, scope, exclusions, timing and the proposed payment stages. You can propose a different stage split without changing the tradesperson’s quote total.' : 'A tradesperson may quote from the details, ask questions, or propose a site visit before pricing. Nothing is awarded until you accept a formal BuildPair quote.'}</Text>{data.job.status === 'quoted' ? <Link href={`/customer/compare/${jobId}` as Href} asChild><Button mode="contained" icon="compare">Review quotes</Button></Link> : null}</AppCard>;
  if (data.job.status === 'in_progress') {
    const current = [...data.milestones].sort((a, b) => a.sortOrder - b.sortOrder).find((stage) => stage.status !== 'paid');
    const title = data.job.paymentMode === 'undecided' ? 'Next: choose how payments will be managed' : data.job.paymentMode === 'external' ? 'Private payment route selected' : current ? `Next: ${current.title}` : 'All payment stages are released';
    return <AppCard style={styles.nextCard}><Chip icon="briefcase-check-outline">Active project</Chip><Text variant="titleLarge" style={styles.heading}>{title}</Text><Text style={styles.muted}>{data.job.paymentMode === 'undecided' ? 'The quote is accepted. Choose BuildPair payments or a private arrangement below.' : data.job.paymentMode === 'external' ? 'Keep messages and variations here, but BuildPair cannot process or verify payments made privately.' : current?.status === 'pending' ? 'Pay the highlighted stage below. BuildPair processes one stage at a time.' : current?.status === 'funded' ? 'Payment has been received for this stage. The tradesperson now needs to reach the agreed completion point and request release.' : current?.status === 'completed' ? 'Review the agreed completion point below, then approve release or raise an issue.' : current?.status === 'disputed' ? 'This stage is paused while the issue is resolved.' : 'The payment schedule is complete. The tradesperson can finish the project record.'}</Text></AppCard>;
  }
  if (data.job.status === 'completed') return <AppCard style={styles.nextCard}><Chip icon="flag-checkered">Completed</Chip><Text variant="titleLarge" style={styles.heading}>{reviewAllowed ? 'Next: leave your verified review' : 'Project complete'}</Text><Text style={styles.muted}>{reviewAllowed ? 'Your payment and project history stay attached to this job, so your review can reflect the completed work.' : 'The completed quote, messages, variations and payment history remain together here.'}</Text></AppCard>;
  return null;
}

const styles = StyleSheet.create({
  nextCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  protectionCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  externalCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  currentStageCard: { borderColor: colors.primary, borderWidth: 2 },
  issueBox: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  confirmBox: { backgroundColor: colors.surfaceSoft, borderColor: colors.primary },
  heading: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  notice: { color: colors.charcoalSoft, lineHeight: 21, fontWeight: '700' },
  success: { color: colors.accentDark, lineHeight: 21, fontWeight: '800' },
  issue: { color: colors.danger, lineHeight: 21, fontWeight: '800' },
  externalText: { color: colors.warning, fontWeight: '700' },
  money: { color: colors.primary, fontWeight: '900', fontSize: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  badges: { gap: 4, alignItems: 'flex-end' },
  stageActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cancelBox: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceSoft },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 150, height: 120, borderRadius: 12 },
  stars: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timelineRow: { position: 'relative', flexDirection: 'row', gap: 12, paddingBottom: 18 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, marginTop: 3, zIndex: 2 },
  timelineCopy: { flex: 1, minWidth: 220 },
  timelineLine: { position: 'absolute', left: 7, top: 19, bottom: 0, width: 2, backgroundColor: colors.border },
});