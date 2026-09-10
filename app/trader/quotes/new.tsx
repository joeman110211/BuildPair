import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Menu, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { QuoteDocument, type QuoteDocumentData } from '@/components/QuoteDocument';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney, poundsToPence } from '@/lib/money';
import { buildQuoteStartDateOptions, closestQuoteDuration, QUOTE_DURATION_OPTIONS, QUOTE_SCOPE_MIN_LENGTH } from '@/lib/quote-options';
import type { Job, PaymentStagePlan, TraderProfile } from '@/types';

type AiQuote = {
  laborCost: number; materialsCost: number; depositAmount: number; scope: string; exclusions: string; paymentTerms: string;
  durationDays?: number; warrantyMonths?: number; notes: string; source: 'ai' | 'rules';
};
type SentJobQuote = { conversationId: string | null };
type ItemCategory = 'labour' | 'materials' | 'other';
type DraftItem = { key: string; description: string; category: ItemCategory; quantity: string; unitPrice: string };
type DraftStage = { key: string; title: string; amount: string; trigger: string; kind: 'materials' | 'stage' };
type PlanMode = 'single' | 'deposit' | 'staged';
type DepositUnit = 'amount' | 'percent';
type SelectOption = { value: string; label: string };

type BusinessQuote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  jobTitle: string;
  jobAddress: string | null;
  workIncluded: string;
  notIncluded: string | null;
  expectedStart: string | null;
  durationText: string | null;
  warrantyText: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: 'undecided' | 'buildpair' | 'external';
  paymentTerms: string;
  paymentSchedule: PaymentStagePlan[];
  notes: string | null;
  showBreakdown: boolean;
  validUntil: string | null;
  status: string;
  shareToken: string;
  shareUrl: string;
  createdAt: string;
  items: Array<{ id?: string; description: string; category: ItemCategory; quantity: number | string; unitPrice: number; lineTotal: number }>;
};

const START_DATE_OPTIONS: SelectOption[] = buildQuoteStartDateOptions(365);
const DURATION_OPTIONS: SelectOption[] = QUOTE_DURATION_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }));

