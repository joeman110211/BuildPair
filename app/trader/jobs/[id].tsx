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
import type { Job, JobTimelineEvent, JobVariation, Quote } from '@/types';

type Milestone = {
  id: string; title: string; amount: number; status: 'pending' | 'completed' | 'paid';
  kind: 'materials' | 'deposit' | 'stage' | 'final'; triggerDescription: string; sortOrder: number;
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
  const load = useCallback(async () => { try { setData(await apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken)); setError(''); } catch (e) { setError(errorMessage(e)); } }, [getToken, id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function propose() {
    try { setBusy(true); setError(''); await apiFetch('/api/variations', { method: 'POST', body: JSON.stringify({ jobId: id, title, description, amountDelta: poundsToPence(amount), durationDeltaDays: Number(days || 0) }) }, getToken); setTitle('Additional work'); setDescription(''); setAmount(''); setDays('0'); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function withdraw(variationId: string) {
    try { setBusy(true); await apiFetch(`/api/variations/${variationId}`, { method: 'PATCH', body: JSON.stringify({ action: 'withdraw' }) }, getToken); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function completeStage(milestoneId: string) {
    try { setStageBusy(milestoneId); setError(''); await apiFetch('/api/milestones', { method: 'PATCH', body: JSON.stringify({ id: milestoneId, action: 'complete' }) }, getToken); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setStageBusy(undefined); }
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
  const allPaid = data.milestones.length > 0 && data.milestones.every((stage) => stage.status === 'paid');
  const firstPendingWorkStage = data.milestones.find((stage) => stage.status === 'pending' && stage.kind !== 'materials' && stage.kind !== 'deposit');
  const previousStagesPaid = (stage: Milestone) => data.milestones.filter((item) => item.sortOrder < stage.sortOrder).every((item) => item.status === 'paid');

  return <Screen title={data.job.title} subtitle={`${data.job.category} · ${data.job.status.replace('_', ' ')}`}>
    <AppCard style={styles.nextCard}>
      <Chip icon={data.job.status === 'completed' ? 'flag-checkered' : 'briefcase-check-outline'}>{data.job.status === 'completed' ? 'Work complete' : 'Active BuildPair job'}</Chip>
      <Text variant="titleLarge" style={styles.title}>{data.job.status === 'completed' ? 'The project record is complete' : paymentMode === 'undecided' ? 'Waiting for the homeowner to choose payment route' : paymentMode === 'external' ? 'Private payments selected' : allPaid ? 'All agreed stages are paid' : 'Follow the agreed payment stages'}</Text>
      <Text style={styles.muted}>{data.job.status === 'completed' ? 'The homeowner can review the completed work and payment history.' : paymentMode === 'undecided' ? 'The quote is accepted. The homeowner must choose BuildPair staged payments or a private payment arrangement before payment stages progress.' : paymentMode === 'external' ? 'BuildPair keeps the project record, messages and variations, but cannot process or protect money exchanged privately.' : 'Do not skip stages. When you reach an agreed completion point, mark that stage complete so the homeowner can review it and make the payment.'}</Text>
      {data.job.status === 'in_progress' && (paymentMode === 'external' || allPaid) ? <Button mode="contained" icon="check-circle-outline" loading={busy} disabled={busy || hasPendingVariation} onPress={() => void complete()}>Mark whole job complete</Button> : null}
      {data.job.status === 'in_progress' && paymentMode === 'buildpair' && !allPaid ? <HelperText type="info">The whole job can be marked complete after every agreed BuildPair payment stage has been paid.</HelperText> : null}
      {hasPendingVariation ? <HelperText type="info">Resolve the pending variation before marking the whole job complete.</HelperText> : null}
    </AppCard>

    <AppCard><View style={styles.row}><Chip>{data.job.budgetRange}</Chip>{data.job.isEmergency ? <Chip icon="alert">Emergency</Chip> : null}{data.job.scheduledStartAt ? <Chip icon="calendar">Starts {new Date(data.job.scheduledStartAt).toLocaleDateString('en-GB')}</Chip> : null}</View><Text style={styles.body}>{data.job.description}</Text>{data.acceptedQuote ? <Text style={styles.muted}>Agreed quote: {formatMoney(data.acceptedQuote.totalAmount)}{data.acceptedQuote.durationDays ? ` · ${data.acceptedQuote.durationDays} days` : ''}</Text> : null}<View style={styles.row}><Link href="/trader/messages" asChild><Button mode="outlined" icon="message-text-outline">Messages</Button></Link><Link href={reportCustomerHref} asChild><Button mode="text" icon="alert-outline" textColor={colors.danger}>Report this homeowner</Button></Link></View></AppCard>

    <Text variant="titleLarge" style={styles.title}>Payment stages</Text>
    {data.milestones.length ? data.milestones.map((stage) => {
      const upfront = stage.kind === 'materials' || stage.kind === 'deposit';
      const canComplete = data.job.status === 'in_progress' && paymentMode !== 'undecided' && !upfront && stage.status === 'pending' && firstPendingWorkStage?.id === stage.id && (paymentMode === 'external' || previousStagesPaid(stage));
      return <AppCard key={stage.id}>
        <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{stage.title}</Text><Text variant="titleLarge" style={styles.money}>{formatMoney(stage.amount)}</Text>{stage.triggerDescription ? <Text style={styles.muted}>{stage.triggerDescription}</Text> : null}</View><View style={styles.badges}><Chip>{stage.kind}</Chip><Chip>{stage.status}</Chip></View></View>
        {paymentMode === 'buildpair' && upfront && stage.status === 'pending' ? <Text style={styles.muted}>{stage.kind === 'materials' ? 'Waiting for the homeowner to pay the agreed materials amount before materials are ordered.' : 'Waiting for the homeowner to pay the agreed deposit.'}</Text> : null}
        {paymentMode === 'buildpair' && stage.status === 'completed' ? <Text style={styles.muted}>You marked this stage complete. Waiting for the homeowner to review and pay it.</Text> : null}
        {canComplete ? <Button mode="contained" icon="check" loading={stageBusy === stage.id} disabled={Boolean(stageBusy)} onPress={() => void completeStage(stage.id)}>Mark {stage.title} complete</Button> : null}
        {paymentMode === 'external' && stage.status !== 'paid' ? <Text style={styles.externalText}>Payment is being arranged privately. BuildPair is not processing this amount.</Text> : null}
      </AppCard>;
    }) : <EmptyState title="No payment stages" body="The accepted quote does not contain payment stages." />}

    <Text variant="titleLarge" style={styles.title}>Project timeline</Text>
    {data.timeline?.length ? <AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.dot} /><View style={styles.flex}><Text variant="titleSmall" style={styles.title}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.line} /> : null}</View>)}</AppCard> : <EmptyState title="No timeline events yet" body="Job progress and approved changes will appear here." />}

    <Text variant="titleLarge" style={styles.title}>Variations</Text>
    {data.variations?.map((variation) => <AppCard key={variation.id}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View><Text>Price: {variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)} · Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} days</Text>{variation.status === 'pending' ? <Button mode="outlined" disabled={busy} onPress={() => void withdraw(variation.id)}>Withdraw proposal</Button> : null}</AppCard>)}
    {data.job.status === 'in_progress' ? <AppCard><Text variant="titleMedium" style={styles.title}>Propose a job change</Text><Text style={styles.muted}>Record chargeable extras or scope changes here and get homeowner approval before doing the additional work.</Text><TextInput mode="outlined" label="Variation title" value={title} onChangeText={setTitle} /><TextInput mode="outlined" label="What is changing?" value={description} onChangeText={setDescription} multiline numberOfLines={4} /><View style={styles.row}><TextInput style={styles.moneyInput} mode="outlined" label="Price change (£)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /><TextInput style={styles.moneyInput} mode="outlined" label="Days change" value={days} onChangeText={setDays} keyboardType="numbers-and-punctuation" /></View><HelperText type="error" visible={Boolean(error)}>{error}</HelperText><Button mode="contained" loading={busy} disabled={busy || title.trim().length < 3 || description.trim().length < 10} onPress={() => void propose()}>Send variation for approval</Button></AppCard> : null}
    {error ? <HelperText type="error">{error}</HelperText> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  nextCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, title: { color: colors.charcoal, fontWeight: '900' }, body: { color: colors.text, lineHeight: 22 }, muted: { color: colors.muted, lineHeight: 21 }, money: { color: colors.primary, fontWeight: '900' }, externalText: { color: colors.warning, fontWeight: '700' }, badges: { gap: 4, alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, flex: { flex: 1, minWidth: 220, gap: 3 }, moneyInput: { flex: 1, minWidth: 140 }, timelineRow: { position: 'relative', flexDirection: 'row', gap: 12, paddingBottom: 18 }, dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, marginTop: 3, zIndex: 2 }, line: { position: 'absolute', left: 7, top: 19, bottom: 0, width: 2, backgroundColor: colors.border },
});
