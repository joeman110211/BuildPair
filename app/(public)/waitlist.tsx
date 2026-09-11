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
  const params = useLocalSearchParams<{ audience?: string; source?: string }>();
  const initialAudience: Audience = params.audience === 'trader' ? 'trader' : 'homeowner';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [trade, setTrade] = useState('');
  const [testerInterest, setTesterInterest] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState<WaitlistResponse>();

  const canSubmit = useMemo(() => name.trim().length >= 2 && email.includes('@') && phone.trim().length >= 7 && postcode.trim().length >= 5 && (audience === 'homeowner' || trade.trim().length >= 2), [audience, email, name, phone, postcode, trade]);

  async function submit() {
    try {
      setBusy(true); setError('');
      const result = await apiFetch<WaitlistResponse>('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          phone,
          postcode,
          audience,
          trade: audience === 'trader' ? trade : '',
          testerInterest,
          smsOptIn,
          marketingOptIn,
          source: typeof params.source === 'string' ? params.source : 'website',
        }),
      });
      setJoined(result);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (joined) return <Screen title="You’re on the BuildPair launch list" subtitle={`BuildPair launches ${LAUNCH_DATE_LABEL}.`}>
    <AppCard style={styles.successCard}>
      <Chip icon="check-circle">Launch list confirmed</Chip>
      <Text variant="headlineSmall" style={styles.heading}>{joined.alreadyJoined ? 'Your details have been updated.' : 'Your place is saved.'}</Text>
      <Text style={styles.body}>We’ll email you when BuildPair registration opens. No BuildPair account has been created yet.</Text>
      {audience === 'trader' ? <Text style={styles.body}><Text style={styles.strong}>Founding Trades offer:</Text> the first 50 eligible tradespeople from the waiting list who complete registration within 24 hours of launch will receive BuildPair Pro free for 3 months.</Text> : null}
      {testerInterest ? <Text style={styles.body}>You also registered interest in real-world testing. Places are limited and selected testers may receive up to 6 months of Pro free.</Text> : null}
      <Link href="/" asChild><Button mode="contained">Back to BuildPair</Button></Link>
    </AppCard>
  </Screen>;

  return <Screen title="Join the BuildPair launch list" subtitle={`Launching ${LAUNCH_DATE_LABEL} · the full public site is open to explore now.`}>
    <AppCard style={styles.launchCard}>
      <Chip icon="rocket-launch-outline">Final release steps</Chip>
      <Text variant="headlineSmall" style={styles.heading}>Registration is paused until launch.</Text>
      <Text style={styles.body}>Explore BuildPair, our trade directory, pricing, guides and how the platform works. New accounts are not being opened yet, so join the list and we’ll tell you as soon as the doors open.</Text>
    </AppCard>

    <AppCard style={styles.buildPayCard}>
      <Chip icon="shield-check-outline">Now introducing BuildPay</Chip>
      <Text variant="titleLarge" style={styles.heading}>A clearer way to handle job payments.</Text>
      <Text style={styles.body}>BuildPay follows the accepted quote and agreed payment stages. Materials can be released for procurement after the tradesperson acknowledges the opening payment, while work-stage funds stay controlled until the agreed stage is reached and the homeowner approves release.</Text>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.heading}>Your details</Text>
      <TextInput mode="outlined" label="Name" value={name} onChangeText={setName} autoComplete="name" />
      <TextInput mode="outlined" label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextInput mode="outlined" label="Mobile" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="07911 123456" />
      <TextInput mode="outlined" label="Postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" placeholder="TW18 1AA" />

      <Text variant="labelLarge" style={styles.label}>I’m joining as</Text>
      <SegmentedButtons value={audience} onValueChange={(value) => setAudience(value as Audience)} buttons={[{ value: 'homeowner', label: 'Homeowner', icon: 'home-outline' }, { value: 'trader', label: 'Tradesperson', icon: 'hammer-wrench' }]} />
      {audience === 'trader' ? <>
        <TextInput mode="outlined" label="Main trade" value={trade} onChangeText={setTrade} placeholder="e.g. Plumber, electrician, tiler" />
        <AppCard elevated={false} style={styles.offerCard}>
          <Text variant="titleMedium" style={styles.heading}>Founding Trades offer</Text>
          <Text style={styles.body}>The first 50 eligible tradespeople from this waiting list who complete their BuildPair registration within 24 hours of launch get <Text style={styles.strong}>3 months of Pro free</Text>. One offer per genuine trade business.</Text>
        </AppCard>
      </> : null}

      <Checkbox.Item label="I’m interested in real-world testing before launch" status={testerInterest ? 'checked' : 'unchecked'} onPress={() => setTesterInterest((value) => !value)} position="leading" labelStyle={styles.checkboxLabel} />
      {testerInterest ? <HelperText type="info">Limited places. Selected testers may receive up to 6 months of Pro free in return for genuine use and useful feedback.</HelperText> : null}
      <Checkbox.Item label="You may text me about launch or testing" status={smsOptIn ? 'checked' : 'unchecked'} onPress={() => setSmsOptIn((value) => !value)} position="leading" labelStyle={styles.checkboxLabel} />
      <Checkbox.Item label="Send me occasional BuildPair news and product updates after launch" status={marketingOptIn ? 'checked' : 'unchecked'} onPress={() => setMarketingOptIn((value) => !value)} position="leading" labelStyle={styles.checkboxLabel} />

      <Text style={styles.privacy}>We’ll use the details above to manage this launch list and send the launch notification you requested. Optional marketing and SMS choices are stored separately. See our Privacy Policy for more information.</Text>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" icon="account-clock-outline" loading={busy} disabled={busy || !canSubmit} onPress={() => void submit()}>Join the launch list</Button>
      <View style={styles.links}><Link href="/(public)/privacy" asChild><Button mode="text">Privacy</Button></Link><Link href="/auth/sign-in" asChild><Button mode="text">Existing member? Sign in</Button></Link></View>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  launchCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  buildPayCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  offerCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  successCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  heading: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  strong: { fontWeight: '900' },
  label: { color: colors.charcoal, fontWeight: '800', marginTop: spacing.xs },
  checkboxLabel: { color: colors.text, lineHeight: 20 },
  privacy: { color: colors.muted, lineHeight: 19, fontSize: 12 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
});
