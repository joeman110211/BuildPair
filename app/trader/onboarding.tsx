import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, ProgressBar, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { FormSelect } from '@/components/FormSelect';
import { PhotoUploader } from '@/components/PhotoUploader';
import { Screen } from '@/components/Screen';
import { TradeCategorySelector } from '@/components/TradeCategorySelector';
import { RADIUS_OPTIONS, SUB_SKILLS, TRADE_CATEGORIES, TRADER_BIO_MIN_LENGTH, type TradeCategory } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch, ApiError, errorMessage } from '@/lib/api';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft-storage';
import type { BeforeAfterProject, TraderProfile } from '@/types';

const STEP_TITLES = ['Business Details', 'Build Your Profile', 'Portfolio', 'Review & Publish'] as const;
const DRAFT_KEY = 'trader-onboarding-v2';

const LEGACY_CATEGORY_MAP: Record<string, TradeCategory> = {
  'Bathroom Fitting': 'Bathrooms',
  'Kitchen Fitting': 'Kitchens',
  'EV Chargers': 'Renewables & EV',
  'Solar & Renewables': 'Renewables & EV',
  'General Building': 'Building & Extensions',
  Extensions: 'Building & Extensions',
  'Loft Conversions': 'Conversions',
  'Loft Boarding & Storage': 'Conversions',
  'Garage Conversions': 'Conversions',
  'Basement & Cellar Conversions': 'Conversions',
  Bricklaying: 'Brickwork & Masonry',
  'Stone Masonry': 'Brickwork & Masonry',
  'Plastering & Rendering': 'Plastering, Rendering & Dry Lining',
  'Dry Lining & Partitioning': 'Plastering, Rendering & Dry Lining',
  Roofing: 'Roofing & Roofline',
  'Guttering, Fascias & Soffits': 'Roofing & Roofline',
  'Windows & Doors': 'Windows, Doors & Glazing',
  Glazing: 'Windows, Doors & Glazing',
  'Garage Doors & Automated Gates': 'Windows, Doors & Glazing',
  Flooring: 'Flooring & Screeding',
  'Carpet Fitting': 'Flooring & Screeding',
  'Screeding & Floor Preparation': 'Flooring & Screeding',
  'Driveways & Paving': 'Driveways, Paving & Groundworks',
  Groundworks: 'Driveways, Paving & Groundworks',
  'Concrete & Formwork': 'Driveways, Paving & Groundworks',
  'Piling & Foundations': 'Driveways, Paving & Groundworks',
  Drainage: 'Drainage & Sewage',
  'Septic Tanks & Sewage Treatment': 'Drainage & Sewage',
  'Damp Proofing': 'Damp Proofing & Insulation',
  Insulation: 'Damp Proofing & Insulation',
  Cladding: 'Cladding & Exterior Finishes',
  'Smart Home, CCTV & Alarms': 'Security, Smart Home & Locksmiths',
  Locksmith: 'Security, Smart Home & Locksmiths',
  Handyman: 'Handyman & Property Maintenance',
  'Property Maintenance': 'Handyman & Property Maintenance',
  'Shopfitting & Commercial Fit-Out': 'Commercial Fit-Out & Access',
  Scaffolding: 'Commercial Fit-Out & Access',
  Demolition: 'Demolition, Asbestos & Waste',
  'Asbestos Survey & Removal': 'Demolition, Asbestos & Waste',
  'Waste Removal': 'Demolition, Asbestos & Waste',
  'Pressure Washing': 'Cleaning, Exterior Care & Pest Control',
  Cleaning: 'Cleaning, Exterior Care & Pest Control',
  'Pest Control': 'Cleaning, Exterior Care & Pest Control',
  'Garden Rooms & Outbuildings': 'Garden Buildings & Leisure',
  Conservatories: 'Garden Buildings & Leisure',
  'Swimming Pools & Hot Tubs': 'Garden Buildings & Leisure',
  'Architectural & Planning Services': 'Professional Building Services',
  'Structural Engineering': 'Professional Building Services',
  'Building Surveying': 'Professional Building Services',
};

type ServiceSelections = Partial<Record<TradeCategory, string[]>>;

