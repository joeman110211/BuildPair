import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, Chip, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Quote } from '@/types';

export default function ReviewPaymentPlanScreen() {
  const { quoteId } = useLocalSearchParams<{ quoteId: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote>();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const rows = await apiFetch<Quote[]>('/api/quotes', {}, getToken);
      setQuote(rows.find((row) => row.id === quoteId));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken, quoteId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function acceptPlan() {
    if (!quote) return;
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/quotes/${quote.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept_payment_plan', acknowledgedPaymentSchedule: true }) }, getToken);
      setConfirming(false);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (error && !quote) return <Screen><EmptyState title="Payment schedule unavailable" body={error} /></Screen>;
  if (!quote) return <LoadingScreen />;
  const waiting = quote.paymentScheduleStatus === 'customer_edited';
  return <Screen title="Review payment schedule" subtitle={`Quote total ${formatMoney(quote.totalAmount)}`}>
    <AppCard>
      <Chip icon={waiting ? 'account-edit-outline' : 'check-circle-outline'}>{waiting ? 'Homeowner proposed changes' : 'Payment schedule agreed'}</Chip>
      <Text variant="titleLarge">The quote total has not changed</Text>
      <Text>The homeowner can propose changes to the split, timing or description of payment stages. They cannot change your labour, materials, VAT or total quoted price.</Text>
    </AppCard>
    <AppCard>
      <Text variant="titleLarge">Payment schedule</Text>
      {(quote.paymentSchedule ?? []).map((stage) => <AppCard key={stage.key} elevated={false}>
        <Text variant="titleMedium">{stage.title} · {formatMoney(stage.amount)}</Text>
        <Chip compact>{stage.kind}</Chip>
        <Text>{stage.trigger || 'No completion point specified.'}</Text>
      </AppCard>)}
      <Text variant="headlineSmall">Total: {formatMoney(quote.totalAmount)}</Text>
      {waiting ? <Text>Check that every amount, stage and completion point is workable before accepting the revised schedule. Materials payments and deposits are upfront payments when BuildPair payments are used. For progress and final stages, request release only after the recorded completion point has been reached.</Text> : null}
      {waiting && !confirming ? <Button mode="contained" icon="check" disabled={busy} onPress={() => setConfirming(true)}>Review & accept changes</Button> : null}
      {waiting && confirming ? <AppCard elevated={false}>
        <Text variant="titleMedium">Confirm revised payment schedule</Text>
        <Text>I have reviewed the amounts, order and completion points. I understand that requesting release of a progress or final stage confirms that the recorded completion point has been reached.</Text>
        <Text>This does not remove the homeowner’s responsibility to check the stage before approving release or either party’s statutory or contractual rights.</Text>
        <Button mode="text" disabled={busy} onPress={() => setConfirming(false)}>Review again</Button>
        <Button mode="contained" icon="check" loading={busy} disabled={busy} onPress={() => void acceptPlan()}>Accept revised schedule</Button>
      </AppCard> : null}
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      {!waiting ? <Button mode="contained" onPress={() => router.replace('/trader/messages')}>Back to messages</Button> : null}
    </AppCard>
  </Screen>;
}
