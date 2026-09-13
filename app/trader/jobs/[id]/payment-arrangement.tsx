import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, Chip, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';

type Arrangement = {
  paymentMode: 'undecided' | 'buildpair' | 'external';
  proposedAt: string | null;
  proposedByMe: boolean;
  proposedByOther: boolean;
  myAgreed: boolean;
  otherAgreed: boolean;
  fullyAgreed: boolean;
};

export default function TraderPaymentArrangementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<Arrangement>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setState(await apiFetch<Arrangement>(`/api/payment-arrangement?jobId=${encodeURIComponent(id)}`, {}, getToken));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken, id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function act(action: 'propose_external' | 'confirm_external' | 'cancel_external') {
    try {
      setBusy(true); setError('');
      const next = await apiFetch<Arrangement>('/api/payment-arrangement', { method: 'POST', body: JSON.stringify({ jobId: id, action }) }, getToken);
      setState(next);
      if (next.paymentMode === 'external') router.replace(`/trader/jobs/${id}` as Href);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (!state) return <LoadingScreen label="Checking payment arrangement…" />;
  return <Screen title="Payment arrangement" subtitle="Both sides must agree before a job moves outside BuildPay">
    <AppCard>
      <Chip icon={state.paymentMode === 'external' ? 'check-circle-outline' : 'bank-transfer-out'}>{state.paymentMode === 'external' ? 'Direct payment agreed' : 'Decision recorded in BuildPair'}</Chip>
      <Text variant="titleLarge">Paying outside BuildPair is allowed</Text>
      <Text>Site visits, face-to-face discussions and in-person quotes are allowed. If you and the homeowner want to settle the accepted structured quote by bank transfer, cash or another direct method, BuildPair does not force you to use BuildPay.</Text>
      <Text>Both of you must agree here first. Once agreed, BuildPair keeps the quote, messages, variations and optional two-party payment confirmations, but it does not receive, hold, protect, refund, recover or independently verify the money.</Text>
    </AppCard>

    {state.paymentMode === 'external' ? <AppCard>
      <Chip icon="check">Both sides agreed</Chip>
      <Text>Direct payments are active for this project. Each recorded payment stage still needs both parties to confirm what happened if you want it shown in the BuildPair project record.</Text>
      <Button mode="contained" onPress={() => router.replace(`/trader/jobs/${id}` as Href)}>Back to project</Button>
    </AppCard> : state.proposedByOther ? <AppCard>
      <Text variant="titleLarge">Homeowner proposed direct payment</Text>
      <Text>Agree only if this matches what you discussed. Confirming switches the job to direct payment and removes BuildPay protection for future payments.</Text>
      <Button mode="contained" icon="check" loading={busy} disabled={busy} onPress={() => void act('confirm_external')}>Agree to payment outside BuildPair</Button>
    </AppCard> : state.proposedByMe ? <AppCard>
      <Chip icon="clock-outline">Waiting for homeowner</Chip>
      <Text>Your proposal is recorded. The job will not switch to direct payment unless the homeowner explicitly agrees.</Text>
      <Button mode="text" disabled={busy} onPress={() => void act('cancel_external')}>Cancel proposal</Button>
    </AppCard> : <AppCard>
      <Text variant="titleLarge">Propose direct payment</Text>
      <Text>The homeowner will be notified and must confirm their side before anything changes.</Text>
      <Button mode="outlined" icon="bank-transfer-out" loading={busy} disabled={busy} onPress={() => void act('propose_external')}>Propose payment outside BuildPair</Button>
    </AppCard>}

    {error ? <HelperText type="error">{error}</HelperText> : null}
  </Screen>;
}
