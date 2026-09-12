import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, Chip, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { LAUNCH_DATE_LABEL } from '@/lib/launch';

type Audience = 'homeowner' | 'trader';
type ContactPreference = 'email' | 'sms' | 'both';
type WaitlistResponse = { ok: true; alreadyJoined: boolean; preferredContact?: ContactPreference };
type ContactOptions = { emailEnabled: boolean; smsEnabled: boolean; smsProvider: string };

export default function WaitlistPage() {
  const params = useLocalSearchParams<{ audience?: string; source?: string }>();
  const initialAudience: Audience = params.audience === 'trader' ? 'trader' : 'homeowner';
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPreference, setContactPreference] = useState<ContactPreference>('email');
  const [contactOptions, setContactOptions] = useState<ContactOptions>({ emailEnabled: true, smsEnabled: false, smsProvider: 'disabled' });
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [trade, setTrade] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState<WaitlistResponse>();
  const [name, setName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const source = typeof params.source === 'string' ? params.source : 'website';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneLooksValid = phone.replace(/\D/g, '').length >= 10;
  const canJoin = useMemo(() => {
    if (contactPreference === 'email') return emailValid;
    if (contactPreference === 'sms') return contactOptions.smsEnabled && phoneLooksValid;
    return contactOptions.smsEnabled && emailValid && phoneLooksValid;
  }, [contactOptions.smsEnabled, contactPreference, emailValid, phoneLooksValid]);
  const canSaveDetails = useMemo(() => name.trim().length >= 2 && postcode.trim().length >= 5 && (!phone.trim() || phoneLooksValid), [name, phone, phoneLooksValid, postcode]);

  useEffect(() => {
    let alive = true;
    void apiFetch<ContactOptions>('/api/contact-options')
      .then((options) => {
        if (alive) setContactOptions(options);
      })
      .catch(() => {
        if (alive) setContactOptions({ emailEnabled: true, smsEnabled: false, smsProvider: 'disabled' });
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!contactOptions.smsEnabled && contactPreference !== 'email') setContactPreference('email');
  }, [contactOptions.smsEnabled, contactPreference]);

  async function join() {
    try {
      setBusy(true);
      setError('');
      const result = await apiFetch<WaitlistResponse>('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email,
          phone,
          audience,
          trade: audience === 'trader' ? trade : '',
          preferredContact: contactPreference,
          smsOptIn: contactPreference === 'sms' || contactPreference === 'both',
          source,
        }),
      });
      setJoined(result);
      setSmsOptIn(contactPreference === 'sms' || contactPreference === 'both');
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
          source: `${source}-testing`,
        }),
      });
      setDetailsSaved(true);
    } catch (e) {
      setDetailsError(errorMessage(e));
    } finally {
      setDetailsBusy(false);
    }
  }

  const chosenContactCopy = contactPreference === 'sms'
    ? 'We’ll text the mobile number you chose when BuildPair registration opens.'
    : contactPreference === 'both'
      ? 'We’ll email and text you when BuildPair registration opens.'
      : 'We’ll email you when BuildPair registration opens.';

  if (joined) return <Screen title="You’re on the BuildPair launch list" subtitle={`BuildPair launches ${LAUNCH_DATE_LABEL}.`}>
    <AppCard style={styles.successCard}>
      <Chip icon="check-circle">Launch list confirmed</Chip>
      <Text variant="headlineSmall" style={styles.heading}>{joined.alreadyJoined ? 'You’re already on the list.' : 'That’s it. You’re in.'}</Text>
      <Text style={styles.body}>{chosenContactCopy} No account has been created and you do not need to do anything else.</Text>
      {audience === 'trader' ? <Text style={styles.body}><Text style={styles.strong}>Founding Trades:</Text> the first 50 eligible waiting-list tradespeople who complete registration within 24 hours of launch get 3 months of Pro free.</Text> : null}
    </AppCard>

    <AppCard>
      <Chip icon="flask-outline">Optional</Chip>
      <Text variant="titleLarge" style={styles.heading}>Interested in testing BuildPair before launch?</Text>
      <Text style={styles.body}>Only add these details if you want to be considered for limited real-world testing. Your launch-list place is already saved.</Text>
      {detailsSaved ? <Text style={styles.saved}>Testing interest saved. Thanks.</Text> : <>
        <TextInput mode="outlined" label="Name" value={name} onChangeText={setName} autoComplete="name" />
        {!phone.trim() ? <TextInput mode="outlined" label="Mobile (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="07911 123456" /> : null}
        <TextInput mode="outlined" label="Postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" placeholder="TW18 1AA" />
        <Checkbox.Item
          label="You may text me about pre-launch testing"
          status={smsOptIn ? 'checked' : 'unchecked'}
          disabled={!phone.trim() || !contactOptions.smsEnabled}
          onPress={() => setSmsOptIn((value) => !value)}
          position="leading"
          labelStyle={styles.checkboxLabel}
        />
        {!contactOptions.smsEnabled && phone.trim() ? <Text style={styles.smsNote}>Texting is not switched on yet. Your number can still be saved, but no SMS will be sent until BuildPair enables the service.</Text> : null}
        <HelperText type="error" visible={Boolean(detailsError)}>{detailsError}</HelperText>
        <Button mode="outlined" loading={detailsBusy} disabled={detailsBusy || !canSaveDetails} onPress={() => void saveTestingDetails()}>Register testing interest</Button>
      </>}
    </AppCard>

    <Link href="/" asChild><Button mode="text">Back to BuildPair</Button></Link>
  </Screen>;

  return <Screen title="Join the BuildPair launch list" subtitle={`Launching ${LAUNCH_DATE_LABEL}. One quick step.`}>
    <AppCard style={styles.heroCard}>
      <Chip icon="rocket-launch-outline">Launching soon</Chip>
      <Text variant="headlineSmall" style={styles.heading}>Choose how BuildPair should contact you.</Text>
      <Text style={styles.body}>No account setup and no postcode required. Use email, text, or both once SMS is connected.</Text>
    </AppCard>

    <AppCard>
      <Text variant="labelLarge" style={styles.label}>I’m joining as</Text>
      <SegmentedButtons value={audience} onValueChange={(value) => setAudience(value as Audience)} buttons={[{ value: 'homeowner', label: 'Homeowner', icon: 'home-outline' }, { value: 'trader', label: 'Tradesperson', icon: 'hammer-wrench' }]} />

      <Text variant="labelLarge" style={styles.label}>Contact me by</Text>
      <SegmentedButtons
        value={contactPreference}
        onValueChange={(value) => setContactPreference(value as ContactPreference)}
        buttons={[
          { value: 'email', label: 'Email', icon: 'email-outline' },
          { value: 'sms', label: 'Text', icon: 'message-text-outline', disabled: !contactOptions.smsEnabled },
          { value: 'both', label: 'Both', icon: 'email-multiple-outline', disabled: !contactOptions.smsEnabled },
        ]}
      />
      {!contactOptions.smsEnabled ? <Text style={styles.smsNote}>Text alerts are ready in BuildPair but not connected to the SMS provider yet. Email works now; mobile is optional and can still be saved.</Text> : null}

      <TextInput
        mode="outlined"
        label={contactPreference === 'sms' ? 'Email address (optional)' : `Email address${contactPreference === 'both' ? '' : ' (required)'}`}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextInput
        mode="outlined"
        label={contactPreference === 'email' ? 'Mobile (optional)' : 'UK mobile number'}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="07911 123456"
      />

      {audience === 'trader' ? <>
        <TextInput mode="outlined" label="Main trade (optional)" value={trade} onChangeText={setTrade} placeholder="e.g. Plumber, electrician, tiler" />
        <AppCard elevated={false} style={styles.offerCard}>
          <Text variant="titleMedium" style={styles.heading}>Founding Trades offer</Text>
          <Text style={styles.body}>The first 50 eligible waiting-list tradespeople who complete registration within 24 hours of launch get <Text style={styles.strong}>3 months of BuildPair Pro free</Text>.</Text>
        </AppCard>
      </> : null}

      <Text style={styles.privacy}>{contactPreference === 'sms'
        ? 'You’re asking BuildPair to send service texts about the launch and your requested early access. We will not use this as consent for marketing texts.'
        : contactPreference === 'both'
          ? 'You’re asking BuildPair to contact you by email and service text about the launch and requested early access. Marketing messages require separate consent.'
          : 'We’ll use your email for the launch list. If you add an optional mobile number, we will not text it unless you later choose text updates or separately opt in.'} See our Privacy Policy for details.</Text>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" icon="account-clock-outline" loading={busy} disabled={busy || !canJoin} onPress={() => void join()}>{audience === 'trader' ? 'Join the Founding Trades list' : 'Join the launch list'}</Button>
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
  smsNote: { color: colors.muted, lineHeight: 19, fontSize: 12 },
  saved: { color: colors.success, fontWeight: '800', lineHeight: 22 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
});
