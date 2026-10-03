import { useSignUp } from '@clerk/expo';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { modeSetupHref, signInHref } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';
import { HOMEOWNER_REGISTRATION_OPEN } from '@/lib/launch';
import { firstParam } from '@/lib/search-params';

type InviteState = {
  valid: boolean;
  claimed?: boolean;
  email?: string;
  needsEmail?: boolean;
  phoneHint?: string;
  mode?: 'homeowner' | 'trader';
};


export default function EarlyAccessSignup() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
  const invite = firstParam(params.invite)?.trim() ?? '';
  const [inviteState, setInviteState] = useState<InviteState>();
  const [checking, setChecking] = useState(true);
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const busy = fetchStatus === 'fetching';
  const email = inviteState?.email?.trim().toLowerCase() ?? '';
  const accountMode = inviteState?.mode === 'homeowner' ? 'customer' : 'trader';
  const roleLabel = accountMode === 'customer' ? 'homeowner' : 'tradesperson';
  const needsEmailVerification = signUp.status === 'missing_requirements'
    && signUp.unverifiedFields.includes('email_address')
    && signUp.missingFields.length === 0;

  async function readInvite() {
    if (!invite) return { valid: false } as InviteState;
    return apiFetch<InviteState>(`/api/early-access-invite?invite=${encodeURIComponent(invite)}`);
  }

  useEffect(() => {
    let alive = true;
    async function validate() {
      try {
        const result = await readInvite();
        if (alive) {
          setInviteState(result);
          if (result.email) setAccountEmail(result.email);
        }
      } catch {
        if (alive) setInviteState({ valid: false });
      } finally {
        if (alive) setChecking(false);
      }
    }
    void validate();
    return () => { alive = false; };
  }, [invite]);

  const canCreate = useMemo(() => inviteState?.valid === true && Boolean(email) && password.length >= 8, [email, inviteState?.valid, password.length]);
  const canAttachEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim());

  async function attachEmail() {
    if (!canAttachEmail) return;
    try {
      setSavingEmail(true);
      setError('');
      const result = await apiFetch<InviteState>('/api/early-access-invite', {
        method: 'POST',
        body: JSON.stringify({ invite, email: accountEmail.trim().toLowerCase() }),
      });
      setInviteState((current) => ({ ...current, ...result, valid: true, needsEmail: false }));
      setAccountEmail(result.email ?? accountEmail.trim().toLowerCase());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingEmail(false);
    }
  }

  async function confirmInvite() {
    const latest = await readInvite();
    if (!latest.valid || latest.email?.trim().toLowerCase() !== email || latest.mode !== inviteState?.mode) {
      throw new Error('This early-access invite is no longer valid.');
    }
  }

  async function startSignup() {
    if (!canCreate) return;
    try {
      setError('');
      await confirmInvite();
      const result = await signUp.password({
        emailAddress: email,
        password,
        unsafeMetadata: { buildpairMode: accountMode, buildpairEarlyAccess: true },
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
          if (session?.currentTask) throw new Error('Your account needs another setup step before BuildPair can continue.');
          router.replace(modeSetupHref(accountMode));
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

  if (checking) return <LoadingScreen label="Checking your BuildPair early-access invite…" />;

  if (!inviteState?.valid) {
    return <Screen title="Early-access invite" subtitle="This invite is unavailable, has been withdrawn or has already been used.">
      <AppCard>
        <Chip icon="lock-outline">Registration remains invite-only</Chip>
        <Text style={styles.body}>If you already created your BuildPair account, sign in normally. Otherwise, your place on the launch list is unaffected.</Text>
        <Link href={signInHref(accountMode)} asChild><Button mode="contained">Sign in</Button></Link>
        <Link href={`/(public)/waitlist?audience=${accountMode === 'trader' ? 'trader' : 'homeowner'}&source=early-access`} asChild><Button mode="outlined">Back to the launch list</Button></Link>
      </AppCard>
    </Screen>;
  }

  if (accountMode === 'customer' && !HOMEOWNER_REGISTRATION_OPEN) {
    return <Screen title="Homeowners open at launch" subtitle="Your place is saved and we’ll notify you when job posting opens.">
      <AppCard style={styles.inviteCard}>
        <Chip icon="lock-clock">Pre-launch</Chip>
        <Text variant="titleLarge" style={styles.heading}>Your invite is safe, but homeowner accounts stay closed for now.</Text>
        <Text style={styles.body}>We’re letting tradespeople prepare their business profiles before launch. Homeowner job posting, messaging and payments will open with the marketplace.</Text>
        <Link href="/(public)/waitlist?audience=homeowner&source=homeowner-invite-paused" asChild><Button mode="contained">Keep me updated for launch</Button></Link>
      </AppCard>
    </Screen>;
  }

  if (inviteState.needsEmail || !email) {
    return <Screen title="Set up your BuildPair account" subtitle="Your text invite is valid. Add the email address you want to use to sign in.">
      <AppCard style={styles.inviteCard}>
        <Chip icon="message-check-outline">Early access approved</Chip>
        <Text variant="titleLarge" style={styles.heading}>Your invitation is confirmed</Text>
        <Text style={styles.body}>This invite was sent to {inviteState.phoneHint || 'your mobile'}. BuildPair accounts use a verified email for secure sign-in, receipts and important account messages.</Text>
      </AppCard>
      <TextInput mode="outlined" label="Email address for your account" value={accountEmail} onChangeText={setAccountEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Text style={styles.hint}>This will be added to your launch-list entry and locked to this one-time invitation.</Text>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={savingEmail} disabled={savingEmail || !canAttachEmail} onPress={() => void attachEmail()} contentStyle={styles.button}>Continue with this email</Button>
    </Screen>;
  }

  if (needsEmailVerification) {
    return <Screen title="Verify your email" subtitle={`We sent a 6-digit code to ${email}.`}>
      <AppCard style={styles.inviteCard}>
        <Chip icon="check-decagram-outline">BuildPair early access</Chip>
        <Text variant="titleLarge" style={styles.heading}>One last step</Text>
        <Text style={styles.body}>Confirm the invited email address to finish creating your {roleLabel} account.</Text>
      </AppCard>
      <TextInput mode="outlined" label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyEmail()} contentStyle={styles.button}>Verify and continue</Button>
      <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
    </Screen>;
  }

  return <Screen title={`Create your BuildPair ${roleLabel} account`} subtitle="You’ve been approved to join BuildPair before the public launch.">
    <AppCard style={styles.inviteCard}>
      <Chip icon="rocket-launch-outline">Early access approved</Chip>
      <Text variant="titleLarge" style={styles.heading}>Your account is ready to set up</Text>
      <Text style={styles.body}>This invitation is locked to <Text style={styles.strong}>{email}</Text>. Once registered, complete your real trade profile and trust information. Jobs, quotes, messaging and payments remain locked until BuildPair launches.</Text>
    </AppCard>
    <TextInput mode="outlined" label="Approved email address" value={email} editable={false} autoCapitalize="none" keyboardType="email-address" />
    <TextInput mode="outlined" label="Choose a password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
    <Text variant="bodySmall" style={styles.hint}>Use at least 8 characters. You’ll verify access using a code sent to this email address.</Text>
    <View nativeID="clerk-captcha" />
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" loading={busy} disabled={busy || !canCreate} onPress={() => void startSignup()} contentStyle={styles.button}>Create my BuildPair account</Button>
    <Link href={signInHref(accountMode)} asChild><Button mode="text">Already registered? Sign in</Button></Link>
  </Screen>;
}

const styles = StyleSheet.create({
  inviteCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  heading: { color: colors.charcoal, fontWeight: '900' },
  strong: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  hint: { color: colors.muted, lineHeight: 19 },
  button: { minHeight: 50 },
});
