import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, Chip, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { LAUNCH_DATE_LABEL } from '@/lib/launch';

type Audience = 'homeowner' | 'trader';
type WaitlistResponse = { ok: true; alreadyJoined: boolean };

export default function WaitlistPage() {
  const params = useLocalSearchParams<{ audience?: string; source?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>();
  const initialAudience: Audience = params.audience === 'trader' ? 'trader' : 'homeowner';
  const [email, setEmail] = useState('');
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [trade, setTrade] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState<WaitlistResponse>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const source = useMemo(() => {
    const base = typeof params.source === 'string' && params.source ? params.source : 'website';
    const campaign = [
      typeof params.utm_source === 'string' && params.utm_source ? `src:${params.utm_source}` : '',
      typeof params.utm_medium === 'string' && params.utm_medium ? `med:${params.utm_medium}` : '',
      typeof params.utm_campaign === 'string' && params.utm_campaign ? `cmp:${params.utm_campaign}` : '',
    ].filter(Boolean).join('|');
    return `${base}${campaign ? `|${campaign}` : ''}`.slice(0, 80);
  }, [params.source, params.utm_source, params.utm_medium, params.utm_campaign]);

  const canJoin = useMemo(() => email.trim().includes('@'), [email]);
  const canSaveDetails = useMemo(() => name.trim().length >= 2 && phone.trim().length >= 7 && postcode.trim().length >= 5, [name, phone, postcode]);

  async function join() {
    try {
      setBusy(true);
      setError('');
      const result = await apiFetch<WaitlistResponse>('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email,
          audience,
          trade: audience === 'trader' ? trade : '',
          source,
        }),
      });
      setJoined(result);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveTestingDetails() {
    try {
      setDetailsBusy(true);
      setDetailsError('');
      await apiFetch<WaitlistResponse>('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          phone,
          postcode,
          audience,
          trade: audience === 'trader' ? trade : '',
          testerInterest: true,
          smsOptIn,
          source: `${source}-testing`.slice(0, 80),
        }),
      });
      setDetailsSaved(true);
    } catch (e) {
      setDetailsError(errorMessage(e));
    } finally {
      setDetailsBusy(false);
    }
  }

  if (joined) return <Screen title="You’re on the BuildPair launch list" subtitle={`BuildPair launches ${LAUNCH_DATE_LABEL}.`}>
    <AppCard style={styles.successCard}>
      <Chip icon="check-circle">Launch list confirmed</Chip>
      <Text variant="headlineSmall" style={styles.heading}>{joined.alreadyJoined ? 'You’re already on the list.' : 'That’s it. You’re in.'}</Text>
      <Text style={styles.body}>We’ll email you when BuildPair registration opens. No account has been created and you do not need to do anything else.</Text>
      {audience === 'trader' ? <Text style={styles.body}><Text style={styles.strong}>Founding Trades:</Text> the first 50 eligible waiting-list tradespeople who complete registration within 24 hours of launch get 3 months of Pro free.</Text> : null}
    </AppCard>

    <AppCard>
      <Chip icon="flask-outline">Optional</Chip>
      <Text variant="titleLarge" style={styles.heading}>Interested in testing BuildPair before launch?</Text>
      <Text style={styles.body}>Only add these details if you want to be considered for limited real-world testing. Your launch-list place is already saved.</Text>
      {detailsSaved ? <Text style={styles.saved}>Testing interest saved. Thanks.</Text> : <>
        <TextInput mode="outlined" label="Name" value={name} onChangeText={setName} autoComplete="name" />
        <TextInput mode="outlined" label="Mobile" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="07911 123456" />
        <TextInput mode="outlined" label="Postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" placeholder="TW18 1AA" />
        <Checkbox.Item label="You may text me about testing" status={smsOptIn ? 'checked' : 'unchecked'} onPress={() => setSmsOptIn((value) => !value)} position="leading" labelStyle={styles.checkboxLabel} />
        <HelperText type="error" visible={Boolean(detailsError)}>{detailsError}</HelperText>
        <Button mode="outlined" loading={detailsBusy} disabled={detailsBusy || !canSaveDetails} onPress={() => void saveTestingDetails()}>Register testing interest</Button>
      </>}
    </AppCard>

    <Link href="/" asChild><Button mode="text">Back to BuildPair</Button></Link>
  </Screen>;

  return <Screen title="Join the BuildPair launch list" subtitle={`Launching ${LAUNCH_DATE_LABEL}. One quick step.`}>
    <AppCard style={styles.heroCard}>
      <Chip icon="rocket-launch-outline">Launching soon</Chip>
      <Text variant="headlineSmall" style={styles.heading}>Tell us where to send the launch email.</Text>
      <Text style={styles.body}>No account setup. No phone number. No postcode. Just your email and whether you’re a homeowner or tradesperson.</Text>
    </AppCard>

    <AppCard>
      <Text variant="labelLarge" style={styles.label}>I’m joining as</Text>
      <SegmentedButtons value={audience} onValueChange={(value) => setAudience(value as Audience)} buttons={[{ value: 'homeowner', label: 'Homeowner', icon: 'home-outline' }, { value: 'trader', label: 'Tradesperson', icon: 'hammer-wrench' }]} />
      <TextInput mode="outlined" label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      {audience === 'trader' ? <>
        <TextInput mode="outlined" label="Main trade (optional)" value={trade} onChangeText={setTrade} placeholder="e.g. Plumber, electrician, tiler" />
        <AppCard elevated={false} style={styles.offerCard}>
          <Text variant="titleMedium" style={styles.heading}>Founding Trades offer</Text>
          <Text style={styles.body}>The first 50 eligible waiting-list tradespeople who complete registration within 24 hours of launch get <Text style={styles.strong}>3 months of BuildPair Pro free</Text>.</Text>
        </AppCard>
      </> : null}
      <Text style={styles.privacy}>We’ll use your email to manage the launch list and tell you when BuildPair registration opens. See our Privacy Policy for details.</Text>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" icon="account-clock-outline" loading={busy} disabled={busy || !canJoin} onPress={() => void join()}>{audience === 'trader' ? 'Join the Founding Trades list' : 'Notify me at launch'}</Button>
      <View style={styles.links}><Link href="/(public)/privacy" asChild><Button mode="text">Privacy</Button></Link><Link href="/auth/sign-in" asChild><Button mode="text">Existing member? Sign in</Button></Link></View>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  offerCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  successCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  heading: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  strong: { fontWeight: '900' },
  label: { color: colors.charcoal, fontWeight: '800', marginTop: spacing.xs },
  checkboxLabel: { color: colors.text, lineHeight: 20 },
  privacy: { color: colors.muted, lineHeight: 19, fontSize: 12 },
  saved: { color: colors.success, fontWeight: '800', lineHeight: 22 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
});