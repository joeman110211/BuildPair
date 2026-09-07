import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, ProgressBar, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import { AIJobSpecModal } from '@/components/AIJobSpecModal';
import { AppCard } from '@/components/AppCard';
import { FormSelect } from '@/components/FormSelect';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Screen } from '@/components/Screen';
import { TradeMatchAssistant } from '@/components/TradeMatchAssistant';
import { BUDGET_OPTIONS, PROPERTY_TYPES, TRADE_CATEGORIES, URGENCY_OPTIONS } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

const STEP_TITLES = ['What do you need?', 'Describe the job', 'Add photos', 'Location & budget', 'Review & post'] as const;

export default function NewJobScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { traderId, traderName, tradeCategory } = useLocalSearchParams<{ traderId?: string; traderName?: string; tradeCategory?: string }>();
  const directRequest = Boolean(traderId);
  const initialCategory = TRADE_CATEGORIES.find((item) => item === tradeCategory);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<(typeof TRADE_CATEGORIES)[number] | undefined>(initialCategory);
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number]>();
  const [postcode, setPostcode] = useState('');
  const [urgency, setUrgency] = useState<(typeof URGENCY_OPTIONS)[number]>();
  const [budgetRange, setBudgetRange] = useState<(typeof BUDGET_OPTIONS)[number]>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [aiGeneratedSpec, setAiGeneratedSpec] = useState<string | null>(null);
  const [mode, setMode] = useState('manual');
  const [showAi, setShowAi] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
  const footer = <View style={styles.actions}>
    {step > 0 ? <Button onPress={() => setStep((value) => value - 1)}>Back</Button> : <View />}
    {step < 4 ? <Button mode="contained" contentStyle={styles.button} disabled={!stepValid} onPress={() => setStep((value) => value + 1)}>Continue</Button> : <Button mode="contained" icon="send" contentStyle={styles.button} loading={busy} disabled={!stepValid || busy} onPress={submit}>{traderName ? 'Send Request & Open Chat' : isEmergency ? 'Broadcast Urgent Job' : 'Post Job'}</Button>}
  </View>;

  return <Screen title={STEP_TITLES[step]} subtitle={traderName ? `Direct quote request for ${traderName}` : 'A few clear details help tradespeople give you useful quotes instead of guessing.'} footer={footer}>
    <View style={styles.progressBlock}><View style={styles.progressHeader}><Text style={styles.step}>Step {step + 1} of 5</Text><Text style={styles.muted}>{STEP_TITLES[step]}</Text></View><ProgressBar progress={(step + 1) / 5} color={colors.primary} style={styles.progress} /></View>

    {directRequest ? <AppCard style={styles.directInfo}>
      <Text variant="titleMedium" style={styles.title}>Keep it simple</Text>
      <Text style={styles.muted}>For a direct request, only your job description and area are mandatory. Photos, property type, timing, budget and a custom title are optional and can be discussed in the BuildPair conversation.</Text>
    </AppCard> : null}

    {step === 0 ? <>
      {!directRequest ? <TradeMatchAssistant onChoose={(trade) => { const matched = TRADE_CATEGORIES.find((item) => item === trade); if (matched) setCategory(matched); }} /> : null}
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>What work do you need?</Text>
        <FormSelect label={directRequest ? 'Trade category' : 'Trade category'} value={category} options={TRADE_CATEGORIES} onChange={setCategory} />
        <FormSelect label={directRequest ? 'Property type (optional)' : 'Property type'} value={propertyType} options={PROPERTY_TYPES} onChange={setPropertyType} placeholder={directRequest ? 'Not specified' : undefined} />
        <Text style={styles.muted}>{directRequest ? 'The trade is preselected from the profile where possible. Property type can be left blank.' : 'Choose the closest category, or use the BuildPair matcher above when you are not sure. You can explain the exact work on the next step.'}</Text>
      </AppCard>
    </> : null}

    {step === 1 ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Tell the tradesperson what needs doing</Text>
      <TextInput label={directRequest ? 'Short job title (optional)' : 'Short job title'} accessibilityLabel={directRequest ? 'Short job title (optional)' : 'Short job title'} value={title} onChangeText={setTitle} mode="outlined" maxLength={120} placeholder={directRequest ? `e.g. ${category ?? 'Job'} quote request` : 'e.g. Retile bathroom floor'} />
      <SegmentedButtons value={mode} onValueChange={setMode} buttons={[{ value: 'manual', label: 'Write it myself' }, { value: 'ai', label: 'BuildPair AI helper' }]} />
      {mode === 'ai' ? <Button mode="outlined" icon="creation" disabled={!readyForAi} onPress={() => setShowAi(true)}>{aiGeneratedSpec ? 'Improve with AI again' : 'Help me write the job'}</Button> : null}
      {mode === 'ai' && !readyForAi ? <HelperText type="info">Choose a trade category first.</HelperText> : null}
      <TextInput label="Detailed job description" accessibilityLabel="Detailed job description" value={description} onChangeText={(value) => { setDescription(value); if (value !== aiGeneratedSpec) setAiGeneratedSpec(null); }} mode="outlined" multiline numberOfLines={10} maxLength={5000} />
      <HelperText type={description.length > 0 && description.trim().length < 30 ? 'error' : 'info'}>{description.length}/5000 characters · minimum 30 and required {aiGeneratedSpec ? '· AI draft checked by you ✓' : ''}</HelperText>
    </AppCard> : null}

    {step === 2 ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Add useful photos</Text>
      <Text style={styles.muted}>Photos are optional, but they help the tradesperson understand access, condition, size and finish before replying.</Text>
      <PhotoUploader kind="job" photos={photos} onChange={setPhotos} max={8} />
      <Chip icon="information-outline">Up to 8 photos · optional</Chip>
    </AppCard> : null}

    {step === 3 ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Where, when and roughly how much?</Text>
      <TextInput label="Job postcode / area" accessibilityLabel="Job postcode / area" value={postcode} onChangeText={setPostcode} mode="outlined" autoCapitalize="characters" placeholder="e.g. SW1A 1AA" />
      <HelperText type="info">Area is required so BuildPair can confirm the job is within the tradesperson’s service radius.</HelperText>
      <FormSelect label={directRequest ? 'Budget bracket (optional)' : 'Budget bracket'} value={budgetRange} options={BUDGET_OPTIONS} onChange={setBudgetRange} placeholder={directRequest ? 'Not sure / discuss' : undefined} />
      <FormSelect label={directRequest ? 'Timing / urgency (optional)' : 'Urgency'} value={urgency} options={URGENCY_OPTIONS} onChange={setUrgency} placeholder={directRequest ? 'Flexible / discuss' : undefined} />
      {!directRequest ? <View style={[styles.emergencyRow, isEmergency && styles.emergencyActive]}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Emergency broadcast</Text><Text style={styles.muted}>For genuinely urgent jobs, alert matching nearby tradespeople who have marked themselves available now.</Text></View><Switch value={isEmergency} onValueChange={setIsEmergency} /></View> : null}
      {isEmergency ? <HelperText type="info">Emergency broadcast improves visibility but does not guarantee attendance or replace emergency services where life or property is at immediate risk.</HelperText> : null}
    </AppCard> : null}

    {step === 4 ? <AppCard>
      <View style={styles.reviewHeader}><View style={styles.flex}><Text variant="headlineSmall" style={styles.title}>{title.trim() || `${category ?? 'Trade'} quote request`}</Text><Text style={styles.muted}>{category}{propertyType ? ` · ${propertyType}` : ''}</Text></View>{traderName ? <Chip icon="account-arrow-right">Direct request</Chip> : isEmergency ? <Chip icon="alert">Emergency broadcast</Chip> : <Chip icon="account-group-outline">Marketplace job</Chip>}</View>
      <View style={styles.reviewMeta}><Chip icon="map-marker-outline">{postcode}</Chip>{budgetRange ? <Chip icon="cash">{budgetRange}</Chip> : null}{urgency ? <Chip icon="clock-outline">{urgency}</Chip> : null}</View>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.muted}>{photos.length} photo{photos.length === 1 ? '' : 's'} attached{directRequest && !budgetRange ? ' · budget to discuss' : ''}{directRequest && !urgency ? ' · timing to discuss' : ''}{aiGeneratedSpec ? ' · description assisted by BuildPair AI' : ''}</Text>
    </AppCard> : null}

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    {category ? <AIJobSpecModal visible={showAi} category={category} propertyType={aiPropertyType} onDismiss={() => setShowAi(false)} onGenerated={(spec) => { setDescription(spec); setAiGeneratedSpec(spec); }} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  progressBlock: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  progress: { height: 8, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  step: { color: colors.primary, fontWeight: '900' },
  title: { fontWeight: '900', color: colors.charcoal },
  muted: { color: colors.muted, lineHeight: 22 },
  directInfo: { backgroundColor: '#FFF8F3', borderColor: colors.primary },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  button: { minHeight: 50 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 220 },
  reviewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  description: { color: colors.text, lineHeight: 23 },
  emergencyRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emergencyActive: { backgroundColor: '#FFF4EF', borderColor: colors.primary },
});
