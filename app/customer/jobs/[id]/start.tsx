import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
// Metro and TypeScript resolve the native/web implementation.
// eslint-disable-next-line import/no-unresolved
import { PayMilestoneButton } from '@/components/PayMilestoneButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';
import { BUILDPAY_OPEN } from '@/lib/launch-config';
import { allocateCustomerBuildPayFee } from '@/lib/buildpay-fees';
import { formatMoney } from '@/lib/money';
import type { BuildPayFeeMode, BuildPayRequestedBy, Job, PaymentStageStatus, Quote, TraderProfile } from '@/types';
import type { JobPrivateDetails } from '@/types/job-private-details';
import { formatProjectStart } from '@/lib/project-dates';

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

type PaymentArrangement = {
  paymentMode: 'undecided' | 'buildpair' | 'external';
  proposedAt: string | null;
  proposedByMe: boolean;
  proposedByOther: boolean;
  myAgreed: boolean;
  otherAgreed: boolean;
  fullyAgreed: boolean;
};
type BuildPaySummary = {
  paymentMode: 'undecided' | 'buildpair' | 'external';
  buildPayRequestedBy: BuildPayRequestedBy | null;
  buildPayFeeMode: BuildPayFeeMode | null;
  buildPayCustomerFeeTotal: number;
  buildPayFeeTermsVersion: string | null;
  contractAmount: number;
  allInTotal: number;
  previewCustomerFee: number;
  previewAllInTotal: number;
  plannedChargeCount: number;
};

