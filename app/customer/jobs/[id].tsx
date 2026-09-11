import { useAuth } from '@clerk/expo';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
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

type ExternalPaymentRecord = {
  id: string;
  milestoneId: string;
  amount: number;
  payerConfirmedAt: string | null;
  recipientConfirmedAt: string | null;
  payerNote: string;
  recipientNote: string;
};

type PaymentDispute = {
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  disputeReason: string | null;
  disputeStatus: 'open' | 'trader_response' | 'escalated' | 'resolved';
  disputeResponse: string | null;
  disputeResponseAt: string | null;
  disputeEscalatedAt: string | null;
  disputeResolvedAt: string | null;
  disputeResolutionNote: string | null;
  refundRequestedAt: string | null;
  refundApprovedAt: string | null;
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
  const [externalPayments, setExternalPayments] = useState<ExternalPaymentRecord[]>([]);
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmExternal, setConfirmExternal] = useState(false);
  const [confirmBuildPay, setConfirmBuildPay] = useState(false);
  const [confirmReleaseId, setConfirmReleaseId] = useState<string>();
  const [issueMilestoneId, setIssueMilestoneId] = useState<string>();
  const [issueReason, setIssueReason] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  const load = useCallback(async () => {
    try {
      const detail = await apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken);
      setData(detail);
      if (detail.acceptedQuote) {
        const [externalResult, disputeResult] = await Promise.allSettled([
          apiFetch<ExternalPaymentRecord[]>(`/api/external-payments?jobId=${encodeURIComponent(id)}`, {}, getToken),
          apiFetch<PaymentDispute[]>(`/api/payment-disputes?jobId=${encodeURIComponent(id)}`, {}, getToken),
        ]);
        setExternalPayments(externalResult.status === 'fulfilled' ? externalResult.value : []);
        setDisputes(disputeResult.status === 'fulfilled' ? disputeResult.value : []);
      } else {
        setExternalPayments([]);
        setDisputes([]);
      }
      setError('');
    } catch (e) { setError(errorMessage(e)); }
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
      setConfirmBuildPay(false);
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

  async function directPaymentConfirm(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/external-payments', { method: 'POST', body: JSON.stringify({ milestoneId, action: 'confirm_direct_payment', note: 'Homeowner confirms this payment was made directly to the tradesperson outside BuildPay.' }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  async function disputeAction(milestoneId: string, action: 'resolve' | 'request_refund' | 'escalate') {
    const fallback = action === 'resolve' ? 'The issue has been resolved and I am ready to review release again.' : action === 'request_refund' ? 'I am requesting a refund of this unreleased stage while the issue is resolved.' : 'I want BuildPair admin to review the project record and help with this paused payment issue.';
    const note = resolutionNote.trim() || fallback;
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/payment-disputes', { method: 'POST', body: JSON.stringify({ milestoneId, action, note }) }, getToken);
      setResolutionNote('');
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
      {location ? <Text variant="titleSmall">Job area: {location}</Text> : null}
      <Text>{data.job.description}</Text>
      {data.job.aiGeneratedSpec ? <Text variant="bodySmall" style={styles.muted}>Drafted with AI and approved by you.</Text> : null}
      {data.job.scheduledStartAt ? <Text style={styles.muted}>Scheduled start: {new Date(data.job.scheduledStartAt).toLocaleDateString('en-GB')}</Text> : null}
      {data.acceptedQuote ? <Link href={`/customer/jobs/${id}/start` as Href} asChild><Button mode="text" icon="home-map-marker">Job address & payment setup</Button></Link> : null}
      {cancellable && !confirmCancel ? <Button mode="outlined" textColor={colors.danger} onPress={() => setConfirmCancel(true)}>Cancel job</Button> : null}
      {cancellable && confirmCancel ? <View style={styles.cancelBox}><Text variant="titleSmall">Cancel this job?</Text><Text style={styles.muted}>Pending quotes will be declined and the job will stop appearing to tradespeople.</Text><View style={styles.row}><Button onPress={() => setConfirmCancel(false)} disabled={busy}>Keep job</Button><Button mode="contained" buttonColor={colors.danger} loading={busy} disabled={busy} onPress={() => void cancelJob()}>Confirm cancellation</Button></View></View> : null}
    </AppCard>

    {data.job.photos?.length ? <View style={styles.gallery}>{data.job.photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.photo} />)}</View> : null}

    {data.acceptedQuote && data.job.status === 'in_progress' ? <AppCard style={paymentMode === 'external' ? styles.externalCard : styles.protectionCard}>
      <Text variant="titleLarge" style={styles.heading}>{paymentMode === 'undecided' ? 'Choose how to pay' : paymentMode === 'buildpair' ? 'BuildPay' : 'Direct payment'}</Text>
      {paymentMode === 'undecided' ? <>
        <Text style={styles.muted}>Your quote and payment schedule are agreed. Choose BuildPay for controlled stage payments or pay the tradesperson directly outside BuildPair.</Text>
        <AppCard elevated={false}>
          <Text variant="titleMedium" style={styles.heading}>Use BuildPay</Text>
          <Text>Stripe processes the payments. The exact materials amount is released for procurement. Deposits, progress stages and final funds stay controlled until their agreed completion point is reached and you approve release.</Text>
          <Text style={styles.muted}>BuildPair's platform fee is 1% of labour/service only, never materials or VAT. Stripe processing is recovered at cost from controlled service payouts.</Text>
          <Text style={styles.muted}>BuildPay is not described as escrow, and BuildPair does not inspect workmanship or decide whether work is satisfactory.</Text>
          {!confirmBuildPay ? <Button mode="contained" icon="shield-lock-outline" disabled={busy} onPress={() => setConfirmBuildPay(true)}>Choose BuildPay</Button> : <AppCard elevated={false} style={styles.confirmBox}>
            <Text variant="titleSmall" style={styles.heading}>Confirm BuildPay</Text>
            <Text>I have reviewed the payment stages. I understand materials are released when paid and controlled work stages need my release approval.</Text>
            <View style={styles.row}><Button disabled={busy} onPress={() => setConfirmBuildPay(false)}>Go back</Button><Button mode="contained" loading={busy} disabled={busy} onPress={() => void setPaymentMode('buildpair')}>Confirm BuildPay</Button></View>
          </AppCard>}
        </AppCard>
        {!confirmExternal ? <Button mode="outlined" onPress={() => setConfirmExternal(true)}>Pay tradesperson directly instead</Button> : <AppCard style={styles.externalCard} elevated={false}>
          <Text variant="titleMedium" style={styles.heading}>Use direct payments?</Text>
          <Text>Money is arranged directly between you and the tradesperson. BuildPair can keep the quote, messages, variations and optional two-party payment confirmations, but cannot process, protect, pause, refund or recover money it never handled.</Text>
          <Text style={styles.muted}>Direct payment does not remove either party's legal or contractual rights and responsibilities. BuildPair's role for the money is limited to the introduction and project record.</Text>
          <View style={styles.row}><Button onPress={() => setConfirmExternal(false)}>Go back</Button><Button mode="contained" buttonColor={colors.danger} loading={busy} disabled={busy} onPress={() => void setPaymentMode('external')}>Use direct payments</Button></View>
        </AppCard>}
      </> : paymentMode === 'buildpair' ? <Text style={styles.muted}>One stage unlocks at a time. Materials release when paid. Every controlled work stage stays protected until the tradesperson marks its agreed trigger complete and you approve release.</Text> : <><Text style={styles.muted}>BuildPair is not processing this job's money. Payment confirmations below are declarations by you and the tradesperson, not BuildPair verification or protection.</Text><Button mode="outlined" loading={busy} disabled={busy} onPress={() => void completeExternalJob()}>Mark directly paid job complete</Button></>}
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

      <Text variant="titleLarge" style={styles.heading}>{paymentMode === 'external' ? 'Project payment record' : 'BuildPay progress'}</Text>
      <AppCard style={styles.timelineCard}>
        <MilestoneTimeline items={orderedMilestones.map((milestone) => ({ id: milestone.id, title: milestone.title, amount: milestone.amount, kind: milestone.kind, trigger: milestone.triggerDescription, status: milestone.status }))} />
        {paymentMode === 'buildpair' ? <View style={styles.trustBox}><Chip compact icon="shield-check-outline">BuildPay record</Chip><Text style={styles.muted}>Green stages are released. The orange stage is the current action. Funded stages stay controlled until the release process is completed.</Text></View> : paymentMode === 'external' ? <View style={styles.directBox}><Chip compact icon="bank-transfer-out">Direct-payment record</Chip><Text style={styles.muted}>BuildPair does not handle the money. A stage moves to paid only after both sides confirm the direct payment.</Text></View> : null}
      </AppCard>

      <Text variant="titleLarge" style={styles.heading}>Stage actions</Text>
      {orderedMilestones.map((milestone) => {
        const isNext = nextMilestone?.id === milestone.id;
        const canFund = paymentMode === 'buildpair' && isNext && milestone.status === 'pending';
        const canRelease = paymentMode === 'buildpair' && milestone.status === 'completed';
        const issueOpen = issueMilestoneId === milestone.id;
        const releaseConfirmOpen = confirmReleaseId === milestone.id;
        const minimumTooSmall = milestone.amount < 30;
        const immediateMaterials = milestone.kind === 'materials';
        const externalRecord = externalPayments.find((record) => record.milestoneId === milestone.id);
        const dispute = disputes.find((item) => item.milestoneId === milestone.id);
        const directCanConfirm = paymentMode === 'external' && isNext && (milestone.kind === 'materials' || milestone.kind === 'deposit' || milestone.status === 'completed') && milestone.status !== 'paid';
        return <AppCard key={milestone.id} style={isNext ? styles.currentStageCard : undefined}>
          <View style={styles.row}>
            <View style={styles.flex}><Text variant="titleMedium" style={styles.heading}>{milestone.title}</Text><Text style={styles.money}>{formatMoney(milestone.amount)}</Text>{milestone.triggerDescription ? <Text style={styles.muted}>{milestone.triggerDescription}</Text> : null}</View>
            <View style={styles.badges}>{isNext ? <Chip icon="arrow-right-circle-outline">Current</Chip> : null}<Chip>{stageStatusLabel(milestone.status, paymentMode)}</Chip></View>
          </View>

          {paymentMode === 'buildpair' && immediateMaterials && milestone.status === 'pending' ? <Text style={styles.notice}>Materials payment. When Stripe confirms it, BuildPair releases the exact quoted materials amount to the tradesperson so procurement can start.</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'pending' && !immediateMaterials ? <Text style={styles.muted}>{isNext ? 'Fund this BuildPay stage. It will not transfer to the tradesperson until the agreed trigger is completed and you approve release.' : 'Locked until the previous stage is fully completed and approved.'}</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'funded' ? <Text style={styles.notice}>Funded ✓ No service-stage transfer has been made. Waiting for the tradesperson to reach the agreed release point.</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'completed' ? <Text style={styles.notice}>Approval needed. Check the agreed completion point before releasing this stage.</Text> : null}
          {paymentMode === 'buildpair' && milestone.status === 'paid' ? <Text style={styles.success}>Released ✓ This stage is complete in the BuildPay record.</Text> : null}
          {minimumTooSmall && canFund ? <HelperText type="error">Stripe's minimum GBP charge is £0.30. Revise this stage before trying to fund it.</HelperText> : null}
          {canFund && !minimumTooSmall ? <PayMilestoneButton milestoneId={milestone.id} onPaid={() => setTimeout(load, 1500)} /> : null}
          {canRelease && !releaseConfirmOpen ? <View style={styles.stageActions}><Button mode="contained" icon="check-circle-outline" disabled={Boolean(stageBusy)} onPress={() => { setConfirmReleaseId(milestone.id); setIssueMilestoneId(undefined); }}>Review release {formatMoney(milestone.amount)}</Button><Button mode="outlined" textColor={colors.danger} disabled={Boolean(stageBusy)} onPress={() => { setIssueMilestoneId(milestone.id); setIssueReason(''); setConfirmReleaseId(undefined); }}>Raise an issue</Button></View> : null}
          {canRelease && releaseConfirmOpen ? <AppCard elevated={false} style={styles.confirmBox}>
            <Text variant="titleSmall" style={styles.heading}>Approve this completed stage?</Text>
            <Text>Approving instructs BuildPair to release the applicable tradesperson payout through Stripe. Only approve if the agreed completion point has genuinely been reached.</Text>
            <View style={styles.row}><Button disabled={Boolean(stageBusy)} onPress={() => setConfirmReleaseId(undefined)}>Go back</Button><Button mode="contained" icon="check-circle-outline" loading={stageBusy === milestone.id} disabled={Boolean(stageBusy)} onPress={() => void releaseStage(milestone.id)}>Approve & release</Button></View>
          </AppCard> : null}
          {issueOpen ? <AppCard elevated={false} style={styles.issueBox}><Text variant="titleSmall" style={styles.heading}>Pause this release?</Text><Text style={styles.muted}>Explain what has not been completed or what needs resolving. The unreleased stage stays paused in BuildPay.</Text><TextInput mode="outlined" label="What is the issue?" value={issueReason} onChangeText={setIssueReason} multiline /><View style={styles.row}><Button onPress={() => { setIssueMilestoneId(undefined); setIssueReason(''); }}>Cancel</Button><Button mode="contained" buttonColor={colors.danger} disabled={issueReason.trim().length < 10 || Boolean(stageBusy)} onPress={() => void disputeStage(milestone.id)}>Pause release</Button></View></AppCard> : null}

          {milestone.status === 'disputed' ? <AppCard elevated={false} style={styles.issueBox}>
            <Text variant="titleMedium" style={styles.heading}>BuildPay release paused</Text>
            <Text>{milestone.disputeReason || dispute?.disputeReason || 'An issue was raised before this money was released.'}</Text>
            {dispute?.disputeResponse ? <><Text variant="labelLarge">Tradesperson response</Text><Text>{dispute.disputeResponse}</Text></> : <Text style={styles.muted}>Waiting for the tradesperson to respond, or you can choose another resolution below.</Text>}
            {dispute?.refundRequestedAt ? <Chip icon="cash-refund">Refund requested</Chip> : null}
            {dispute?.disputeStatus === 'escalated' ? <Chip icon="alert">Escalated for BuildPair admin review</Chip> : null}
            <TextInput mode="outlined" label="Resolution note (optional)" value={resolutionNote} onChangeText={setResolutionNote} multiline />
            <View style={styles.stageActions}>
              <Button mode="contained" disabled={Boolean(stageBusy)} onPress={() => void disputeAction(milestone.id, 'resolve')}>Resolved · review release again</Button>
              {!dispute?.refundRequestedAt ? <Button mode="outlined" disabled={Boolean(stageBusy)} onPress={() => void disputeAction(milestone.id, 'request_refund')}>Request refund</Button> : null}
              {dispute?.disputeStatus !== 'escalated' ? <Button mode="text" textColor={colors.danger} disabled={Boolean(stageBusy)} onPress={() => void disputeAction(milestone.id, 'escalate')}>Escalate to BuildPair</Button> : null}
            </View>
            <Text style={styles.muted}>BuildPair keeps unreleased funds paused while this workflow is open. Admin review is not an inspection of workmanship or a substitute for legal or card-scheme rights.</Text>
          </AppCard> : null}

          {paymentMode === 'external' && milestone.status !== 'paid' ? <AppCard elevated={false} style={styles.directBox}>
            <Text variant="titleSmall" style={styles.heading}>Direct payment outside BuildPair</Text>
            <Text style={styles.muted}>BuildPay protection does not apply. BuildPair only records what each side confirms.</Text>
            {externalRecord?.recipientConfirmedAt && !externalRecord.payerConfirmedAt ? <Text style={styles.notice}>The tradesperson says they received this payment. Confirm only if you actually paid it directly.</Text> : null}
            {externalRecord?.payerConfirmedAt ? <Chip icon="check">You marked payment sent</Chip> : directCanConfirm ? <Button mode="outlined" icon="bank-transfer-out" loading={stageBusy === milestone.id} disabled={Boolean(stageBusy)} onPress={() => void directPaymentConfirm(milestone.id)}>I paid {formatMoney(milestone.amount)} directly</Button> : <Text style={styles.muted}>{isNext && !['materials', 'deposit'].includes(milestone.kind) ? 'The tradesperson must mark this work stage complete before direct payment is confirmed.' : 'Waiting for the earlier stage to finish.'}</Text>}
            {externalRecord?.payerConfirmedAt && !externalRecord.recipientConfirmedAt ? <Text style={styles.muted}>Waiting for the tradesperson to confirm receipt.</Text> : null}
          </AppCard> : null}
          {paymentMode === 'external' && milestone.status === 'paid' ? <Text style={styles.success}>Direct payment recorded ✓ Both sides confirmed it. BuildPair did not process or verify the money.</Text> : null}
        </AppCard>;
      })}
    </> : data.job.status === 'cancelled' ? <EmptyState title="Job cancelled" body="This job is closed and will no longer receive quotes." /> : <EmptyState title="No quote accepted" body="Compare quotes when they arrive, then accept the best fit, not just the cheapest number." />}

    {data.timeline?.length ? <><Text variant="titleLarge" style={styles.heading}>Project activity</Text><AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={styles.timelineCopy}><Text variant="titleSmall" style={styles.heading}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.timelineLine} /> : null}</View>)}</AppCard></> : null}

    {data.variations?.length ? <><Text variant="titleLarge" style={styles.heading}>Approved changes & variations</Text>{data.variations.map((variation) => <AppCard key={variation.id}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.heading}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View><View style={styles.row}><Text>Price change: <Text style={styles.money}>{variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)}</Text></Text><Text>Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} day{Math.abs(variation.durationDeltaDays) === 1 ? '' : 's'}</Text></View>{variation.status === 'pending' ? <View style={styles.row}><Button mode="outlined" textColor={colors.danger} disabled={busy} onPress={() => void variationAction(variation.id, 'decline')}>Decline</Button><Button mode="contained" disabled={busy} onPress={() => void variationAction(variation.id, 'accept')}>Approve variation</Button></View> : null}</AppCard>)}</> : null}

    {data.existingReview ? <AppCard><Text variant="titleMedium">Review submitted ✓</Text><Text style={styles.muted}>Your verified review is now on the tradesperson's public profile.</Text></AppCard> : null}
    {reviewAllowed ? <AppCard style={styles.reviewCard}><Chip icon="star-circle-outline">Project payment stages complete</Chip><Text variant="titleLarge" style={styles.heading}>Rate the tradesperson</Text><Text style={styles.muted}>The project payment record is complete. Your review will be marked as tied to a completed BuildPair project.</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Button key={star} compact mode={rating === star ? 'contained' : 'outlined'} onPress={() => setRating(star)}>{star}★</Button>)}</View><TextInput label="What was the work and how did it go?" value={comment} onChangeText={setComment} mode="outlined" multiline /><Button mode="contained" loading={busy} disabled={comment.trim().length < 10 || busy} onPress={() => void review()}>Publish verified review</Button></AppCard> : null}
    {error ? <HelperText type="error">{error}</HelperText> : null}
    <Divider />
  </Screen>;
}

