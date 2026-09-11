import { useAuth } from '@clerk/expo';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
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

type Detail = { job: Job; acceptedQuote: Quote | null; milestones: Milestone[]; variations: JobVariation[]; timeline: JobTimelineEvent[] };
type PaymentDispute = {
  id: string;
  milestoneId: string;
  status: 'open' | 'responded' | 'escalated' | 'resolved_release';
  reason: string;
  traderResponse?: string | null;
  escalationNote?: string | null;
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

export default function TraderJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [data, setData] = useState<Detail>();
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [siteDetails, setSiteDetails] = useState<SiteDetails>();
  const [title, setTitle] = useState('Additional work');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('0');
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState<string>();
  const [error, setError] = useState('');
  const [responseMilestoneId, setResponseMilestoneId] = useState<string>();
  const [disputeResponse, setDisputeResponse] = useState('');
  const [escalateMilestoneId, setEscalateMilestoneId] = useState<string>();
  const [escalationNote, setEscalationNote] = useState('');

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

  async function propose() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/variations', { method: 'POST', body: JSON.stringify({ jobId: id, title, description, amountDelta: poundsToPence(amount), durationDeltaDays: Number(days || 0) }) }, getToken);
      setTitle('Additional work'); setDescription(''); setAmount(''); setDays('0');
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function withdraw(variationId: string) {
    try { setBusy(true); setError(''); await apiFetch(`/api/variations/${variationId}`, { method: 'PATCH', body: JSON.stringify({ action: 'withdraw' }) }, getToken); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function requestRelease(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/milestones', { method: 'PATCH', body: JSON.stringify({ id: milestoneId, action: 'complete' }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
  }

  async function respondToDispute(milestoneId: string) {
    try {
      setStageBusy(milestoneId); setError('');
      await apiFetch('/api/payments/disputes', { method: 'POST', body: JSON.stringify({ action: 'respond', milestoneId, response: disputeResponse }) }, getToken);
      setResponseMilestoneId(undefined); setDisputeResponse('');
      await load();
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
  const releasedTotal = orderedStages.filter((stage) => stage.status === 'paid').reduce((sum, stage) => sum + stage.amount, 0);
  const securedTotal = orderedStages.filter((stage) => ['funded', 'completed', 'disputed'].includes(stage.status)).reduce((sum, stage) => sum + stage.amount, 0);
  const unfundedTotal = orderedStages.filter((stage) => stage.status === 'pending').reduce((sum, stage) => sum + stage.amount, 0);

  return <Screen title={data.job.title} subtitle={`${data.job.category} · ${data.job.status.replace('_', ' ')}`}>
    <AppCard style={styles.nextCard}>
      <Chip icon={data.job.status === 'completed' ? 'flag-checkered' : 'briefcase-check-outline'}>{data.job.status === 'completed' ? 'Work complete' : 'Active BuildPair job'}</Chip>
      <Text variant="titleLarge" style={styles.title}>{nextTitle(data.job.status, paymentMode, currentStage, allReleased)}</Text>
      <Text style={styles.muted}>{nextCopy(data.job.status, paymentMode, currentStage, allReleased)}</Text>
      {data.job.status === 'in_progress' && (paymentMode === 'external' || allReleased) ? <Button mode="contained" icon="check-circle-outline" loading={busy} disabled={busy || hasPendingVariation} onPress={() => void complete()}>Mark whole job complete</Button> : null}
      {hasPendingVariation ? <HelperText type="info">Resolve the pending variation before marking the whole job complete.</HelperText> : null}
    </AppCard>

    {error ? <AppCard style={styles.errorCard}><HelperText type="error" visible>{error}</HelperText></AppCard> : null}

    <AppCard>
      <View style={styles.row}><Chip>{data.job.budgetRange}</Chip>{data.job.isEmergency ? <Chip icon="alert">Emergency</Chip> : null}{data.job.scheduledStartAt ? <Chip icon="calendar">Starts {new Date(data.job.scheduledStartAt).toLocaleDateString('en-GB')}</Chip> : null}</View>
      <Text style={styles.body}>{data.job.description}</Text>
      {data.acceptedQuote ? <Text style={styles.muted}>Agreed quote: {formatMoney(data.acceptedQuote.totalAmount)}{data.acceptedQuote.durationDays ? ` · ${data.acceptedQuote.durationDays} days` : ''}</Text> : null}
      <View style={styles.row}><Link href="/trader/messages" asChild><Button mode="outlined" icon="message-text-outline">Messages</Button></Link><Link href={reportCustomerHref} asChild><Button mode="text" icon="alert-outline" textColor={colors.danger}>Report this homeowner</Button></Link></View>
    </AppCard>

    {data.acceptedQuote && data.job.status === 'in_progress' ? <AppCard style={siteDetails?.complete ? styles.siteCard : styles.waitingCard}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Worksite details</Text><Text style={styles.muted}>Private details for this awarded job only.</Text></View><Chip icon={siteDetails?.complete ? 'map-marker-check-outline' : 'clock-outline'}>{siteDetails?.complete ? 'Confirmed' : 'Waiting for homeowner'}</Chip></View>
      {siteDetails?.complete ? <>
        <Text variant="titleMedium" style={styles.title}>{siteDetails.addressLine1}{siteDetails.addressLine2 ? `, ${siteDetails.addressLine2}` : ''}</Text>
        <Text>{[siteDetails.townCity, siteDetails.county, siteDetails.postcode].filter(Boolean).join(', ')}</Text>
        <Text variant="labelLarge">Contact: {siteDetails.phone}</Text>
      </> : <Text style={styles.muted}>The homeowner still needs to confirm the full work address and contact number. Do not rely on the public job-area postcode as the attendance address.</Text>}
    </AppCard> : null}

    {paymentMode === 'buildpair' ? <AppCard style={styles.protectionCard}>
      <Text variant="titleLarge" style={styles.title}>BuildPay staged payments</Text>
      <Text style={styles.body}>Materials are released to your connected Stripe account when the homeowner's payment is confirmed. Work-stage and final money is funded first and stays secured until you reach the recorded completion point, request release and the homeowner approves it.</Text>
      <Text style={styles.muted}>A Stripe transfer is not the same thing as a bank payout. Your bank payout timing is handled by Stripe. If you rely on materials money reaching your bank before buying materials, agree a realistic start date with the homeowner.</Text>
      <View style={styles.summaryRow}><SummaryMetric label="Released" value={releasedTotal} /><SummaryMetric label="Secured / paused" value={securedTotal} /><SummaryMetric label="Not funded" value={unfundedTotal} /></View>
      <Text style={styles.muted}>BuildPair's 1% platform fee applies to labour/service only and is spread across service-stage payouts. Recorded Stripe processing costs are also recovered from service payouts, not from the quoted materials amount.</Text>
    </AppCard> : paymentMode === 'external' ? <AppCard style={styles.externalCard}><Text variant="titleLarge" style={styles.title}>Private payments selected</Text><Text style={styles.muted}>BuildPair keeps the quote, messages, variations and project record, but does not process payments on this job.</Text></AppCard> : null}

    <Text variant="titleLarge" style={styles.title}>Payment stages</Text>
    {orderedStages.length ? orderedStages.map((stage) => {
      const isCurrent = currentStage?.id === stage.id;
      const immediateMaterials = stage.kind === 'materials';
      const canRequestRelease = data.job.status === 'in_progress' && isCurrent && paymentMode === 'buildpair' && stage.status === 'funded' && !immediateMaterials;
      const canMarkPrivateComplete = data.job.status === 'in_progress' && isCurrent && paymentMode === 'external' && stage.status === 'pending' && stage.kind !== 'materials';
      const activeDispute = disputes.find((item) => item.milestoneId === stage.id && ['open', 'responded', 'escalated'].includes(item.status));
      return <AppCard key={stage.id} style={isCurrent ? styles.currentStageCard : undefined}>
        <View style={styles.row}>
          <View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{stage.title}</Text><Text variant="titleLarge" style={styles.money}>{formatMoney(stage.amount)}</Text>{stage.triggerDescription ? <Text style={styles.muted}>{stage.triggerDescription}</Text> : null}</View>
          <View style={styles.badges}>{isCurrent ? <Chip icon="arrow-right-circle-outline">Current</Chip> : null}<Chip>{stage.kind}</Chip><Chip>{stageLabel(stage.status)}</Chip></View>
        </View>

        {paymentMode === 'buildpair' && immediateMaterials && stage.status === 'pending' ? <Text style={styles.muted}>Waiting for the homeowner's initial BuildPay funding. When Stripe confirms it, the exact quoted materials amount is released to your connected Stripe account; the first work-stage amount remains secured.</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'pending' && !immediateMaterials ? <Text style={styles.muted}>{isCurrent ? 'Waiting for the homeowner to fund this agreed stage through BuildPay.' : 'This stage has not been funded yet. It unlocks after the previous stage is released.'}</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'funded' ? <Text style={styles.notice}>Secured ✓ The homeowner payment is confirmed. No transfer has been made to you for this work stage. Reach the agreed completion point, then request release.</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'completed' ? <Text style={styles.notice}>Release requested. The homeowner is being asked to check the agreed completion point and either approve release or raise an issue.</Text> : null}
        {stage.status === 'paid' ? <Text style={styles.success}>Released ✓ BuildPair has instructed Stripe to transfer this stage according to the agreed payment route.</Text> : null}
        {stage.status === 'disputed' ? <Text style={styles.issue}>Release paused. The funded money remains unreleased while the issue is resolved.</Text> : null}
        {canRequestRelease ? <Button mode="contained" icon="check" loading={stageBusy === stage.id} disabled={Boolean(stageBusy)} onPress={() => void requestRelease(stage.id)}>Request release of {formatMoney(stage.amount)}</Button> : null}
        {canMarkPrivateComplete ? <Button mode="outlined" icon="check" loading={stageBusy === stage.id} disabled={Boolean(stageBusy)} onPress={() => void requestRelease(stage.id)}>Mark {stage.title} complete</Button> : null}

        {activeDispute ? <AppCard elevated={false} style={styles.issueBox}>
          <View style={styles.row}><Text variant="titleSmall" style={styles.title}>Homeowner raised an issue</Text><Chip icon="alert-circle-outline">{disputeStatusLabel(activeDispute.status)}</Chip></View>
          <Text>{activeDispute.reason}</Text>
          {activeDispute.traderResponse ? <><Text variant="labelLarge">Your response</Text><Text>{activeDispute.traderResponse}</Text></> : null}
          {activeDispute.escalationNote ? <><Text variant="labelLarge">Escalation note</Text><Text>{activeDispute.escalationNote}</Text></> : null}
          {activeDispute.status === 'open' && responseMilestoneId !== stage.id ? <Button mode="contained" onPress={() => { setResponseMilestoneId(stage.id); setDisputeResponse(''); }}>Respond to issue</Button> : null}
          {responseMilestoneId === stage.id && activeDispute.status === 'open' ? <View style={styles.responseBox}><TextInput mode="outlined" label="Your response" value={disputeResponse} onChangeText={setDisputeResponse} multiline /><View style={styles.row}><Button onPress={() => setResponseMilestoneId(undefined)}>Cancel</Button><Button mode="contained" loading={stageBusy === stage.id} disabled={disputeResponse.trim().length < 10 || Boolean(stageBusy)} onPress={() => void respondToDispute(stage.id)}>Send response</Button></View></View> : null}
          {activeDispute.status !== 'escalated' && escalateMilestoneId !== stage.id ? <Button mode="outlined" textColor={colors.danger} onPress={() => { setEscalateMilestoneId(stage.id); setEscalationNote(''); }}>Escalate unresolved issue</Button> : null}
          {escalateMilestoneId === stage.id ? <View style={styles.responseBox}><TextInput mode="outlined" label="Why does this need BuildPair review?" value={escalationNote} onChangeText={setEscalationNote} multiline /><View style={styles.row}><Button onPress={() => setEscalateMilestoneId(undefined)}>Cancel</Button><Button mode="contained" buttonColor={colors.danger} loading={stageBusy === stage.id} disabled={escalationNote.trim().length < 10 || Boolean(stageBusy)} onPress={() => void escalateDispute(stage.id)}>Escalate</Button></View></View> : null}
          <Text style={styles.muted}>No stage transfer can be approved while this issue is active. Keep job communication and evidence inside BuildPair.</Text>
        </AppCard> : null}

        {paymentMode === 'external' && stage.status !== 'paid' ? <Text style={styles.externalText}>Payment is arranged privately. BuildPair is only recording project progress.</Text> : null}
      </AppCard>;
    }) : <EmptyState title="No payment stages" body="The accepted quote does not contain payment stages." />}

    <Text variant="titleLarge" style={styles.title}>Project timeline</Text>
    {data.timeline?.length ? <AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.dot} /><View style={styles.flex}><Text variant="titleSmall" style={styles.title}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.line} /> : null}</View>)}</AppCard> : <EmptyState title="No timeline events yet" body="Job progress and approved changes will appear here." />}

    <Text variant="titleLarge" style={styles.title}>Variations</Text>
    {data.variations?.map((variation) => <AppCard key={variation.id}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View><Text>Price: {variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)} · Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} days</Text>{variation.status === 'pending' ? <Button mode="outlined" disabled={busy} onPress={() => void withdraw(variation.id)}>Withdraw proposal</Button> : null}</AppCard>)}
    {data.job.status === 'in_progress' ? <AppCard><Text variant="titleMedium" style={styles.title}>Propose a job change</Text><Text style={styles.muted}>Record chargeable extras or scope changes here and get homeowner approval before doing the additional work.</Text><TextInput mode="outlined" label="Variation title" value={title} onChangeText={setTitle} /><TextInput mode="outlined" label="What is changing?" value={description} onChangeText={setDescription} multiline numberOfLines={4} /><View style={styles.row}><TextInput style={styles.moneyInput} mode="outlined" label="Price change (£)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /><TextInput style={styles.moneyInput} mode="outlined" label="Days change" value={days} onChangeText={setDays} keyboardType="numbers-and-punctuation" /></View><Button mode="contained" loading={busy} disabled={busy || title.trim().length < 3 || description.trim().length < 10} onPress={() => void propose()}>Send variation for approval</Button></AppCard> : null}
  </Screen>;
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return <View style={styles.metric}><Text variant="labelSmall" style={styles.muted}>{label}</Text><Text variant="titleMedium" style={styles.title}>{formatMoney(value)}</Text></View>;
}

