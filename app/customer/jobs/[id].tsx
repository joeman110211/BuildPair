import { useAuth } from '@clerk/expo';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
// Metro and TypeScript resolve the .native/.web implementations; ESLint's generic resolver does not.
// eslint-disable-next-line import/no-unresolved
import { PayMilestoneButton } from '@/components/PayMilestoneButton';
// eslint-disable-next-line import/no-unresolved
import { ReleaseAndFundButton } from '@/components/ReleaseAndFundButton';
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

type PaymentDispute = {
  id: string;
  jobId: string;
  milestoneId: string;
  paymentId: string;
  customerId: string;
  traderId: string;
  status: 'open' | 'responded' | 'escalated' | 'resolved_release';
  reason: string;
  traderResponse?: string | null;
  escalationNote?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
};

type SiteDetails = {
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  county: string | null;
  postcode: string | null;
  phone: string | null;
  confirmedAt: string | null;
  complete: boolean;
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [data, setData] = useState<Detail>();
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [siteDetails, setSiteDetails] = useState<SiteDetails>();
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
  const [escalateMilestoneId, setEscalateMilestoneId] = useState<string>();
  const [escalationNote, setEscalationNote] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [townCity, setTownCity] = useState('');
  const [county, setCounty] = useState('');
  const [sitePostcode, setSitePostcode] = useState('');
  const [sitePhone, setSitePhone] = useState('');

  const load = useCallback(async () => {
    try {
      const detail = await apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken);
      setData(detail);
      setError('');
      if (detail.acceptedQuote) {
        const [disputeResult, siteResult] = await Promise.allSettled([
          apiFetch<{ disputes: PaymentDispute[] }>(`/api/payments/disputes?jobId=${encodeURIComponent(id)}`, {}, getToken),
          apiFetch<{ siteDetails: SiteDetails }>(`/api/jobs/${id}/site-details`, {}, getToken),
        ]);
        if (disputeResult.status === 'fulfilled') setDisputes(disputeResult.value.disputes);
        if (siteResult.status === 'fulfilled') setSiteDetails(siteResult.value.siteDetails);
      }
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken, id]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!siteDetails) return;
    setAddressLine1((value) => value || siteDetails.addressLine1 || '');
    setAddressLine2((value) => value || siteDetails.addressLine2 || '');
    setTownCity((value) => value || siteDetails.townCity || '');
    setCounty((value) => value || siteDetails.county || '');
    setSitePostcode((value) => value || siteDetails.postcode || '');
    setSitePhone((value) => value || siteDetails.phone || '');
  }, [siteDetails]);

  async function review() {
    if (!data?.acceptedQuote) return;
    try {
      setBusy(true); setError('');
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

  async function saveSiteDetails() {
    try {
      setBusy(true); setError('');
      const result = await apiFetch<{ siteDetails: SiteDetails }>(`/api/jobs/${id}/site-details`, {
        method: 'POST',
        body: JSON.stringify({ addressLine1, addressLine2, townCity, county, postcode: sitePostcode, phone: sitePhone }),
      }, getToken);
      setSiteDetails(result.siteDetails);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function openDispute(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/payments/disputes', { method: 'POST', body: JSON.stringify({ action: 'open', milestoneId, reason: issueReason }) }, getToken);
      setIssueMilestoneId(undefined); setIssueReason(''); setConfirmReleaseId(undefined);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  async function resolveDispute(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/payments/disputes', { method: 'POST', body: JSON.stringify({ action: 'resolve_release', milestoneId }) }, getToken);
      await load();
      setConfirmReleaseId(milestoneId);
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  async function escalateDispute(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/payments/disputes', { method: 'POST', body: JSON.stringify({ action: 'escalate', milestoneId, note: escalationNote }) }, getToken);
      setEscalateMilestoneId(undefined); setEscalationNote('');
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
  const chargedTotal = orderedMilestones.filter((stage) => stage.status !== 'pending').reduce((sum, stage) => sum + stage.amount, 0);
  const releasedTotal = orderedMilestones.filter((stage) => stage.status === 'paid').reduce((sum, stage) => sum + stage.amount, 0);
  const securedTotal = orderedMilestones.filter((stage) => ['funded', 'completed', 'disputed'].includes(stage.status)).reduce((sum, stage) => sum + stage.amount, 0);
  const remainingTotal = orderedMilestones.filter((stage) => stage.status === 'pending').reduce((sum, stage) => sum + stage.amount, 0);
  const firstIndex = nextMilestone ? orderedMilestones.findIndex((stage) => stage.id === nextMilestone.id) : -1;
  const groupedInitial = firstIndex >= 0 && nextMilestone?.kind === 'materials' && nextMilestone.status === 'pending'
    ? orderedMilestones[firstIndex + 1]?.status === 'pending' && orderedMilestones[firstIndex + 1]?.kind !== 'materials'
      ? [nextMilestone, orderedMilestones[firstIndex + 1]] as [Milestone, Milestone]
      : null
    : null;

  return <Screen title={data.job.title} subtitle={`${data.job.category} · ${data.job.status.replace('_', ' ')}`}>
    <HomeownerNextStep data={data} jobId={id} reviewAllowed={reviewAllowed} />
    {error ? <AppCard style={styles.errorCard}><HelperText type="error" visible>{error}</HelperText></AppCard> : null}

    <AppCard>
      <View style={styles.row}><Chip>{data.job.propertyType}</Chip><Chip>{data.job.urgency}</Chip><Chip>{data.job.budgetRange}</Chip>{data.job.isEmergency ? <Chip icon="alert">Emergency</Chip> : null}</View>
      {location ? <Text variant="titleSmall">Job area: {location}</Text> : null}
      <Text>{data.job.description}</Text>
      {data.job.aiGeneratedSpec ? <Text variant="bodySmall" style={styles.muted}>Drafted with AI and approved by you.</Text> : null}
      {data.job.scheduledStartAt ? <Text style={styles.muted}>Scheduled start: {new Date(data.job.scheduledStartAt).toLocaleDateString('en-GB')}</Text> : null}
      {cancellable && !confirmCancel ? <Button mode="outlined" textColor={colors.danger} onPress={() => setConfirmCancel(true)}>Cancel job</Button> : null}
      {cancellable && confirmCancel ? <View style={styles.cancelBox}><Text variant="titleSmall">Cancel this job?</Text><Text style={styles.muted}>Pending quotes will be declined and the job will stop appearing to tradespeople.</Text><View style={styles.row}><Button onPress={() => setConfirmCancel(false)} disabled={busy}>Keep job</Button><Button mode="contained" buttonColor={colors.danger} loading={busy} disabled={busy} onPress={() => void cancelJob()}>Confirm cancellation</Button></View></View> : null}
    </AppCard>

    {data.job.photos?.length ? <View style={styles.gallery}>{data.job.photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.photo} />)}</View> : null}

    {data.acceptedQuote && data.job.status === 'in_progress' ? <AppCard style={paymentMode === 'external' ? styles.externalCard : styles.protectionCard}>
      <Text variant="titleLarge" style={styles.heading}>{paymentMode === 'undecided' ? 'Choose how this job will be paid' : paymentMode === 'buildpair' ? 'BuildPay staged payments' : 'Private payment arrangement'}</Text>
      {paymentMode === 'undecided' ? <>
        <Text style={styles.muted}>The quote and payment schedule are agreed. Choose BuildPay to fund agreed stages through Stripe, or arrange payments privately.</Text>
        <AppCard elevated={false}>
          <Text variant="titleMedium" style={styles.heading}>Use BuildPay</Text>
          <Text>For a staged quote with materials, the materials amount and first work stage are funded together. Materials are released to the tradesperson's connected Stripe account. The first work stage stays secured until the agreed completion point is reached and you approve release.</Text>
          <Text style={styles.muted}>Later stages are funded only when they become due. BuildPair's 1% fee applies to labour/service only and is spread across service-stage payouts. Stripe processing costs are recovered from service payouts.</Text>
          <Text style={styles.muted}>BuildPair records funding and release decisions but is not a legal escrow service and does not inspect the work.</Text>
          {!confirmBuildPairPayments ? <Button mode="contained" icon="shield-lock-outline" disabled={busy} onPress={() => setConfirmBuildPairPayments(true)}>Choose BuildPay</Button> : <AppCard elevated={false} style={styles.confirmBox}>
            <Text variant="titleSmall" style={styles.heading}>Confirm BuildPay staged payments</Text>
            <Text>I understand that materials are released when paid, while work-stage money remains secured until the agreed stage is completed and I approve release.</Text>
            <View style={styles.row}><Button disabled={busy} onPress={() => setConfirmBuildPairPayments(false)}>Go back</Button><Button mode="contained" loading={busy} disabled={busy} onPress={() => void setPaymentMode('buildpair')}>Confirm BuildPay</Button></View>
          </AppCard>}
        </AppCard>
        {!confirmExternal ? <Button mode="outlined" onPress={() => setConfirmExternal(true)}>Arrange payments privately instead</Button> : <AppCard style={styles.externalCard} elevated={false}>
          <Text variant="titleMedium" style={styles.heading}>Use a private payment arrangement?</Text>
          <Text>Payments will be arranged directly between you and the tradesperson. BuildPair keeps the quote, messages, variations and project record but cannot process, pause, refund or recover money paid outside BuildPair.</Text>
          <View style={styles.row}><Button onPress={() => setConfirmExternal(false)}>Go back</Button><Button mode="contained" buttonColor={colors.danger} loading={busy} disabled={busy} onPress={() => void setPaymentMode('external')}>Use private payments</Button></View>
        </AppCard>}
      </> : paymentMode === 'buildpair' ? <Text style={styles.muted}>Materials are released to the tradesperson's Stripe account for procurement. Work stages remain secured until their recorded completion point is reached and you approve release. After a non-final release, BuildPay takes you straight to funding the next agreed stage.</Text> : <><Text style={styles.muted}>BuildPair is not processing this job's payments. The project record remains here, but BuildPay controls do not apply to money paid privately.</Text><Button mode="outlined" loading={busy} disabled={busy} onPress={() => void completeExternalJob()}>Mark privately managed job complete</Button></>}
    </AppCard> : null}

    {data.acceptedQuote ? <>
      <Text variant="titleLarge" style={styles.heading}>Awarded to {data.trader?.businessName ?? 'tradesperson'}</Text>
      <AppCard>
        <Text variant="headlineSmall" style={styles.money}>{formatMoney(data.acceptedQuote.totalAmount)}</Text>
        <View style={styles.row}><Text>Materials: <Text style={styles.strong}>{formatMoney(data.acceptedQuote.materialsCost)}</Text></Text><Text>Labour/service: <Text style={styles.strong}>{formatMoney(data.acceptedQuote.laborCost)}</Text></Text>{data.acceptedQuote.vatAmount ? <Text>VAT: <Text style={styles.strong}>{formatMoney(data.acceptedQuote.vatAmount)}</Text></Text> : null}</View>
        {data.acceptedQuote.scope ? <><Text variant="labelLarge">Agreed scope</Text><Text>{data.acceptedQuote.scope}</Text></> : null}
        {data.acceptedQuote.exclusions ? <><Text variant="labelLarge">Exclusions</Text><Text>{data.acceptedQuote.exclusions}</Text></> : null}
        <Text style={styles.muted}>{data.acceptedQuote.paymentTerms}</Text>
        <View style={styles.row}><Link href="/customer/messages" asChild><Button mode="outlined" icon="message-text-outline">Messages</Button></Link>{reportTraderHref ? <Link href={reportTraderHref} asChild><Button mode="text" icon="alert-outline" textColor={colors.danger}>Report this tradesperson</Button></Link> : null}</View>
      </AppCard>

      {data.job.status === 'in_progress' ? <AppCard style={!siteDetails?.complete ? styles.currentStageCard : undefined}>
        <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.heading}>Worksite & contact details</Text><Text style={styles.muted}>Private. Shared only with the tradesperson awarded this job so they know exactly where to attend and how to contact you.</Text></View><Chip icon={siteDetails?.complete ? 'check-circle-outline' : 'map-marker-alert-outline'}>{siteDetails?.complete ? 'Confirmed' : 'Confirm before visit'}</Chip></View>
        <TextInput mode="outlined" label="Address line 1" value={addressLine1} onChangeText={setAddressLine1} />
        <TextInput mode="outlined" label="Address line 2 (optional)" value={addressLine2} onChangeText={setAddressLine2} />
        <View style={styles.row}><TextInput style={styles.halfInput} mode="outlined" label="Town / city" value={townCity} onChangeText={setTownCity} /><TextInput style={styles.halfInput} mode="outlined" label="County (optional)" value={county} onChangeText={setCounty} /></View>
        <View style={styles.row}><TextInput style={styles.halfInput} mode="outlined" autoCapitalize="characters" label="Postcode" value={sitePostcode} onChangeText={setSitePostcode} /><TextInput style={styles.halfInput} mode="outlined" keyboardType="phone-pad" label="Contact number" value={sitePhone} onChangeText={setSitePhone} /></View>
        <Button mode="contained" icon="map-marker-check-outline" loading={busy} disabled={busy || addressLine1.trim().length < 3 || townCity.trim().length < 2 || sitePostcode.trim().length < 5 || sitePhone.trim().length < 10} onPress={() => void saveSiteDetails()}>{siteDetails?.complete ? 'Update private site details' : 'Confirm private site details'}</Button>
      </AppCard> : null}

      <Text variant="titleLarge" style={styles.heading}>BuildPay progress</Text>
      <AppCard style={styles.timelineCard}>
        <MilestoneTimeline items={orderedMilestones.map((milestone) => ({ id: milestone.id, title: milestone.title, amount: milestone.amount, kind: milestone.kind, trigger: milestone.triggerDescription, status: milestone.status }))} />
        {paymentMode === 'buildpair' ? <>
          <View style={styles.moneySummary}>
            <SummaryMetric label="Charged so far" value={chargedTotal} />
            <SummaryMetric label="Released" value={releasedTotal} />
            <SummaryMetric label="Secured / paused" value={securedTotal} />
            <SummaryMetric label="Not yet funded" value={remainingTotal} />
          </View>
          <View style={styles.trustBox}><Chip compact icon="shield-check-outline">Payment record</Chip><Text style={styles.muted}>Released means BuildPair has instructed Stripe to transfer that stage to the tradesperson's connected Stripe account. Secured means the homeowner payment is confirmed but has not been transferred. Bank payout timing is handled by Stripe.</Text></View>
        </> : null}
      </AppCard>

      <Text variant="titleLarge" style={styles.heading}>Stage actions</Text>
      {orderedMilestones.map((milestone, index) => {
        const isNext = nextMilestone?.id === milestone.id;
        const canFund = paymentMode === 'buildpair' && isNext && milestone.status === 'pending';
        const canRelease = paymentMode === 'buildpair' && milestone.status === 'completed';
        const issueOpen = issueMilestoneId === milestone.id;
        const releaseConfirmOpen = confirmReleaseId === milestone.id;
        const minimumTooSmall = milestone.amount < 30;
        const immediateMaterials = milestone.kind === 'materials';
        const activeDispute = disputes.find((item) => item.milestoneId === milestone.id && ['open', 'responded', 'escalated'].includes(item.status));
        const nextAfterRelease = orderedMilestones[index + 1]?.status === 'pending' ? orderedMilestones[index + 1] : undefined;
        const isGroupedInitialMaterial = groupedInitial?.[0].id === milestone.id;
        const groupedAmount = groupedInitial ? groupedInitial[0].amount + groupedInitial[1].amount : 0;
        return <AppCard key={milestone.id} style={isNext ? styles.currentStageCard : undefined}>
          <View style={styles.row}>
            <View style={styles.flex}><Text variant="titleMedium" style={styles.heading}>{milestone.title}</Text><Text style={styles.money}>{formatMoney(milestone.amount)}</Text>{milestone.triggerDescription ? <Text style={styles.muted}>{milestone.triggerDescription}</Text> : null}</View>
            <View style={styles.badges}>{isNext ? <Chip icon="arrow-right-circle-outline">Current</Chip> : null}<Chip>{stageStatusLabel(milestone.status)}</Chip></View>
          </View>

          {paymentMode === 'buildpair' && immediateMaterials && milestone.status === 'pending' ? <Text style={styles.notice}>{isGroupedInitialMaterial ? `Initial funding: ${formatMoney(groupedAmount)} total. ${formatMoney(groupedInitial![0].amount)} for materials will be released to the tradesperson's Stripe account and ${formatMoney(groupedInitial![1].amount)} for the first work stage will remain secured.` : 'When Stripe confirms this materials payment, BuildPair releases the exact quoted materials amount to the tradesperson’s connected Stripe account for procurement.'}</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'pending' && !immediateMaterials ? <Text style={styles.muted}>{isNext ? 'Fund this stage. It stays secured until the agreed completion point is reached and you approve release.' : 'Not yet funded. It unlocks after the previous stage is approved and released.'}</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'funded' ? <Text style={styles.notice}>Secured ✓ Your payment is confirmed. No transfer has been made for this work stage. Waiting for the tradesperson to reach the agreed completion point.</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'completed' ? <Text style={styles.notice}>Approval needed. Check the agreed completion point, then release the stage or raise an issue.</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'paid' ? <Text style={styles.success}>Released ✓ BuildPair has instructed Stripe to transfer this stage according to the agreed payment route.</Text> : null}
          {milestone.status === 'disputed' ? <Text style={styles.issue}>Release paused. The money remains unreleased while the issue is resolved.</Text> : null}

          {minimumTooSmall && canFund ? <HelperText type="error">Stripe's minimum GBP charge is £0.30. Revise this stage before trying to fund it.</HelperText> : null}
          {canFund && !minimumTooSmall && isGroupedInitialMaterial ? <PayMilestoneButton milestoneIds={groupedInitial!.map((stage) => stage.id)} label={`Fund materials + first work stage ${formatMoney(groupedAmount)}`} onPaid={() => setTimeout(load, 1500)} onError={setError} /> : null}
          {canFund && !minimumTooSmall && !isGroupedInitialMaterial ? <PayMilestoneButton milestoneId={milestone.id} label={`Fund ${formatMoney(milestone.amount)} through BuildPay`} onPaid={() => setTimeout(load, 1500)} onError={setError} /> : null}

          {canRelease && !releaseConfirmOpen && !issueOpen ? <View style={styles.stageActions}>
            <Button mode="contained" icon="check-circle-outline" disabled={Boolean(stageBusy)} onPress={() => { setConfirmReleaseId(milestone.id); setIssueMilestoneId(undefined); }}>Review release {formatMoney(milestone.amount)}</Button>
            <Button mode="outlined" textColor={colors.danger} disabled={Boolean(stageBusy)} onPress={() => { setIssueMilestoneId(milestone.id); setIssueReason(''); setConfirmReleaseId(undefined); }}>Raise an issue</Button>
          </View> : null}

          {canRelease && releaseConfirmOpen ? <AppCard elevated={false} style={styles.confirmBox}>
            <Text variant="titleSmall" style={styles.heading}>{nextAfterRelease ? 'Approve this stage and fund the next one?' : 'Approve the final release?'}</Text>
            <Text>{nextAfterRelease ? `${formatMoney(milestone.amount)} will be released for this completed stage. You will then be taken straight to Stripe to fund the next agreed stage of ${formatMoney(nextAfterRelease.amount)}. The next payment is not taken unless you complete that Stripe payment.` : `Approving instructs BuildPair to release the applicable payout for this final ${formatMoney(milestone.amount)} stage.`}</Text>
            <Text style={styles.muted}>Only approve if the recorded completion point has genuinely been reached. BuildPair will show any release error here rather than silently failing.</Text>
            <View style={styles.stageActions}><Button onPress={() => setConfirmReleaseId(undefined)}>Go back</Button><Button mode="outlined" textColor={colors.danger} onPress={() => { setIssueMilestoneId(milestone.id); setIssueReason(''); setConfirmReleaseId(undefined); }}>Raise an issue</Button></View>
            <ReleaseAndFundButton releaseMilestoneId={milestone.id} releaseAmount={milestone.amount} nextMilestoneId={nextAfterRelease?.id} nextAmount={nextAfterRelease?.amount} onDone={() => { setConfirmReleaseId(undefined); setTimeout(load, 1000); }} />
          </AppCard> : null}

          {issueOpen && !activeDispute ? <AppCard elevated={false} style={styles.issueBox}>
            <Text variant="titleSmall" style={styles.heading}>Pause this release?</Text>
            <Text style={styles.muted}>Explain what has not been completed or what needs resolving. The funded stage stays paused and is not released to the tradesperson.</Text>
            <TextInput mode="outlined" label="What is the issue?" value={issueReason} onChangeText={setIssueReason} multiline />
            <View style={styles.row}><Button onPress={() => { setIssueMilestoneId(undefined); setIssueReason(''); }}>Cancel</Button><Button mode="contained" buttonColor={colors.danger} loading={stageBusy === milestone.id} disabled={issueReason.trim().length < 10 || Boolean(stageBusy)} onPress={() => void openDispute(milestone.id)}>Pause release & open issue</Button></View>
          </AppCard> : null}

          {activeDispute ? <AppCard elevated={false} style={styles.issueBox}>
            <View style={styles.row}><Text variant="titleSmall" style={styles.heading}>BuildPay issue</Text><Chip icon="alert-circle-outline">{disputeStatusLabel(activeDispute.status)}</Chip></View>
            <Text variant="labelLarge">Your issue</Text><Text>{activeDispute.reason}</Text>
            {activeDispute.traderResponse ? <><Text variant="labelLarge">Tradesperson response</Text><Text>{activeDispute.traderResponse}</Text></> : <Text style={styles.muted}>Waiting for the tradesperson to respond. The stage remains paused.</Text>}
            {activeDispute.escalationNote ? <><Text variant="labelLarge">Escalation note</Text><Text>{activeDispute.escalationNote}</Text></> : null}
            <View style={styles.stageActions}><Button mode="contained" loading={stageBusy === milestone.id} disabled={Boolean(stageBusy)} onPress={() => void resolveDispute(milestone.id)}>Issue resolved · continue to release</Button>{activeDispute.status !== 'escalated' ? <Button mode="outlined" textColor={colors.danger} disabled={Boolean(stageBusy)} onPress={() => { setEscalateMilestoneId(milestone.id); setEscalationNote(''); }}>Escalate</Button> : null}</View>
            {escalateMilestoneId === milestone.id ? <View style={styles.escalateBox}><TextInput mode="outlined" label="Why does this need BuildPair review?" value={escalationNote} onChangeText={setEscalationNote} multiline /><View style={styles.row}><Button onPress={() => setEscalateMilestoneId(undefined)}>Cancel</Button><Button mode="contained" buttonColor={colors.danger} loading={stageBusy === milestone.id} disabled={escalationNote.trim().length < 10 || Boolean(stageBusy)} onPress={() => void escalateDispute(milestone.id)}>Escalate issue</Button></View></View> : null}
          </AppCard> : null}

          {paymentMode === 'external' && milestone.status !== 'paid' ? <Text style={styles.externalText}>Private payment arrangement. BuildPair is only recording project progress.</Text> : null}
        </AppCard>;
      })}
    </> : data.job.status === 'cancelled' ? <EmptyState title="Job cancelled" body="This job is closed and will no longer receive quotes." /> : <EmptyState title="No quote accepted" body="Compare quotes when they arrive, then accept the best fit, not just the cheapest number." />}

    {data.timeline?.length ? <><Text variant="titleLarge" style={styles.heading}>Project activity</Text><AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={styles.timelineCopy}><Text variant="titleSmall" style={styles.heading}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.timelineLine} /> : null}</View>)}</AppCard></> : null}

    {data.variations?.length ? <><Text variant="titleLarge" style={styles.heading}>Approved changes & variations</Text>{data.variations.map((variation) => <AppCard key={variation.id}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.heading}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View><View style={styles.row}><Text>Price change: <Text style={styles.money}>{variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)}</Text></Text><Text>Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} day{Math.abs(variation.durationDeltaDays) === 1 ? '' : 's'}</Text></View>{variation.status === 'pending' ? <View style={styles.row}><Button mode="outlined" textColor={colors.danger} disabled={busy} onPress={() => void variationAction(variation.id, 'decline')}>Decline</Button><Button mode="contained" disabled={busy} onPress={() => void variationAction(variation.id, 'accept')}>Approve variation</Button></View> : null}</AppCard>)}</> : null}

    {data.existingReview ? <AppCard><Text variant="titleMedium">Review submitted ✓</Text><Text style={styles.muted}>Your verified review is now on the tradesperson's public profile.</Text></AppCard> : null}
    {reviewAllowed ? <AppCard style={styles.reviewCard}><Chip icon="star-circle-outline">Final stage released</Chip><Text variant="titleLarge" style={styles.heading}>Rate the tradesperson</Text><Text style={styles.muted}>The BuildPay schedule is complete. Your review will be tied to this completed BuildPair project.</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Button key={star} compact mode={rating === star ? 'contained' : 'outlined'} onPress={() => setRating(star)}>{star}★</Button>)}</View><TextInput label="What was the work and how did it go?" value={comment} onChangeText={setComment} mode="outlined" multiline /><Button mode="contained" loading={busy} disabled={comment.trim().length < 10 || busy} onPress={() => void review()}>Publish verified review</Button></AppCard> : null}
    <Divider />
  </Screen>;
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return <View style={styles.summaryMetric}><Text variant="labelSmall" style={styles.muted}>{label}</Text><Text variant="titleMedium" style={styles.strong}>{formatMoney(value)}</Text></View>;
}

