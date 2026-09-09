import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Chip, HelperText, Menu, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';
import { calculateQuote, formatMoney, poundsToPence } from '@/lib/money';
import { buildQuoteStartDateOptions, closestQuoteDuration, QUOTE_DURATION_OPTIONS, QUOTE_SCOPE_MIN_LENGTH } from '@/lib/quote-options';
import type { Job, PaymentStagePlan, TraderProfile } from '@/types';

type AiQuote = {
  laborCost: number; materialsCost: number; vatAmount: number; depositAmount: number; scope: string; exclusions: string; paymentTerms: string;
  durationDays?: number; warrantyMonths?: number; notes: string; source: 'ai' | 'rules';
};
type SentQuote = { conversationId: string | null };
type DraftStage = { key: string; title: string; amount: string; trigger: string };
type PlanMode = 'single' | 'deposit' | 'staged';
type SelectOption = { value: string; label: string };

const START_DATE_OPTIONS: SelectOption[] = buildQuoteStartDateOptions(365);
const DURATION_OPTIONS: SelectOption[] = QUOTE_DURATION_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }));

function QuoteDropdown({ label, value, options, placeholder, onSelect }: { label: string; value: string; options: SelectOption[]; placeholder: string; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={{ flex: 1, minWidth: 180, gap: 5 }}>
    <Text variant="labelLarge">{label}</Text>
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={<Button mode="outlined" icon="chevron-down" contentStyle={{ minHeight: 48, justifyContent: 'space-between' }} onPress={() => setOpen(true)}>{selected?.label ?? placeholder}</Button>}
    >
      <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {options.map((option) => <Menu.Item key={option.value} title={option.label} onPress={() => { onSelect(option.value); setOpen(false); }} />)}
      </ScrollView>
    </Menu>
  </View>;
}

export default function NewQuoteScreen() {
  const { jobId, title } = useLocalSearchParams<{ jobId: string; title?: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [job, setJob] = useState<Job>();
  const [profile, setProfile] = useState<TraderProfile>();
  const [labor, setLabor] = useState('');
  const [materials, setMaterials] = useState('');
  const [vat, setVat] = useState('no');
  const [planMode, setPlanMode] = useState<PlanMode>('deposit');
  const [materialsUpfront, setMaterialsUpfront] = useState('');
  const [deposit, setDeposit] = useState('');
  const [stages, setStages] = useState<DraftStage[]>([]);
  const [validDays, setValidDays] = useState('14');
  const [terms, setTerms] = useState('Payments follow the agreed payment schedule. Any additional chargeable work must be agreed as a variation before it is carried out.');
  const [scope, setScope] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [notes, setNotes] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [labourDays, setLabourDays] = useState('');
  const [dayRate, setDayRate] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSource, setAiSource] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  useEffect(() => {
    const tokenGetter = () => getTokenRef.current();
    void apiFetch<Job[]>('/api/jobs', {}, tokenGetter).then((rows) => setJob(rows.find((item) => item.id === jobId))).catch(() => undefined);
    void apiFetch<TraderProfile>('/api/me/profile', {}, tokenGetter).then(setProfile).catch(() => undefined);
  }, [jobId]);

  const totals = useMemo(() => calculateQuote(poundsToPence(labor), poundsToPence(materials), vat === 'yes' ? 0.2 : 0), [labor, materials, vat]);
  const materialsUpfrontAmount = planMode === 'single' ? 0 : poundsToPence(materialsUpfront);
  const depositAmount = planMode === 'single' ? 0 : poundsToPence(deposit);
  const customStageTotal = planMode === 'staged' ? stages.reduce((sum, stage) => sum + poundsToPence(stage.amount), 0) : 0;
  const allocatedBeforeFinal = materialsUpfrontAmount + depositAmount + customStageTotal;
  const finalAmount = totals.totalAmount - allocatedBeforeFinal;
  const planInvalid = totals.totalAmount <= 0 || finalAmount <= 0 || allocatedBeforeFinal < 0;
  const scopeLength = scope.trim().length;
  const scopeInvalid = scopeLength < QUOTE_SCOPE_MIN_LENGTH;
  const payoutReady = Boolean(profile?.stripeAccountId && (profile.stripePayoutsEnabled || profile.stripeChargesEnabled));

  const paymentSchedule = useMemo<PaymentStagePlan[]>(() => {
    if (totals.totalAmount <= 0) return [];
    if (planMode === 'single') return [{ key: 'final', title: 'Full payment', amount: totals.totalAmount, kind: 'final', trigger: 'Due after the agreed work is complete and approved by the homeowner.', sortOrder: 1 }];
    const result: PaymentStagePlan[] = [];
    if (materialsUpfrontAmount > 0) result.push({ key: 'materials', title: 'Materials payment', amount: materialsUpfrontAmount, kind: 'materials', trigger: 'Due before materials are ordered. If paid through BuildPair, this upfront amount is transferred to the tradesperson when payment succeeds.', sortOrder: result.length + 1 });
    if (depositAmount > 0) result.push({ key: 'deposit', title: 'Project deposit', amount: depositAmount, kind: 'deposit', trigger: 'Due before the agreed start date. If paid through BuildPair, this upfront deposit is transferred to the tradesperson when payment succeeds.', sortOrder: result.length + 1 });
    if (planMode === 'staged') {
      stages.forEach((stage, index) => {
        const amount = poundsToPence(stage.amount);
        if (amount > 0) result.push({ key: stage.key, title: stage.title.trim() || `Stage ${index + 1}`, amount, kind: 'stage', trigger: stage.trigger.trim(), sortOrder: result.length + 1 });
      });
    }
    if (finalAmount > 0) result.push({ key: 'final', title: 'Final payment', amount: finalAmount, kind: 'final', trigger: 'Due after the final agreed work is complete and approved by the homeowner.', sortOrder: result.length + 1 });
    return result;
  }, [depositAmount, finalAmount, materialsUpfrontAmount, planMode, stages, totals.totalAmount]);

  function addStage() {
    setStages((current) => [...current, { key: `stage-${Date.now()}-${current.length}`, title: `Stage ${current.length + 1}`, amount: '', trigger: '' }]);
  }
  function updateStage(index: number, patch: Partial<DraftStage>) { setStages((current) => current.map((stage, i) => i === index ? { ...stage, ...patch } : stage)); }
  function removeStage(index: number) { setStages((current) => current.filter((_, i) => i !== index)); }

  async function buildWithAi() {
    try {
      setAiBusy(true); setError('');
      const result = await apiFetch<AiQuote>('/api/ai/quote-assistant', {
        method: 'POST',
        body: JSON.stringify({ jobTitle: job?.title || title || 'BuildPair job', jobDescription: job?.description || 'Customer job details are available in BuildPair.', tradeCategory: job?.category || 'Building & Extensions', labourDays: labourDays ? Number(labourDays) : undefined, dayRate: dayRate ? poundsToPence(dayRate) : undefined, materialsEstimate: materials ? poundsToPence(materials) : undefined, vatRegistered: vat === 'yes' }),
      }, () => getTokenRef.current());
      if (result.laborCost) setLabor((result.laborCost / 100).toFixed(2));
      if (result.materialsCost) setMaterials((result.materialsCost / 100).toFixed(2));
      if (result.depositAmount) { setDeposit((result.depositAmount / 100).toFixed(2)); setPlanMode('deposit'); }
      setScope(result.scope); setExclusions(result.exclusions); setTerms(result.paymentTerms); setNotes(result.notes);
      if (result.durationDays) setDurationDays(String(closestQuoteDuration(result.durationDays)));
      if (result.warrantyMonths != null) setWarrantyMonths(String(result.warrantyMonths));
      setAiSource(result.source);
    } catch (e) { setError(errorMessage(e)); }
    finally { setAiBusy(false); }
  }

  async function submit() {
    if (scopeInvalid) { setError(`Included scope must be at least ${QUOTE_SCOPE_MIN_LENGTH} characters so the homeowner can see what is actually included.`); return; }
    if (!durationDays) { setError('Choose an estimated duration from the list.'); return; }
    if (!proposedStartDate) { setError('Choose an exact proposed start date from the list.'); return; }
    if (planInvalid || !paymentSchedule.length) { setError('Payment stages must leave a positive final payment and add up to the quote total.'); return; }
    if (planMode === 'staged' && stages.some((stage) => poundsToPence(stage.amount) > 0 && stage.trigger.trim().length < 3)) { setError('Give each staged payment a clear completion point so the homeowner knows when it becomes due.'); return; }
    const validUntil = new Date(Date.now() + Number(validDays) * 24 * 60 * 60 * 1000).toISOString();
    const proposedStartAt = `${proposedStartDate}T12:00:00.000Z`;
    try {
      setBusy(true); setError('');
      const sent = await apiFetch<SentQuote>('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({ jobId, laborCost: poundsToPence(labor), materialsCost: poundsToPence(materials), vatAmount: totals.vatAmount, depositAmount, paymentTerms: terms, paymentSchedule, scope: scope.trim(), exclusions: exclusions || undefined, notes: notes || undefined, durationDays: Number(durationDays), warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined, proposedStartAt, validUntil }),
      }, getToken);
      if (sent.conversationId) router.replace(`/trader/messages/${sent.conversationId}` as Href);
      else router.replace('/trader/dashboard');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const footer = <Button mode="contained" loading={busy} disabled={busy || planInvalid || scopeInvalid || !durationDays || !proposedStartDate || terms.length < 5} onPress={() => void submit()}>Send quote & payment plan</Button>;

  return <Screen title="Create an itemised quote" subtitle={job?.title ?? title ?? 'Customer job'} footer={footer}>
    {job ? <AppCard><Text variant="titleMedium">{job.title}</Text><Text>{job.description}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><Chip compact>{job.category}</Chip><Chip compact>{job.budgetRange}</Chip>{job.isEmergency ? <Chip compact icon="alert">Emergency</Chip> : null}</View></AppCard> : null}

    <AppCard>
      <Text variant="titleLarge">Build the numbers</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><TextInput style={{ flex: 1, minWidth: 150 }} label="Labour days" value={labourDays} onChangeText={setLabourDays} keyboardType="decimal-pad" mode="outlined" /><TextInput style={{ flex: 1, minWidth: 150 }} label="Day rate (£)" value={dayRate} onChangeText={setDayRate} keyboardType="decimal-pad" mode="outlined" /></View>
      <TextInput label="Labour total (£)" value={labor} onChangeText={setLabor} keyboardType="decimal-pad" mode="outlined" />
      <TextInput label="Materials included in quote (£)" value={materials} onChangeText={setMaterials} keyboardType="decimal-pad" mode="outlined" />
      <Text variant="labelLarge">Add 20% VAT?</Text><SegmentedButtons value={vat} onValueChange={setVat} buttons={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
      <Button mode="contained-tonal" icon="creation" loading={aiBusy} disabled={aiBusy || !job} onPress={() => void buildWithAi()}>Draft quote with BuildPair AI</Button>
      {aiSource ? <HelperText type="info">{aiSource === 'ai' ? 'AI draft created' : 'Smart fallback draft created'} ✓ Review every detail before sending.</HelperText> : null}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">Scope & programme</Text>
      <TextInput label={`Included scope · minimum ${QUOTE_SCOPE_MIN_LENGTH} characters`} value={scope} onChangeText={setScope} mode="outlined" multiline numberOfLines={5} />
      <HelperText type={scopeInvalid ? 'error' : 'info'} visible>{scopeLength}/{QUOTE_SCOPE_MIN_LENGTH} minimum characters. Be specific about the work, preparation and finish included in this price.</HelperText>
      <TextInput label="Exclusions / assumptions" value={exclusions} onChangeText={setExclusions} mode="outlined" multiline numberOfLines={4} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <QuoteDropdown label="Estimated duration" value={durationDays} options={DURATION_OPTIONS} placeholder="Choose duration" onSelect={setDurationDays} />
        <TextInput style={{ flex: 1, minWidth: 180 }} label="Warranty (months)" value={warrantyMonths} onChangeText={setWarrantyMonths} keyboardType="number-pad" mode="outlined" />
      </View>
      <QuoteDropdown label="Exact proposed start date" value={proposedStartDate} options={START_DATE_OPTIONS} placeholder="Choose start date" onSelect={setProposedStartDate} />
      <HelperText type="info">The start date and estimated duration are selected from fixed options, so the homeowner sees an unambiguous programme rather than free-text dates.</HelperText>
    </AppCard>

    <AppCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><Text variant="titleLarge">Payout setup</Text><Chip icon={payoutReady ? 'check-circle-outline' : 'alert-circle-outline'}>{payoutReady ? 'Ready' : 'Setup required'}</Chip></View>
      <Text>BuildPair uses Stripe to process supported job payments and pay tradespeople. Complete Stripe onboarding before you can receive BuildPair payments.</Text>
      <Text variant="bodySmall">You can send this quote before setup is complete. The homeowner cannot select BuildPair payments for the job until Stripe confirms that your account is ready for payouts. Bank and verification details entered into Stripe are handled by Stripe.</Text>
      {!payoutReady ? <Button mode="contained" icon="bank-outline" onPress={() => router.push('/trader/subscription')}>Set up payouts with Stripe</Button> : null}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">Payment schedule</Text>
      <Text>Set the amounts and timing proposed for this job. The homeowner can accept the schedule or propose a different split without changing your quote total.</Text>
      <SegmentedButtons value={planMode} onValueChange={(value) => setPlanMode(value as PlanMode)} buttons={[{ value: 'single', label: 'Full at end' }, { value: 'deposit', label: 'Deposit + balance' }, { value: 'staged', label: 'Staged' }]} />
      {planMode !== 'single' ? <>
        <TextInput label="Upfront materials payment (£, optional)" value={materialsUpfront} onChangeText={setMaterialsUpfront} keyboardType="decimal-pad" mode="outlined" />
        <HelperText type="info">If paid through BuildPair, an upfront materials payment is transferred to your connected Stripe account when payment succeeds. Use it only for the agreed materials stated in the quote.</HelperText>
        <TextInput label="Project deposit (£, optional)" value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" mode="outlined" />
        <HelperText type="info">If paid through BuildPair, a deposit is also transferred to your connected Stripe account when payment succeeds. It is not held for a later completion approval.</HelperText>
      </> : null}
      {planMode === 'staged' ? <>
        <Text variant="titleMedium">Progress stages</Text>
        {stages.map((stage, index) => <AppCard key={stage.key} elevated={false}>
          <TextInput label={`Stage ${index + 1} name`} value={stage.title} onChangeText={(value) => updateStage(index, { title: value })} mode="outlined" />
          <TextInput label="Amount (£)" value={stage.amount} onChangeText={(value) => updateStage(index, { amount: value })} keyboardType="decimal-pad" mode="outlined" />
          <TextInput label="What must be complete before this is due?" value={stage.trigger} onChangeText={(value) => updateStage(index, { trigger: value })} mode="outlined" multiline />
          <Button mode="text" onPress={() => removeStage(index)}>Remove stage</Button>
        </AppCard>)}
        <Button mode="outlined" icon="plus" disabled={stages.length >= 7} onPress={addStage}>Add payment stage</Button>
      </> : null}
      <HelperText type="error" visible={planInvalid}>The upfront, deposit and progress-stage amounts must leave a positive final payment.</HelperText>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">Proposed payment schedule</Text>
      {paymentSchedule.map((stage) => <View key={stage.key} style={{ gap: 2, paddingVertical: 6 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text variant="titleSmall">{stage.title}</Text><Text variant="titleSmall">{formatMoney(stage.amount)}</Text></View><Text variant="bodySmall">{stage.trigger}</Text></View>)}
      <Text variant="headlineSmall">Total: {formatMoney(totals.totalAmount)}</Text>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">Terms & validity</Text>
      <Text variant="labelLarge">Quote valid for</Text><SegmentedButtons value={validDays} onValueChange={setValidDays} buttons={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} />
      <TextInput label="Payment terms" value={terms} onChangeText={setTerms} mode="outlined" multiline />
      <TextInput label="Additional notes" value={notes} onChangeText={setNotes} mode="outlined" multiline />
    </AppCard>

    <AppCard><Text>Net: {formatMoney(totals.net)}</Text><Text>VAT: {formatMoney(totals.vatAmount)}</Text><Text variant="headlineSmall">Total: {formatMoney(totals.totalAmount)}</Text><Text variant="bodySmall">Sending this quote also sends the proposed payment schedule. A new open-marketplace job uses one monthly offer; direct homeowner requests do not.</Text></AppCard>
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </Screen>;
}