type OnboardingDraft = {
  step: number;
  businessName: string;
  tradeCategories?: string[];
  serviceSelections?: Record<string, string[]>;
  tradeCategory?: string;
  subSkills?: string[];
  postcode: string;
  radius: string;
  serviceAreasText: string;
  yearsExperience: string;
  yearEstablished: string;
  bio: string;
  qualificationsText: string;
  gasSafe: string;
  trustMark: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  photos: string[];
  coverPhoto: string[];
  profileImage: string[];
  logo: string[];
  beforeAfterProjects: BeforeAfterProject[];
};

function canonicalCategory(value?: string | null): TradeCategory | undefined {
  if (!value) return undefined;
  const direct = TRADE_CATEGORIES.find((item) => item === value);
  return direct ?? LEGACY_CATEGORY_MAP[value];
}

function normaliseCategories(primary?: string | null, stored: readonly string[] = []) {
  const values = [...stored, primary ?? '']
    .map(canonicalCategory)
    .filter((value): value is TradeCategory => Boolean(value));
  return [...new Set(values)];
}

function normaliseServices(categories: TradeCategory[], stored?: Record<string, string[]>, legacySkills: readonly string[] = []): ServiceSelections {
  const result: ServiceSelections = {};
  for (const category of categories) {
    const allowed = new Set<string>(SUB_SKILLS[category]);
    const direct = Object.entries(stored ?? {})
      .filter(([key]) => canonicalCategory(key) === category)
      .flatMap(([, services]) => services)
      .filter((service) => allowed.has(service));
    const legacy = legacySkills.filter((service) => allowed.has(service));
    result[category] = [...new Set([...direct, ...legacy])];
  }
  return result;
}

