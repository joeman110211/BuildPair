import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { QuoteComparison } from '@/components/QuoteComparison';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Job, PaymentStagePlan, Quote } from '@/types';

export default function CompareQuotesScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ job: Job; quotes: Quote[] }>();
  const [accepting, setAccepting] = useState<string>();
  const [messaging, setMessaging] = useState<string>();
  const [acting, setActing] = useState<string>();
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { setData(await apiFetch(`/api/jobs/${jobId}/quotes`, {}, getToken)); setError(''); } catch (e) { setError(errorMessage(e)); } }, [getToken, jobId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function performAccept(quote: Quote) {
    try {
      setAccepting(quote.id); setError('');
      await apiFetch(`/api/quotes/${quote.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept', acknowledgedPaymentSchedule: true }) }, getToken);
      router.replace(`/customer/jobs/${jobId}`);
    } catch (e) { setError(errorMessage(e)); }
    finally { setAccepting(undefined); }
  }

  function accept(quote: Quote) {
    const message = `You are accepting the ${formatMoney(quote.totalAmount)} quote and the payment schedule shown with it. Review the scope, exclusions, upfront materials payment or deposit, and each later stage before continuing. Accepting the quote does not itself make a payment. If you later choose BuildPair payments, upfront materials payments and deposits are transferred when paid; progress and final stages are transferred only after the tradesperson requests release and you approve it.`;
    if (typeof window !== 'undefined') {
      if (window.confirm(message)) void performAccept(quote);
      return;
    }
    Alert.alert('Accept quote and payment schedule?', message, [
      { text: 'Review again', style: 'cancel' },
      { text: 'Accept quote', onPress: () => void performAccept(quote) },
    ]);
  }

  async function decline(quote: Quote) {
    const perform = async () => {
      try { setActing(quote.id); setError(''); await apiFetch(`/api/quotes/${quote.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'decline' }) }, getToken); await load(); }
      catch (e) { setError(errorMessage(e)); }
      finally { setActing(undefined); }
    };
    if (typeof window !== 'undefined') {
      if (window.confirm(`Decline the ${quote.businessName ?? 'tradesperson'} quote?`)) await perform();
    } else {
      Alert.alert('Decline quote?', 'The tradesperson will be notified.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Decline', style: 'destructive', onPress: () => void perform() }]);
    }
  }

  async function editPaymentPlan(quote: Quote, paymentSchedule: PaymentStagePlan[]) {
    try {
      setActing(quote.id); setError('');
      await apiFetch(`/api/quotes/${quote.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'edit_payment_plan', paymentSchedule }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setActing(undefined); }
  }

  async function message(quote: Quote) {
    try {
      setMessaging(quote.id); setError('');
      const conversation = await apiFetch<{ id: string }>('/api/conversations', { method: 'POST', body: JSON.stringify({ jobId, traderId: quote.traderId }) }, getToken);
      router.push(`/customer/messages/${conversation.id}` as Href);
    } catch (e) { setError(errorMessage(e)); }
    finally { setMessaging(undefined); }
  }

  if (error && !data) return <Screen><EmptyState title="Quotes unavailable" body={error} action={<Button onPress={load}>Try again</Button>} /></Screen>;
  if (!data) return <LoadingScreen />;
  return <Screen title="Compare quotes" subtitle={data.job.title}>
    {error ? <EmptyState title="Something needs attention" body={error} /> : null}
    {!data.quotes.length ? <EmptyState title="No quotes yet" body="We’ll keep them organised here when tradespeople respond." /> : <QuoteComparison quotes={data.quotes} accepting={accepting} messaging={messaging} acting={acting} onAccept={accept} onMessage={message} onDecline={decline} onEditPlan={editPaymentPlan} />}
  </Screen>;
}
