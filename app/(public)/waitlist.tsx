import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Button, Checkbox, Chip, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { LAUNCH_DATE_LABEL } from '@/lib/launch';

type Audience = 'homeowner' | 'trader';
type ContactPreference = 'email' | 'sms' | 'both';
type WaitlistResponse = {
  ok: true;
  alreadyJoined: boolean;
  preferredContact?: ContactPreference;
  referralCode?: string;
  referralCount?: number;
};
type ContactOptions = { emailEnabled: boolean; smsEnabled: boolean; smsProvider: string };

export default function WaitlistPage() {
  const params = useLocalSearchParams<{ audience?: string; source?: string; ref?: string }>();
  const initialAudience: Audience = params.audience === 'trader' ? 'trader' : 'homeowner';
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPreference, setContactPreference] = useState<ContactPreference>('email');
  const [contactOptions, setContactOptions] = useState<ContactOptions>({ emailEnabled: true, smsEnabled: false, smsProvider: 'disabled' });
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [trade, setTrade] = useState('');
  const [requestEarlyAccess, setRequestEarlyAccess] = useState(initialAudience === 'trader');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState<WaitlistResponse>();
  const [name, setName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);

  const source = typeof params.source === 'string' ? params.source : 'website';
  const incomingReferralCode = typeof params.ref === 'string' ? params.ref.trim().toUpperCase() : '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneLooksValid = phone.replace(/\D/g, '').length >= 10;
  const canJoin = useMemo(() => {
    if (contactPreference === 'email') return emailValid;
    if (contactPreference === 'sms') return contactOptions.smsEnabled && phoneLooksValid;
    return contactOptions.smsEnabled && emailValid && phoneLooksValid;
  }, [contactOptions.smsEnabled, contactPreference, emailValid, phoneLooksValid]);
  const canSaveDetails = useMemo(() => name.trim().length >= 2 && postcode.trim().length >= 5 && (!phone.trim() || phoneLooksValid), [name, phone, phoneLooksValid, postcode]);
  const referralLink = useMemo(() => {
    if (!joined?.referralCode) return '';
    return `https://buildpair.co.uk/waitlist?audience=${audience}&source=referral&ref=${encodeURIComponent(joined.referralCode)}`;
  }, [audience, joined?.referralCode]);

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
          testerInterest: requestEarlyAccess,
          preferredContact: contactPreference,
          smsOptIn: contactPreference === 'sms' || contactPreference === 'both',
          source,
          referralCode: incomingReferralCode,
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
          source: `${source}-early-access`,
          referralCode: incomingReferralCode,
        }),
      });
      setDetailsSaved(true);
      setRequestEarlyAccess(true);
    } catch (e) {
      setDetailsError(errorMessage(e));
    } finally {
      setDetailsBusy(false);
    }
  }

  async function shareReferral() {
    if (!referralLink) return;
    const text = audience === 'trader'
      ? 'I joined the BuildPair launch list. If you’re a builder or tradesperson, take a look:'
      : 'I joined the BuildPair launch list. Take a look:';
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: 'BuildPair', text, url: referralLink });
        return;
      }
      await Share.share({ message: `${text} ${referralLink}` });
    } catch {
      // The user can cancel a native share sheet without turning it into an error state.
    }
  }

  async function copyReferralLink() {
    if (!referralLink) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
        setReferralCopied(true);
        return;
      }
      await Share.share({ message: referralLink });
    } catch {
      // Leave the selectable URL visible as the final fallback.
    }
  }

  const chosenContactCopy = contactPreference === 'sms'
    ? 'We’ll text the mobile number you chose when BuildPair registration opens.'
    : contactPreference === 'both'
      ? 'We’ll email and text you when BuildPair registration opens.'
      : 'We’ll email you when BuildPair registration opens.';

  if (joined) return <Screen title={audience === 'trader' ? 'Your Founding Trade place is reserved' : 'Welcome to BuildPair early access'} subtitle={`BuildPair launches ${LAUNCH_DATE_LABEL}.`}>
    <AppCard style={styles.successCard}>
      <Chip icon="check-circle">Launch list confirmed</Chip>
      <Text variant="headlineSmall" style={styles.heading}>{joined.alreadyJoined ? (audience === 'trader' ? 'Your founding place is already reserved.' : 'You’re already registered for early access.') : (audience === 'trader' ? 'You’re in the Surrey Founding 50 group.' : 'You’re in. Welcome to BuildPair early access.')}</Text>
      <Text style={styles.body}>{chosenContactCopy} No account has been created yet. {audience === 'trader' ? 'We can help you finish the business profile when your early-access invite is ready.' : 'There is nothing else you have to do.'}</Text>
      {requestEarlyAccess ? <View style={styles.earlySuccess}>
        <Chip icon="key-clock-outline">Early access requested</Chip>
        <Text style={styles.body}>You’ve asked to start before the public launch. We’ll invite selected early users in manageable batches while we finish real-world testing. Requesting a place does not guarantee an invitation, but your interest is now recorded.</Text>
      </View> : null}
      {audience === 'trader' ? <>
        <Text style={styles.body}><Text style={styles.strong}>Founding Trades:</Text> the first 100 eligible tradespeople to complete BuildPair registration during the launch offer receive 3 months of Pro free. Other eligible tradespeople joining during the launch offer receive 3 months of Plus free.</Text>
        <Text style={styles.body}>No pay-per-lead charges. Keep using BuildPair for genuine jobs and BuildPay completions and you can unlock further membership rewards.</Text>
        <Link href="/(public)/rewards" asChild><Button mode="text">See BuildPair Rewards →</Button></Link>
      </> : null}
    </AppCard>

    {joined.referralCode ? <AppCard style={styles.referralCard}>
      <Chip icon="account-multiple-plus-outline">Your personal BuildPair link</Chip>
      <Text variant="titleLarge" style={styles.heading}>{audience === 'trader' ? 'Know another decent builder or trade?' : 'Know someone who should see BuildPair?'}</Text>
      <Text style={styles.body}>Share your link. If someone joins the launch list through it, BuildPair records that as your referral so we can see which early members are actually helping the community grow.</Text>
      <View style={styles.referralStat}>
        <Text variant="headlineMedium" style={styles.referralNumber}>{joined.referralCount ?? 0}</Text>
        <Text style={styles.referralStatLabel}>{(joined.referralCount ?? 0) === 1 ? 'confirmed referral' : 'confirmed referrals'}</Text>
      </View>
      <Text selectable style={styles.referralLink}>{referralLink}</Text>
      <View style={styles.referralActions}>
        <Button mode="contained" icon="share-variant-outline" onPress={() => void shareReferral()}>Share BuildPair</Button>
        <Button mode="outlined" icon={referralCopied ? 'check' : 'content-copy'} onPress={() => void copyReferralLink()}>{referralCopied ? 'Copied' : 'Copy link'}</Button>
      </View>
      <Text style={styles.smsNote}>We’re counting genuine launch-list signups first. Any referral rewards will be clearly announced if we introduce them later.</Text>
    </AppCard> : null}

    <AppCard>
      <Chip icon="key-plus">Optional</Chip>
      <Text variant="titleLarge" style={styles.heading}>{requestEarlyAccess ? 'Help us prioritise your early-access request' : 'Want to request early access?'}</Text>
      <Text style={styles.body}>{requestEarlyAccess ? 'Add your name and postcode so we have a little more context when selecting early users. Your launch-list place and early-access request are already saved.' : 'If you would like to try BuildPair before public launch, add a few details here. Your launch-list place is already saved.'}</Text>
      {detailsSaved ? <Text style={styles.saved}>Early-access details saved. Thanks.</Text> : <>
        <TextInput mode="outlined" label="Name" value={name} onChangeText={setName} autoComplete="name" />
        {!phone.trim() ? <TextInput mode="outlined" label="Mobile (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="07911 123456" /> : null}
        <TextInput mode="outlined" label="Postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" placeholder="TW18 1AA" />
        <Checkbox.Item
          label="You may text me about my requested early access"
          status={smsOptIn ? 'checked' : 'unchecked'}
          disabled={!phone.trim() || !contactOptions.smsEnabled}
          onPress={() => setSmsOptIn((value) => !value)}
          position="leading"
          labelStyle={styles.checkboxLabel}
        />
        {!contactOptions.smsEnabled && phone.trim() ? <Text style={styles.smsNote}>SMS updates are coming soon. Your number can still be saved now if you want to use text updates later.</Text> : null}
        <HelperText type="error" visible={Boolean(detailsError)}>{detailsError}</HelperText>
        <Button mode="outlined" icon="key-plus" loading={detailsBusy} disabled={detailsBusy || !canSaveDetails} onPress={() => void saveTestingDetails()}>{requestEarlyAccess ? 'Save early-access details' : 'Request early access'}</Button>
      </>}
    </AppCard>

    <Link href="/" asChild><Button mode="text">Back to BuildPair</Button></Link>
  </Screen>;

  return <Screen title={audience === 'trader' ? 'Become a BuildPair Founding Trade' : 'Get BuildPair early access'} subtitle={audience === 'trader' ? `Surrey Founding 50 • launching ${LAUNCH_DATE_LABEL}` : `Launching ${LAUNCH_DATE_LABEL}. Get notified and request early access.`}>
    <AppCard style={styles.heroCard}>
      <Chip icon="rocket-launch-outline">You’re early. That’s a good thing.</Chip>
      <Text variant="headlineSmall" style={styles.heading}>{audience === 'trader' ? 'Claim a Surrey Founding 50 place.' : 'Get notified at launch, or ask to get in sooner.'}</Text>
      <Text style={styles.body}>{audience === 'trader' ? 'For established Surrey trades who want local opportunities without buying individual leads. Reserve a place with your email now; we can help with the full profile afterwards.' : 'BuildPair gives homeowners a clearer way to find, compare and manage work. Early access takes less than a minute.'}</Text>
    </AppCard>

    <AppCard>
      {incomingReferralCode ? <Chip icon="account-multiple-check-outline">You were invited by an early BuildPair member</Chip> : null}
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
      {!contactOptions.smsEnabled ? <Text style={styles.smsNote}>SMS updates are coming soon. Email updates are available now; adding a mobile number is optional.</Text> : null}

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
          <Text variant="titleMedium" style={styles.heading}>Founding 50: Surrey launch group</Text>
          <Text style={styles.body}>We’re personally onboarding the first 50 Surrey trades with early setup support and founding-member recognition. Separately, the first 100 eligible tradespeople to complete BuildPair registration during the launch offer receive <Text style={styles.strong}>3 months of BuildPair Pro free</Text>.</Text>
          <Text style={styles.tradePromise}>No paying for a lead that goes nowhere. No giant bill just for sitting in a directory. BuildPair uses straightforward membership options and gives you tools to quote, manage and complete the work once you win it.</Text>
          <Text variant="bodySmall" style={styles.smsNote}>BuildPair Rewards can add further Pro time for genuine completed jobs, BuildPay completions and qualifying member activity. Promotional eligibility and fair-use rules apply.</Text>
          <Link href="/(public)/rewards" asChild><Button mode="text">View BuildPair Rewards</Button></Link>
        </AppCard>
      </> : null}

      {audience === 'homeowner' ? <AppCard elevated={false} style={styles.earlyCard}>
        <Checkbox.Item
          label="I’d like early access before the public launch"
          status={requestEarlyAccess ? 'checked' : 'unchecked'}
          onPress={() => setRequestEarlyAccess((value) => !value)}
          position="leading"
          labelStyle={styles.earlyLabel}
        />
        <Text style={styles.earlyHelp}>We’re inviting a limited number of homeowners in batches for real-world testing. Tick this if you want to be considered.</Text>
      </AppCard> : null}

      <Text style={styles.privacy}>{contactPreference === 'sms'
        ? 'You’re asking BuildPair to send service texts about the launch and your requested early access. We will not use this as consent for marketing texts.'
        : contactPreference === 'both'
          ? 'You’re asking BuildPair to contact you by email and service text about the launch and requested early access. Marketing messages require separate consent.'
          : audience === 'trader'
            ? 'We’ll use your email to reserve your Founding Trade place and contact you about onboarding or launch access. If you add an optional mobile number, we will not text it unless you later opt in.'
            : `We’ll use your email for launch and early-access updates${requestEarlyAccess ? ' including your early-access request' : ''}. If you add an optional mobile number, we will not text it unless you later choose text updates or separately opt in.`} See our Privacy Policy for details.</Text>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" icon={audience === 'trader' ? 'hammer-wrench' : requestEarlyAccess ? 'key-plus' : 'account-clock-outline'} loading={busy} disabled={busy || !canJoin} onPress={() => void join()}>{audience === 'trader' ? 'Claim my Founding 50 place' : requestEarlyAccess ? 'Get early access' : 'Get launch updates'}</Button>
      <View style={styles.links}><Link href="/(public)/privacy" asChild><Button mode="text">Privacy</Button></Link><Link href="/auth/sign-in" asChild><Button mode="text">Existing member? Sign in</Button></Link></View>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  offerCard: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  earlyCard: { backgroundColor: '#F7FAFC', borderColor: colors.primary, gap: 2 },
  successCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  referralCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  referralStat: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm },
  referralNumber: { color: colors.primaryDark, fontWeight: '900' },
  referralStatLabel: { color: colors.charcoal, fontWeight: '800' },
  referralLink: { color: colors.accentDark, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  referralActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  earlySuccess: { gap: 6, marginTop: 4 },
  heading: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  strong: { fontWeight: '900' },
  tradePromise: { color: colors.charcoal, lineHeight: 21, fontSize: 14, fontWeight: '700' },
  label: { color: colors.charcoal, fontWeight: '800', marginTop: spacing.xs },
  earlyLabel: { color: colors.charcoal, lineHeight: 21, fontWeight: '800' },
  earlyHelp: { color: colors.muted, lineHeight: 19, fontSize: 12, paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  checkboxLabel: { color: colors.text, lineHeight: 20 },
  privacy: { color: colors.muted, lineHeight: 19, fontSize: 12 },
  smsNote: { color: colors.muted, lineHeight: 19, fontSize: 12 },
  saved: { color: colors.success, fontWeight: '800', lineHeight: 22 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
});
