import { useAuth } from '@clerk/expo';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { ProjectWorkspace } from '@/components/ProjectWorkspace';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney, poundsToPence } from '@/lib/money';
import type { Job, JobTimelineEvent, JobVariation, PaymentStageStatus, Quote } from '@/types';

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

type PrivateDetails = {
  addressLine1: string;
  addressLine2: string;
  townCity: string;
  postcode: string;
  accessNotes: string;
  complete: boolean;
};

type FundingAllocation = {
  milestoneId: string;
  title: string;
  kind: 'materials' | 'deposit' | 'stage' | 'final';
  amount: number;
  status: 'pending' | 'funded' | 'released' | 'disputed' | 'refunded';
  stripeTransferId: string | null;
};
type FundingBatch = {
  id: string;
  totalAmount: number;
  status: 'requires_payment' | 'funded' | 'partially_released' | 'released' | 'disputed' | 'refunded';
  fundedAt: string | null;
  acknowledgedAt: string | null;
  allocations: FundingAllocation[];
};

type Detail = { job: Job; acceptedQuote: Quote | null; milestones: Milestone[]; variations: JobVariation[]; timeline: JobTimelineEvent[] };

export default function TraderJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [data, setData] = useState<Detail>();
  const [privateDetails, setPrivateDetails] = useState<PrivateDetails>();
  const [externalPayments, setExternalPayments] = useState<ExternalPaymentRecord[]>([]);
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatch[]>([]);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [title, setTitle] = useState('Additional work');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('0');
  const [disputeNote, setDisputeNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState<string>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const detail = await apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken);
      setData(detail);
      if (detail.job.scheduledStartAt) {
        const start = new Date(detail.job.scheduledStartAt);
        setStartDate(formatInputDate(start));
        setStartTime(start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      } else if (detail.acceptedQuote?.proposedStartAt) {
        const suggested = new Date(detail.acceptedQuote.proposedStartAt);
        setStartDate((current) => current || formatInputDate(suggested));
      }
      const [addressResult, externalResult, disputeResult, fundingResult] = await Promise.allSettled([
        apiFetch<PrivateDetails>(`/api/job-private-details?jobId=${encodeURIComponent(id)}`, {}, getToken),
        apiFetch<ExternalPaymentRecord[]>(`/api/external-payments?jobId=${encodeURIComponent(id)}`, {}, getToken),
        apiFetch<PaymentDispute[]>(`/api/payment-disputes?jobId=${encodeURIComponent(id)}`, {}, getToken),
        apiFetch<FundingBatch[]>(`/api/buildpay/funding-status?jobId=${encodeURIComponent(id)}`, {}, getToken),
      ]);
      setPrivateDetails(addressResult.status === 'fulfilled' ? addressResult.value : undefined);
      setExternalPayments(externalResult.status === 'fulfilled' ? externalResult.value : []);
      setDisputes(disputeResult.status === 'fulfilled' ? disputeResult.value : []);
      setFundingBatches(fundingResult.status === 'fulfilled' ? fundingResult.value : []);
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken, id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function proposeStart() {
    const startAt = parseUkStart(startDate, startTime);
    if (!startAt) { setError('Use a valid start date (DD/MM/YYYY) and time (HH:MM).'); return; }
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'propose_start', startAt: startAt.toISOString() }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function acknowledgeFunding(batchId: string) {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/buildpay/acknowledge', { method: 'POST', body: JSON.stringify({ batchId, acknowledgedResponsibility: true }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function propose() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/variations', { method: 'POST', body: JSON.stringify({ jobId: id, title, description, amountDelta: poundsToPence(amount), durationDeltaDays: Number(days || 0) }) }, getToken);
      setTitle('Additional work'); setDescription(''); setAmount(''); setDays('0');
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function withdraw(variationId: string) {
    try { setBusy(true); await apiFetch(`/api/variations/${variationId}`, { method: 'PATCH', body: JSON.stringify({ action: 'withdraw' }) }, getToken); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function requestRelease(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/milestones', { method: 'PATCH', body: JSON.stringify({ id: milestoneId, action: 'complete' }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  async function confirmDirectReceipt(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/external-payments', { method: 'POST', body: JSON.stringify({ milestoneId, action: 'confirm_direct_payment', note: 'Tradesperson confirms this direct payment was received outside BuildPay.' }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  async function disputeAction(milestoneId: string, action: 'respond' | 'agree_refund' | 'escalate') {
    const fallback = action === 'respond'
      ? 'I have reviewed the issue and added my response to the BuildPair project record.'
      : action === 'agree_refund'
        ? 'I agree to the homeowner request to refund this unreleased BuildPay stage.'
        : 'I want BuildPair admin to review the project record and help with this paused payment issue.';
    const note = disputeNote.trim() || fallback;
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/payment-disputes', { method: 'POST', body: JSON.stringify({ milestoneId, action, note }) }, getToken);
      setDisputeNote('');
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  async function complete() {
    try { setBusy(true); setError(''); await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'complete' }) }, getToken); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  if (error && !data) return <Screen><EmptyState title="Job unavailable" body={error} /></Screen>;
  if (!data) return <LoadingScreen />;

  const reportCustomerHref = ({ pathname: '/(public)/report', params: { subjectUserId: data.job.customerId, subjectLabel: 'Homeowner on this job', subjectType: 'customer' } } as Href);
  const hasPendingVariation = data.variations?.some((variation) => variation.status === 'pending');
  const paymentMode = data.job.paymentMode ?? 'undecided';
  const orderedStages = [...data.milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentStage = orderedStages.find((stage) => stage.status !== 'paid');
  const allReleased = orderedStages.length > 0 && orderedStages.every((stage) => stage.status === 'paid');
  const pendingAcknowledgement = fundingBatches.find((batch) => !batch.acknowledgedAt && ['funded', 'partially_released'].includes(batch.status) && batch.allocations.some((allocation) => allocation.kind === 'materials' && allocation.status === 'funded'));

  return <Screen title={data.job.title} subtitle={`${data.job.category} · ${data.job.status.replace('_', ' ')}`}>
    <AppCard style={styles.nextCard}>
      <Chip icon={data.job.status === 'completed' ? 'flag-checkered' : 'briefcase-check-outline'}>{data.job.status === 'completed' ? 'Work complete' : 'Active BuildPair job'}</Chip>
      <Text variant="titleLarge" style={styles.title}>{nextTitle(data.job.status, paymentMode, currentStage, allReleased)}</Text>
      <Text style={styles.muted}>{nextCopy(data.job.status, paymentMode, currentStage, allReleased)}</Text>
      {data.job.status === 'in_progress' && (paymentMode === 'external' || allReleased) ? <Button mode="contained" icon="check-circle-outline" loading={busy} disabled={busy || hasPendingVariation} onPress={() => void complete()}>Mark whole job complete</Button> : null}
      {hasPendingVariation ? <HelperText type="info">Resolve the pending variation before marking the whole job complete.</HelperText> : null}
    </AppCard>

    <AppCard>
      <View style={styles.row}><Chip>{data.job.budgetRange}</Chip>{data.job.isEmergency ? <Chip icon="alert">Emergency</Chip> : null}{data.job.scheduledStartAt ? <Chip icon="calendar">Starts {new Date(data.job.scheduledStartAt).toLocaleDateString('en-GB')}</Chip> : null}</View>
      <Text style={styles.body}>{data.job.description}</Text>
      {data.acceptedQuote ? <Text style={styles.muted}>Agreed quote: {formatMoney(data.acceptedQuote.totalAmount)}{data.acceptedQuote.durationDays ? ` · ${data.acceptedQuote.durationDays} days` : ''}</Text> : null}
      <View style={styles.row}><Link href="/trader/messages" asChild><Button mode="outlined" icon="message-text-outline">Messages</Button></Link><Link href={reportCustomerHref} asChild><Button mode="text" icon="alert-outline" textColor={colors.danger}>Report this homeowner</Button></Link></View>
    </AppCard>

    {data.job.status === 'in_progress' ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Agree the start</Text>
      {data.job.startAgreedAt && data.job.scheduledStartAt ? <>
        <Chip icon="calendar-check">Homeowner agreed ✓</Chip>
        <Text variant="titleMedium">{formatStart(data.job.scheduledStartAt)}</Text>
        <Text style={styles.muted}>This is the agreed start in the BuildPair project record. If it changes, propose a new date/time and the homeowner will confirm it again.</Text>
      </> : data.job.scheduledStartAt ? <>
        <Chip icon="clock-outline">Waiting for homeowner</Chip>
        <Text variant="titleMedium">{formatStart(data.job.scheduledStartAt)}</Text>
        <Text style={styles.muted}>The homeowner has been asked to approve this start. The opening BuildPay payment cannot be taken until they agree it.</Text>
      </> : <Text style={styles.muted}>Confirm when you actually expect to start. The homeowner approves this before the opening BuildPay payment.</Text>}
      <View style={styles.row}>
        <TextInput style={styles.moneyInput} mode="outlined" label="Start date (DD/MM/YYYY)" value={startDate} onChangeText={setStartDate} placeholder="14/09/2026" />
        <TextInput style={styles.moneyInput} mode="outlined" label="Start time (HH:MM)" value={startTime} onChangeText={setStartTime} placeholder="08:00" />
      </View>
      <Button mode={data.job.startAgreedAt ? 'outlined' : 'contained'} icon="calendar-clock" loading={busy} disabled={busy || !startDate.trim() || !startTime.trim()} onPress={() => void proposeStart()}>{data.job.startAgreedAt ? 'Propose a different start' : data.job.scheduledStartAt ? 'Update proposed start' : 'Send start for homeowner approval'}</Button>
    </AppCard> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Job address</Text>
      {privateDetails?.complete ? <>
        <Text variant="titleMedium">{privateDetails.addressLine1}</Text>
        {privateDetails.addressLine2 ? <Text>{privateDetails.addressLine2}</Text> : null}
        <Text>{privateDetails.townCity}</Text>
        <Text>{privateDetails.postcode}</Text>
        {privateDetails.accessNotes ? <><Text variant="labelLarge">Access / parking notes</Text><Text>{privateDetails.accessNotes}</Text></> : null}
        <Text style={styles.muted}>The homeowner shared this private address for the awarded BuildPair job. Do not republish it or use it for unrelated marketing.</Text>
      </> : <Text style={styles.muted}>The homeowner has not added the exact street address yet. Ask them to finish the job setup in BuildPair before attendance.</Text>}
    </AppCard>

    {paymentMode === 'buildpair' ? <AppCard style={styles.protectionCard}>
      <Text variant="titleLarge" style={styles.title}>BuildPay</Text>
      <Text style={styles.body}>The homeowner can fund materials and the first work stage together. When the opening payment is confirmed, you acknowledge it first. BuildPay then releases only the exact materials amount to your connected Stripe account; the work-stage money stays protected until you reach its agreed trigger and request release.</Text>
      <Text style={styles.muted}>BuildPair charges 1% of labour/service only, never materials or VAT. Stripe processing is recovered at cost from controlled service payouts. Record extra work as an agreed variation before charging for it.</Text>
    </AppCard> : paymentMode === 'external' ? <AppCard style={styles.externalCard}>
      <Text variant="titleLarge" style={styles.title}>Direct payments selected</Text>
      <Text style={styles.muted}>The homeowner pays you directly. BuildPair can record the quote, project, variations and what both sides say about payment, but it does not receive, hold, protect, refund or recover that money. BuildPay controls do not apply.</Text>
    </AppCard> : <AppCard style={styles.externalCard}><Text variant="titleLarge" style={styles.title}>Waiting for payment choice</Text><Text style={styles.muted}>The quote is accepted. The homeowner now confirms the job address and chooses BuildPay or direct payment.</Text></AppCard>}

    {paymentMode === 'buildpair' && pendingAcknowledgement ? <AppCard style={styles.ackCard}>
      <Chip icon="cash-check">Opening payment received</Chip>
      <Text variant="titleLarge" style={styles.title}>{formatMoney(pendingAcknowledgement.totalAmount)} paid into BuildPay</Text>
      {pendingAcknowledgement.allocations.map((allocation) => <View key={allocation.milestoneId} style={styles.row}><Text>{allocation.title}</Text><Text style={styles.money}>{formatMoney(allocation.amount)}</Text></View>)}
      <Text>The homeowner’s card payment is confirmed. Nothing needs guessing here: acknowledge it when you are ready to obtain the quoted materials, contact the homeowner and start in line with the agreed date.</Text>
      <Text style={styles.muted}>When you confirm, BuildPay releases only the materials allocation to your connected Stripe account. Any funded work stage remains protected and is not paid to you until its agreed completion point is reached and the homeowner approves release.</Text>
      <Button mode="contained" icon="check-decagram-outline" loading={busy} disabled={busy} onPress={() => void acknowledgeFunding(pendingAcknowledgement.id)}>I’ve seen the payment · release materials</Button>
    </AppCard> : null}

    <Text variant="titleLarge" style={styles.title}>Payment stages</Text>
    {orderedStages.length ? orderedStages.map((stage) => {
      const isCurrent = currentStage?.id === stage.id;
      const buildPayMaterials = stage.kind === 'materials';
      const directUpfront = stage.kind === 'materials' || stage.kind === 'deposit';
      const canRequestRelease = data.job.status === 'in_progress' && isCurrent && paymentMode === 'buildpair' && stage.status === 'funded' && !buildPayMaterials;
      const canMarkPrivateComplete = data.job.status === 'in_progress' && isCurrent && paymentMode === 'external' && stage.status === 'pending' && !directUpfront;
      const externalRecord = externalPayments.find((record) => record.milestoneId === stage.id);
      const canConfirmDirectReceipt = paymentMode === 'external' && isCurrent && stage.status !== 'paid' && !externalRecord?.recipientConfirmedAt && (directUpfront || stage.status === 'completed');
      const dispute = disputes.find((item) => item.milestoneId === stage.id);
      return <AppCard key={stage.id} style={isCurrent ? styles.currentStageCard : undefined}>
        <View style={styles.row}>
          <View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{stage.title}</Text><Text variant="titleLarge" style={styles.money}>{formatMoney(stage.amount)}</Text>{stage.triggerDescription ? <Text style={styles.muted}>{stage.triggerDescription}</Text> : null}</View>
          <View style={styles.badges}>{isCurrent ? <Chip icon="arrow-right-circle-outline">Next</Chip> : null}<Chip>{stage.kind}</Chip><Chip>{stageLabel(stage.status, paymentMode)}</Chip></View>
        </View>

        {paymentMode === 'buildpair' && buildPayMaterials && stage.status === 'pending' ? <Text style={styles.muted}>Waiting for the opening BuildPay payment.</Text> : null}
        {paymentMode === 'buildpair' && buildPayMaterials && stage.status === 'funded' ? <Text style={styles.notice}>Homeowner payment confirmed ✓ Acknowledge the opening payment above before the materials amount is released.</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'pending' && !buildPayMaterials ? <Text style={styles.muted}>{isCurrent ? 'Waiting for the homeowner to fund this controlled BuildPay stage.' : 'This stage stays locked until the earlier stage is released.'}</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'funded' && !buildPayMaterials ? <Text style={styles.notice}>Funded ✓ No work-stage transfer has been made to you. Reach the agreed completion point, then request release.</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'completed' ? <Text style={styles.notice}>Release requested. The homeowner is being asked to check the agreed completion point and approve release or raise an issue.</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'paid' ? <Text style={styles.success}>{buildPayMaterials ? 'Materials released ✓' : 'Released ✓'} This stage is complete in the BuildPay record.</Text> : null}
        {canRequestRelease ? <Button mode="contained" icon="check" loading={stageBusy === stage.id} disabled={Boolean(stageBusy)} onPress={() => void requestRelease(stage.id)}>Request release of {formatMoney(stage.amount)}</Button> : null}

        {stage.status === 'disputed' ? <AppCard elevated={false} style={styles.issueBox}>
          <Text variant="titleMedium" style={styles.title}>BuildPay release paused</Text>
          <Text>{stage.disputeReason || dispute?.disputeReason || 'The homeowner raised an issue before release.'}</Text>
          {dispute?.disputeResponse ? <><Text variant="labelLarge">Your recorded response</Text><Text>{dispute.disputeResponse}</Text></> : null}
          {dispute?.refundRequestedAt ? <Chip icon="cash-refund">Homeowner requested a refund</Chip> : null}
          {dispute?.disputeStatus === 'escalated' ? <Chip icon="alert">Escalated for BuildPair admin review</Chip> : null}
          <TextInput mode="outlined" label="Your response / resolution note" value={disputeNote} onChangeText={setDisputeNote} multiline />
          <View style={styles.stageActions}>
            <Button mode="contained" disabled={Boolean(stageBusy) || (disputeNote.trim().length > 0 && disputeNote.trim().length < 10)} onPress={() => void disputeAction(stage.id, 'respond')}>Respond to issue</Button>
            {dispute?.refundRequestedAt && !dispute.refundApprovedAt ? <Button mode="outlined" icon="cash-refund" disabled={Boolean(stageBusy)} onPress={() => void disputeAction(stage.id, 'agree_refund')}>Agree refund</Button> : null}
            {dispute?.disputeStatus !== 'escalated' ? <Button mode="text" textColor={colors.danger} disabled={Boolean(stageBusy)} onPress={() => void disputeAction(stage.id, 'escalate')}>Escalate to BuildPair</Button> : null}
          </View>
          <Text style={styles.muted}>The unreleased money stays paused. BuildPair admin can review the project record and facilitate the workflow, but does not automatically decide whether workmanship is satisfactory.</Text>
        </AppCard> : null}

        {paymentMode === 'external' && stage.status !== 'paid' ? <AppCard elevated={false} style={styles.directBox}>
          <Text variant="titleSmall" style={styles.title}>Direct payment outside BuildPair</Text>
          {canMarkPrivateComplete ? <Button mode="outlined" icon="check" loading={stageBusy === stage.id} disabled={Boolean(stageBusy)} onPress={() => void requestRelease(stage.id)}>Mark {stage.title} complete</Button> : null}
          {externalRecord?.payerConfirmedAt ? <Text style={styles.notice}>Homeowner says they paid this amount directly.</Text> : null}
          {externalRecord?.recipientConfirmedAt ? <Chip icon="check">You marked payment received</Chip> : canConfirmDirectReceipt ? <Button mode="contained" icon="bank-transfer-in" loading={stageBusy === stage.id} disabled={Boolean(stageBusy)} onPress={() => void confirmDirectReceipt(stage.id)}>I received {formatMoney(stage.amount)} directly</Button> : null}
          {externalRecord?.recipientConfirmedAt && !externalRecord.payerConfirmedAt ? <Text style={styles.muted}>Waiting for the homeowner to confirm they sent the direct payment.</Text> : null}
          {!externalRecord?.recipientConfirmedAt && !externalRecord?.payerConfirmedAt && isCurrent && !directUpfront && stage.status === 'pending' ? <Text style={styles.muted}>Complete the agreed work stage first. Payment itself remains a private arrangement between you and the homeowner.</Text> : null}
          <Text style={styles.muted}>A BuildPair direct-payment record is based on your confirmations. BuildPair did not process, protect or independently verify the payment.</Text>
        </AppCard> : null}
        {paymentMode === 'external' && stage.status === 'paid' ? <Text style={styles.success}>Direct payment recorded ✓ Both sides confirmed it. BuildPair did not handle the money.</Text> : null}
      </AppCard>;
    }) : <EmptyState title="No payment stages" body="The accepted quote does not contain payment stages." />}

    {data.acceptedQuote ? <ProjectWorkspace jobId={id} role="trader" /> : null}

    <Text variant="titleLarge" style={styles.title}>Project timeline</Text>
    {data.timeline?.length ? <AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.dot} /><View style={styles.flex}><Text variant="titleSmall" style={styles.title}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.line} /> : null}</View>)}</AppCard> : <EmptyState title="No timeline events yet" body="Job progress and approved changes will appear here." />}

    <Text variant="titleLarge" style={styles.title}>Variations</Text>
    {data.variations?.map((variation) => <AppCard key={variation.id}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View><Text>Price: {variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)} · Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} days</Text>{variation.status === 'pending' ? <Button mode="outlined" disabled={busy} onPress={() => void withdraw(variation.id)}>Withdraw proposal</Button> : null}</AppCard>)}
    {data.job.status === 'in_progress' ? <AppCard><Text variant="titleMedium" style={styles.title}>Propose a job change</Text><Text style={styles.muted}>Record chargeable extras or scope changes here and get homeowner approval before doing the additional work.</Text><TextInput mode="outlined" label="Variation title" value={title} onChangeText={setTitle} /><TextInput mode="outlined" label="What is changing?" value={description} onChangeText={setDescription} multiline numberOfLines={4} /><View style={styles.row}><TextInput style={styles.moneyInput} mode="outlined" label="Price change (£)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /><TextInput style={styles.moneyInput} mode="outlined" label="Days change" value={days} onChangeText={setDays} keyboardType="numbers-and-punctuation" /></View><Button mode="contained" loading={busy} disabled={busy || title.trim().length < 3 || description.trim().length < 10} onPress={() => void propose()}>Send variation for approval</Button></AppCard> : null}
    {error ? <HelperText type="error">{error}</HelperText> : null}
  </Screen>;
}

