import { useSignUp } from '@clerk/expo';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { modeSetupHref, signInHref } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';

type InviteState = {
  valid: boolean;
  claimed?: boolean;
  email?: string;
  mode?: 'trader';
};

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function EarlyAccessSignup() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
  const invite = scalar(params.invite)?.trim() ?? '';
  const [inviteState, setInviteState] = useState<InviteState>();
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const busy = fetchStatus === 'fetching';
  const email = inviteState?.email ?? '';
  const needsEmailVerification = signUp.status === 'missing_requirements'
    && signUp.unverifiedFields.includes('email_address')
    && signUp.missingFields.length === 0;

  useEffect(() => {
    let alive = true;
    async function validate() {
      if (!invite) {
        if (alive) { setInviteState({ valid: false }); setChecking(false); }
        return;
      }
      try {
        const result = await apiFetch<InviteState>(`/api/early-access-invite?invite=${encodeURIComponent(invite)}`);
        if (alive) setInviteState(result);
      } catch (e) {
        const message = errorMessage(e);
        if (alive) setInviteState({ valid: false, claimed: message.toLowerCase().includes('gone') });
      } finally {
        if (alive) setChecking(false);
      }
    }
    void validate();
    return () => { alive = false; };
  }, [invite]);

  const canCreate = useMemo(() => inviteState?.valid === true && password.length >= 8, [inviteState?.valid, password.length]);

  async function startSignup() {
    if (!email || !inviteState?.valid) return;
    try {
      setError('');
      const result = await signUp.password({
        emailAddress: email.toLowerCase(),
        password,
        unsafeMetadata: { buildpairMode: 'trader', earlyAccessInvite: true },
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
      const verification = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verification.error) throw verification.error;
      if (signUp.status !== 'complete') throw new Error(`Account verification is incomplete (${signUp.status}).`);
      const finalized = await signUp.finalize({
        navigate: async ({ session }) => {
          if (session?.currentTask) throw new Error('Your account needs another setup step before BuildPair can continue.');
          router.replace(modeSetupHref('trader'));
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
      const result = await signUp.verifications.sendEmailCode();
      if (result.error) throw result.error;
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (checking) return <LoadingScreen label="Checking your BuildPair invite…" />;

  if (!inviteState?.valid) {
    return <Screen title="Early-access invite" subtitle="This invite is unavailable or has already been used.">
      <AppCard>
        <Chip icon="lock-outline">Registration remains invite-only</Chip>
        <Text style={styles.body}>BuildPair registration is still paused for the public. Existing members can sign in normally.</Text>
        <Link href={signInHref('trader')} asChild><Button mode="contained">Tradesperson sign in</Button></Link>
        <Link href="/(public)/waitlist?audience=trader&source=early-access" asChild><Button mode="outlined">Join the launch list</Button></Link>
      </AppCard>
    </Screen>;
  }

  if (needsEmailVerification) {
    return <Screen title="Verify your email" subtitle={`We sent a 6-digit code to ${email}.`}>
      <AppCard style={styles.inviteCard}>
        <Chip icon="check-decagram-outline">BuildPair early access</Chip>
        <Text variant="titleLarge" style={styles.heading}>MKE Property Maintenance Ltd</Text>
        <Text style={styles.body}>Confirm the invited email address to finish creating the tradesperson account.</Text>
      </AppCard>
      <TextInput mode="outlined" label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyEmail()} contentStyle={styles.button}>Verify and continue</Button>
      <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
    </Screen>;
  }

  return <Screen title="Create your BuildPair tradesperson account" subtitle="This early-access invite is restricted to the approved email address below.">
    <AppCard style={styles.inviteCard}>
      <Chip icon="rocket-launch-outline">Early access approved</Chip>
      <Text variant="titleLarge" style={styles.heading}>MKE Property Maintenance Ltd</Text>
      <Text style={styles.body}>You can register now while public account creation remains closed.</Text>
    </AppCard>
    <TextInput mode="outlined" label="Invited email" value={email} editable={false} autoCapitalize="none" keyboardType="email-address" />
    <TextInput mode="outlined" label="Create password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
    <Text variant="bodySmall" style={styles.hint}>Use at least 8 characters. You will verify access using a code sent to the invited email address.</Text>
    <View nativeID="clerk-captcha" />
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" loading={busy} disabled={busy || !canCreate} onPress={() => void startSignup()} contentStyle={styles.button}>Create early-access account</Button>
    <Link href={signInHref('trader')} asChild><Button mode="text">Already registered? Sign in</Button></Link>
  </Screen>;
}

const styles = StyleSheet.create({
  inviteCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  heading: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  hint: { color: colors.muted, lineHeight: 19 },
  button: { minHeight: 50 },
});