export default function TraderOnboarding() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [tradeCategories, setTradeCategories] = useState<TradeCategory[]>([]);
  const [serviceSelections, setServiceSelections] = useState<ServiceSelections>({});
  const [categoryLimit, setCategoryLimit] = useState(2);
  const [categoryChangeAvailableAt, setCategoryChangeAvailableAt] = useState<string | null>(null);
  const [postcode, setPostcode] = useState('');
  const [radius, setRadius] = useState('15');
  const [serviceAreasText, setServiceAreasText] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [yearEstablished, setYearEstablished] = useState('');
  const [bio, setBio] = useState('');
  const [qualificationsText, setQualificationsText] = useState('');
  const [gasSafe, setGasSafe] = useState('');
  const [trustMark, setTrustMark] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<string[]>([]);
  const [logo, setLogo] = useState<string[]>([]);
  const [beforeAfterProjects, setBeforeAfterProjects] = useState<BeforeAfterProject[]>([]);
  const [beforeDraft, setBeforeDraft] = useState<string[]>([]);
  const [afterDraft, setAfterDraft] = useState<string[]>([]);
  const [projectCaption, setProjectCaption] = useState('');
  const [certified, setCertified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [error, setError] = useState('');

  const tradeCategory = tradeCategories[0];
  const selectedServiceCount = useMemo(() => tradeCategories.reduce((sum, category) => sum + (serviceSelections[category]?.length ?? 0), 0), [serviceSelections, tradeCategories]);
  const everyCategoryHasService = tradeCategories.every((category) => (serviceSelections[category]?.length ?? 0) > 0);

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const applyDraft = useCallback((draft: OnboardingDraft) => {
    setStep(Math.max(0, Math.min(3, draft.step ?? 0)));
    setBusinessName(draft.businessName ?? '');
    const categories = normaliseCategories(draft.tradeCategory, draft.tradeCategories ?? draft.subSkills ?? []);
    setTradeCategories(categories);
    setServiceSelections(normaliseServices(categories, draft.serviceSelections, draft.subSkills ?? []));
    setPostcode(draft.postcode ?? '');
    setRadius(draft.radius ?? '15');
    setServiceAreasText(draft.serviceAreasText ?? '');
    setYearsExperience(draft.yearsExperience ?? '');
    setYearEstablished(draft.yearEstablished ?? '');
    setBio(draft.bio ?? '');
    setQualificationsText(draft.qualificationsText ?? '');
    setGasSafe(draft.gasSafe ?? '');
    setTrustMark(draft.trustMark ?? '');
    setFacebook(draft.facebook ?? '');
    setInstagram(draft.instagram ?? '');
    setTiktok(draft.tiktok ?? '');
    setWhatsapp(draft.whatsapp ?? '');
    setPhotos(draft.photos ?? []);
    setCoverPhoto(draft.coverPhoto ?? []);
    setProfileImage(draft.profileImage ?? []);
    setLogo(draft.logo ?? []);
    setBeforeAfterProjects(draft.beforeAfterProjects ?? []);
  }, []);

  const loadExisting = useCallback(async () => {
    try {
      const profile = await apiFetch<TraderProfile>('/api/me/profile', {}, () => getTokenRef.current());
      await clearDraft(DRAFT_KEY);
      const categories = normaliseCategories(profile.tradeCategory, profile.tradeCategories ?? []);
      setBusinessName(profile.businessName ?? '');
      setTradeCategories(categories);
      setServiceSelections(normaliseServices(categories, profile.serviceSelections, profile.subSkills ?? []));
      setCategoryLimit(profile.categoryLimit ?? 2);
      setCategoryChangeAvailableAt(profile.categoryChangeAvailableAt ?? null);
      setPostcode(profile.postcode ?? '');
      setRadius(String(profile.radiusMiles ?? 15));
      setServiceAreasText((profile.serviceAreas ?? []).join(', '));
      setYearsExperience(profile.yearsExperience ? String(profile.yearsExperience) : '');
      setYearEstablished(profile.yearEstablished ? String(profile.yearEstablished) : '');
      setBio(profile.bio ?? '');
      setQualificationsText((profile.qualifications ?? []).join('\n'));
      setGasSafe(profile.externalLinks?.gasSafe ?? '');
      setTrustMark(profile.externalLinks?.trustMark ?? '');
      setFacebook(profile.externalLinks?.facebook ?? '');
      setInstagram(profile.externalLinks?.instagram ?? '');
      setTiktok(profile.externalLinks?.tiktok ?? '');
      setWhatsapp(profile.externalLinks?.whatsapp ?? '');
      setPhotos(profile.photos ?? []);
      setCoverPhoto(profile.coverPhotoUrl ? [profile.coverPhotoUrl] : []);
      setProfileImage(profile.profileImageUrl ? [profile.profileImageUrl] : []);
      setLogo(profile.logoUrl ? [profile.logoUrl] : []);
      setBeforeAfterProjects(profile.beforeAfterProjects ?? []);
      setCertified(true);
      setDraftStatus('Profile loaded');
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        const draft = await loadDraft<OnboardingDraft>(DRAFT_KEY);
        if (draft) {
          applyDraft(draft);
          setDraftStatus('Draft restored ✓');
        }
      } else setError(errorMessage(e));
    } finally {
      setLoadingExisting(false);
      setDraftReady(true);
    }
  }, [applyDraft]);

  useEffect(() => { void loadExisting(); }, [loadExisting]);

  const draft = useMemo<OnboardingDraft>(() => ({
    step,
    businessName,
    tradeCategory,
    tradeCategories,
    serviceSelections: serviceSelections as Record<string, string[]>,
    subSkills: Object.values(serviceSelections).flatMap((value) => value ?? []),
    postcode,
    radius,
    serviceAreasText,
    yearsExperience,
    yearEstablished,
    bio,
    qualificationsText,
    gasSafe,
    trustMark,
    facebook,
    instagram,
    tiktok,
    whatsapp,
    photos,
    coverPhoto,
    profileImage,
    logo,
    beforeAfterProjects,
  }), [beforeAfterProjects, bio, businessName, coverPhoto, facebook, gasSafe, instagram, logo, photos, postcode, profileImage, qualificationsText, radius, serviceAreasText, serviceSelections, step, tiktok, tradeCategories, tradeCategory, trustMark, whatsapp, yearEstablished, yearsExperience]);

  useEffect(() => {
    if (!draftReady || certified) return;
    const timer = setTimeout(() => {
      void saveDraft(DRAFT_KEY, draft).then(() => setDraftStatus('Draft saved automatically ✓')).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [certified, draft, draftReady]);

  const bioLength = bio.trim().length;
  const bioCharactersRemaining = Math.max(0, TRADER_BIO_MIN_LENGTH - bioLength);
  const valid = useMemo(() => [
    Boolean(businessName.trim().length >= 2 && tradeCategories.length && tradeCategories.length <= categoryLimit && everyCategoryHasService && postcode.trim().length >= 5),
    bioLength >= TRADER_BIO_MIN_LENGTH,
    true,
    certified,
  ][step], [bioLength, businessName, categoryLimit, certified, everyCategoryHasService, postcode, step, tradeCategories.length]);

  function addBeforeAfter() {
    const before = beforeDraft[0];
    const after = afterDraft[0];
    if (!before || !after || beforeAfterProjects.length >= 12) return;
    setBeforeAfterProjects((current) => [...current, { before, after, caption: projectCaption.trim() || undefined }]);
    setBeforeDraft([]);
    setAfterDraft([]);
    setProjectCaption('');
  }

  async function save() {
    if (!tradeCategory || !tradeCategories.length || !everyCategoryHasService) return;
    try {
      setBusy(true);
      setError('');
      const links = { gasSafe, trustMark, facebook, instagram, tiktok, whatsapp };
      const serviceAreas = serviceAreasText.split(/[,\n]/).map((value) => value.trim()).filter(Boolean).slice(0, 20);
      const flattenedServices = [...new Set(Object.values(serviceSelections).flatMap((value) => value ?? []))];
      await apiFetch('/api/me', {
        method: 'PUT',
        body: JSON.stringify({
          businessName,
          tradeCategories,
          serviceSelections,
          tradeCategory,
          subSkills: flattenedServices,
          bio,
          postcode,
          radiusMiles: Number(radius),
          qualifications: qualificationsText.split('\n').map((value) => value.trim()).filter(Boolean),
          externalLinks: links,
          photos,
          selfCertified: certified,
          showcase: {
            template: 'modern',
            colourTheme: 'burnt_orange',
            coverPhotoUrl: coverPhoto[0] ?? '',
            profileImageUrl: profileImage[0] ?? '',
            logoUrl: logo[0] ?? '',
            yearsExperience: Number(yearsExperience || 0),
            yearEstablished: yearEstablished ? Number(yearEstablished) : null,
            serviceAreas,
            beforeAfterProjects,
          },
        }),
      }, getToken);
      await clearDraft(DRAFT_KEY);
      router.replace('/trader/dashboard');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const footer = <View style={styles.actions}>
    {step > 0 ? <Button mode="text" onPress={() => setStep((value) => value - 1)}>Back</Button> : <View />}
    {step < 3
      ? <Button mode="contained" contentStyle={styles.continueButton} disabled={!valid} onPress={() => setStep((value) => value + 1)}>Continue</Button>
      : <Button mode="contained" icon="check-circle-outline" contentStyle={styles.continueButton} loading={busy} disabled={!valid || busy} onPress={() => void save()}>{busy ? 'Publishing…' : 'Save & Publish Profile'}</Button>}
  </View>;

  return <Screen
    key={step}
    title={STEP_TITLES[step]}
    subtitle="Build a profile homeowners can understand and trust without fighting through a giant form."
    footer={footer}
  >
    <View style={styles.progressBlock}>
      <View style={styles.progressHeader}>
        <Text variant="labelLarge" style={styles.stepLabel}>Step {step + 1} of 4</Text>
        <Text style={styles.muted}>{STEP_TITLES[step]}</Text>
      </View>
      <ProgressBar progress={(step + 1) / 4} color={colors.primary} style={styles.progress} />
    </View>

    {loadingExisting ? <HelperText type="info">Loading your existing profile details…</HelperText> : draftStatus ? <HelperText type="info">{draftStatus}</HelperText> : null}

    {step === 0 ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Tell us about your business</Text>
      <Text style={styles.muted}>Choose broad trade categories first, then expand each one and tick the services you actually offer. Services do not use extra plan slots.</Text>
      <TextInput label="Business or trading name" accessibilityLabel="Business or trading name" value={businessName} onChangeText={setBusinessName} mode="outlined" />

      <Text variant="titleMedium" style={styles.title}>What work do you offer?</Text>
      <TradeCategorySelector
        selectedCategories={tradeCategories}
        serviceSelections={serviceSelections}
        categoryLimit={categoryLimit}
        categoryChangeAvailableAt={categoryChangeAvailableAt}
        onCategoriesChange={setTradeCategories}
        onServicesChange={setServiceSelections}
      />
      {!everyCategoryHasService && tradeCategories.length ? <HelperText type="error">Choose at least one service inside each selected trade category.</HelperText> : null}

      <View style={styles.twoCol}>
        <TextInput style={styles.flex} label="Years of experience" accessibilityLabel="Years of experience" value={yearsExperience} onChangeText={setYearsExperience} mode="outlined" keyboardType="number-pad" />
        <TextInput style={styles.flex} label="Year established" accessibilityLabel="Year established" value={yearEstablished} onChangeText={setYearEstablished} mode="outlined" keyboardType="number-pad" />
      </View>
      <TextInput label="Base postcode" accessibilityLabel="Base postcode" value={postcode} onChangeText={setPostcode} mode="outlined" autoCapitalize="characters" placeholder="e.g. SW1A 1AA" />
      <HelperText type="info">Used for local job matching. Your full postcode is never displayed publicly.</HelperText>
      <FormSelect label="Working radius (miles)" value={radius} options={RADIUS_OPTIONS} onChange={setRadius} />
      <TextInput label="Other areas you cover" accessibilityLabel="Other areas you cover" value={serviceAreasText} onChangeText={setServiceAreasText} mode="outlined" multiline placeholder="Staines, Egham, Chertsey, Windsor…" />
    </AppCard> : null}

    {step === 1 ? <>
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>Make the profile look like your business</Text>
        <PhotoUploader kind="trader" photos={coverPhoto} onChange={setCoverPhoto} max={1} title="Cover photo" buttonLabel="Choose Cover Photo" emptyText="Use a strong wide photo of finished work, your van or your team." />
        <PhotoUploader kind="trader" photos={profileImage} onChange={setProfileImage} max={1} title="Profile photo" buttonLabel="Choose Profile Photo" emptyText="A clear photo of you or your team works best." />
        <PhotoUploader kind="trader" photos={logo} onChange={setLogo} max={1} title="Company logo" buttonLabel="Choose Logo" emptyText="Optional. Add your logo if you have one." />
      </AppCard>
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>About your business</Text>
        <TextInput label="Business bio" accessibilityLabel="Business bio" value={bio} onChangeText={setBio} mode="outlined" multiline numberOfLines={7} />
        <View style={styles.bioMeta}>
          <HelperText style={styles.helperFlex} type={bioLength > 0 && bioCharactersRemaining > 0 ? 'error' : 'info'}>
            Minimum {TRADER_BIO_MIN_LENGTH} characters required.{bioCharactersRemaining > 0 ? ` ${bioCharactersRemaining} more to go.` : ' Requirement met ✓'}
          </HelperText>
          <Text style={[styles.counter, bioLength >= TRADER_BIO_MIN_LENGTH && styles.counterOk]}>{bioLength} / {TRADER_BIO_MIN_LENGTH}</Text>
        </View>
        <Text style={styles.muted}>Explain what you specialise in, how you work and what customers can expect.</Text>
        <TextInput label="Qualifications, cards and certificates (one per line)" accessibilityLabel="Qualifications, cards and certificates (one per line)" value={qualificationsText} onChangeText={setQualificationsText} mode="outlined" multiline />
        <Text variant="titleMedium" style={styles.title}>Registers & social links</Text>
        {([
          ['Gas Safe register URL', gasSafe, setGasSafe],
          ['TrustMark URL', trustMark, setTrustMark],
          ['Facebook URL', facebook, setFacebook],
          ['Instagram URL', instagram, setInstagram],
          ['TikTok URL', tiktok, setTiktok],
          ['WhatsApp click-to-chat URL', whatsapp, setWhatsapp],
        ] as const).map(([label, value, setter]) => <TextInput key={label} label={label} accessibilityLabel={label} value={value} onChangeText={setter} mode="outlined" autoCapitalize="none" />)}
      </AppCard>
    </> : null}

    {step === 2 ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Show your work</Text>
      <Text style={styles.muted}>Photos sell workmanship better than a paragraph ever will. Add finished jobs and useful before-and-after examples.</Text>
      <PhotoUploader kind="trader" photos={photos} onChange={setPhotos} max={30} title="Work gallery" buttonLabel="Add Work Photo" emptyText="Bathrooms, kitchens, floors, details, finishes and other completed work." />
      <Text variant="titleMedium" style={styles.title}>Before & after projects</Text>
      <PhotoUploader kind="trader" photos={beforeDraft} onChange={setBeforeDraft} max={1} title="Before" buttonLabel="Add Before Photo" />
      <PhotoUploader kind="trader" photos={afterDraft} onChange={setAfterDraft} max={1} title="After" buttonLabel="Add After Photo" />
      <TextInput label="Project caption (optional)" accessibilityLabel="Project caption (optional)" value={projectCaption} onChangeText={setProjectCaption} mode="outlined" placeholder="Full bathroom retile in Staines" />
      <Button mode="outlined" icon="image-plus" disabled={!beforeDraft[0] || !afterDraft[0] || beforeAfterProjects.length >= 12} onPress={addBeforeAfter}>Add Before & After Project</Button>
      {beforeAfterProjects.map((project, index) => <View key={`${project.before}-${index}`} style={styles.projectRow}>
        <View style={styles.flex}>
          <Text style={styles.title}>{project.caption || `Project ${index + 1}`}</Text>
          <Text style={styles.muted}>Before / after pair ready ✓</Text>
        </View>
        <Button compact onPress={() => setBeforeAfterProjects((current) => current.filter((_, i) => i !== index))}>Remove</Button>
      </View>)}
    </AppCard> : null}

    {step === 3 ? <>
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>Profile preview</Text>
        <View style={styles.previewHeader}>
          <View style={styles.previewMark}><Text style={styles.previewMarkText}>{businessName.slice(0, 1).toUpperCase() || 'B'}</Text></View>
          <View style={styles.flex}>
            <Text variant="headlineSmall" style={styles.title}>{businessName || 'Your business'}</Text>
            <Text style={styles.muted}>{tradeCategory || 'Primary trade'} · {postcode || 'Service area'}</Text>
          </View>
        </View>
        <View style={styles.previewChips}>{tradeCategories.map((category) => <Chip key={category} compact>{category} · {serviceSelections[category]?.length ?? 0} services</Chip>)}</View>
        <Text numberOfLines={5} style={styles.previewBio}>{bio || 'Your business bio will appear here.'}</Text>
        <Text style={styles.muted}>{tradeCategories.length} trade categor{tradeCategories.length === 1 ? 'y' : 'ies'} · {selectedServiceCount} service{selectedServiceCount === 1 ? '' : 's'} · {photos.length} work photo{photos.length === 1 ? '' : 's'} · {beforeAfterProjects.length} before/after project{beforeAfterProjects.length === 1 ? '' : 's'}</Text>
      </AppCard>
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>Confirm & publish</Text>
        <Text style={styles.muted}>Starter Free lets you complete and externally share this profile and browse BuildPair jobs. Starter profiles are hidden from BuildPair search and cannot offer on jobs until you choose Plus or Pro. There is no trial during beta testing.</Text>
        <Pressable accessibilityRole="checkbox" accessibilityLabel="Confirm profile information is accurate" accessibilityState={{ checked: certified }} onPress={() => setCertified((value) => !value)} style={styles.check}>
          <View style={[styles.checkBox, certified && styles.checkBoxSelected]}>{certified ? <Text style={styles.checkMark}>✓</Text> : null}</View>
          <Text style={styles.checkText}>I confirm that the information I have provided is accurate and that I hold any insurance or trade accreditation required for the work I offer.</Text>
        </Pressable>
      </AppCard>
    </> : null}

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </Screen>;
}

const styles = StyleSheet.create({
  progressBlock: { gap: 8, marginBottom: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  stepLabel: { color: colors.primary, fontWeight: '900' },
  progress: { height: 8, borderRadius: 8, backgroundColor: '#F2E7DF' },
  title: { fontWeight: '900', color: colors.text },
  muted: { color: colors.muted, lineHeight: 22 },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  flex: { flex: 1, minWidth: 220 },
  bioMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  helperFlex: { flex: 1 },
  counter: { color: colors.warning, fontWeight: '800' },
  counterOk: { color: colors.success },
  projectRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewMark: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  previewMarkText: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  previewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  previewBio: { color: colors.text, lineHeight: 23 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  checkBox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkBoxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  checkText: { flex: 1, color: colors.text, lineHeight: 22 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  continueButton: { minHeight: 50, minWidth: 130 },
});