function QuoteDropdown({ label, value, options, placeholder, onSelect }: { label: string; value: string; options: SelectOption[]; placeholder: string; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={styles.dropdownWrap}>
    <Text variant="labelLarge" style={styles.label}>{label}</Text>
    <Menu visible={open} onDismiss={() => setOpen(false)} anchor={<Button mode="outlined" icon="chevron-down" contentStyle={styles.dropdownButton} onPress={() => setOpen(true)}>{selected?.label ?? placeholder}</Button>}>
      <ScrollView style={styles.dropdownMenu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {options.map((option) => <Menu.Item key={option.value} title={option.label} onPress={() => { onSelect(option.value); setOpen(false); }} />)}
      </ScrollView>
    </Menu>
  </View>;
}

function itemLineTotal(item: DraftItem) {
  const quantity = Number(item.quantity || 0);
  return Math.max(0, Math.round(quantity * poundsToPence(item.unitPrice)));
}

export default function NewQuoteScreen() {
  const { jobId, title, quoteId } = useLocalSearchParams<{ jobId?: string; title?: string; quoteId?: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const external = !jobId;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job>();
  const [profile, setProfile] = useState<TraderProfile>();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [jobTitle, setJobTitle] = useState(title ?? '');
  const [jobAddress, setJobAddress] = useState('');
  const [workIncluded, setWorkIncluded] = useState('');
  const [notIncluded, setNotIncluded] = useState('');
  const [items, setItems] = useState<DraftItem[]>([
    { key: 'labour-1', description: 'Labour', category: 'labour', quantity: '1', unitPrice: '' },
    { key: 'materials-1', description: 'Materials', category: 'materials', quantity: '1', unitPrice: '' },
  ]);
  const [vatRate, setVatRate] = useState('0');
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [expectedStart, setExpectedStart] = useState('');
  const [durationText, setDurationText] = useState('');
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [planMode, setPlanMode] = useState<PlanMode>('single');
  const [depositUnit, setDepositUnit] = useState<DepositUnit>('amount');
  const [depositValue, setDepositValue] = useState('');
  const [stages, setStages] = useState<DraftStage[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'external' | 'buildpair'>('external');
  const [paymentTerms, setPaymentTerms] = useState('Payment due in line with the agreed payment schedule. Any extra chargeable work must be agreed before it is carried out.');
  const [warrantyText, setWarrantyText] = useState('');
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('14');
  const [showMore, setShowMore] = useState(false);
  const [preview, setPreview] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const tokenGetter = () => getTokenRef.current();
        const ownProfile = await apiFetch<TraderProfile>('/api/me/profile', {}, tokenGetter);
        if (!active) return;
        setProfile(ownProfile);

        if (jobId) {
          const jobs = await apiFetch<Job[]>('/api/jobs', {}, tokenGetter);
          if (!active) return;
          const found = jobs.find((row) => row.id === jobId);
          setJob(found);
          if (found) {
            setJobTitle(found.title);
            if (found.description.trim().length >= QUOTE_SCOPE_MIN_LENGTH) setWorkIncluded(found.description.trim());
          }
        } else if (quoteId) {
          const rows = await apiFetch<BusinessQuote[]>('/api/business-quotes', {}, tokenGetter);
          if (!active) return;
          const draft = rows.find((row) => row.id === quoteId);
          if (!draft || draft.status !== 'draft') throw new Error('That quote draft is no longer editable.');
          setCustomerName(draft.customerName);
          setCustomerEmail(draft.customerEmail ?? '');
          setCustomerPhone(draft.customerPhone ?? '');
          setJobTitle(draft.jobTitle);
          setJobAddress(draft.jobAddress ?? '');
          setWorkIncluded(draft.workIncluded);
          setNotIncluded(draft.notIncluded ?? '');
          setExpectedStart(draft.expectedStart ?? '');
          setDurationText(draft.durationText ?? '');
          setWarrantyText(draft.warrantyText ?? '');
          setVatRate(String(draft.vatRate ?? 0));
          setPaymentMethod(draft.paymentMethod === 'buildpair' ? 'buildpair' : 'external');
          setPaymentTerms(draft.paymentTerms);
          setNotes(draft.notes ?? '');
          setShowBreakdown(draft.showBreakdown);
          setItems(draft.items.map((item, index) => ({ key: item.id ?? `item-${index}`, description: item.description, category: item.category, quantity: String(Number(item.quantity)), unitPrice: (item.unitPrice / 100).toFixed(2) })));
          const depositStage = draft.paymentSchedule.find((stage) => stage.kind === 'deposit');
          const progressStages = draft.paymentSchedule.filter((stage) => stage.kind === 'stage' || stage.kind === 'materials');
          setPlanMode(progressStages.length ? 'staged' : depositStage ? 'deposit' : 'single');
          if (depositStage) setDepositValue((depositStage.amount / 100).toFixed(2));
          setStages(progressStages.map((stage, index) => ({ key: stage.key || `stage-${index}`, title: stage.title, amount: (stage.amount / 100).toFixed(2), trigger: stage.trigger, kind: stage.kind === 'materials' ? 'materials' : 'stage' })));
        }
      } catch (e) {
        if (active) setError(errorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [jobId, quoteId]);

  const pricedItems = useMemo(() => items.filter((item) => item.description.trim() && itemLineTotal(item) > 0), [items]);
  const subtotal = useMemo(() => pricedItems.reduce((sum, item) => sum + itemLineTotal(item), 0), [pricedItems]);
  const vatAmount = Math.round(subtotal * Number(vatRate || 0) / 100);
  const totalAmount = subtotal + vatAmount;
  const labourCost = pricedItems.filter((item) => item.category === 'labour').reduce((sum, item) => sum + itemLineTotal(item), 0);
  const materialsAndOtherCost = subtotal - labourCost;
  const payoutReady = Boolean(profile?.stripeAccountId && (profile.stripePayoutsEnabled || profile.stripeChargesEnabled));

  const depositAmount = useMemo(() => {
    if (planMode === 'single') return 0;
    if (depositUnit === 'percent') return Math.round(totalAmount * Math.max(0, Number(depositValue || 0)) / 100);
    return poundsToPence(depositValue);
  }, [depositUnit, depositValue, planMode, totalAmount]);
  const progressTotal = planMode === 'staged' ? stages.reduce((sum, stage) => sum + poundsToPence(stage.amount), 0) : 0;
  const finalAmount = totalAmount - depositAmount - progressTotal;

  const paymentSchedule = useMemo<PaymentStagePlan[]>(() => {
    if (totalAmount <= 0 || finalAmount <= 0) return [];
    const result: PaymentStagePlan[] = [];
    if (depositAmount > 0) result.push({ key: 'deposit', title: 'Deposit', amount: depositAmount, kind: 'deposit', trigger: 'Due when the quote is accepted and before work starts.', sortOrder: result.length + 1 });
    if (planMode === 'staged') {
      stages.forEach((stage, index) => {
        const amount = poundsToPence(stage.amount);
        if (amount > 0) result.push({ key: stage.key, title: stage.title.trim() || `Stage ${index + 1}`, amount, kind: stage.kind, trigger: stage.trigger.trim(), sortOrder: result.length + 1 });
      });
    }
    result.push({ key: 'final', title: 'Final balance', amount: finalAmount, kind: 'final', trigger: 'Due when the agreed work is complete.', sortOrder: result.length + 1 });
    return result;
  }, [depositAmount, finalAmount, planMode, stages, totalAmount]);

  const validUntil = useMemo(() => new Date(Date.now() + Number(validDays) * 24 * 60 * 60 * 1000).toISOString(), [validDays]);
  const previewQuote = useMemo<QuoteDocumentData>(() => ({
    businessName: profile?.businessName ?? 'Your business',
    quoteNumber: quoteId ? 'Draft quote' : 'Preview',
    customerName: external ? customerName || 'Customer' : 'BuildPair homeowner',
    customerEmail: external ? customerEmail || null : null,
    customerPhone: external ? customerPhone || null : null,
    jobTitle: jobTitle || job?.title || 'Job',
    jobAddress: external ? jobAddress || null : (job?.postcode ?? null),
    workIncluded: workIncluded || 'Add the work included in this price.',
    notIncluded: notIncluded || null,
    expectedStart: external ? expectedStart || null : (START_DATE_OPTIONS.find((option) => option.value === proposedStartDate)?.label ?? null),
    durationText: external ? durationText || null : (DURATION_OPTIONS.find((option) => option.value === durationDays)?.label ?? null),
    warrantyText: warrantyText || null,
    items: pricedItems.map((item) => ({ description: item.description.trim(), category: item.category, quantity: Number(item.quantity || 0), unitPrice: poundsToPence(item.unitPrice), lineTotal: itemLineTotal(item) })),
    subtotal,
    vatRate: Number(vatRate || 0),
    vatAmount,
    totalAmount,
    paymentMethod: external ? paymentMethod : 'undecided',
    paymentTerms,
    paymentSchedule,
    notes: notes || null,
    showBreakdown: external ? showBreakdown : true,
    validUntil,
  }), [customerEmail, customerName, customerPhone, durationDays, durationText, expectedStart, external, job, jobAddress, jobTitle, notes, notIncluded, paymentMethod, paymentSchedule, paymentTerms, pricedItems, profile?.businessName, proposedStartDate, quoteId, showBreakdown, subtotal, totalAmount, validUntil, vatAmount, vatRate, warrantyText, workIncluded]);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function addItem(category: ItemCategory) {
    const defaults: Record<ItemCategory, string> = { labour: 'Labour', materials: 'Materials', other: '' };
    setItems((current) => [...current, { key: `item-${Date.now()}-${current.length}`, description: defaults[category], category, quantity: '1', unitPrice: '' }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function addStage(kind: DraftStage['kind'], title: string, trigger: string) {
    setStages((current) => [...current, { key: `stage-${Date.now()}-${current.length}`, title, amount: '', trigger, kind }]);
    setPlanMode('staged');
  }

  function updateStage(index: number, patch: Partial<DraftStage>) {
    setStages((current) => current.map((stage, i) => i === index ? { ...stage, ...patch } : stage));
  }

  function removeStage(index: number) {
    setStages((current) => current.filter((_, i) => i !== index));
  }

  async function buildWithAi() {
    const description = (workIncluded || job?.description || `Customer requested ${jobTitle}`).trim();
    if ((jobTitle || job?.title || '').trim().length < 3 || description.length < 10) {
      setError('Add a short job title and a few words about the work before asking AI to draft it.');
      return;
    }
    try {
      setAiBusy(true); setError('');
      const result = await apiFetch<AiQuote>('/api/ai/quote-assistant', {
        method: 'POST',
        body: JSON.stringify({
          jobTitle: jobTitle || job?.title,
          jobDescription: description,
          tradeCategory: job?.category || profile?.tradeCategory || 'Building',
          vatRegistered: vatRate === '20',
        }),
      }, () => getTokenRef.current());
      setWorkIncluded(result.scope);
      setNotIncluded(result.exclusions);
      setPaymentTerms(result.paymentTerms);
      setNotes(result.notes);
      if (result.durationDays) {
        const closest = String(closestQuoteDuration(result.durationDays));
        if (external) setDurationText(DURATION_OPTIONS.find((option) => option.value === closest)?.label ?? `${result.durationDays} days`);
        else setDurationDays(closest);
      }
      if (result.warrantyMonths != null) setWarrantyText(result.warrantyMonths ? `${result.warrantyMonths} months` : '');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAiBusy(false);
    }
  }

  function validate() {
    if (external && customerName.trim().length < 2) return 'Add the customer name.';
    if ((jobTitle || job?.title || '').trim().length < 2) return 'Add a job title.';
    if (workIncluded.trim().length < QUOTE_SCOPE_MIN_LENGTH) return `Explain the work included in at least ${QUOTE_SCOPE_MIN_LENGTH} characters so the customer knows exactly what the price covers.`;
    if (!pricedItems.length || totalAmount <= 0) return 'Add at least one priced item.';
    if (planMode !== 'single' && (depositAmount < 0 || depositAmount >= totalAmount)) return 'The deposit must be less than the full quote total.';
    if (depositUnit === 'percent' && (Number(depositValue || 0) < 0 || Number(depositValue || 0) >= 100)) return 'Deposit percentage must be less than 100%.';
    if (planMode === 'staged') {
      if (!stages.length) return 'Add at least one stage payment or choose a simpler payment option.';
      if (stages.some((stage) => poundsToPence(stage.amount) <= 0)) return 'Give every stage payment an amount.';
      if (stages.some((stage) => stage.kind === 'stage' && stage.trigger.trim().length < 3)) return 'Say what must be finished before each stage payment is due.';
    }
    if (finalAmount <= 0) return 'The deposit and stage payments must leave a final balance.';
    if (!external && !durationDays) return 'Choose roughly how long the job should take.';
    if (!external && !proposedStartDate) return 'Choose when you expect to start.';
    if (external && paymentMethod === 'buildpair' && !payoutReady) return 'BuildPair payments are not available until payout setup is complete. Use direct payment for now or finish payout setup first.';
    return '';
  }

  async function shareSavedQuote(quote: BusinessQuote) {
    const message = `Quote ${quote.quoteNumber} for ${quote.jobTitle}: ${quote.shareUrl}`;
    try {
      if (Platform.OS === 'web') {
        const nav = (globalThis as unknown as { navigator?: { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> } }).navigator;
        if (nav?.share) await nav.share({ title: `Quote ${quote.quoteNumber}`, text: `Quote for ${quote.jobTitle}`, url: quote.shareUrl });
        else if (quote.customerEmail) await Linking.openURL(`mailto:${encodeURIComponent(quote.customerEmail)}?subject=${encodeURIComponent(`Quote ${quote.quoteNumber}`)}&body=${encodeURIComponent(message)}`);
        return;
      }
      await Share.share({ title: `Quote ${quote.quoteNumber}`, message });
    } catch {
      // The quote is already saved. Dismissing a share sheet must not turn a successful save into an error.
    }
  }

  async function saveExternal(status: 'draft' | 'sent') {
    const problem = validate();
    if (problem) { setError(problem); setPreview(false); return; }
    try {
      setBusy(true); setError('');
      const saved = await apiFetch<BusinessQuote>('/api/business-quotes', {
        method: 'POST',
        body: JSON.stringify({
          quoteId: quoteId || undefined,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          jobTitle: jobTitle.trim(),
          jobAddress: jobAddress.trim(),
          workIncluded: workIncluded.trim(),
          notIncluded: notIncluded.trim(),
          expectedStart: expectedStart.trim(),
          durationText: durationText.trim(),
          warrantyText: warrantyText.trim(),
          items: pricedItems.map((item) => ({ description: item.description.trim(), category: item.category, quantity: Number(item.quantity), unitPrice: poundsToPence(item.unitPrice) })),
          vatRate: Number(vatRate),
          paymentMethod,
          paymentTerms: paymentTerms.trim(),
          paymentSchedule,
          notes: notes.trim(),
          showBreakdown,
          validUntil,
          status,
        }),
      }, getToken);
      if (status === 'sent') await shareSavedQuote(saved);
      router.replace('/trader/quotes');
    } catch (e) {
      setError(errorMessage(e));
      setPreview(false);
    } finally {
      setBusy(false);
    }
  }

  async function sendJobQuote() {
    const problem = validate();
    if (problem) { setError(problem); setPreview(false); return; }
    if (!jobId) return;
    try {
      setBusy(true); setError('');
      const proposedStartAt = `${proposedStartDate}T12:00:00.000Z`;
      const sent = await apiFetch<SentJobQuote>('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          laborCost: labourCost,
          materialsCost: materialsAndOtherCost,
          vatAmount,
          depositAmount,
          paymentTerms: paymentTerms.trim(),
          paymentSchedule,
          scope: workIncluded.trim(),
          exclusions: notIncluded.trim() || undefined,
          notes: notes.trim() || undefined,
          durationDays: Number(durationDays),
          warrantyMonths: warrantyText.match(/^\d+$/) ? Number(warrantyText) : undefined,
          proposedStartAt,
          validUntil,
        }),
      }, getToken);
      if (sent.conversationId) router.replace(`/trader/messages/${sent.conversationId}` as Href);
      else router.replace('/trader/quotes');
    } catch (e) {
      setError(errorMessage(e));
      setPreview(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen label="Getting the quote ready…" />;

  const footer = <View style={styles.footerActions}>
    <Button mode="outlined" icon={preview ? 'pencil-outline' : 'eye-outline'} disabled={busy} onPress={() => { setError(''); setPreview((value) => !value); }}>{preview ? 'Back to edit' : 'Preview quote'}</Button>
    {external ? <Button mode="outlined" icon="content-save-outline" loading={busy} disabled={busy} onPress={() => void saveExternal('draft')}>Save draft</Button> : null}
    <Button mode="contained" icon={external ? 'share-variant-outline' : 'send-outline'} loading={busy} disabled={busy} onPress={() => external ? void saveExternal('sent') : void sendJobQuote()}>{external ? 'Save & share' : 'Send quote'}</Button>
  </View>;

  if (preview) {
    return <Screen title="Preview quote" subtitle="This is what the customer will read. Check it before you send it." backHref="/trader/quotes" footer={footer}>
      <QuoteDocument quote={previewQuote} />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </Screen>;
  }

  return <Screen title={quoteId ? 'Edit quote draft' : 'Create quote'} subtitle={external ? 'A straightforward quote for any customer. No BuildPair job required.' : (job?.title ?? title ?? 'BuildPair job')} backHref="/trader/quotes" footer={footer}>
    {external ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Customer</Text>
      <Text style={styles.muted}>Who is this quote for?</Text>
      <TextInput label="Customer name" value={customerName} onChangeText={setCustomerName} mode="outlined" />
      <View style={styles.row}><TextInput style={styles.flexField} label="Email (optional)" value={customerEmail} onChangeText={setCustomerEmail} keyboardType="email-address" autoCapitalize="none" mode="outlined" /><TextInput style={styles.flexField} label="Mobile (optional)" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" mode="outlined" /></View>
      <TextInput label="Job address (optional)" value={jobAddress} onChangeText={setJobAddress} mode="outlined" />
    </AppCard> : job ? <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>{job.title}</Text><Text style={styles.muted}>{job.postcode || job.locationLabel || 'BuildPair job'} · {job.budgetRange}</Text></View><Chip>{job.category}</Chip></View>
      <Text style={styles.body}>{job.description}</Text>
    </AppCard> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Job details</Text>
      {external ? <TextInput label="Job title" value={jobTitle} onChangeText={setJobTitle} mode="outlined" placeholder="e.g. Re-tile bathroom" /> : null}
      <TextInput label="Work included" value={workIncluded} onChangeText={setWorkIncluded} mode="outlined" multiline numberOfLines={5} placeholder="Describe what you are supplying and doing for this price" />
      <HelperText type={workIncluded.trim().length >= QUOTE_SCOPE_MIN_LENGTH ? 'info' : 'error'}>{workIncluded.trim().length}/{QUOTE_SCOPE_MIN_LENGTH} minimum characters. Keep it plain and specific.</HelperText>
      <TextInput label="Not included (optional)" value={notIncluded} onChangeText={setNotIncluded} mode="outlined" multiline numberOfLines={3} placeholder="e.g. Decorating, hidden defects, extra work not listed above" />
      <Button mode="contained-tonal" icon="creation" loading={aiBusy} disabled={aiBusy} onPress={() => void buildWithAi()}>Help me draft the wording with AI</Button>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Price</Text>
      <Text style={styles.muted}>Add the parts of the price you actually use. Keep it as simple or detailed as the job needs.</Text>
      {items.map((item, index) => <View key={item.key} style={styles.itemCard}>
        <TextInput label="Description" value={item.description} onChangeText={(value) => updateItem(index, { description: value })} mode="outlined" placeholder="e.g. Labour, tiles, skip" />
        <SegmentedButtons value={item.category} onValueChange={(value) => updateItem(index, { category: value as ItemCategory })} buttons={[{ value: 'labour', label: 'Labour' }, { value: 'materials', label: 'Materials' }, { value: 'other', label: 'Other' }]} />
        <View style={styles.row}><TextInput style={styles.flexField} label="Qty" value={item.quantity} onChangeText={(value) => updateItem(index, { quantity: value })} keyboardType="decimal-pad" mode="outlined" /><TextInput style={styles.flexField} label="Price each (£)" value={item.unitPrice} onChangeText={(value) => updateItem(index, { unitPrice: value })} keyboardType="decimal-pad" mode="outlined" /></View>
        <View style={styles.row}><Text style={styles.strong}>Line total</Text><Text style={styles.strong}>{formatMoney(itemLineTotal(item))}</Text></View>
        <Button mode="text" textColor={colors.danger} onPress={() => removeItem(index)}>Remove</Button>
      </View>)}
      <View style={styles.actions}><Button mode="outlined" icon="plus" onPress={() => addItem('labour')}>Labour</Button><Button mode="outlined" icon="plus" onPress={() => addItem('materials')}>Materials</Button><Button mode="outlined" icon="plus" onPress={() => addItem('other')}>Other cost</Button></View>
      <Text variant="labelLarge" style={styles.label}>VAT</Text>
      <SegmentedButtons value={vatRate} onValueChange={setVatRate} buttons={[{ value: '0', label: 'No VAT' }, { value: '20', label: 'Add 20%' }]} />
      {external ? <View style={styles.switchRow}><View style={styles.flex}><Text style={styles.strong}>Show item breakdown to customer</Text><Text style={styles.muted}>Turn this off if you want the customer to see only the total price.</Text></View><Switch value={showBreakdown} onValueChange={setShowBreakdown} /></View> : null}
      <View style={styles.totalBox}><View style={styles.row}><Text>Subtotal</Text><Text>{formatMoney(subtotal)}</Text></View>{vatAmount ? <View style={styles.row}><Text>VAT</Text><Text>{formatMoney(vatAmount)}</Text></View> : null}<View style={styles.row}><Text variant="titleLarge" style={styles.title}>Total</Text><Text variant="headlineSmall" style={styles.total}>{formatMoney(totalAmount)}</Text></View></View>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>When will you do the job?</Text>
      {external ? <>
        <TextInput label="Expected start (optional)" value={expectedStart} onChangeText={setExpectedStart} mode="outlined" placeholder="e.g. Week commencing 21 September" />
        <TextInput label="How long should it take? (optional)" value={durationText} onChangeText={setDurationText} mode="outlined" placeholder="e.g. Around 4 days" />
      </> : <View style={styles.row}>
        <QuoteDropdown label="When can you start?" value={proposedStartDate} options={START_DATE_OPTIONS} placeholder="Choose a date" onSelect={setProposedStartDate} />
        <QuoteDropdown label="How long should it take?" value={durationDays} options={DURATION_OPTIONS} placeholder="Choose a duration" onSelect={setDurationDays} />
      </View>}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>How do you want to be paid?</Text>
      <SegmentedButtons value={planMode} onValueChange={(value) => setPlanMode(value as PlanMode)} buttons={[{ value: 'single', label: 'Full at end' }, { value: 'deposit', label: 'Deposit + balance' }, { value: 'staged', label: 'Stage payments' }]} />
      {planMode !== 'single' ? <View style={styles.depositBlock}>
        <Text variant="labelLarge" style={styles.label}>Deposit</Text>
        <SegmentedButtons value={depositUnit} onValueChange={(value) => setDepositUnit(value as DepositUnit)} buttons={[{ value: 'amount', label: '£ amount' }, { value: 'percent', label: '%' }]} />
        <TextInput label={depositUnit === 'percent' ? 'Deposit (%)' : 'Deposit (£)'} value={depositValue} onChangeText={setDepositValue} keyboardType="decimal-pad" mode="outlined" />
        {depositAmount > 0 ? <Text style={styles.muted}>Deposit: {formatMoney(depositAmount)}</Text> : null}
      </View> : null}
      {planMode === 'staged' ? <>
        <Text variant="titleMedium" style={styles.title}>Stage payments</Text>
        <Text style={styles.muted}>Use normal site language. The customer should immediately understand what has to be done before each payment is due.</Text>
        {stages.map((stage, index) => <View key={stage.key} style={styles.itemCard}>
          <TextInput label="Stage name" value={stage.title} onChangeText={(value) => updateStage(index, { title: value })} mode="outlined" />
          <TextInput label="Amount (£)" value={stage.amount} onChangeText={(value) => updateStage(index, { amount: value })} keyboardType="decimal-pad" mode="outlined" />
          <TextInput label={stage.kind === 'materials' ? 'When is this due?' : 'What must be finished before this is due?'} value={stage.trigger} onChangeText={(value) => updateStage(index, { trigger: value })} mode="outlined" multiline />
          <Button mode="text" textColor={colors.danger} onPress={() => removeStage(index)}>Remove stage</Button>
        </View>)}
        <View style={styles.actions}><Button mode="outlined" icon="plus" onPress={() => addStage('materials', 'Materials payment', 'Due before materials are ordered.')}>Materials</Button><Button mode="outlined" icon="plus" onPress={() => addStage('stage', 'First fix', 'Due when first fix work is complete.')}>First fix</Button><Button mode="outlined" icon="plus" onPress={() => addStage('stage', 'Second fix', 'Due when second fix work is complete.')}>Second fix</Button><Button mode="outlined" icon="plus" onPress={() => addStage('stage', `Stage ${stages.length + 1}`, '')}>Custom</Button></View>
      </> : null}
      {totalAmount > 0 ? <View style={styles.totalBox}>
        {paymentSchedule.map((stage) => <View key={stage.key} style={styles.stageSummary}><View style={styles.row}><Text style={styles.strong}>{stage.title}</Text><Text style={styles.strong}>{formatMoney(stage.amount)}</Text></View>{stage.trigger ? <Text style={styles.muted}>{stage.trigger}</Text> : null}</View>)}
      </View> : null}
      {external ? <>
        <Text variant="labelLarge" style={styles.label}>Payment method</Text>
        <SegmentedButtons value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'external' | 'buildpair')} buttons={[{ value: 'external', label: 'Paid directly' }, { value: 'buildpair', label: 'BuildPair payments', disabled: !payoutReady }]} />
        {!payoutReady ? <HelperText type="info">BuildPair payments are unavailable until payout setup is complete. You can still create, send and track quotes normally.</HelperText> : null}
      </> : null}
    </AppCard>

    <AppCard>
      <Button mode="text" icon={showMore ? 'chevron-up' : 'chevron-down'} onPress={() => setShowMore((value) => !value)}>{showMore ? 'Hide extra quote options' : 'More quote options'}</Button>
      {showMore ? <View style={styles.moreOptions}>
        <Text variant="labelLarge" style={styles.label}>Quote valid for</Text>
        <SegmentedButtons value={validDays} onValueChange={setValidDays} buttons={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} />
        <TextInput label="Guarantee / warranty (optional)" value={warrantyText} onChangeText={setWarrantyText} mode="outlined" placeholder="e.g. 12 months workmanship" />
        <TextInput label="Payment terms" value={paymentTerms} onChangeText={setPaymentTerms} mode="outlined" multiline numberOfLines={3} />
        <TextInput label="Notes (optional)" value={notes} onChangeText={setNotes} mode="outlined" multiline numberOfLines={3} />
      </View> : null}
    </AppCard>

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  muted: { color: colors.muted, lineHeight: 21 },
  strong: { color: colors.text, fontWeight: '800' },
  label: { color: colors.charcoal, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  flexField: { flex: 1, minWidth: 170 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  itemCard: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceSoft, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  totalBox: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceSoft, borderRadius: 14 },
  total: { color: colors.primary, fontWeight: '900' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  depositBlock: { gap: spacing.sm },
  stageSummary: { gap: 3, paddingVertical: spacing.xs },
  moreOptions: { gap: spacing.md },
  dropdownWrap: { flex: 1, minWidth: 220, gap: 5 },
  dropdownButton: { minHeight: 48, justifyContent: 'space-between' },
  dropdownMenu: { maxHeight: 320 },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
});
