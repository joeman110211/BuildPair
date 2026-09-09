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

export default function TraderJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [data, setData] = useState<Detail>();
  const [title, setTitle] = useState('Additional work');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('0');
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState<string>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setData(await apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
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

    {paymentMode === 'buildpair' ? <AppCard style={styles.protectionCard}>
      <Text variant="titleLarge" style={styles.title}>BuildPair payment stages</Text>
      <Text style={styles.body}>Materials payments and deposits are transferred to your connected Stripe account when the homeowner pays them. Progress and final stages are paid by the homeowner first and transferred only after you request release and the homeowner approves it.</Text>
      <Text style={styles.muted}>Request release only after the recorded completion point has been reached. Record extra work as an agreed variation before charging for it.</Text>
    </AppCard> : paymentMode === 'external' ? <AppCard style={styles.externalCard}><Text variant="titleLarge" style={styles.title}>Private payments selected</Text><Text style={styles.muted}>BuildPair keeps the quote, messages, variations and project record, but does not process payments on this job. BuildPair payment-stage controls do not apply to money exchanged privately.</Text></AppCard> : null}

    <Text variant="titleLarge" style={styles.title}>Payment stages</Text>
    {orderedStages.length ? orderedStages.map((stage) => {
      const isCurrent = currentStage?.id === stage.id;
      const immediateUpfront = stage.kind === 'materials' || stage.kind === 'deposit';
      const canRequestRelease = data.job.status === 'in_progress' && isCurrent && paymentMode === 'buildpair' && stage.status === 'funded' && !immediateUpfront;
      const canMarkPrivateComplete = data.job.status === 'in_progress' && isCurrent && paymentMode === 'external' && stage.status === 'pending' && stage.kind !== 'materials';
      return <AppCard key={stage.id} style={isCurrent ? styles.currentStageCard : undefined}>
        <View style={styles.row}>
          <View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{stage.title}</Text><Text variant="titleLarge" style={styles.money}>{formatMoney(stage.amount)}</Text>{stage.triggerDescription ? <Text style={styles.muted}>{stage.triggerDescription}</Text> : null}</View>
          <View style={styles.badges}>{isCurrent ? <Chip icon="arrow-right-circle-outline">Next</Chip> : null}<Chip>{stage.kind}</Chip><Chip>{stageLabel(stage.status)}</Chip></View>
        </View>

        {paymentMode === 'buildpair' && immediateUpfront && stage.status === 'pending' ? <Text style={styles.muted}>Waiting for the homeowner to pay this upfront {stage.kind === 'deposit' ? 'deposit' : 'materials payment'}. When Stripe confirms payment, the amount is transferred to your connected payout account without a later release request.</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'pending' && !immediateUpfront ? <Text style={styles.muted}>{isCurrent ? 'Waiting for the homeowner to pay this stage through BuildPair.' : 'This stage stays locked until the earlier stage is released.'}</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'funded' ? <Text style={styles.notice}>Payment received ✓ No transfer has been made to you for this stage. Reach the agreed completion point, then request release.</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'completed' ? <Text style={styles.notice}>Release requested. The homeowner is being asked to check the agreed completion point and approve release or raise an issue.</Text> : null}
        {stage.status === 'paid' ? <Text style={styles.success}>Paid ✓ This stage has been transferred or released according to the agreed payment route.</Text> : null}
        {stage.status === 'disputed' ? <Text style={styles.issue}>Release paused. {stage.disputeReason || 'The homeowner raised an issue before release. Keep the discussion and evidence in BuildPair while it is resolved.'}</Text> : null}
        {canRequestRelease ? <Button mode="contained" icon="check" loading={stageBusy === stage.id} disabled={Boolean(stageBusy)} onPress={() => void requestRelease(stage.id)}>Request release of {formatMoney(stage.amount)}</Button> : null}
        {canMarkPrivateComplete ? <Button mode="outlined" icon="check" loading={stageBusy === stage.id} disabled={Boolean(stageBusy)} onPress={() => void requestRelease(stage.id)}>Mark {stage.title} complete</Button> : null}
        {paymentMode === 'external' && stage.status !== 'paid' ? <Text style={styles.externalText}>Payment is arranged privately. BuildPair is only recording project progress.</Text> : null}
      </AppCard>;
    }) : <EmptyState title="No payment stages" body="The accepted quote does not contain payment stages." />}

    <Text variant="titleLarge" style={styles.title}>Project timeline</Text>
    {data.timeline?.length ? <AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.dot} /><View style={styles.flex}><Text variant="titleSmall" style={styles.title}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.line} /> : null}</View>)}</AppCard> : <EmptyState title="No timeline events yet" body="Job progress and approved changes will appear here." />}

    <Text variant="titleLarge" style={styles.title}>Variations</Text>
    {data.variations?.map((variation) => <AppCard key={variation.id}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View><Text>Price: {variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)} · Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} days</Text>{variation.status === 'pending' ? <Button mode="outlined" disabled={busy} onPress={() => void withdraw(variation.id)}>Withdraw proposal</Button> : null}</AppCard>)}
    {data.job.status === 'in_progress' ? <AppCard><Text variant="titleMedium" style={styles.title}>Propose a job change</Text><Text style={styles.muted}>Record chargeable extras or scope changes here and get homeowner approval before doing the additional work.</Text><TextInput mode="outlined" label="Variation title" value={title} onChangeText={setTitle} /><TextInput mode="outlined" label="What is changing?" value={description} onChangeText={setDescription} multiline numberOfLines={4} /><View style={styles.row}><TextInput style={styles.moneyInput} mode="outlined" label="Price change (£)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /><TextInput style={styles.moneyInput} mode="outlined" label="Days change" value={days} onChangeText={setDays} keyboardType="numbers-and-punctuation" /></View><Button mode="contained" loading={busy} disabled={busy || title.trim().length < 3 || description.trim().length < 10} onPress={() => void propose()}>Send variation for approval</Button></AppCard> : null}
    {error ? <HelperText type="error">{error}</HelperText> : null}
  </Screen>;
}