function stageStatusLabel(status: PaymentStageStatus) {
  if (status === 'pending') return 'Not funded';
  if (status === 'funded') return 'Secured';
  if (status === 'completed') return 'Release requested';
  if (status === 'paid') return 'Released';
  return 'Paused';
}

function disputeStatusLabel(status: PaymentDispute['status']) {
  if (status === 'responded') return 'Response received';
  if (status === 'escalated') return 'Escalated';
  if (status === 'resolved_release') return 'Resolved';
  return 'Open';
}

function HomeownerNextStep({ data, jobId, reviewAllowed }: { data: Detail; jobId: string; reviewAllowed: boolean }) {
  if (data.job.status === 'cancelled') return <AppCard style={styles.nextCard}><Chip icon="close-circle-outline">Closed</Chip><Text variant="titleLarge" style={styles.heading}>This job is cancelled</Text><Text style={styles.muted}>The record remains here, but no further quote or project action is expected.</Text></AppCard>;
  if (!data.acceptedQuote) return <AppCard style={styles.nextCard}><Chip icon={data.job.status === 'quoted' ? 'file-document-check-outline' : 'clock-outline'}>{data.job.status === 'quoted' ? 'Quote received' : 'Awaiting response'}</Chip><Text variant="titleLarge" style={styles.heading}>{data.job.status === 'quoted' ? 'Next: review price, scope and payment plan' : 'Next: quote or site visit'}</Text><Text style={styles.muted}>{data.job.status === 'quoted' ? 'Open the quote, compare costs and review the proposed payment schedule before accepting.' : 'A tradesperson may quote from the details, ask questions, or propose a site visit before pricing. Nothing is awarded until you accept a formal BuildPair quote.'}</Text>{data.job.status === 'quoted' ? <Link href={`/customer/compare/${jobId}` as Href} asChild><Button mode="contained" icon="compare">Review quotes</Button></Link> : null}</AppCard>;
  if (data.job.status === 'in_progress') {
    const current = [...data.milestones].sort((a, b) => a.sortOrder - b.sortOrder).find((stage) => stage.status !== 'paid');
    const title = data.job.paymentMode === 'undecided' ? 'Next: choose the payment route' : data.job.paymentMode === 'external' ? 'Private payment route selected' : current ? `Next: ${current.title}` : 'All BuildPay stages are released';
    const body = data.job.paymentMode === 'undecided' ? 'Choose BuildPay or a private payment arrangement below.' : data.job.paymentMode === 'external' ? 'Keep messages and variations here, but BuildPair cannot process or verify private payments.' : current?.status === 'pending' ? 'Fund the highlighted stage below. If this is the initial materials stage, BuildPay also secures the first work stage in the same checkout.' : current?.status === 'funded' ? 'This stage is secured. The tradesperson now needs to reach its agreed completion point.' : current?.status === 'completed' ? 'Review the completion point, then release the stage and fund the next one, or raise an issue.' : current?.status === 'disputed' ? 'This stage is paused. Review the issue and response below.' : 'The payment schedule is complete.';
    return <AppCard style={styles.nextCard}><Chip icon="briefcase-check-outline">Active project</Chip><Text variant="titleLarge" style={styles.heading}>{title}</Text><Text style={styles.muted}>{body}</Text></AppCard>;
  }
  if (data.job.status === 'completed') return <AppCard style={styles.nextCard}><Chip icon="flag-checkered">Completed</Chip><Text variant="titleLarge" style={styles.heading}>{reviewAllowed ? 'Next: leave your verified review' : 'Project complete'}</Text><Text style={styles.muted}>{reviewAllowed ? 'The final release is complete, so BuildPair has opened the verified review step below.' : 'The completed quote, messages, variations and payment history remain together here.'}</Text></AppCard>;
  return null;
}