function stageStatusLabel(status: PaymentStageStatus, paymentMode: Job['paymentMode']) {
  if (status === 'pending') return paymentMode === 'external' ? 'Not yet confirmed' : 'Awaiting funding';
  if (status === 'funded') return 'Funds protected';
  if (status === 'completed') return paymentMode === 'external' ? 'Work stage complete' : 'Approval needed';
  if (status === 'paid') return paymentMode === 'external' ? 'Direct payment confirmed' : 'Released';
  return 'Issue raised';
}

function HomeownerNextStep({ data, jobId, reviewAllowed }: { data: Detail; jobId: string; reviewAllowed: boolean }) {
  if (data.job.status === 'cancelled') return <AppCard style={styles.nextCard}><Chip icon="close-circle-outline">Closed</Chip><Text variant="titleLarge" style={styles.heading}>This job is cancelled</Text><Text style={styles.muted}>The record remains here, but no further quote or project action is expected.</Text></AppCard>;
  if (!data.acceptedQuote) return <AppCard style={styles.nextCard}><Chip icon={data.job.status === 'quoted' ? 'file-document-check-outline' : 'clock-outline'}>{data.job.status === 'quoted' ? 'Quote received' : 'Awaiting response'}</Chip><Text variant="titleLarge" style={styles.heading}>{data.job.status === 'quoted' ? 'Next: review the quote and payment plan' : 'Next: quote now or a site visit first'}</Text><Text style={styles.muted}>{data.job.status === 'quoted' ? 'Open the quote, compare costs and choose full funding or staged payments before accepting.' : 'A tradesperson may quote from the details, ask questions, or propose a site visit before pricing. Your exact address stays private until you confirm a visit or award the job.'}</Text>{data.job.status === 'quoted' ? <Link href={`/customer/compare/${jobId}` as Href} asChild><Button mode="contained" icon="compare">Review quotes</Button></Link> : null}</AppCard>;
  if (data.job.status === 'in_progress') {
    const current = [...data.milestones].sort((a, b) => a.sortOrder - b.sortOrder).find((stage) => stage.status !== 'paid');
    const title = data.job.paymentMode === 'undecided' ? 'Next: finish job setup' : data.job.paymentMode === 'external' ? 'Direct payment route selected' : current ? `Next: ${current.title}` : 'All BuildPay stages are released';
    return <AppCard style={styles.nextCard}><Chip icon="briefcase-check-outline">Active project</Chip><Text variant="titleLarge" style={styles.heading}>{title}</Text><Text style={styles.muted}>{data.job.paymentMode === 'undecided' ? 'Confirm the private job address and choose BuildPay or direct payment.' : data.job.paymentMode === 'external' ? 'Keep messages, variations and two-party payment confirmations here. BuildPair does not handle the money.' : current?.status === 'pending' ? 'Fund the highlighted BuildPay stage below. The next stage remains locked.' : current?.status === 'funded' ? 'This stage is funded and controlled. The tradesperson now needs to reach its agreed completion point.' : current?.status === 'completed' ? 'Review the agreed completion point, then approve release or raise an issue.' : current?.status === 'disputed' ? 'This BuildPay stage is paused while the issue is resolved.' : 'The BuildPay schedule is complete.'}</Text>{data.job.paymentMode === 'undecided' ? <Link href={`/customer/jobs/${jobId}/start` as Href} asChild><Button mode="contained">Finish setup</Button></Link> : null}</AppCard>;
  }
  if (data.job.status === 'completed') return <AppCard style={styles.nextCard}><Chip icon="flag-checkered">Completed</Chip><Text variant="titleLarge" style={styles.heading}>{reviewAllowed ? 'Next: leave your verified review' : 'Project complete'}</Text><Text style={styles.muted}>{reviewAllowed ? 'The qualifying project payment record is complete, so BuildPair has opened the verified review step below.' : 'The completed quote, messages, variations and payment history remain together here.'}</Text></AppCard>;
  return null;
}

const styles = StyleSheet.create({
  nextCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  protectionCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  externalCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  currentStageCard: { borderColor: colors.primary, borderWidth: 2 },
  timelineCard: { backgroundColor: colors.surfaceRaised },
  trustBox: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: colors.accentSoft },
  directBox: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1 },
  reviewCard: { borderColor: colors.primary, borderWidth: 2 },
  issueBox: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  confirmBox: { backgroundColor: colors.surfaceSoft, borderColor: colors.primary },
  heading: { color: colors.charcoal, fontWeight: '900' },
  strong: { color: colors.text, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  notice: { color: colors.charcoalSoft, lineHeight: 21, fontWeight: '700' },
  success: { color: colors.accentDark, lineHeight: 21, fontWeight: '800' },
  issue: { color: colors.danger, lineHeight: 21, fontWeight: '800' },
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