function stageLabel(status: PaymentStageStatus) {
  if (status === 'pending') return 'Not funded';
  if (status === 'funded') return 'Secured';
  if (status === 'completed') return 'Release requested';
  if (status === 'paid') return 'Released';
  return 'Paused';
}

function disputeStatusLabel(status: PaymentDispute['status']) {
  if (status === 'responded') return 'Response sent';
  if (status === 'escalated') return 'Escalated';
  if (status === 'resolved_release') return 'Resolved';
  return 'Open';
}

function nextTitle(status: Job['status'], paymentMode: Job['paymentMode'], current: Milestone | undefined, allReleased: boolean) {
  if (status === 'completed') return 'The project record is complete';
  if (paymentMode === 'undecided') return 'Waiting for the homeowner to choose the payment route';
  if (paymentMode === 'external') return 'Private payments selected';
  if (allReleased) return 'All agreed BuildPay stages are released';
  if (!current) return 'Follow the agreed project record';
  if (current.status === 'pending') return `Waiting for ${current.title.toLowerCase()} funding`;
  if (current.status === 'funded') return `Complete the trigger for ${current.title.toLowerCase()}`;
  if (current.status === 'completed') return `Waiting for ${current.title.toLowerCase()} approval`;
  return `${current.title} is paused`;
}