const styles = StyleSheet.create({
  nextCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  protectionCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  externalCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  currentStageCard: { borderColor: colors.primary, borderWidth: 2 },
  timelineCard: { backgroundColor: colors.surfaceRaised },
  trustBox: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: colors.accentSoft },
  reviewCard: { borderColor: colors.primary, borderWidth: 2 },
  issueBox: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  confirmBox: { backgroundColor: colors.surfaceSoft, borderColor: colors.primary },
  errorCard: { borderColor: colors.danger, backgroundColor: colors.surfaceSoft },
  escalateBox: { gap: 8, paddingTop: 8 },
  heading: { color: colors.charcoal, fontWeight: '900' },
  strong: { color: colors.text, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  notice: { color: colors.charcoalSoft, lineHeight: 21, fontWeight: '700' },
  success: { color: colors.accentDark, lineHeight: 21, fontWeight: '800' },
  issue: { color: colors.danger, lineHeight: 21, fontWeight: '800' },
  externalText: { color: colors.warning, fontWeight: '700' },
  money: { color: colors.primary, fontWeight: '900', fontSize: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  badges: { gap: 4, alignItems: 'flex-end' },
  stageActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  cancelBox: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceSoft },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 150, height: 120, borderRadius: 12 },
  stars: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  halfInput: { flex: 1, minWidth: 180 },
  moneySummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  summaryMetric: { minWidth: 135, flexGrow: 1, padding: 10, borderRadius: 10, backgroundColor: colors.surfaceSoft },
  timelineRow: { position: 'relative', flexDirection: 'row', gap: 12, paddingBottom: 18 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, marginTop: 3, zIndex: 2 },
  timelineCopy: { flex: 1, minWidth: 220 },
  timelineLine: { position: 'absolute', left: 7, top: 19, bottom: 0, width: 2, backgroundColor: colors.border },
});
