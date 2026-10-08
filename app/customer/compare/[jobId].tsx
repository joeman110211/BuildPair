import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { QuoteComparison } from '@/components/QuoteComparison';
import { QuoteComparisonOverview } from '@/components/QuoteComparisonOverview';
import { apiFetch, errorMessage } from '@/lib/api';
import { BUILDPAY_OPEN } from '@/lib/launch-config';
import { formatMoney } from '@/lib/money';
import type { Job, PaymentStagePlan, Quote } from '@/types';

type PaymentChoice = 'full' | 'milestones';
type IntakeState = {
  quoteIntakeClosedAt: string | null;
  quoteIntakeClosed: boolean;
  activeQuoteCount: number;
  archivedQuoteCount: number;
  canReceiveMoreQuotes: boolean;
  intakeLabel: string;
};

export default function CompareQuotesScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ job: Job; quotes: Quote[] }>();
  const [intake, setIntake] = useState<IntakeState>();
  const [accepting, setAccepting] = useState<string>();
  const [messaging, setMessaging] = useState<string>();
  const [acting, setActing] = useState<string>();
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [quotesResult, intakeResult] = await Promise.all([
        apiFetch<{ job: Job; quotes: Quote[] }>(`/api/jobs/${jobId}/quotes`, {}, getToken),
        apiFetch<IntakeState>(`/api/jobs/${jobId}/quote-intake`, {}, getToken),
      ]);
      setData(quotesResult);
      setIntake(intakeResult);
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken, jobId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const acceptedQuotes = useMemo(() => data?.quotes.filter((quote) => quote.status === 'accepted') ?? [], [data?.quotes]);
  const pendingQuotes = useMemo(() => data?.quotes.filter((quote) => quote.status === 'pending') ?? [], [data?.quotes]);
  const visibleQuotes = acceptedQuotes.length ? acceptedQuotes : pendingQuotes;

  async function performAccept(quote: Quote, paymentPlanChoice: PaymentChoice) {
    try {
      setAccepting(quote.id); setError('');
      const customerPaysBuildPay = Boolean(quote.buildPayRequestedBy && quote.buildPayFeeMode === 'customer_pays');
      await apiFetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'accept',
          paymentPlanChoice,
          acknowledgedPaymentSchedule: true,
          acknowledgedBuildPayFee: customerPaysBuildPay ? true : undefined,
        }),
      }, getToken);
      router.replace(`/customer/jobs/${jobId}/start` as Href);
    } catch (e) { setError(errorMessage(e)); }
    finally { setAccepting(undefined); }
  }

  function accept(quote: Quote, paymentPlanChoice: PaymentChoice) {
    const paymentText = paymentPlanChoice === 'full'
      ? 'The agreed schedule is materials first, then one service balance.'
      : 'The agreed milestone schedule stays attached to the job.';
    const buildPayFee = quote.buildPayFeeMode === 'customer_pays' ? Math.max(0, quote.buildPayCustomerFeeEstimate ?? 0) : 0;
    const allIn = quote.totalAmount + buildPayFee;
    const buildPayText = quote.buildPayRequestedBy
      ? quote.buildPayFeeMode === 'customer_pays'
        ? ` BuildPay is part of this proposal. Work price: ${formatMoney(quote.totalAmount)}. BuildPay service fee: ${formatMoney(buildPayFee)}. All-in total with BuildPay: ${formatMoney(allIn)}.`
        : ` BuildPay is part of this proposal. The tradesperson is absorbing its agreed fees, so your all-in total remains ${formatMoney(quote.totalAmount)}.`
      : ' Accepting does not charge your card. After acceptance, agree payment directly with the tradesperson; BuildPair does not handle that money.';
    const message = `You are accepting the quote from ${quote.businessName ?? 'this tradesperson'}. ${paymentText}${buildPayText} Other active quotes will be archived and those tradespeople will be notified that another quote was chosen.`;
    if (typeof window !== 'undefined') {
      if (window.confirm(message)) void performAccept(quote, paymentPlanChoice);
      return;
    }
    Alert.alert('Accept this quote?', message, [
      { text: 'Review again', style: 'cancel' },
      { text: 'Accept quote', onPress: () => void performAccept(quote, paymentPlanChoice) },
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
      Alert.alert('Decline quote?', 'The tradesperson will be notified and the quote will move out of your active comparison.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Decline', style: 'destructive', onPress: () => void perform() }]);
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

  async function setQuoteIntake(action: 'close' | 'reopen') {
    try {
      setIntakeBusy(true); setError('');
      const next = await apiFetch<IntakeState>(`/api/jobs/${jobId}/quote-intake`, { method: 'PATCH', body: JSON.stringify({ action }) }, getToken);
      setIntake(next);
    } catch (e) { setError(errorMessage(e)); }
    finally { setIntakeBusy(false); }
  }

  if (error && !data) return <Screen><EmptyState title="Quotes unavailable" body={error} action={<Button onPress={load}>Try again</Button>} /></Screen>;
  if (!data || !intake) return <LoadingScreen />;
  return <Screen title="Compare quotes" subtitle={data.job.title}>
    {error ? <EmptyState title="Something needs attention" body={error} /> : null}

    {!acceptedQuotes.length ? <AppCard>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, flexBasis: 220, flexShrink: 1, minWidth: 0, maxWidth: '100%', gap: 4 }}>
          <Text variant="titleLarge" style={{ fontWeight: '900' }}>Control your quote inbox</Text>
          <Text>You can stop new tradespeople sending quotes whenever you have enough to compare. Quotes already received stay here and can still be accepted, declined or discussed.</Text>
        </View>
        <Chip icon={intake.quoteIntakeClosed ? 'pause-circle-outline' : 'inbox-arrow-down-outline'}>{intake.intakeLabel}</Chip>
      </View>
      {intake.quoteIntakeClosed ? <Button mode="outlined" icon="play-circle-outline" loading={intakeBusy} disabled={intakeBusy} onPress={() => void setQuoteIntake('reopen')}>Receive new quotes again</Button> : <Button mode="contained-tonal" icon="pause-circle-outline" loading={intakeBusy} disabled={intakeBusy} onPress={() => void setQuoteIntake('close')}>Stop receiving new quotes</Button>}
      <Text variant="bodySmall">BuildPair also stops additional new quotes automatically once you already have enough active quotes to make a sensible comparison. We do not turn your job into an endless lead auction.</Text>
    </AppCard> : null}

    {pendingQuotes.length > 1 ? <QuoteComparisonOverview quotes={pendingQuotes} /> : null}

    {intake.archivedQuoteCount > 0 ? <AppCard elevated={false}>
      <Text variant="bodySmall">{intake.archivedQuoteCount} declined or withdrawn quote{intake.archivedQuoteCount === 1 ? '' : 's'} archived. They stay in the BuildPair project record rather than cluttering your active comparison.</Text>
    </AppCard> : null}

    {!visibleQuotes.length ? <EmptyState title="No active quotes yet" body={intake.quoteIntakeClosed ? 'You have paused new quotes. Reopen quote intake above if you want more tradespeople to respond.' : 'We’ll keep structured quotes organised here when tradespeople respond.'} /> : <QuoteComparison quotes={visibleQuotes} accepting={accepting} messaging={messaging} acting={acting} onAccept={accept} onMessage={message} onDecline={decline} onEditPlan={BUILDPAY_OPEN ? editPaymentPlan : undefined} />}
  </Screen>;
}
