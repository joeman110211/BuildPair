import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
// Metro and TypeScript resolve the native/web implementation.
// eslint-disable-next-line import/no-unresolved
import { PayMilestoneButton } from '@/components/PayMilestoneButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { Job, PaymentStageStatus, Quote, TraderProfile } from '@/types';

type Milestone = {
  id: string;
  title: string;
  amount: number;
  status: PaymentStageStatus;
  kind: 'materials' | 'deposit' | 'stage' | 'final';
  triggerDescription: string;
  sortOrder: number;
};

type Detail = { job: Job; acceptedQuote: Quote | null; milestones: Milestone[]; trader: TraderProfile | null };
type PrivateDetails = { addressLine1: string; addressLine2: string; townCity: string; postcode: string; accessNotes: string; complete: boolean };

export default function StartAwardedJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Detail>();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [townCity, setTownCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [addressSaved, setAddressSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [detail, privateDetails] = await Promise.all([
        apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken),
        apiFetch<PrivateDetails>(`/api/job-private-details?jobId=${encodeURIComponent(id)}`, {}, getToken),
      ]);
      setData(detail);
      setAddressLine1(privateDetails.addressLine1);
      setAddressLine2(privateDetails.addressLine2);
      setTownCity(privateDetails.townCity);
      setPostcode(privateDetails.postcode);
      setAccessNotes(privateDetails.accessNotes);
      setAddressSaved(privateDetails.complete);
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken, id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function saveAddress() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/job-private-details', { method: 'PUT', body: JSON.stringify({ jobId: id, addressLine1, addressLine2, townCity, accessNotes }) }, getToken);
      setAddressSaved(true);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function choosePaymentMode(mode: 'buildpair' | 'external') {
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'set_payment_mode', mode, acknowledgedPaymentTerms: mode === 'buildpair' ? true : undefined }),
      }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (!data) return <LoadingScreen label="Preparing your project…" />;
  const paymentMode = data.job.paymentMode ?? 'undecided';
  const ordered = [...data.milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  const current = ordered.find((stage) => stage.status !== 'paid');
  const nextAfterCurrent = current ? ordered.find((stage) => stage.sortOrder > current.sortOrder && stage.status !== 'paid') : undefined;
  const addressReady = addressSaved && addressLine1.trim().length >= 3 && townCity.trim().length >= 2;

  return <Screen title="Start the job" subtitle={data.job.title}>
    <AppCard>
      <Chip icon="check-circle-outline">Quote accepted</Chip>
      <Text variant="headlineSmall">{data.trader?.businessName ?? 'Tradesperson'} has the job</Text>
      <Text>The price, scope and payment stages are now attached to this BuildPair project. Finish the two practical bits below so nobody has to hunt through messages later.</Text>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">1. Confirm the job address</Text>
      <Text>Your street address is private. It is available to the tradesperson you awarded the job to, and to a tradesperson only when you confirm their pre-quote site visit. It is never part of the public marketplace listing.</Text>
      <TextInput mode="outlined" label="House number/name and street" value={addressLine1} onChangeText={(value) => { setAddressLine1(value); setAddressSaved(false); }} />
      <TextInput mode="outlined" label="Address line 2 (optional)" value={addressLine2} onChangeText={(value) => { setAddressLine2(value); setAddressSaved(false); }} />
      <TextInput mode="outlined" label="Town / city" value={townCity} onChangeText={(value) => { setTownCity(value); setAddressSaved(false); }} />
      <TextInput mode="outlined" label="Postcode" value={postcode} disabled />
      <TextInput mode="outlined" label="Access / parking notes (optional)" value={accessNotes} onChangeText={(value) => { setAccessNotes(value); setAddressSaved(false); }} multiline maxLength={1000} />
      <Button mode={addressReady ? 'outlined' : 'contained'} icon={addressReady ? 'check' : 'content-save'} loading={busy} disabled={busy || addressLine1.trim().length < 3 || townCity.trim().length < 2} onPress={() => void saveAddress()}>{addressReady ? 'Address saved ✓' : 'Save private address'}</Button>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">2. Choose how the money moves</Text>
      {paymentMode === 'undecided' ? <>
        <AppCard elevated={false}>
          <Chip icon="shield-lock-outline">BuildPay</Chip>
          <Text variant="titleMedium">Pay through BuildPay</Text>
          <Text>Stripe processes the card payment. The exact quoted materials amount is released so materials can be ordered. Work-stage money stays controlled until the agreed stage is completed and you approve release.</Text>
          <Text>BuildPair charges the tradesperson 1% of labour/service only, never materials or VAT. Stripe processing is recovered at cost from controlled service payouts.</Text>
          <Button mode="contained" icon="shield-check-outline" loading={busy} disabled={busy || !addressReady} onPress={() => void choosePaymentMode('buildpair')}>Use BuildPay</Button>
          {!addressReady ? <HelperText type="info">Save the private job address first.</HelperText> : null}
        </AppCard>

        <AppCard elevated={false}>
          <Chip icon="bank-transfer-out">Direct payment</Chip>
          <Text variant="titleMedium">Pay the tradesperson directly</Text>
          <Text>You can pay by bank transfer, cash or another method agreed directly with the tradesperson. BuildPair remains the introduction and project-record platform, but does not receive, hold, protect, release, refund or recover that money.</Text>
          <Text>Any direct-payment record in BuildPair is based on what you and the tradesperson confirm. It is not BuildPair verification of the payment or the work. Your normal contractual and statutory rights still apply between the relevant parties.</Text>
          <Button mode="outlined" loading={busy} disabled={busy || !addressReady} onPress={() => void choosePaymentMode('external')}>Pay tradesperson directly</Button>
        </AppCard>
      </> : paymentMode === 'buildpair' ? <>
        <Chip icon="shield-check-outline">BuildPay selected</Chip>
        <Text>One stage at a time. This keeps the next action obvious instead of turning a building job into an accounting qualification.</Text>
        {current ? <AppCard elevated={false}>
          <Text variant="titleMedium">Now: {current.title}</Text>
          <Text variant="headlineSmall">{formatMoney(current.amount)}</Text>
          {current.kind === 'materials' ? <Text>Pay the exact quoted materials amount first. Stripe confirms the payment and BuildPair releases that materials amount to the tradesperson for procurement.</Text> : <Text>Fund this work stage. It stays controlled until the tradesperson reaches the agreed completion point and you approve release.</Text>}
          {current.status === 'pending' ? <PayMilestoneButton milestoneId={current.id} onPaid={() => setTimeout(load, 1500)} /> : <Text>Current status: {current.status}</Text>}
          {nextAfterCurrent ? <Text>Next after this: {nextAfterCurrent.title} · {formatMoney(nextAfterCurrent.amount)}</Text> : null}
        </AppCard> : <Text>All agreed payment stages are complete.</Text>}
      </> : <>
        <Chip icon="bank-transfer-out">Direct payment selected</Chip>
        <Text>Payments are between you and the tradesperson. BuildPair keeps the quote, messages, variations and optional payment confirmations together, but BuildPay protection does not apply.</Text>
      </>}
    </AppCard>

    {error ? <HelperText type="error">{error}</HelperText> : null}
    <View>
      <Button mode="contained" disabled={!addressReady || paymentMode === 'undecided'} onPress={() => router.replace(`/customer/jobs/${id}` as Href)}>Continue to project</Button>
    </View>
  </Screen>;
}
