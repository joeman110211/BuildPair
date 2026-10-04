import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AIJobSpecModal } from '@/components/AIJobSpecModal';
import { AppCard } from '@/components/AppCard';
import { FormSelect } from '@/components/FormSelect';
import { FormStepHeader } from '@/components/FormStepHeader';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Screen } from '@/components/Screen';
import { TradeMatchAssistant } from '@/components/TradeMatchAssistant';
import { BUDGET_OPTIONS, PROPERTY_TYPES, TRADE_CATEGORIES, URGENCY_OPTIONS } from '@/constants/options';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft-storage';
import { jobReadiness } from '@/lib/job-readiness';
import type { Job } from '@/types';

const STEP_TITLES = ['Trade & property', 'Describe job', 'Photos', 'Location & budget', 'Review'] as const;
const STEP_HELP = [
  'Choose the trade and property type.',
  'Explain what needs doing in plain English.',
  'Add photos if they help show the job.',
  'Add the area, timing and budget.',
  'Check everything before you send it.',
] as const;
type Category = (typeof TRADE_CATEGORIES)[number];
type PropertyType = (typeof PROPERTY_TYPES)[number];
type Urgency = (typeof URGENCY_OPTIONS)[number];
type Budget = (typeof BUDGET_OPTIONS)[number];

type SavedProperty = {
  id: string;
  nickname: string;
  propertyType: string;
  postcode: string;
  addressLine1: string;
  addressLine2: string;
  townCity: string;
  accessNotes: string;
};

type JobDraft = {
  step: number;
  category?: string;
  propertyType?: string;
  postcode: string;
  urgency?: string;
  budgetRange?: string;
  title: string;
  description: string;
  photos: string[];
  aiGeneratedSpec: string | null;
  mode: string;
  isEmergency: boolean;
};

