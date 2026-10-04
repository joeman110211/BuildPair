import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Chip, HelperText, Menu, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
import { QuoteDocument, type QuoteDocumentData } from '@/components/QuoteDocument';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney, poundsToPence } from '@/lib/money';
import { buildQuoteStartDateOptions, closestQuoteDuration, QUOTE_DURATION_OPTIONS, QUOTE_SCOPE_MIN_LENGTH } from '@/lib/quote-options';
import type { BuildPayFeeMode, Job, PaymentStagePlan, TraderProfile } from '@/types';
import type { BusinessQuoteScopeFields } from '@/types/business-quotes';

type AiQuote = {
  laborCost: number; materialsCost: number; depositAmount: number; scope: string; exclusions: string; paymentTerms: string;
  durationDays?: number; warrantyMonths?: number; notes: string; source: 'ai' | 'rules';
};
type SentJobQuote = { conversationId: string | null };
type ItemCategory = 'labour' | 'materials' | 'other';
type DraftItem = { key: string; description: string; category: ItemCategory; quantity: string; unitPrice: string };
type DraftStage = { key: string; title: string; amount: string; trigger: string; kind: 'materials' | 'stage' };
type DraftQuoteOption = { key: string; kind: 'optional' | 'alternative'; title: string; description: string; priceDelta: string };
type PlanMode = 'single' | 'deposit' | 'staged';
type DepositUnit = 'amount' | 'percent';
type SelectOption = { value: string; label: string };
type TraderTemplate = { id: string; kind: 'quote' | 'message'; title: string; content: string };

type BusinessQuote = BusinessQuoteScopeFields & {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  jobTitle: string;
  tradeCategory: string | null;
  jobAddress: string | null;
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
  revisionNumber: number;
  managedJobId: string | null;
  createdAt: string;
  items: { id?: string; description: string; category: ItemCategory; quantity: number | string; unitPrice: number; lineTotal: number }[];
  options: { id?: string; kind: 'optional' | 'alternative'; title: string; description: string; priceDelta: number }[];
};