function nextCopy(status: Job['status'], paymentMode: Job['paymentMode'], current: Milestone | undefined, allReleased: boolean) {
  if (status === 'completed') return 'The homeowner can review the completed work and the project history.';
  if (paymentMode === 'undecided') return 'The quote is accepted. The homeowner now chooses BuildPay or a private payment arrangement.';
  if (paymentMode === 'external') return 'BuildPair keeps the project record, messages and variations, but cannot process or verify payments made privately.';
  if (allReleased) return 'Every agreed BuildPay stage is released. Resolve any variations, then mark the whole job complete.';
  if (!current) return 'Keep the job record up to date as work progresses.';
  if (current.status === 'pending') return current.kind === 'materials' ? 'Waiting for the homeowner to complete the initial funding. Materials will release to your Stripe account while the first work stage is secured.' : 'Waiting for the homeowner to fund this stage through BuildPay.';
  if (current.status === 'funded') return 'The homeowner payment is secured but has not been transferred to you. Reach the agreed completion point, then request release.';
  if (current.status === 'completed') return 'You requested release. The homeowner is reviewing the agreed completion point.';
  return 'The homeowner raised an issue before release. The money stays paused while both sides resolve it.';
}

const styles = StyleSheet.create({
  nextCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  protectionCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  externalCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  siteCard: { backgroundColor: colors.surfaceRaised, borderColor: colors.accent },
  waitingCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  currentStageCard: { borderColor: colors.primary, borderWidth: 2 },
  issueBox: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  errorCard: { borderColor: colors.danger, backgroundColor: colors.surfaceSoft },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted, lineHeight: 20 },
  notice: { color: colors.charcoalSoft, fontWeight: '700', lineHeight: 20 },
  success: { color: colors.accentDark, fontWeight: '800', lineHeight: 20 },
  issue: { color: colors.danger, fontWeight: '800', lineHeight: 20 },
  externalText: { color: colors.warning, fontWeight: '700' },
  money: { color: colors.primary, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  badges: { gap: 4, alignItems: 'flex-end' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { minWidth: 135, flexGrow: 1, padding: 10, borderRadius: 10, backgroundColor: colors.surfaceSoft },
  responseBox: { gap: 8 },
  moneyInput: { minWidth: 150, flex: 1 },
  timelineRow: { position: 'relative', flexDirection: 'row', gap: 12, paddingBottom: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, marginTop: 3, zIndex: 2 },
  line: { position: 'absolute', left: 7, top: 19, bottom: 0, width: 2, backgroundColor: colors.border },
});