function stageLabel(status: PaymentStageStatus) {
  if (status === 'pending') return 'Awaiting funding';
  if (status === 'funded') return 'Funded';
  if (status === 'completed') return 'Release requested';
  if (status === 'paid') return 'Released';
  return 'Issue raised';
}

function nextTitle(status: Job['status'], paymentMode: Job['paymentMode'], current: Milestone | undefined, allReleased: boolean) {
  if (status === 'completed') return 'The project record is complete';
  if (paymentMode === 'undecided') return 'Waiting for the homeowner to choose the payment route';
  if (paymentMode === 'external') return 'Private payments selected';
  if (allReleased) return 'All agreed payment stages are released';
  if (!current) return 'Follow the agreed project record';
  if (current.status === 'pending') return `Waiting for ${current.title.toLowerCase()} funding`;
  if (current.status === 'funded') return `Complete the trigger for ${current.title.toLowerCase()}`;
  if (current.status === 'completed') return `Waiting for ${current.title.toLowerCase()} approval`;
  return `${current.title} is paused`;
}

function nextCopy(status: Job['status'], paymentMode: Job['paymentMode'], current: Milestone | undefined, allReleased: boolean) {
  if (status === 'completed') return 'The homeowner can review the completed work and the project history.';
  if (paymentMode === 'undecided') return 'The quote is accepted. The homeowner now chooses BuildPair payments or a private payment arrangement.';
  if (paymentMode === 'external') return 'BuildPair keeps the project record, messages and variations, but cannot process or verify payments made privately.';
  if (allReleased) return 'Every agreed BuildPair payment stage has been released. Resolve any variations, then mark the whole job complete.';
  if (!current) return 'Keep the job record up to date as work progresses.';
  if (current.status === 'pending') return current.kind === 'materials' || current.kind === 'deposit' ? 'Waiting for the homeowner to make this upfront payment.' : 'Waiting for the homeowner to pay this stage through BuildPair.';
  if (current.status === 'funded') return 'The homeowner payment is confirmed but has not been transferred to you. Reach the agreed completion point, then request release.';
  if (current.status === 'completed') return 'You requested release. The homeowner is reviewing the agreed completion point.';
  return 'The homeowner raised an issue before release. Keep communication and evidence inside the project until it is resolved.';
}

const styles = StyleSheet.create({
  nextCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  protectionCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  externalCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  currentStageCard: { borderColor: colors.primary, borderWidth: 2 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  muted: { color: colors.muted, lineHeight: 21 },
  notice: { color: colors.charcoalSoft, fontWeight: '700', lineHeight: 21 },
  success: { color: colors.accentDark, fontWeight: '800', lineHeight: 21 },
  issue: { color: colors.danger, fontWeight: '800', lineHeight: 21 },
  money: { color: colors.primary, fontWeight: '900' },
  externalText: { color: colors.warning, fontWeight: '700' },
  badges: { gap: 4, alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  moneyInput: { flex: 1, minWidth: 140 },
  timelineRow: { position: 'relative', flexDirection: 'row', gap: 12, paddingBottom: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, marginTop: 3, zIndex: 2 },
  line: { position: 'absolute', left: 7, top: 19, bottom: 0, width: 2, backgroundColor: colors.border },
});