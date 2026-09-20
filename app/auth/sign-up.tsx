import { useSignUp } from '@clerk/expo';
import { Link, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { modeSetupHref, parseAccountMode, signInHref } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';
import { LAUNCH_DATE_LABEL, TRADER_PRELAUNCH_REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';

type InviteStatus = {
  valid: boolean;
  claimed?: boolean;
  email?: string;
  mode?: 'homeowner' | 'trader';
};

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string | string[];
    invite?: string | string[];
    jobTitle?: string | string[];
    jobCategory?: string | string[];
    jobLocation?: string | string[];
  }>();
  const inviteToken = scalar(params.invite)?.trim() ?? '';
  const requestedMode = parseAccountMode(params.mode);
  const jobTitle = scalar(params.jobTitle);
  const jobCategory = scalar(params.jobCategory);
  const jobLocation = scalar(params.jobLocation);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>();
  const [directEmail, setDirectEmail] = useState('');
  const [checkingInvite, setCheckingInvite] = useState(Boolean(inviteToken));
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteToken) return;
    let active = true;
    setCheckingInvite(true);
    apiFetch<InviteStatus>(`/api/early-access-invite?invite=${encodeURIComponent(inviteToken)}`)
      .then((result) => { if (active) setInviteStatus(result); })
      .catch(() => { if (active) setInviteStatus({ valid: false }); })
      .finally(() => { if (active) setCheckingInvite(false); });
    return () => { active = false; };
  }, [inviteToken]);

  const directTraderPrelaunch = !inviteToken && requestedMode === 'trader' && TRADER_PRELAUNCH_REGISTRATION_OPEN;
  if (!inviteToken && !directTraderPrelaunch) return <Redirect href={waitlistHref(requestedMode, 'direct-signup')} />;
  if (inviteToken && (checkingInvite || !inviteStatus)) return <LoadingScreen label="Checking your BuildPair early-access invite…" />;

  const mode = inviteToken ? (inviteStatus?.mode === 'homeowner' ? 'customer' : 'trader') : 'trader';
  const email = inviteToken ? inviteStatus?.email?.trim().toLowerCase() ?? '' : directEmail.trim().toLowerCase();
  const busy = fetchStatus === 'fetching';
  const needsEmailVerification = signUp.status === 'missing_requirements'
    && signUp.unverifiedFields.includes('email_address')
    && signUp.missingFields.length === 0;
  const verificationEmail = signUp.emailAddress ?? email;
  const title = mode === 'customer' ? 'Create Homeowner Account' : directTraderPrelaunch ? 'Create your Founding Trade account' : 'Create Tradesperson Account';

  if (inviteToken && (!inviteStatus?.valid || !email)) {
    return <Screen title="This early-access invite is no longer available" subtitle={inviteStatus.claimed ? 'This invite has already been used.' : 'The link may have expired, been replaced or been withdrawn.'}>
      <AppCard style={styles.inviteCard}>
        <Text style={styles.inviteText}>If you already created an account, sign in normally. Otherwise, your place on the launch list is unaffected.</Text>
      </AppCard>
      <Link href={signInHref(mode)} asChild><Button mode="contained">Sign in</Button></Link>
      <Link href={waitlistHref(mode, 'expired-early-access')} asChild><Button mode="outlined">Back to launch list</Button></Link>
    </Screen>;
  }

  async function confirmInvite() {
    if (!inviteToken) return;
    const result = await apiFetch<InviteStatus>(`/api/early-access-invite?invite=${encodeURIComponent(inviteToken)}`);
    if (!result.valid || result.email?.trim().toLowerCase() !== email) throw new Error('This early-access invite is no longer valid.');
  }

  async function startEmailSignUp() {
    try {
      setError('');
      await confirmInvite();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
      const result = await signUp.password({
        emailAddress: email,
        password,
        unsafeMetadata: { buildpairMode: mode, buildpairEarlyAccess: Boolean(inviteToken), buildpairPrelaunchProfile: directTraderPrelaunch },
      });
      if (result.error) throw result.error;
      const verification = await signUp.verifications.sendEmailCode();
      if (verification.error) throw verification.error;
      setCode('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function verifyEmail() {
    try {
      setError('');
      await confirmInvite();
      if ((signUp.emailAddress ?? '').trim().toLowerCase() !== email) throw new Error(inviteToken ? 'This invite is tied to a different email address.' : 'The verification email does not match this sign-up.');
      const verification = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verification.error) throw verification.error;
      if (signUp.status !== 'complete') {
        const missing = signUp.missingFields?.join(', ');
        throw new Error(missing ? `Account verification still needs: ${missing}.` : `Account verification is incomplete (${signUp.status}).`);
      }
      const finalized = await signUp.finalize({
        navigate: async ({ session }) => {
          if (session?.currentTask) throw new Error('Account needs another setup step before BuildPair can continue.');
          router.replace(modeSetupHref(mode));
        },
      });
      if (finalized.error) throw finalized.error;
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function resendCode() {
    try {
      setError('');
      await confirmInvite();
      const result = await signUp.verifications.sendEmailCode();
      if (result.error) throw result.error;
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const jobContext = jobTitle ? <AppCard style={styles.contextCard}>
    <Text variant="labelLarge" style={styles.contextLabel}>Joining this job to quote</Text>
    <Text variant="titleLarge" style={styles.contextTitle}>{jobTitle}</Text>
    <Text style={styles.contextMeta}>{[jobCategory, jobLocation].filter(Boolean).join(' · ')}</Text>
  </AppCard> : null;

  if (needsEmailVerification) {
    return <Screen title="Verify your email" subtitle={`We sent a 6-digit code to ${verificationEmail}.`}>
      {jobContext}
      <TextInput label="Verification code" accessibilityLabel="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" mode="outlined" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyEmail()} contentStyle={styles.button}>Verify and continue</Button>
      <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
    </Screen>;
  }

  return <Screen title={title} subtitle={directTraderPrelaunch ? `Set everything up now. Your profile stays private until BuildPair launches.` : 'You’ve been approved for BuildPair early access before the public launch.'}>
    {jobContext}
    <AppCard style={styles.inviteCard}>
      <Text variant="titleMedium" style={styles.inviteTitle}>{directTraderPrelaunch ? 'Build your profile before launch' : 'Early access approved'}</Text>
      <Text style={styles.inviteText}>{directTraderPrelaunch ? `Create your account now and complete your business profile, services, photos and trust details. The marketplace, homeowner contact, quoting, payments and paid membership billing stay switched off until launch. Founding Pro time will not start before ${LAUNCH_DATE_LABEL}.` : <>This invite is locked to <Text style={styles.strong}>{email}</Text>. Create your account and complete your profile while we finish the public launch.</>}</Text>
    </AppCard>
    <TextInput label={directTraderPrelaunch ? 'Business email address' : 'Approved email address'} accessibilityLabel={directTraderPrelaunch ? 'Business email address' : 'Approved email address'} value={email} onChangeText={directTraderPrelaunch ? setDirectEmail : undefined} editable={directTraderPrelaunch} keyboardType="email-address" autoCapitalize="none" autoComplete="email" mode="outlined" />
    <TextInput label="Choose a password" accessibilityLabel="Choose a password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" mode="outlined" />
    <Text variant="bodySmall" style={styles.hint}>Use at least 8 characters. Your email will be verified before the account is activated.</Text>
    <View nativeID="clerk-captcha" />
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" loading={busy} disabled={busy || password.length < 8 || (directTraderPrelaunch && !email)} onPress={() => void startEmailSignUp()} contentStyle={styles.button}>{directTraderPrelaunch ? 'Create account & build my profile' : 'Create my BuildPair account'}</Button>
    <View style={styles.footer}><Text>Already registered?</Text><Link href={signInHref(mode)} asChild><Button>Sign in</Button></Link></View>
  </Screen>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48 },
  hint: { opacity: 0.7, marginTop: -4 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  inviteCard: { backgroundColor: '#FFF8F3', borderColor: colors.primary },
  inviteTitle: { color: colors.charcoal, fontWeight: '900' },
  inviteText: { color: colors.text, lineHeight: 21 },
  strong: { color: colors.charcoal, fontWeight: '900' },
  contextCard: { backgroundColor: '#FFF8F3' },
  contextLabel: { color: colors.primary, fontWeight: '900' },
  contextTitle: { color: colors.charcoal, fontWeight: '900' },
  contextMeta: { color: colors.muted, fontWeight: '700' },
});
