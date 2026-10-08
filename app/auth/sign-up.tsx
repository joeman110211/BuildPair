import { useSignUp } from '@clerk/expo';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LegalAcceptance } from '@/components/LegalAcceptance';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { modeSetupHref, parseAccountMode, signInHref } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';
import { HOMEOWNER_REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';
import { firstParam } from '@/lib/search-params';

type InviteStatus = {
  valid: boolean;
  claimed?: boolean;
  email?: string;
  mode?: 'homeowner' | 'trader';
};


export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string | string[];
    invite?: string | string[];
    jobTitle?: string | string[];
    jobCategory?: string | string[];
    jobLocation?: string | string[];
    returnTo?: string | string[];
  }>();
  const inviteToken = firstParam(params.invite)?.trim() ?? '';
  const requestedMode = parseAccountMode(params.mode);
  const jobTitle = firstParam(params.jobTitle);
  const jobCategory = firstParam(params.jobCategory);
  const jobLocation = firstParam(params.jobLocation);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>();
  const [checkingInvite, setCheckingInvite] = useState(Boolean(inviteToken));
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
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


  if (inviteToken && (checkingInvite || !inviteStatus)) return <LoadingScreen label="Checking your BuildPair early-access invite…" />;

  const mode = inviteToken ? (inviteStatus?.mode === 'homeowner' ? 'customer' : 'trader') : (requestedMode ?? 'customer');
  const email = inviteToken ? (inviteStatus?.email?.trim().toLowerCase() ?? '') : emailInput.trim().toLowerCase();
  const busy = fetchStatus === 'fetching';
  const needsEmailVerification = signUp.status === 'missing_requirements'
    && signUp.unverifiedFields.includes('email_address')
    && signUp.missingFields.length === 0;
  const verificationEmail = signUp.emailAddress ?? email;
  const title = mode === 'customer' ? 'Create homeowner account' : 'Create tradesperson account';

  if (mode === 'customer' && !HOMEOWNER_REGISTRATION_OPEN) {
    return <Screen title="Homeowners open at launch" subtitle="Join the launch list and we’ll notify you when job posting opens.">
      <AppCard style={styles.inviteCard}>
        <Text variant="titleMedium" style={styles.inviteTitle}>Marketplace pre-launch</Text>
        <Text style={styles.inviteText}>Tradespeople can prepare their business profiles now. Homeowner accounts, jobs, quotes, messaging and payments open with the marketplace.</Text>
      </AppCard>
      <Link href={waitlistHref('customer', 'homeowner-invite-paused')} asChild><Button mode="contained">Join launch list</Button></Link>
    </Screen>;
  }

  if (inviteToken && (!inviteStatus?.valid || !email)) {
    return <Screen title="This early-access invite is no longer available" subtitle={inviteStatus?.claimed ? 'This invite has already been used.' : 'The link may have expired, been replaced or been withdrawn.'}>
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
    if (!legalAccepted) return;
    try {
      setError('');
      await confirmInvite();
      const result = await signUp.password({
        emailAddress: email,
        password,
        legalAccepted,
        unsafeMetadata: { buildpairMode: mode, ...(inviteToken ? { buildpairEarlyAccess: true } : {}) },
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
      if ((signUp.emailAddress ?? '').trim().toLowerCase() !== email) throw new Error('This invite is tied to a different email address.');
      const verification = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verification.error) throw verification.error;
      if (signUp.status !== 'complete') {
        const missing = signUp.missingFields?.join(', ');
        throw new Error(missing ? `Account verification still needs: ${missing}.` : `Account verification is incomplete (${signUp.status}).`);
      }
      const finalized = await signUp.finalize({
        navigate: async ({ session }) => {
          if (session?.currentTask) throw new Error('Account needs another setup step before BuildPair can continue.');
          router.replace(modeSetupHref(mode, firstParam(params.returnTo)));
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

  return <Screen title={title} subtitle={inviteToken ? 'Complete your early-access registration.' : mode === 'customer' ? 'Create an account to post your job and compare quotes.' : 'Create an account to find work and manage customers.'}>
    {jobContext}
    {inviteToken ? <AppCard style={styles.inviteCard}><Text variant="titleMedium" style={styles.inviteTitle}>Early access approved</Text><Text style={styles.inviteText}>This invitation is linked to <Text style={styles.strong}>{email}</Text>.</Text></AppCard> : null}
    {!inviteToken && mode === 'trader' ? <AppCard style={styles.inviteCard}><Text variant="titleMedium" style={styles.inviteTitle}>Three months of BuildPair Pro free</Text><Text style={styles.inviteText}>Your three free months begin when you complete your trade profile. No card details or automatic subscription required. BuildPay is coming soon.</Text></AppCard> : null}
    <TextInput label="Email address" accessibilityLabel="Email address" value={email} onChangeText={setEmailInput} editable={!inviteToken} keyboardType="email-address" autoCapitalize="none" autoComplete="email" mode="outlined" />
    <TextInput label="Choose a password" accessibilityLabel="Choose a password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" mode="outlined" />
    <Text variant="bodySmall" style={styles.hint}>Use at least 8 characters. Your email will be verified before the account is activated.</Text>
    <LegalAcceptance accepted={legalAccepted} onChange={setLegalAccepted} disabled={busy} />
    <View nativeID="clerk-captcha" />
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" loading={busy} disabled={busy || !legalAccepted || password.length < 8 || !email.includes('@')} onPress={() => void startEmailSignUp()} contentStyle={styles.button}>Create my BuildPair account</Button>
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
