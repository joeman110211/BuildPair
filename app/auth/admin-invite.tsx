import { useAuth, useClerk, useSignUp } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type InviteStatus = { valid: boolean; email?: string; expiresAt?: string };

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdminInviteScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const inviteToken = scalar(params.token)?.trim() ?? '';
  const { signUp, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteStatus>();
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteToken) return;
    let active = true;
    apiFetch<InviteStatus>(`/api/admin-invite?token=${encodeURIComponent(inviteToken)}`)
      .then((result) => { if (active) setInvite(result); })
      .catch(() => { if (active) setInvite({ valid: false }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [inviteToken]);

  if (!inviteToken) {
    return <Screen title="Administrator invitation unavailable" subtitle="This link has expired, has already been used, or has been withdrawn.">
      <Button mode="contained" onPress={() => router.replace('/auth/sign-in?admin=1')}>Administrator sign in</Button>
    </Screen>;
  }

  if (loading || !invite) return <LoadingScreen label="Checking your BuildPair administrator invitation…" />;

  if (!invite.valid || !invite.email) {
    return <Screen title="Administrator invitation unavailable" subtitle="This link has expired, has already been used, or has been withdrawn.">
      <Button mode="contained" onPress={() => router.replace('/auth/sign-in?admin=1')}>Administrator sign in</Button>
    </Screen>;
  }

  const email = invite.email.trim().toLowerCase();
  const busy = fetchStatus === 'fetching';
  const needsVerification = signUp.status === 'missing_requirements'
    && signUp.unverifiedFields.includes('email_address')
    && signUp.missingFields.length === 0;

  async function recheckInvite() {
    const result = await apiFetch<InviteStatus>(`/api/admin-invite?token=${encodeURIComponent(inviteToken)}`);
    if (!result.valid || result.email?.trim().toLowerCase() !== email) {
      throw new Error('This administrator invitation is no longer valid.');
    }
  }

  async function startSignUp() {
    try {
      setError('');
      await recheckInvite();
      const result = await signUp.password({
        emailAddress: email,
        password,
        unsafeMetadata: { buildpairAdminInvite: true },
      });
      if (result.error) throw result.error;
      const verification = await signUp.verifications.sendEmailCode();
      if (verification.error) throw verification.error;
      setCode('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function verifyAndAccept() {
    try {
      setError('');
      await recheckInvite();
      if ((signUp.emailAddress ?? '').trim().toLowerCase() !== email) {
        throw new Error('This invitation belongs to a different email address.');
      }
      const verification = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verification.error) throw verification.error;
      if (signUp.status !== 'complete') {
        const missing = signUp.missingFields?.join(', ');
        throw new Error(missing ? `Account setup still needs: ${missing}.` : `Account setup is incomplete (${signUp.status}).`);
      }

      const finalized = await signUp.finalize({
        navigate: async ({ session }) => {
          if (session?.currentTask) throw new Error('Your administrator account needs another security step before it can continue.');
          const sessionToken = await session.getToken();
          if (!sessionToken) throw new Error('Unable to authenticate the new administrator session.');
          await apiFetch<{ ok: boolean }>('/api/admin-invite', {
            method: 'POST',
            body: JSON.stringify({ token: inviteToken }),
          }, async () => sessionToken);
          router.replace('/admin');
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
      await recheckInvite();
      const result = await signUp.verifications.sendEmailCode();
      if (result.error) throw result.error;
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (isSignedIn && !signUp.emailAddress) {
    return <Screen title="Administrator invitation" subtitle="This invitation needs its own administrator account session.">
      <AppCard style={styles.inviteCard}>
        <Text style={styles.body}>The invitation is for <Text style={styles.strong}>{email}</Text>. Sign out of the current account before creating the administrator login.</Text>
      </AppCard>
      <Button mode="contained" onPress={() => signOut()}>Sign out and continue</Button>
    </Screen>;
  }

  if (needsVerification) {
    return <Screen title="Verify administrator email" subtitle={`We sent a 6-digit code to ${email}.`}>
      <AppCard style={styles.inviteCard}>
        <Text style={styles.body}>After verification, this account will be granted BuildPair administrator access only.</Text>
      </AppCard>
      <TextInput label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" mode="outlined" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyAndAccept()} contentStyle={styles.button}>Verify and join BuildPair Admin</Button>
      <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
    </Screen>;
  }

  return <Screen title="You’ve been invited to BuildPair Admin" subtitle="Create a private administrator login. This is separate from the homeowner and tradesperson signup journey.">
    <AppCard style={styles.inviteCard}>
      <Text variant="titleMedium" style={styles.title}>Administrator access approved</Text>
      <Text style={styles.body}>This invitation is locked to <Text style={styles.strong}>{email}</Text>. Choose your own password, verify the email, then you can sign directly into the administrator panel.</Text>
    </AppCard>
    <TextInput label="Invited email address" value={email} editable={false} mode="outlined" />
    <TextInput label="Create administrator password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" mode="outlined" />
    <Text variant="bodySmall" style={styles.hint}>Use at least 8 characters. The email address cannot be changed during this invitation.</Text>
    <View nativeID="clerk-captcha" />
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" loading={busy} disabled={busy || password.length < 8} onPress={() => void startSignUp()} contentStyle={styles.button}>Create administrator account</Button>
  </Screen>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48 },
  inviteCard: { backgroundColor: '#FFF8F3', borderColor: colors.primary },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 21 },
  strong: { color: colors.charcoal, fontWeight: '900' },
  hint: { color: colors.muted, marginTop: -4 },
});