export default function StartAwardedJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Detail>();
  const [buildPaySummary, setBuildPaySummary] = useState<BuildPaySummary>();
  const [arrangement, setArrangement] = useState<PaymentArrangement>();
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
      const [detail, privateDetails, feeSummary, paymentArrangement] = await Promise.all([
        apiFetch<Detail>(`/api/jobs/${id}`, {}, getToken),
        apiFetch<JobPrivateDetails>(`/api/job-private-details?jobId=${encodeURIComponent(id)}`, {}, getToken),
        apiFetch<BuildPaySummary>(`/api/buildpay/summary?jobId=${encodeURIComponent(id)}`, {}, getToken),
        apiFetch<PaymentArrangement>(`/api/payment-arrangement?jobId=${encodeURIComponent(id)}`, {}, getToken),
      ]);
      setData(detail);
      setBuildPaySummary(feeSummary);
      setArrangement(paymentArrangement);
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

  async function confirmStart() {
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'confirm_start' }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function chooseBuildPay() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/buildpay/select', {
        method: 'POST',
        body: JSON.stringify({ jobId: id, acknowledgedPaymentTerms: true, acknowledgedBuildPayFee: true }),
      }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function directPaymentAction(action: 'propose_external' | 'confirm_external' | 'cancel_external') {
    try {
      setBusy(true); setError('');
      const next = await apiFetch<PaymentArrangement>('/api/payment-arrangement', { method: 'POST', body: JSON.stringify({ jobId: id, action }) }, getToken);
      setArrangement(next);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (!data || !buildPaySummary || !arrangement) return <LoadingScreen label="Preparing your project…" />;
  const paymentMode = data.job.paymentMode ?? 'undecided';
  const ordered = [...data.milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  const current = ordered.find((stage) => stage.status !== 'paid');
  const nextAfterCurrent = current ? ordered.find((stage) => stage.sortOrder > current.sortOrder && stage.status !== 'paid') : undefined;
  const addressReady = addressSaved && addressLine1.trim().length >= 3 && townCity.trim().length >= 2;
  const startProposed = Boolean(data.job.scheduledStartAt);
  const startAgreed = Boolean(data.job.startAgreedAt);
  const openingBundle = current?.status === 'pending' && current.kind === 'materials' && nextAfterCurrent?.status === 'pending'
    ? [current, nextAfterCurrent]
    : current?.status === 'pending' ? [current] : [];
  const openingContractTotal = openingBundle.reduce((sum, stage) => sum + stage.amount, 0);
  const customerFeeTotal = paymentMode === 'buildpair' ? buildPaySummary.buildPayCustomerFeeTotal : buildPaySummary.previewCustomerFee;
  const feeAllocations = allocateCustomerBuildPayFee(ordered.map((stage) => ({ id: stage.id, amount: stage.amount, sortOrder: stage.sortOrder })), customerFeeTotal);
  const openingFee = openingBundle.reduce((sum, stage) => sum + (feeAllocations.get(stage.id) ?? 0), 0);
  const openingCheckoutTotal = openingContractTotal + openingFee;
  const currentFee = current ? (feeAllocations.get(current.id) ?? 0) : 0;
  const currentCheckoutTotal = (current?.amount ?? 0) + currentFee;
  const openingReady = addressReady && startAgreed && paymentMode === 'buildpair' && openingBundle.length > 0;

  return <Screen title="Start the job" subtitle={data.job.title}>
    <AppCard>
      <Chip icon="check-circle-outline">Quote accepted</Chip>
      <Text variant="headlineSmall">{data.trader?.businessName ?? 'Tradesperson'} has the job</Text>
      <Text>The quote is agreed. BuildPair now keeps the private address, start time and payment setup in one place so both sides know exactly what happens next.</Text>
      {BUILDPAY_OPEN && buildPaySummary.buildPayRequestedBy ? <Text>{buildPaySummary.buildPayRequestedBy === 'trader' ? 'The tradesperson included BuildPay in the accepted proposal.' : 'You requested BuildPay protected stages before acceptance.'} {buildPaySummary.buildPayFeeMode === 'customer_pays' ? `Work price ${formatMoney(buildPaySummary.contractAmount)} + BuildPay service fee ${formatMoney(buildPaySummary.buildPayCustomerFeeTotal)} = ${formatMoney(buildPaySummary.allInTotal)} all-in.` : `The tradesperson is absorbing the agreed BuildPay costs, so your total remains ${formatMoney(buildPaySummary.contractAmount)}.`}</Text> : null}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">1. Confirm the job address</Text>
      <Text>Your street address stays private. It is shared with the tradesperson you awarded the job to, and with a tradesperson only when you confirm their pre-quote site visit. It is never shown on the public job post.</Text>
      <TextInput mode="outlined" label="House number/name and street" value={addressLine1} onChangeText={(value) => { setAddressLine1(value); setAddressSaved(false); }} />
      <TextInput mode="outlined" label="Address line 2 (optional)" value={addressLine2} onChangeText={(value) => { setAddressLine2(value); setAddressSaved(false); }} />
      <TextInput mode="outlined" label="Town / city" value={townCity} onChangeText={(value) => { setTownCity(value); setAddressSaved(false); }} />
      <TextInput mode="outlined" label="Postcode" value={postcode} disabled />
      <TextInput mode="outlined" label="Access / parking notes (optional)" value={accessNotes} onChangeText={(value) => { setAccessNotes(value); setAddressSaved(false); }} multiline maxLength={1000} />
      <Button mode={addressReady ? 'outlined' : 'contained'} icon={addressReady ? 'check' : 'content-save'} loading={busy} disabled={busy || addressLine1.trim().length < 3 || townCity.trim().length < 2} onPress={() => void saveAddress()}>{addressReady ? 'Address saved ✓' : 'Save private address'}</Button>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">2. Agree the start</Text>
      {!startProposed ? <>
        <Chip icon="clock-outline">Waiting for tradesperson</Chip>
        <Text>The tradesperson now confirms the date and time they plan to start. You can approve it here before the job begins.</Text>
      </> : startAgreed ? <>
        <Chip icon="calendar-check">Start agreed ✓</Chip>
        <Text variant="titleMedium">{formatProjectStart(data.job.scheduledStartAt!)}</Text>
        <Text>Both sides have the same start date and time recorded in BuildPair.</Text>
      </> : <>
        <Chip icon="calendar-clock">Start proposed</Chip>
        <Text variant="titleMedium">{formatProjectStart(data.job.scheduledStartAt!)}</Text>
        <Text>Confirm this only if the date and time work for you. If not, message the tradesperson and ask them to propose another time.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button mode="contained" icon="calendar-check" loading={busy} disabled={busy} onPress={() => void confirmStart()}>Agree start</Button>
          <Button mode="outlined" icon="message-text-outline" onPress={() => router.push('/customer/messages' as Href)}>Message tradesperson</Button>
        </View>
      </>}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">3. Agree how the money moves</Text>
      {paymentMode === 'undecided' ? <>
        {BUILDPAY_OPEN ? <AppCard elevated={false}>
          <Chip icon="shield-lock-outline">Optional BuildPay</Chip>
          <Text variant="titleMedium">Use protected staged payments</Text>
          <Text>Stripe processes the card payments. When the schedule starts with materials, the materials amount and first protected work stage are paid together in one opening payment. Only the materials amount is released after the tradesperson acknowledges that payment; the first work-stage money stays protected until the agreed stage is finished and you approve release.</Text>
          <View style={{ gap: 6 }}>
            <Text>Work price: <Text style={{ fontWeight: '800' }}>{formatMoney(buildPaySummary.contractAmount)}</Text></Text>
            <Text>BuildPay service fee: <Text style={{ fontWeight: '800' }}>{formatMoney(buildPaySummary.previewCustomerFee)}</Text></Text>
            <Text variant="titleMedium">All-in with BuildPay: {formatMoney(buildPaySummary.previewAllInTotal)}</Text>
          </View>
          <Text variant="bodySmall">Because you are choosing BuildPay after accepting a quote that did not require it, you pay the disclosed BuildPay service fee. It is a BuildPay protection/administration fee, not a card surcharge. Your tradesperson's accepted work price is not reduced by this fee.</Text>
          <Button mode="contained" icon="shield-check-outline" loading={busy} disabled={busy || !addressReady} onPress={() => void chooseBuildPay()}>Use BuildPay · {formatMoney(buildPaySummary.previewAllInTotal)} all-in</Button>
          {!addressReady ? <HelperText type="info">Save the private job address first.</HelperText> : null}
        </AppCard> : null}

        <AppCard elevated={false}>
          <Chip icon="bank-transfer-out">Pay outside BuildPair</Chip>
          <Text variant="titleMedium">Direct payment · {formatMoney(buildPaySummary.contractAmount)} work price</Text>
          <Text>Site visits, face-to-face discussions and in-person quotes are allowed. If you both decide to arrange payment privately, either of you can propose that here and the other person must explicitly agree before BuildPair switches the job to direct payment.</Text>
          <Text>BuildPair keeps the structured quote, messages, variations and optional two-party payment records, but it does not receive, hold, protect, refund, recover or independently verify money paid outside BuildPair.</Text>
          {arrangement.proposedByOther ? <>
            <Chip icon="account-clock-outline">Tradesperson proposed direct payment</Chip>
            <Text variant="bodySmall">Confirm only if you have both agreed to pay outside BuildPair. BuildPay protection will not apply.</Text>
            <Button mode="contained-tonal" icon="check" loading={busy} disabled={busy || !addressReady} onPress={() => void directPaymentAction('confirm_external')}>Agree to pay outside BuildPair</Button>
          </> : arrangement.proposedByMe ? <>
            <Chip icon="clock-outline">Waiting for tradesperson to agree</Chip>
            <Button mode="text" disabled={busy} onPress={() => void directPaymentAction('cancel_external')}>Cancel direct-payment proposal</Button>
          </> : <Button mode="outlined" loading={busy} disabled={busy || !addressReady} onPress={() => void directPaymentAction('propose_external')}>Propose paying outside BuildPair</Button>}
        </AppCard>
      </> : paymentMode === 'buildpair' ? <>
        <Chip icon="shield-check-outline">BuildPay selected</Chip>
        <Text>BuildPay keeps the job simple: fund what is needed next, release work money only after the agreed point is reached, then move straight on to the next stage.</Text>
        {buildPaySummary.buildPayFeeMode === 'customer_pays' ? <Text>Work price {formatMoney(buildPaySummary.contractAmount)} + agreed BuildPay service fee {formatMoney(buildPaySummary.buildPayCustomerFeeTotal)} = {formatMoney(buildPaySummary.allInTotal)} all-in. The fee is allocated across the agreed card payments, so it does not suddenly appear at checkout.</Text> : <Text>The tradesperson chose to absorb the agreed BuildPay costs. Your total remains the {formatMoney(buildPaySummary.contractAmount)} work price.</Text>}
      </> : <>
        <Chip icon="bank-transfer-out">Direct payment agreed by both sides</Chip>
        <Text>You and the tradesperson agreed to arrange payment outside BuildPair. BuildPair keeps the structured project record and optional two-party confirmations, but BuildPay protection does not apply.</Text>
      </>}
    </AppCard>

    {BUILDPAY_OPEN && paymentMode === 'buildpair' ? <AppCard>
      <Text variant="titleLarge">4. Opening BuildPay payment</Text>
      {!startAgreed ? <Text>Nothing is charged yet. First agree the start date and time above.</Text> : openingBundle.length ? <>
        {openingBundle.length === 2 ? <>
          <Chip icon="credit-card-check-outline">Materials + first protected stage</Chip>
          <Text variant="headlineSmall">Pay {formatMoney(openingCheckoutTotal)} now</Text>
          <Text>Contract stages: {openingBundle[0]!.title} {formatMoney(openingBundle[0]!.amount)} + {openingBundle[1]!.title} {formatMoney(openingBundle[1]!.amount)}{openingFee > 0 ? ` + ${formatMoney(openingFee)} allocated BuildPay service fee` : ''}.</Text>
          <Text>The tradesperson is notified when Stripe confirms the payment. They then acknowledge it in BuildPair. Only the quoted materials amount is released immediately; {openingBundle[1]!.title.toLowerCase()} stays protected until its agreed completion point is reached.</Text>
          <PayMilestoneButton milestoneIds={openingBundle.map((stage) => stage.id)} label={`Pay ${formatMoney(openingCheckoutTotal)} opening payment`} onPaid={() => setTimeout(load, 1500)} />
        </> : <>
          <Chip icon="credit-card-check-outline">Next payment</Chip>
          <Text variant="headlineSmall">{current?.title} · {formatMoney(currentCheckoutTotal)}</Text>
          <Text>{currentFee > 0 ? `${formatMoney(current?.amount ?? 0)} contract stage + ${formatMoney(currentFee)} allocated BuildPay service fee. ` : ''}{current?.kind === 'deposit' ? 'This deposit is funded into BuildPay and stays protected until its agreed release point.' : current?.kind === 'final' ? 'This is the protected final work payment for this job. It stays controlled until final completion is approved.' : 'This work-stage payment stays controlled until the agreed completion point is reached and you approve release.'}</Text>
          {openingReady ? <PayMilestoneButton milestoneId={current!.id} label={`Pay ${formatMoney(currentCheckoutTotal)} with BuildPay`} onPaid={() => setTimeout(load, 1500)} /> : null}
        </>}
      </> : current ? <>
        <Chip icon="clock-check-outline">Payment received</Chip>
        <Text>{current.kind === 'materials' && current.status === 'funded' ? 'Stripe has confirmed the opening payment. The tradesperson now needs to acknowledge it before the materials money is released.' : `${current.title} is ${current.status}. Continue in the project screen for the next action.`}</Text>
      </> : <Text>All agreed payment stages are complete.</Text>}
    </AppCard> : null}

    {error ? <HelperText type="error">{error}</HelperText> : null}
    <View>
      <Button mode="contained" disabled={!addressReady || !startAgreed || paymentMode === 'undecided'} onPress={() => router.replace(`/customer/jobs/${id}` as Href)}>Continue to project</Button>
    </View>
  </Screen>;
}