export default function NewJobScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const { traderId, traderName, tradeCategory, repeatJobId, propertyId } = useLocalSearchParams<{ traderId?: string; traderName?: string; tradeCategory?: string; repeatJobId?: string; propertyId?: string }>();
  const directRequest = Boolean(traderId);
  const initialCategory = TRADE_CATEGORIES.find((item) => item === tradeCategory);
  const draftKey = repeatJobId ? `customer-job-repeat-${repeatJobId}-${traderId ?? 'open'}` : traderId ? `customer-job-direct-${traderId}` : 'customer-job-open-v1';
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category | undefined>(initialCategory);
  const [propertyType, setPropertyType] = useState<PropertyType>();
  const [postcode, setPostcode] = useState('');
  const [urgency, setUrgency] = useState<Urgency>();
  const [budgetRange, setBudgetRange] = useState<Budget>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [aiGeneratedSpec, setAiGeneratedSpec] = useState<string | null>(null);
  const [mode, setMode] = useState('manual');
  const [showAi, setShowAi] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<SavedProperty>();

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const draft = await loadDraft<JobDraft>(draftKey);
        if (!active) return;
        if (draft) {
          setStep(Math.max(0, Math.min(4, Number(draft.step) || 0)));
          const restoredCategory = TRADE_CATEGORIES.find((item) => item === draft.category);
          setCategory(restoredCategory ?? initialCategory);
          setPropertyType(PROPERTY_TYPES.find((item) => item === draft.propertyType));
          setPostcode(draft.postcode ?? '');
          setUrgency(URGENCY_OPTIONS.find((item) => item === draft.urgency));
          setBudgetRange(BUDGET_OPTIONS.find((item) => item === draft.budgetRange));
          setTitle(draft.title ?? '');
          setDescription(draft.description ?? '');
          setPhotos(Array.isArray(draft.photos) ? draft.photos.slice(0, 8) : []);
          setAiGeneratedSpec(typeof draft.aiGeneratedSpec === 'string' ? draft.aiGeneratedSpec : null);
          setMode(draft.mode === 'ai' ? 'ai' : 'manual');
          setIsEmergency(!directRequest && Boolean(draft.isEmergency));
          setDraftStatus('Draft restored ✓');
          return;
        }

        if (propertyId) {
          const property = await apiFetch<SavedProperty>(`/api/customer-properties?id=${encodeURIComponent(propertyId)}`, {}, () => getTokenRef.current());
          if (!active) return;
          setSelectedProperty(property);
          setPropertyType(PROPERTY_TYPES.find((item) => item === property.propertyType));
          setPostcode(property.postcode);
          setDraftStatus(`Using saved property: ${property.nickname} ✓`);
        }

        if (repeatJobId) {
          const previous = await apiFetch<{ job: Job }>(`/api/jobs/${encodeURIComponent(repeatJobId)}`, {}, () => getTokenRef.current());
          if (!active) return;
          const old = previous.job;
          setCategory(TRADE_CATEGORIES.find((item) => item === old.category) ?? initialCategory);
          setPropertyType(PROPERTY_TYPES.find((item) => item === old.propertyType));
          setPostcode(old.postcode ?? '');
          setUrgency(URGENCY_OPTIONS.find((item) => item === old.urgency));
          setBudgetRange(BUDGET_OPTIONS.find((item) => item === old.budgetRange));
          setTitle(old.title);
          setDescription(old.description);
          setPhotos([]);
          setAiGeneratedSpec(null);
          setMode('manual');
          setIsEmergency(false);
          setDraftStatus('Previous job copied in ✓ Check what has changed before sending.');
        }
      } catch {
        if (active && repeatJobId) setDraftStatus('The previous job could not be copied. Start a fresh request below.');
      } finally {
        if (active) setDraftReady(true);
      }
    }
    void restore();
    return () => { active = false; };
  }, [directRequest, draftKey, initialCategory, propertyId, repeatJobId]);

  const draft = useMemo<JobDraft>(() => ({
    step,
    category,
    propertyType,
    postcode,
    urgency,
    budgetRange,
    title,
    description,
    photos,
    aiGeneratedSpec,
    mode,
    isEmergency: directRequest ? false : isEmergency,
  }), [aiGeneratedSpec, budgetRange, category, description, directRequest, isEmergency, mode, photos, postcode, propertyType, step, title, urgency]);

  useEffect(() => {
    if (!draftReady) return;
    const timer = setTimeout(() => {
      void saveDraft(draftKey, draft).then(() => setDraftStatus('Draft saved automatically ✓')).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, draftKey, draftReady]);

  async function discardDraft() {
    await clearDraft(draftKey);
    setStep(0);
    setCategory(initialCategory);
    setPropertyType(undefined);
    setPostcode('');
    setUrgency(undefined);
    setBudgetRange(undefined);
    setTitle('');
    setDescription('');
    setPhotos([]);
    setAiGeneratedSpec(null);
    setMode('manual');
    setIsEmergency(false);
    setDraftStatus('Draft cleared');
  }

  async function submit() {
    if (!category) return;
    if (!directRequest && (!propertyType || !urgency || !budgetRange || title.trim().length < 5)) return;
    const finalPropertyType = propertyType ?? 'Other';
    const finalUrgency = urgency ?? 'Flexible';
    const finalBudget = budgetRange ?? 'Not sure / discuss';
    const finalTitle = title.trim() || `${category} quote request`;
    try {
      setBusy(true); setError('');
      const created = await apiFetch<{ id: string; conversationId: string | null }>('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          targetTraderId: traderId ?? null,
          propertyId: selectedProperty?.id ?? propertyId ?? undefined,
          title: finalTitle,
          category,
          propertyType: finalPropertyType,
          postcode,
          urgency: finalUrgency,
          budgetRange: finalBudget,
          description,
          aiGeneratedSpec,
          photos,
          isEmergency: directRequest ? false : isEmergency,
        }),
      }, getToken);
      await clearDraft(draftKey);
      if (created.conversationId) router.replace(`/customer/messages/${created.conversationId}` as Href);
      else router.replace('/customer/jobs');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const readyForAi = Boolean(category && (propertyType || directRequest));
  const stepValid = useMemo(() => directRequest ? [
    Boolean(category),
    description.trim().length >= 30,
    true,
    postcode.trim().length >= 5,
    Boolean(category && postcode.trim().length >= 5 && description.trim().length >= 30),
  ][step] : [
    Boolean(category && propertyType),
    title.trim().length >= 5 && description.trim().length >= 30,
    true,
    Boolean(postcode.trim().length >= 5 && urgency && budgetRange),
    Boolean(category && propertyType && postcode.trim().length >= 5 && urgency && budgetRange && title.trim().length >= 5 && description.trim().length >= 30),
  ][step], [budgetRange, category, description, directRequest, postcode, propertyType, step, title, urgency]);

  const aiPropertyType = propertyType ?? 'Other';
  const readiness = jobReadiness({ directRequest, category, propertyType, postcode, urgency, budgetRange, title, description, photos });
  const submitLabel = traderName ? 'Send request' : isEmergency ? 'Post urgent job' : 'Post job';
  const footer = <View style={styles.actions}>
    {step > 0 ? <Button mode="outlined" contentStyle={styles.button} onPress={() => setStep((value) => value - 1)}>Back</Button> : <Button mode="text" disabled={busy} onPress={() => void discardDraft()}>Clear draft</Button>}
    {step < 4 ? <Button mode="contained" contentStyle={styles.button} disabled={!stepValid} onPress={() => setStep((value) => value + 1)}>Next</Button> : <Button mode="contained" icon="send" contentStyle={styles.button} loading={busy} disabled={!stepValid || busy} onPress={submit}>{submitLabel}</Button>}
  </View>;

  return <Screen title={STEP_TITLES[step]} subtitle={traderName ? `Request a quote from ${traderName}` : STEP_HELP[step]} footer={footer} stickyFooter>
    <FormStepHeader current={step + 1} total={5} hint={STEP_HELP[step]} />
    {draftStatus ? <HelperText type="info" visible>{draftStatus}</HelperText> : null}

    {selectedProperty ? <AppCard style={styles.directInfo}>
      <Text variant="titleMedium" style={styles.title}>Saved property selected · {selectedProperty.nickname}</Text>
      <Text style={styles.muted}>{selectedProperty.propertyType} · {selectedProperty.postcode}. The full address stays private and is copied into the private job record, not the public marketplace listing.</Text>
    </AppCard> : null}

    {repeatJobId ? <AppCard style={styles.directInfo}>
      <Text variant="titleMedium" style={styles.title}>Previous job copied in</Text>
      <Text style={styles.muted}>BuildPair has reused the useful details, but not the old photos. Check the scope, condition, timing and budget before sending a fresh request.</Text>
    </AppCard> : directRequest ? <AppCard style={styles.directInfo}>
      <Text variant="titleMedium" style={styles.title}>Keep it simple</Text>
      <Text style={styles.muted}>Only the job description and area are required. Photos, property type, timing, budget and a custom title can be agreed in chat.</Text>
    </AppCard> : null}

    {step === 0 ? <>
      {!directRequest ? <TradeMatchAssistant onChoose={(trade) => { const matched = TRADE_CATEGORIES.find((item) => item === trade); if (matched) setCategory(matched); }} /> : null}
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>What work do you need?</Text>
        <FormSelect label="Trade category" value={category} options={TRADE_CATEGORIES} onChange={setCategory} />
        <FormSelect label={directRequest ? 'Property type (optional)' : 'Property type'} value={propertyType} options={PROPERTY_TYPES} onChange={setPropertyType} placeholder={directRequest ? 'Not specified' : undefined} />
        <Text style={styles.muted}>{directRequest ? 'The trade is preselected from the profile where possible. Property type can be left blank.' : 'Choose the closest category, or use the BuildPair matcher above if you are unsure. You can explain the exact work on the next step.'}</Text>
      </AppCard>
    </> : null}

    {step === 1 ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Describe the work clearly</Text>
      <TextInput label={directRequest ? 'Short job title (optional)' : 'Short job title'} accessibilityLabel={directRequest ? 'Short job title (optional)' : 'Short job title'} value={title} onChangeText={setTitle} mode="outlined" maxLength={120} placeholder={directRequest ? `e.g. ${category ?? 'Job'} quote request` : 'e.g. Retile bathroom floor'} />
      <SegmentedButtons value={mode} onValueChange={setMode} buttons={[{ value: 'manual', label: 'Write it myself' }, { value: 'ai', label: 'BuildPair AI helper' }]} />
      {mode === 'ai' ? <Button mode="outlined" icon="creation" contentStyle={styles.button} disabled={!readyForAi} onPress={() => setShowAi(true)}>{aiGeneratedSpec ? 'Improve with AI again' : 'Help me write the job'}</Button> : null}
      {mode === 'ai' && !readyForAi ? <HelperText type="info">Choose a trade category first.</HelperText> : null}
      <TextInput label="Detailed job description" accessibilityLabel="Detailed job description" value={description} onChangeText={(value) => { setDescription(value); if (value !== aiGeneratedSpec) setAiGeneratedSpec(null); }} mode="outlined" multiline numberOfLines={10} maxLength={5000} />
      <HelperText type={description.length > 0 && description.trim().length < 30 ? 'error' : 'info'}>{description.length}/5000 characters · minimum 30 characters {aiGeneratedSpec ? '· AI draft reviewed by you ✓' : ''}</HelperText>
    </AppCard> : null}

    {step === 2 ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Add useful photos</Text>
      <Text style={styles.muted}>Photos are optional, but they help show access, condition, size and finish before a tradesperson replies.</Text>
      <PhotoUploader kind="job" photos={photos} onChange={setPhotos} max={8} />
      <Chip icon="information-outline">Up to 8 photos · optional</Chip>
    </AppCard> : null}

    {step === 3 ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Location, timing and budget</Text>
      <TextInput label="Job postcode / area" accessibilityLabel="Job postcode / area" value={postcode} onChangeText={setPostcode} mode="outlined" autoCapitalize="characters" placeholder="e.g. SW1A 1AA" />
      <HelperText type="info">Your area lets BuildPair match the job to tradespeople who cover it.</HelperText>
      <FormSelect label={directRequest ? 'Budget bracket (optional)' : 'Budget bracket'} value={budgetRange} options={BUDGET_OPTIONS} onChange={setBudgetRange} placeholder={directRequest ? 'Not sure / discuss' : undefined} />
      <FormSelect label={directRequest ? 'Timing / urgency (optional)' : 'Urgency'} value={urgency} options={URGENCY_OPTIONS} onChange={setUrgency} placeholder={directRequest ? 'Flexible / discuss' : undefined} />
      {!directRequest ? <View style={[styles.emergencyRow, isEmergency && styles.emergencyActive]}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Emergency broadcast</Text><Text style={styles.muted}>For genuinely urgent work, alert matching nearby tradespeople who have marked themselves available.</Text></View><Switch value={isEmergency} onValueChange={setIsEmergency} /></View> : null}
      {isEmergency ? <HelperText type="info">Emergency broadcast improves visibility but does not guarantee attendance or replace emergency services where there is immediate danger.</HelperText> : null}
    </AppCard> : null}

    {step === 4 ? <>
      <AppCard>
        <View style={styles.reviewHeader}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Job readiness · {readiness.percent}%</Text><Text style={styles.muted}>The required details are ready. The extra signals below can help tradespeople understand and price the work before replying.</Text></View><Chip icon={readiness.percent === 100 ? 'check-circle-outline' : 'progress-check'}>{readiness.complete}/{readiness.total}</Chip></View>
        <View style={styles.reviewMeta}>{readiness.items.map((item) => <Chip key={item.key} compact icon={item.complete ? 'check' : 'circle-outline'}>{item.label}</Chip>)}</View>
      </AppCard>
      <AppCard>
      <View style={styles.reviewHeader}><View style={styles.flex}><Text variant="headlineSmall" style={styles.title}>{title.trim() || `${category ?? 'Trade'} quote request`}</Text><Text style={styles.muted}>{category}{propertyType ? ` · ${propertyType}` : ''}</Text></View>{traderName ? <Chip icon="account-arrow-right">Direct request</Chip> : isEmergency ? <Chip icon="alert">Emergency broadcast</Chip> : <Chip icon="account-group-outline">Marketplace job</Chip>}</View>
      <View style={styles.reviewMeta}><Chip icon="map-marker-outline">{postcode}</Chip>{budgetRange ? <Chip icon="cash">{budgetRange}</Chip> : null}{urgency ? <Chip icon="clock-outline">{urgency}</Chip> : null}</View>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.muted}>{photos.length} photo{photos.length === 1 ? '' : 's'} attached{directRequest && !budgetRange ? ' · budget to discuss' : ''}{directRequest && !urgency ? ' · timing to discuss' : ''}{aiGeneratedSpec ? ' · description assisted by BuildPair AI' : ''}</Text>
    </AppCard></> : null}

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    {category ? <AIJobSpecModal visible={showAi} category={category} propertyType={aiPropertyType} onDismiss={() => setShowAi(false)} onGenerated={(spec) => { setDescription(spec); setAiGeneratedSpec(spec); }} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  progressBlock: { width: '100%', maxWidth: 820, alignSelf: 'center', gap: spacing.sm },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  progress: { height: 8, borderRadius: radii.sm, backgroundColor: colors.surfaceStrong },
  step: { color: colors.primary, fontWeight: '900' },
  title: { fontWeight: '900', color: colors.charcoal },
  muted: { color: colors.muted, lineHeight: 22 },
  directInfo: { backgroundColor: colors.primarySoft, borderColor: '#F2D7C3' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  button: { minHeight: controlHeights.standard, paddingHorizontal: spacing.xs },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap', alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%' },
  reviewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  description: { color: colors.text, lineHeight: 23 },
  emergencyRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emergencyActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
});