function stageLabel(status: PaymentStageStatus, paymentMode: Job['paymentMode']) {
  if (status === 'pending') return paymentMode === 'external' ? 'Not yet confirmed' : 'Awaiting funding';
  if (status === 'funded') return 'Funded';
  if (status === 'completed') return paymentMode === 'external' ? 'Work stage complete' : 'Release requested';
  if (status === 'paid') return paymentMode === 'external' ? 'Direct payment confirmed' : 'Released';
  return 'Issue raised';
}

function nextTitle(status: Job['status'], paymentMode: Job['paymentMode'], current: Milestone | undefined, allReleased: boolean) {
  if (status === 'completed') return 'The project record is complete';
  if (paymentMode === 'undecided') return 'Waiting for the homeowner to finish job setup';
  if (paymentMode === 'external') return 'Direct payments selected';
  if (allReleased) return 'All agreed BuildPay stages are released';
  if (!current) return 'Follow the agreed project record';
  if (current.kind === 'materials' && current.status === 'funded') return 'Acknowledge the opening payment';
  if (current.status === 'pending') return `Waiting for ${current.title.toLowerCase()}`;
  if (current.status === 'funded') return `Complete the trigger for ${current.title.toLowerCase()}`;
  if (current.status === 'completed') return `Waiting for ${current.title.toLowerCase()} approval`;
  return `${current.title} is paused`;
}