const START_DATE_OPTIONS: SelectOption[] = buildQuoteStartDateOptions(365);
const DURATION_OPTIONS: SelectOption[] = QUOTE_DURATION_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }));
const INSPECTION_CAVEAT = 'This quote is based on the information currently available and is subject to inspection. If inspection identifies a different, concealed or additional fault outside the stated scope, any extra chargeable work must be agreed as a variation before it begins.';

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
  const { jobId, title, quoteId, copyQuoteId, customerName: presetCustomerName, customerEmail: presetCustomerEmail, customerPhone: presetCustomerPhone } = useLocalSearchParams<{ jobId?: string; title?: string; quoteId?: string; copyQuoteId?: string; customerName?: string; customerEmail?: string; customerPhone?: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const external = !jobId;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job>();
  const [profile, setProfile] = useState<TraderProfile>();
  const [customerName, setCustomerName] = useState(presetCustomerName ?? '');
  const [customerEmail, setCustomerEmail] = useState(presetCustomerEmail ?? '');
  const [customerPhone, setCustomerPhone] = useState(presetCustomerPhone ?? '');
  const [jobTitle, setJobTitle] = useState(title ?? '');
  const [externalTradeCategory, setExternalTradeCategory] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [workIncluded, setWorkIncluded] = useState('');
  const [notIncluded, setNotIncluded] = useState('');
  const [subjectToInspection, setSubjectToInspection] = useState(false);
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
  const [quoteOptions, setQuoteOptions] = useState<DraftQuoteOption[]>([]);
  const [requestBuildPay, setRequestBuildPay] = useState(false);
  const buildPayFeeMode: BuildPayFeeMode = 'trader_absorbs';
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
  const [quoteTemplates, setQuoteTemplates] = useState<TraderTemplate[]>([]);

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
        setExternalTradeCategory((current) => current || ownProfile.tradeCategory);
        const templates = await apiFetch<TraderTemplate[]>('/api/trader-templates', {}, tokenGetter).catch(() => []);
        if (active) setQuoteTemplates(templates.filter((item) => item.kind === 'quote'));

        if (jobId) {
          const jobs = await apiFetch<Job[]>('/api/jobs', {}, tokenGetter);
          if (!active) return;
          const found = jobs.find((row) => row.id === jobId);
          setJob(found);
          if (found) {
            setJobTitle(found.title);
            if (found.description.trim().length >= QUOTE_SCOPE_MIN_LENGTH) setWorkIncluded(found.description.trim());
          }
        } else if (quoteId || copyQuoteId) {
          const rows = await apiFetch<BusinessQuote[]>('/api/business-quotes', {}, tokenGetter);
          if (!active) return;
          const sourceQuoteId = quoteId || copyQuoteId;
          const draft = rows.find((row) => row.id === sourceQuoteId);
          if (!draft) throw new Error('That quote could not be found.');
          if (quoteId && draft.status !== 'draft') throw new Error('That quote draft is no longer editable.');
          setCustomerName(draft.customerName);
          setCustomerEmail(draft.customerEmail ?? '');
          setCustomerPhone(draft.customerPhone ?? '');
          setJobTitle(draft.jobTitle);
          setExternalTradeCategory(draft.tradeCategory || ownProfile.tradeCategory);
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
          setQuoteOptions((draft.options ?? []).map((option, index) => ({ key: option.id ?? `option-${index}`, kind: option.kind, title: option.title, description: option.description ?? '', priceDelta: (option.priceDelta / 100).toFixed(2) })));
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
  }, [copyQuoteId, jobId, quoteId]);

  const pricedItems = useMemo(() => items.filter((item) => item.description.trim() && itemLineTotal(item) > 0), [items]);
  const subtotal = useMemo(() => pricedItems.reduce((sum, item) => sum + itemLineTotal(item), 0), [pricedItems]);
  const vatAmount = Math.round(subtotal * Number(vatRate || 0) / 100);
  const totalAmount = subtotal + vatAmount;
  const labourOnlyCost = pricedItems.filter((item) => item.category === 'labour').reduce((sum, item) => sum + itemLineTotal(item), 0);
  const materialsCost = pricedItems.filter((item) => item.category === 'materials').reduce((sum, item) => sum + itemLineTotal(item), 0);
  const overheadCost = pricedItems.filter((item) => item.category === 'other').reduce((sum, item) => sum + itemLineTotal(item), 0);
  const serviceCost = labourOnlyCost + overheadCost;
  const serviceFundingBalance = totalAmount - materialsCost;
  const payoutReady = Boolean(profile?.stripeAccountId && profile.stripePayoutsEnabled);
  const plusBusinessTools = profile?.subscriptionTier === 'basic' || profile?.subscriptionTier === 'featured';
  const effectiveNotIncluded = useMemo(() => {
    const exclusions = notIncluded.trim();
    if (!subjectToInspection) return exclusions;
    return [exclusions, INSPECTION_CAVEAT].filter(Boolean).join('\n\n');
  }, [notIncluded, subjectToInspection]);

  const depositAmount = useMemo(() => {
    if (planMode === 'single') return 0;
    const base = external ? totalAmount : serviceFundingBalance;
    if (depositUnit === 'percent') return Math.round(base * Math.max(0, Number(depositValue || 0)) / 100);
    return poundsToPence(depositValue);
  }, [depositUnit, depositValue, external, planMode, serviceFundingBalance, totalAmount]);

  const progressTotal = planMode === 'staged'
    ? stages.reduce((sum, stage) => sum + poundsToPence(stage.amount), 0)
    : 0;
  const finalAmount = external
    ? totalAmount - depositAmount - progressTotal
    : serviceFundingBalance - depositAmount - progressTotal;

  const paymentSchedule = useMemo<PaymentStagePlan[]>(() => {
    if (totalAmount <= 0 || finalAmount <= 0) return [];
    const result: PaymentStagePlan[] = [];

    if (!external && materialsCost > 0) {
      result.push({
        key: 'materials',
        title: 'Materials payment',
        amount: materialsCost,
        kind: 'materials',
        trigger: 'Included in the opening BuildPay payment. Released after the tradesperson acknowledges the payment so the quoted materials can be ordered.',
        sortOrder: result.length + 1,
      });
    }

    if (depositAmount > 0) {
      result.push({
        key: 'deposit',
        title: external ? 'Deposit' : 'Protected deposit',
        amount: depositAmount,
        kind: 'deposit',
        trigger: external ? 'Due when the quote is accepted and before work starts.' : 'Held in BuildPay until the agreed deposit release point is reached and the homeowner approves it.',
        sortOrder: result.length + 1,
      });
    }

    if (planMode === 'staged') {
      stages.forEach((stage, index) => {
        if (!external && stage.kind === 'materials') return;
        const amount = poundsToPence(stage.amount);
        if (amount > 0) result.push({ key: stage.key, title: stage.title.trim() || `Stage ${index + 1}`, amount, kind: stage.kind, trigger: stage.trigger.trim(), sortOrder: result.length + 1 });
      });
    }

    result.push({
      key: 'final',
      title: external ? 'Final balance' : 'Final payment',
      amount: finalAmount,
      kind: 'final',
      trigger: external ? 'Due when the agreed work is complete.' : 'Held in BuildPay and released after final completion is approved by the homeowner.',
      sortOrder: result.length + 1,
    });
    return result;
  }, [depositAmount, external, finalAmount, materialsCost, planMode, stages, totalAmount]);

  const buildPayRequested = !external && (requestBuildPay || planMode !== 'single');
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
    notIncluded: effectiveNotIncluded || null,
    expectedStart: external ? expectedStart || null : (START_DATE_OPTIONS.find((option) => option.value === proposedStartDate)?.label ?? null),
    durationText: external ? durationText || null : (DURATION_OPTIONS.find((option) => option.value === durationDays)?.label ?? null),
    warrantyText: warrantyText || null,
    items: pricedItems.map((item) => ({ description: item.description.trim(), category: item.category, quantity: Number(item.quantity || 0), unitPrice: poundsToPence(item.unitPrice), lineTotal: itemLineTotal(item) })),
    options: quoteOptions.filter((option) => option.title.trim().length >= 2).map((option) => ({ id: option.key, kind: option.kind, title: option.title.trim(), description: option.description.trim(), priceDelta: poundsToPence(option.priceDelta) })),
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
  }), [customerEmail, customerName, customerPhone, durationDays, durationText, effectiveNotIncluded, expectedStart, external, job, jobAddress, jobTitle, notes, paymentMethod, paymentSchedule, paymentTerms, pricedItems, profile?.businessName, proposedStartDate, quoteId, quoteOptions, showBreakdown, subtotal, totalAmount, validUntil, vatAmount, vatRate, warrantyText, workIncluded]);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function addItem(category: ItemCategory) {
    const defaults: Record<ItemCategory, string> = { labour: 'Labour', materials: 'Materials', other: 'Site / overhead' };
    setItems((current) => [...current, { key: `item-${Date.now()}-${current.length}`, description: defaults[category], category, quantity: '1', unitPrice: '' }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function addStage(kind: DraftStage['kind'], title: string, trigger: string) {
    setStages((current) => [...current, { key: `stage-${Date.now()}-${current.length}`, title, amount: '', trigger, kind }]);
    setPlanMode('staged');
    if (!external) setRequestBuildPay(true);
  }

  function updateStage(index: number, patch: Partial<DraftStage>) {
    setStages((current) => current.map((stage, i) => i === index ? { ...stage, ...patch } : stage));
  }

  function removeStage(index: number) {
    setStages((current) => current.filter((_, i) => i !== index));
  }

  function addQuoteOption(kind: DraftQuoteOption['kind']) {
    setQuoteOptions((current) => [...current, { key: `quote-option-${Date.now()}-${current.length}`, kind, title: '', description: '', priceDelta: '' }]);
  }

  function updateQuoteOption(index: number, patch: Partial<DraftQuoteOption>) {
    setQuoteOptions((current) => current.map((option, i) => i === index ? { ...option, ...patch } : option));
  }

  function removeQuoteOption(index: number) {
    setQuoteOptions((current) => current.filter((_, i) => i !== index));
  }

  function choosePlanMode(value: string) {
    const next = value as PlanMode;
    setPlanMode(next);
    if (!external) setRequestBuildPay(next !== 'single');
  }

  async function buildWithAi() {
    if (!plusBusinessTools) {
      setError('AI quote drafting is included with BuildPair Plus and Pro.');
      return;
    }
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
    if (external && !externalTradeCategory) return 'Choose the main trade category for this job.';
    if ((jobTitle || job?.title || '').trim().length < 2) return 'Add a job title.';
    if (workIncluded.trim().length < QUOTE_SCOPE_MIN_LENGTH) return `Explain the work included in at least ${QUOTE_SCOPE_MIN_LENGTH} characters so the customer knows exactly what the price covers.`;
    if (!pricedItems.length || totalAmount <= 0) return 'Add at least one priced item.';
    if (!external && serviceFundingBalance <= 0) return 'A BuildPair trade quote needs a labour/service amount as well as any materials. Materials-only sales are not supported as BuildPay jobs.';
    const depositLimit = external ? totalAmount : serviceFundingBalance;
    if (planMode !== 'single' && (depositAmount < 0 || depositAmount >= depositLimit)) return `The deposit must be less than the ${external ? 'full quote total' : materialsCost > 0 ? 'work balance after materials' : 'full work balance'}.`;
    if (depositUnit === 'percent' && (Number(depositValue || 0) < 0 || Number(depositValue || 0) >= 100)) return 'Deposit percentage must be less than 100%.';
    if (planMode === 'staged') {
      if (!stages.length) return 'Add at least one stage payment or choose a simpler payment option.';
      if (stages.some((stage) => poundsToPence(stage.amount) <= 0)) return 'Give every stage payment an amount.';
      if (stages.some((stage) => stage.kind === 'stage' && stage.trigger.trim().length < 3)) return 'Say what must be finished before each stage payment is due.';
    }
    if (finalAmount <= 0) return 'The deposit and stage payments must leave a final balance.';
    if (!external && !durationDays) return 'Choose roughly how long the job should take.';
    if (!external && !proposedStartDate) return 'Choose when you expect to start.';
    if (!external && buildPayRequested && !payoutReady) return 'BuildPay cannot be included in this quote until Stripe has confirmed your payout setup. Finish payout setup or use a single direct-payment quote for now.';
    if (external && paymentMethod === 'buildpair' && !plusBusinessTools) return 'Outside-customer BuildPay and managed projects are included with BuildPair Plus and Pro.';
    if (external && paymentMethod === 'buildpair' && !payoutReady) return 'BuildPay is not available until Stripe has confirmed payout readiness. Use direct payment for now or finish payout setup first.';
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
          tradeCategory: externalTradeCategory,
          jobAddress: jobAddress.trim(),
          workIncluded: workIncluded.trim(),
          notIncluded: effectiveNotIncluded,
          expectedStart: expectedStart.trim(),
          durationText: durationText.trim(),
          warrantyText: warrantyText.trim(),
          items: pricedItems.map((item) => ({ description: item.description.trim(), category: item.category, quantity: Number(item.quantity), unitPrice: poundsToPence(item.unitPrice) })),
          options: quoteOptions.filter((option) => option.title.trim().length >= 2).map((option) => ({ kind: option.kind, title: option.title.trim(), description: option.description.trim(), priceDelta: poundsToPence(option.priceDelta) })),
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
          laborCost: serviceCost,
          materialsCost,
          vatAmount,
          depositAmount,
          costItems: pricedItems.map((item) => ({
            description: item.description.trim(),
            category: item.category === 'other' ? 'overhead' : item.category,
            quantity: Number(item.quantity || 0),
            unitPrice: poundsToPence(item.unitPrice),
            lineTotal: itemLineTotal(item),
          })),
          paymentTerms: paymentTerms.trim(),
          paymentSchedule,
          requestBuildPay: buildPayRequested,
          buildPayFeeMode: buildPayRequested ? buildPayFeeMode : undefined,
          scope: workIncluded.trim(),
          exclusions: effectiveNotIncluded || undefined,
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
      {!external ? <AppCard style={styles.protectionCard}>
        <Chip icon={buildPayRequested ? 'shield-check-outline' : 'shield-lock-outline'}>{buildPayRequested ? 'BuildPay included in this quote' : 'BuildPay not included'}</Chip>
        <Text variant="titleMedium" style={styles.title}>Payment and fee summary</Text>
        <MilestoneTimeline items={paymentSchedule.map((stage) => ({ id: stage.key, title: stage.title, amount: stage.amount, kind: stage.kind, trigger: stage.trigger }))} />
        {buildPayRequested ? <>
          <View style={styles.totalBox}>
            <View style={styles.row}><Text style={styles.strong}>Your work price</Text><Text style={styles.strong}>{formatMoney(totalAmount)}</Text></View>
            <View style={styles.row}><Text>BuildPay fee charged to homeowner</Text><Text>{formatMoney(0)}</Text></View><View style={styles.row}><Text variant="titleMedium" style={styles.title}>Homeowner all-in total</Text><Text variant="titleMedium" style={styles.total}>{formatMoney(totalAmount)}</Text></View>
          </View>
          <Text style={styles.muted}>{`You requested BuildPay, so you carry its costs. The homeowner pays your ${formatMoney(totalAmount)} work price; BuildPair's labour/service fee and actual Stripe processing costs are recovered from controlled service payouts.`}</Text>
        </> : <Text style={styles.muted}>The homeowner can accept this quote at the work price and choose direct payment. If they later request optional BuildPay, BuildPair will show them its service fee and all-in total before they confirm it.</Text>}
      </AppCard> : null}
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </Screen>;
  }

  const buildPayPlanButtons = materialsCost > 0
    ? [{ value: 'single', label: 'Materials + balance' }, { value: 'deposit', label: 'Materials + deposit' }, { value: 'staged', label: 'Materials + stages' }]
    : [{ value: 'single', label: 'Full amount' }, { value: 'deposit', label: 'Deposit + balance' }, { value: 'staged', label: 'Stage payments' }];

  return <Screen title={quoteId ? 'Edit quote draft' : 'Create quote'} subtitle={external ? 'A straightforward quote for any customer. No BuildPair job required.' : (job?.title ?? title ?? 'BuildPair job')} backHref="/trader/quotes" footer={footer}>
    {external ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Customer</Text>
      <Text style={styles.muted}>Who is this quote for?</Text>
      <TextInput label="Customer name" value={customerName} onChangeText={setCustomerName} mode="outlined" />
      <View style={styles.row}><TextInput style={styles.flexField} label="Email (optional)" value={customerEmail} onChangeText={setCustomerEmail} keyboardType="email-address" autoCapitalize="none" mode="outlined" /><TextInput style={styles.flexField} label="Mobile (optional)" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" mode="outlined" /></View>
      <TextInput label="Job address (optional)" value={jobAddress} onChangeText={setJobAddress} mode="outlined" />
      <QuoteDropdown label="Main trade category" value={externalTradeCategory} options={(profile?.tradeCategories?.length ? profile.tradeCategories : [profile?.tradeCategory].filter(Boolean) as string[]).map((value) => ({ value, label: value }))} placeholder="Choose category" onSelect={setExternalTradeCategory} />
      <Text style={styles.muted}>This category is used if the customer later brings this accepted quote into BuildPair as a managed project.</Text>
    </AppCard> : job ? <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>{job.title}</Text><Text style={styles.muted}>{job.postcode || job.locationLabel || 'BuildPair job'} · {job.budgetRange}</Text></View><Chip>{job.category}</Chip></View>
      <Text style={styles.body}>{job.description}</Text>
    </AppCard> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Job details</Text>
      {quoteTemplates.length ? <View style={styles.templateBlock}><Text variant="labelLarge" style={styles.label}>Pro quote templates</Text><View style={styles.actions}>{quoteTemplates.slice(0, 8).map((template) => <Button key={template.id} compact mode="outlined" icon="file-document-edit-outline" onPress={() => setWorkIncluded(template.content)}>{template.title}</Button>)}</View><Text variant="bodySmall" style={styles.muted}>Using a template only fills the wording. Check it against this customer and job before sending.</Text></View> : null}
      {external ? <TextInput label="Job title" value={jobTitle} onChangeText={setJobTitle} mode="outlined" placeholder="e.g. Re-tile bathroom" /> : null}
      <TextInput label="Work included" value={workIncluded} onChangeText={setWorkIncluded} mode="outlined" multiline numberOfLines={5} placeholder="Describe what you are supplying and doing for this price" />
      <HelperText type={workIncluded.trim().length >= QUOTE_SCOPE_MIN_LENGTH ? 'info' : 'error'}>{workIncluded.trim().length}/{QUOTE_SCOPE_MIN_LENGTH} minimum characters. {external ? 'Keep it plain and specific.' : 'The homeowner description is only a starting point. Edit this into the exact work you are offering.'}</HelperText>
      {!external ? <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.strong}>Scope subject to inspection</Text>
          <Text style={styles.muted}>Use this when the fault or hidden condition cannot be confirmed from the job post. BuildPair will add a clear caveat requiring approval before extra chargeable work begins.</Text>
        </View>
        <Switch value={subjectToInspection} onValueChange={setSubjectToInspection} />
      </View> : null}
      <TextInput label="Not included (optional)" value={notIncluded} onChangeText={setNotIncluded} mode="outlined" multiline numberOfLines={3} placeholder="e.g. Decorating, hidden defects, extra work not listed above" />
      {subjectToInspection ? <HelperText type="info">Inspection caveat added to the customer-facing quote.</HelperText> : null}
      <Button mode="contained-tonal" icon="creation" loading={aiBusy} disabled={aiBusy || !plusBusinessTools} onPress={() => void buildWithAi()}>{plusBusinessTools ? 'Help me draft the wording with AI' : 'AI quote drafting · Plus'}</Button>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Itemised price</Text>
      <Text style={styles.muted}>Use Materials only for things being bought for the job. Put labour, plant, access, waste, supervision and site overhead in Labour or Site / overhead. That keeps the materials payout and BuildPair fee calculation honest.</Text>
      {items.map((item, index) => <View key={item.key} style={styles.itemCard}>
        <TextInput label="Description / specification" value={item.description} onChangeText={(value) => updateItem(index, { description: value })} mode="outlined" placeholder="e.g. C2-S1 flexible tile adhesive, 6 bags" />
        <SegmentedButtons value={item.category} onValueChange={(value) => updateItem(index, { category: value as ItemCategory })} buttons={[{ value: 'labour', label: 'Labour' }, { value: 'materials', label: 'Materials' }, { value: 'other', label: 'Site / overhead' }]} />
        <View style={styles.row}><TextInput style={styles.flexField} label="Qty" value={item.quantity} onChangeText={(value) => updateItem(index, { quantity: value })} keyboardType="decimal-pad" mode="outlined" /><TextInput style={styles.flexField} label="Price each (£)" value={item.unitPrice} onChangeText={(value) => updateItem(index, { unitPrice: value })} keyboardType="decimal-pad" mode="outlined" /></View>
        <View style={styles.row}><Text style={styles.strong}>Line total</Text><Text style={styles.strong}>{formatMoney(itemLineTotal(item))}</Text></View>
        <Button mode="text" textColor={colors.danger} onPress={() => removeItem(index)}>Remove</Button>
      </View>)}
      <View style={styles.actions}><Button mode="outlined" icon="plus" onPress={() => addItem('labour')}>Labour</Button><Button mode="outlined" icon="plus" onPress={() => addItem('materials')}>Materials</Button><Button mode="outlined" icon="plus" onPress={() => addItem('other')}>Site / overhead</Button></View>
      <Text variant="labelLarge" style={styles.label}>VAT</Text>
      <SegmentedButtons value={vatRate} onValueChange={setVatRate} buttons={[{ value: '0', label: 'No VAT' }, { value: '20', label: 'Add 20%' }]} />
      {external ? <View style={styles.switchRow}><View style={styles.flex}><Text style={styles.strong}>Show item breakdown to customer</Text><Text style={styles.muted}>Turn this off if you want the customer to see only the total price.</Text></View><Switch value={showBreakdown} onValueChange={setShowBreakdown} /></View> : null}
      <View style={styles.totalBox}>
        {!external ? <><View style={styles.row}><Text>Materials</Text><Text>{formatMoney(materialsCost)}</Text></View><View style={styles.row}><Text>Labour</Text><Text>{formatMoney(labourOnlyCost)}</Text></View>{overheadCost > 0 ? <View style={styles.row}><Text>Site / overhead</Text><Text>{formatMoney(overheadCost)}</Text></View> : null}</> : null}
        <View style={styles.row}><Text>Subtotal</Text><Text>{formatMoney(subtotal)}</Text></View>{vatAmount ? <View style={styles.row}><Text>VAT</Text><Text>{formatMoney(vatAmount)}</Text></View> : null}<View style={styles.row}><Text variant="titleLarge" style={styles.title}>Work price</Text><Text variant="headlineSmall" style={styles.total}>{formatMoney(totalAmount)}</Text></View>
      </View>
      {!external ? <AppCard elevated={false} style={styles.feeCard}><Text variant="titleSmall" style={styles.title}>How BuildPay cost responsibility works</Text><Text style={styles.muted}>BuildPair's platform fee applies to labour/service only, never the quoted materials amount or VAT. If you choose to add BuildPay protection to your quote, you carry the BuildPay cost from controlled service payouts. If the homeowner requests BuildPay later, the homeowner pays the separately disclosed BuildPay service fee.</Text></AppCard> : null}
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
      <Text variant="titleLarge" style={styles.title}>Payment stages</Text>
      <Text style={styles.muted}>{external ? 'Choose how you want this customer to pay.' : materialsCost > 0 ? 'Materials are split out automatically. A deposit or progress stages makes BuildPay part of your quote so both sides know the protected payment terms before acceptance.' : 'Choose one balance, a protected deposit + balance, or protected progress stages.'}</Text>
      <SegmentedButtons value={planMode} onValueChange={choosePlanMode} buttons={external ? [{ value: 'single', label: 'Full at end' }, { value: 'deposit', label: 'Deposit + balance' }, { value: 'staged', label: 'Stage payments' }] : buildPayPlanButtons} />
      {planMode !== 'single' ? <View style={styles.depositBlock}>
        <Text variant="labelLarge" style={styles.label}>{external ? 'Deposit' : 'Protected deposit'}</Text>
        {!external ? <Text style={styles.muted}>{materialsCost > 0 ? 'This deposit is part of the work balance, separate from the materials amount. It stays protected until its agreed release point is reached.' : 'This deposit stays protected in BuildPay until its agreed release point is reached and the homeowner approves it.'}</Text> : null}
        <SegmentedButtons value={depositUnit} onValueChange={(value) => setDepositUnit(value as DepositUnit)} buttons={[{ value: 'amount', label: '£ amount' }, { value: 'percent', label: '%' }]} />
        <TextInput label={depositUnit === 'percent' ? 'Deposit (%)' : 'Deposit (£)'} value={depositValue} onChangeText={setDepositValue} keyboardType="decimal-pad" mode="outlined" />
        {depositAmount > 0 ? <Text style={styles.muted}>Deposit: {formatMoney(depositAmount)}</Text> : null}
      </View> : null}
      {planMode === 'staged' ? <>
        <Text variant="titleMedium" style={styles.title}>Progress stages</Text>
        <Text style={styles.muted}>Use plain site language. The homeowner should know exactly what has to be finished before each payment can be released.</Text>
        {stages.filter((stage) => external || stage.kind !== 'materials').map((stage) => {
          const sourceIndex = stages.findIndex((candidate) => candidate.key === stage.key);
          return <View key={stage.key} style={styles.itemCard}>
            <TextInput label="Stage name" value={stage.title} onChangeText={(value) => updateStage(sourceIndex, { title: value })} mode="outlined" />
            <TextInput label="Amount (£)" value={stage.amount} onChangeText={(value) => updateStage(sourceIndex, { amount: value })} keyboardType="decimal-pad" mode="outlined" />
            <TextInput label={stage.kind === 'materials' ? 'When is this due?' : 'What must be finished before release?'} value={stage.trigger} onChangeText={(value) => updateStage(sourceIndex, { trigger: value })} mode="outlined" multiline />
            <Button mode="text" textColor={colors.danger} onPress={() => removeStage(sourceIndex)}>Remove stage</Button>
          </View>;
        })}
        <View style={styles.actions}>{external ? <Button mode="outlined" icon="plus" onPress={() => addStage('materials', 'Materials payment', 'Due before materials are ordered.')}>Materials</Button> : null}<Button mode="outlined" icon="plus" onPress={() => addStage('stage', 'Stage 1', 'Released when the agreed Stage 1 work is complete.')}>Stage 1</Button><Button mode="outlined" icon="plus" onPress={() => addStage('stage', 'Stage 2', 'Released when the agreed Stage 2 work is complete.')}>Stage 2</Button><Button mode="outlined" icon="plus" onPress={() => addStage('stage', `Stage ${stages.length + 1}`, '')}>Custom</Button></View>
      </> : null}
      {totalAmount > 0 && paymentSchedule.length ? <View style={styles.timelineBox}>
        {!external ? <MilestoneTimeline items={paymentSchedule.map((stage) => ({ id: stage.key, title: stage.title, amount: stage.amount, kind: stage.kind, trigger: stage.trigger }))} compact /> : paymentSchedule.map((stage) => <View key={stage.key} style={styles.stageSummary}><View style={styles.row}><Text style={styles.strong}>{stage.title}</Text><Text style={styles.strong}>{formatMoney(stage.amount)}</Text></View>{stage.trigger ? <Text style={styles.muted}>{stage.trigger}</Text> : null}</View>)}
      </View> : null}
      {!external ? <AppCard elevated={false} style={styles.feeCard}>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text variant="titleMedium" style={styles.title}>{planMode === 'single' ? 'Include BuildPay in this quote' : 'BuildPay included with protected stages'}</Text>
            <Text style={styles.muted}>{planMode === 'single' ? 'Optional. Turn this on if you want the single work balance protected through BuildPay.' : 'Because you are proposing the protected deposit/stages, the BuildPay cost is yours rather than an extra charge to the homeowner.'}</Text>
          </View>
          <Switch value={buildPayRequested} disabled={planMode !== 'single'} onValueChange={setRequestBuildPay} />
        </View>
        {buildPayRequested ? <>
          {!payoutReady ? <HelperText type="error">Finish Stripe payout setup before sending a quote that includes BuildPay.</HelperText> : null}
          <Chip icon="account-arrow-left-outline">Tradesperson-requested · you carry the BuildPay cost</Chip>
          <View style={styles.totalBox}>
            <View style={styles.row}><Text>Your quoted work price</Text><Text>{formatMoney(totalAmount)}</Text></View>
            <View style={styles.row}><Text>BuildPay fee added to homeowner</Text><Text>{formatMoney(0)}</Text></View>
            <View style={styles.row}><Text variant="titleMedium" style={styles.title}>Homeowner sees</Text><Text variant="titleMedium" style={styles.total}>{formatMoney(totalAmount)}</Text></View>
          </View>
          <Text style={styles.muted}>Because you requested BuildPay, the homeowner's contract total stays at your quoted work price. BuildPair's agreed labour/service fee and actual payment-processing costs are recovered from controlled service payouts.</Text>
          <HelperText type="info">If the homeowner requests BuildPay instead, BuildPair shows their separate service fee and all-in total before they confirm it.</HelperText>
        </> : <Text style={styles.muted}>No BuildPay fee is attached to this quote. If the homeowner later requests BuildPay protection, they will be responsible for the disclosed BuildPay service fee.</Text>}
      </AppCard> : null}
      {external ? <>
        <Text variant="labelLarge" style={styles.label}>Payment method</Text>
        <SegmentedButtons value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'external' | 'buildpair')} buttons={[{ value: 'external', label: 'Paid directly' }, { value: 'buildpair', label: 'BuildPay', disabled: !payoutReady || !plusBusinessTools }]} />
        {!plusBusinessTools ? <HelperText type="info">Core can quote and invoice outside customers. Converting an accepted outside quote into a managed BuildPair project with staged BuildPay is included with Plus and Pro.</HelperText> : null}
        {paymentMethod === 'buildpair' ? <HelperText type="info">You are asking to use BuildPay for this outside customer, so you carry the BuildPay cost. After the customer accepts and claims the project, the agreed stages move into the normal BuildPay project flow.</HelperText> : null}
        {!payoutReady ? <HelperText type="info">BuildPay is unavailable until Stripe has confirmed that payouts are enabled. You can still create, send and track quotes normally.</HelperText> : null}
      </> : null}
    </AppCard>

    {external ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Choices & optional extras</Text>
      <Text style={styles.muted}>Keep upgrades and alternatives separate from the core quote. Their price change is shown clearly but is not included in the main total until you issue a revised quote that includes it.</Text>
      {quoteOptions.map((option, index) => <View key={option.key} style={styles.itemCard}>
        <SegmentedButtons value={option.kind} onValueChange={(value) => updateQuoteOption(index, { kind: value as DraftQuoteOption['kind'] })} buttons={[{ value: 'optional', label: 'Optional extra' }, { value: 'alternative', label: 'Alternative' }]} />
        <TextInput label="Option title" value={option.title} onChangeText={(value) => updateQuoteOption(index, { title: value })} mode="outlined" placeholder="e.g. Upgrade to porcelain tiles" />
        <TextInput label="What changes? (optional)" value={option.description} onChangeText={(value) => updateQuoteOption(index, { description: value })} mode="outlined" multiline numberOfLines={2} />
        <TextInput label="Price change (£)" value={option.priceDelta} onChangeText={(value) => updateQuoteOption(index, { priceDelta: value })} mode="outlined" keyboardType="decimal-pad" placeholder="e.g. 350.00 or -100.00" />
        <Button mode="text" textColor={colors.danger} onPress={() => removeQuoteOption(index)}>Remove option</Button>
      </View>)}
      <View style={styles.actions}><Button mode="outlined" icon="plus" onPress={() => addQuoteOption('optional')}>Add optional extra</Button><Button mode="outlined" icon="swap-horizontal" onPress={() => addQuoteOption('alternative')}>Add alternative</Button></View>
    </AppCard> : null}

    <AppCard>
      <Button mode="text" icon={showMore ? 'chevron-up' : 'chevron-down'} onPress={() => setShowMore((value) => !value)}>{showMore ? 'Hide extra quote settings' : 'More quote settings'}</Button>
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
  templateBlock: { gap: 7 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  muted: { color: colors.muted, lineHeight: 21 },
  strong: { color: colors.text, fontWeight: '800' },
  label: { color: colors.charcoal, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 3 },
  flexField: { flex: 1, minWidth: 0, flexBasis: 170, flexShrink: 1, maxWidth: '100%' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  itemCard: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceSoft, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  totalBox: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceSoft, borderRadius: 14 },
  timelineBox: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceSoft, borderRadius: 14 },
  feeCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  protectionCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  total: { color: colors.primary, fontWeight: '900' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  depositBlock: { gap: spacing.sm },
  stageSummary: { gap: 3, paddingVertical: spacing.xs },
  moreOptions: { gap: spacing.md },
  dropdownWrap: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 5 },
  dropdownButton: { minHeight: 48, justifyContent: 'space-between' },
  dropdownMenu: { maxHeight: 320 },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
});
