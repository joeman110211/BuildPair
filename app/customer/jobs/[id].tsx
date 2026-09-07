import { useAuth } from '@clerk/expo';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import type { Job, JobTimelineEvent, JobVariation, Quote, TraderProfile } from '@/types';

type Milestone = { id: string; title: string; amount: number; status: 'pending' | 'completed' | 'paid' };
type Detail = { job: Job; acceptedQuote: Quote | null; milestones: Milestone[]; trader: TraderProfile | null; existingReview: unknown; variations: JobVariation[]; timeline: JobTimelineEvent[] };

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [data, setData] = useState<Detail>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const load = useCallback(async () => { try { setData(await apiFetch(`/api/jobs/${id}`, {}, getToken)); setError(''); } catch (e) { setError(errorMessage(e)); } }, [getToken, id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function review() {
    if (!data?.acceptedQuote) return;
    try { setBusy(true); await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify({ jobId: id, traderId: data.acceptedQuote.traderId, rating, comment }) }, getToken); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function cancelJob() {
    try { setBusy(true); setError(''); await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) }, getToken); setConfirmCancel(false); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function variationAction(variationId: string, action: 'accept' | 'decline') {
    try { setBusy(true); setError(''); await apiFetch(`/api/variations/${variationId}`, { method: 'PATCH', body: JSON.stringify({ action }) }, getToken); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  if (error && !data) return <Screen><EmptyState title="Job unavailable" body={error} /></Screen>;
  if (!data) return <LoadingScreen />;
  const reviewAllowed = data.job.status === 'completed' && data.milestones.some((m) => m.title !== 'Deposit' && m.status === 'paid') && !data.existingReview;
  const cancellable = !data.acceptedQuote && ['open', 'quoted'].includes(data.job.status);
  const location = [data.job.locationLabel, data.job.postcode].filter(Boolean).join(' · ');
  const reportedTraderId = data.acceptedQuote?.traderId ?? data.job.targetTraderId;
  const reportTraderHref = reportedTraderId ? ({ pathname: '/(public)/report', params: { subjectUserId: reportedTraderId, subjectLabel: data.trader?.businessName ?? 'Tradesperson on this job', subjectType: 'trader' } } as Href) : null;
  return <Screen title={data.job.title} subtitle={`${data.job.category} · ${data.job.status.replace('_', ' ')}`}>
    <AppCard><View style={styles.row}><Chip>{data.job.propertyType}</Chip><Chip>{data.job.urgency}</Chip><Chip>{data.job.budgetRange}</Chip>{data.job.isEmergency ? <Chip icon="alert">Emergency</Chip> : null}</View>{location ? <Text variant="titleSmall">Job location: {location}</Text> : null}<Text>{data.job.description}</Text>{data.job.aiGeneratedSpec ? <Text variant="bodySmall" style={styles.muted}>Drafted with AI and approved by the customer.</Text> : null}{data.job.scheduledStartAt ? <Text style={styles.muted}>Scheduled start: {new Date(data.job.scheduledStartAt).toLocaleDateString('en-GB')}</Text> : null}{cancellable && !confirmCancel ? <Button mode="outlined" textColor={colors.danger} onPress={() => setConfirmCancel(true)}>Cancel job</Button> : null}{cancellable && confirmCancel ? <View style={styles.cancelBox}><Text variant="titleSmall">Cancel this job?</Text><Text style={styles.muted}>Pending quotes will be declined and the job will stop appearing to tradespeople.</Text><View style={styles.row}><Button onPress={() => setConfirmCancel(false)} disabled={busy}>Keep job</Button><Button mode="contained" buttonColor={colors.danger} loading={busy} disabled={busy} onPress={() => void cancelJob()}>Confirm cancellation</Button></View></View> : null}</AppCard>
    {data.job.photos?.length ? <View style={styles.gallery}>{data.job.photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.photo} />)}</View> : null}

    {data.timeline?.length ? <><Text variant="titleLarge" style={styles.heading}>Project Timeline</Text><AppCard>{data.timeline.map((event, index) => <View key={event.id} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={styles.timelineCopy}><Text variant="titleSmall" style={styles.heading}>{event.title}</Text>{event.description ? <Text style={styles.muted}>{event.description}</Text> : null}<Text variant="bodySmall" style={styles.muted}>{new Date(event.createdAt).toLocaleString('en-GB')}</Text></View>{index < data.timeline.length - 1 ? <View style={styles.timelineLine} /> : null}</View>)}</AppCard></> : null}

    {data.variations?.length ? <><Text variant="titleLarge" style={styles.heading}>Approved Changes & Variations</Text>{data.variations.map((variation) => <AppCard key={variation.id}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.heading}>{variation.title}</Text><Text style={styles.muted}>{variation.description}</Text></View><Chip>{variation.status}</Chip></View>
      <View style={styles.row}><Text>Price change: <Text style={styles.money}>{variation.amountDelta >= 0 ? '+' : ''}{formatMoney(variation.amountDelta)}</Text></Text><Text>Time: {variation.durationDeltaDays >= 0 ? '+' : ''}{variation.durationDeltaDays} day{Math.abs(variation.durationDeltaDays) === 1 ? '' : 's'}</Text></View>
      {variation.status === 'pending' ? <View style={styles.row}><Button mode="outlined" textColor={colors.danger} disabled={busy} onPress={() => void variationAction(variation.id, 'decline')}>Decline</Button><Button mode="contained" disabled={busy} onPress={() => void variationAction(variation.id, 'accept')}>Approve variation</Button></View> : null}
    </AppCard>)}</> : null}

    {data.acceptedQuote ? <><Text variant="titleLarge" style={styles.heading}>Awarded to {data.trader?.businessName ?? 'tradesperson'}</Text><AppCard><Text>Total: {formatMoney(data.acceptedQuote.totalAmount)}</Text>{data.acceptedQuote.scope ? <><Text variant="labelLarge">Agreed scope</Text><Text>{data.acceptedQuote.scope}</Text></> : null}{data.acceptedQuote.exclusions ? <><Text variant="labelLarge">Exclusions</Text><Text>{data.acceptedQuote.exclusions}</Text></> : null}<Text>{data.acceptedQuote.paymentTerms}</Text>{reportTraderHref ? <Link href={reportTraderHref} asChild><Button mode="text" icon="alert-outline" textColor={colors.danger}>Report this tradesperson</Button></Link> : null}</AppCard>
      <Text variant="titleLarge" style={styles.heading}>Payments</Text>{data.milestones.map((milestone) => <AppCard key={milestone.id}><View style={styles.row}><View><Text variant="titleMedium">{milestone.title}</Text><Text style={styles.muted}>{formatMoney(milestone.amount)}</Text></View><Chip>{milestone.status}</Chip></View>{milestone.status !== 'paid' && (milestone.title === 'Deposit' || milestone.status === 'completed') ? <PayMilestoneButton milestoneId={milestone.id} onPaid={() => setTimeout(load, 1500)} /> : null}</AppCard>)}
    </> : data.job.status === 'cancelled' ? <EmptyState title="Job cancelled" body="This job is closed and will no longer receive quotes." /> : <EmptyState title="No quote accepted" body="Compare quotes when they arrive, then accept the best fit, not just the cheapest number." />}
    {data.existingReview ? <AppCard><Text variant="titleMedium">Review submitted ✓</Text><Text style={styles.muted}>Your verified review is now on the trader’s public profile.</Text></AppCard> : null}
    {reviewAllowed ? <AppCard><Text variant="titleMedium">Leave a verified review</Text><View style={styles.stars}>{[1,2,3,4,5].map((star) => <Button key={star} compact mode={rating === star ? 'contained' : 'outlined'} onPress={() => setRating(star)}>{star}★</Button>)}</View><TextInput label="What was the work and how did it go?" value={comment} onChangeText={setComment} mode="outlined" multiline /><HelperText type="error" visible={Boolean(error)}>{error}</HelperText><Button mode="contained" loading={busy} disabled={comment.trim().length < 10 || busy} onPress={() => void review()}>Publish verified review</Button></AppCard> : null}
    <Divider />
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1, minWidth: 220, gap: 4 },
  heading: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  money: { color: colors.primary, fontWeight: '900' },
  stars: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 180, height: 135, borderRadius: 10, backgroundColor: colors.border },
  cancelBox: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, gap: 8 },
  timelineRow: { position: 'relative', flexDirection: 'row', gap: 12, paddingBottom: 18 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, marginTop: 3, zIndex: 2 },
  timelineLine: { position: 'absolute', left: 7, top: 19, bottom: 0, width: 2, backgroundColor: colors.border },
  timelineCopy: { flex: 1, gap: 3 },
});