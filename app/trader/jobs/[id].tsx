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

type Detail = { job: Job; acceptedQuote: Quote | null; variations: JobVariation[]; timeline: JobTimelineEvent[] };

export default function TraderJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [data, setData] = useState<Detail>();
  const [title, setTitle] = useState('Additional work');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setData(await apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
  }, [getToken, id]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function propose() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/variations', { method: 'POST', body: JSON.stringify({ jobId: id, title, description, amountDelta: poundsToPence(amount), durationDeltaDays: Number(days || 0) }) }, getToken);
      setTitle('Additional work'); setDescription(''); setAmount(''); setDays('0'); await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function withdraw(variationId: string) {
    try { setBusy(true); await apiFetch(`/api/variations/${variationId}`, { method: 'PATCH', body: JSON.stringify({ action: 'withdraw' }) }, getToken); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  if (error && !data) return <Screen><EmptyState title="Job unavailable" body={error} /></Screen>;
  if (!data) return <LoadingScreen />;
  const reportCustomerHref = ({ pathname: '/(public)/report', params: { subjectUserId: data.job.customerId, subjectLabel: 'Homeowner on this job', subjectType: 'customer' } } as Href);
  return <Screen title={data.job.title} subtitle={`${data.job.category} · ${data.job.status.replace('_', ' ')}`}>
    <AppCard><View style={styles.row}><Chip>{data.job.budgetRange}</Chip>{data.job.isEmergency ? <Chip icon="alert">Emergency</Chip> : null}{data.job.scheduledStartAt ? <Chip icon="calendar">Starts {new Date(data.job.scheduledStartAt).toLocaleDateString('en-GB')}</Chip> : null}</View><Text style={styles.body}>{data.job.description}</Text>{data.acceptedQuote ? <Text style={styles.muted}>Agreed quote: {formatMoney(data.acceptedQuote.totalAmount)}{data.acceptedQuote.durationDays ? ` · ${data.acceptedQuote.durationDays} days` : ''}</Text> : null}<Link href={reportCustomerHref} asChild><Button mode="text" icon="alert-outline" textColor={colors.danger}>Report this homeowner</Button></Link></AppCard>

    <Text variant="titleLarge" style={styles.title}>Project timeline</Text>
    {data.timeline?.length ? <AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.dot} /><View style={styles.flex}><Text variant="titleSmall" style={styles.title}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.line} /> : null}</View>)}</AppCard> : <EmptyState title="No timeline events yet" body="Job progress and approved changes will appear here." />}

    <Text variant="titleLarge" style={styles.title}>Variations</Text>
    {data.variations?.map((variation) => <AppCard key={variation.id}><View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View><Text>Price: {variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)} · Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} days</Text>{variation.status === 'pending' ? <Button mode="outlined" disabled={busy} onPress={() => void withdraw(variation.id)}>Withdraw proposal</Button> : null}</AppCard>)}
    {data.job.status === 'in_progress' ? <AppCard><Text variant="titleMedium" style={styles.title}>Propose a job change</Text><Text style={styles.muted}>Keep extras and scope changes out of awkward text-message arguments. Record the price/time change and let the homeowner approve it before it becomes part of the job record.</Text><TextInput mode="outlined" label="Variation title" value={title} onChangeText={setTitle} /><TextInput mode="outlined" label="What is changing?" value={description} onChangeText={setDescription} multiline numberOfLines={4} /><View style={styles.row}><TextInput style={styles.moneyInput} mode="outlined" label="Price change (£)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /><TextInput style={styles.moneyInput} mode="outlined" label="Days change" value={days} onChangeText={setDays} keyboardType="numbers-and-punctuation" /></View><HelperText type="error" visible={Boolean(error)}>{error}</HelperText><Button mode="contained" loading={busy} disabled={busy || title.trim().length < 3 || description.trim().length < 10} onPress={() => void propose()}>Send variation for approval</Button></AppCard> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontWeight: '900' }, body: { color: colors.text, lineHeight: 22 }, muted: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, flex: { flex: 1, minWidth: 220, gap: 3 }, moneyInput: { flex: 1, minWidth: 140 },
  timelineRow: { position: 'relative', flexDirection: 'row', gap: 12, paddingBottom: 18 }, dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, marginTop: 3, zIndex: 2 }, line: { position: 'absolute', left: 7, top: 19, bottom: 0, width: 2, backgroundColor: colors.border },
});