function nextCopy(status: Job['status'], paymentMode: Job['paymentMode'], current: Milestone | undefined, allReleased: boolean) {
  if (status === 'completed') return 'The homeowner can review the completed work and the project history.';
  if (paymentMode === 'undecided') return 'The quote is accepted. The homeowner now confirms the private job address and chooses BuildPay or direct payment.';
  if (paymentMode === 'external') return 'BuildPair keeps the project record, messages, variations and optional two-party payment confirmations, but does not process or protect money paid directly.';
  if (allReleased) return 'Every agreed BuildPay stage is released. Resolve any variations, then mark the whole job complete.';
  if (!current) return 'Keep the job record up to date as work progresses.';
  if (current.kind === 'materials' && current.status === 'funded') return 'The homeowner payment is confirmed. Acknowledge it in the BuildPay card so the quoted materials amount can be released; any work-stage allocation remains protected.';
  if (current.status === 'pending') return current.kind === 'materials' ? 'Waiting for the homeowner to make the opening BuildPay payment.' : 'Waiting for the homeowner to fund this controlled BuildPay stage.';
  if (current.status === 'funded') return 'The homeowner payment is confirmed but has not been transferred to you. Reach the agreed completion point, then request release.';
  if (current.status === 'completed') return 'You requested release. The homeowner is reviewing the agreed completion point.';
  return 'The homeowner raised an issue before release. Keep communication and evidence inside the project until it is resolved.';
}

function formatInputDate(value: Date) {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${value.getFullYear()}`;
}

function parseUkStart(dateValue: string, timeValue: string) {
  const dateMatch = dateValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = timeValue.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) return null;
  return value;
}

function formatStart(value: string) {
  return new Date(value).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  nextCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  protectionCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  externalCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  ackCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 2 },
  currentStageCard: { borderColor: colors.primary, borderWidth: 2 },
  issueBox: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  directBox: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  muted: { color: colors.muted, lineHeight: 21 },
  notice: { color: colors.charcoalSoft, fontWeight: '700', lineHeight: 21 },
  success: { color: colors.accentDark, fontWeight: '800', lineHeight: 21 },
  money: { color: colors.primary, fontWeight: '900' },
  badges: { gap: 4, alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  moneyInput: { flex: 1, minWidth: 140 },
  stageActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  timelineRow: { position: 'relative', flexDirection: 'row', gap: 12, paddingBottom: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, marginTop: 3, zIndex: 2 },
  line: { position: 'absolute', left: 7, top: 19, bottom: 0, width: 2, backgroundColor: colors.border },
});
