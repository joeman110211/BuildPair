import { useSignUp } from '@clerk/expo';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { colors } from '@/constants/theme';
import { modeSetupHref, parseAccountMode, signInHref } from '@/lib/account-mode';
import { errorMessage } from '@/lib/api';

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function storedMode(value: unknown) {
  return typeof value === 'string' ? parseAccountMode(value) : null;
}

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string | string[];
    jobId?: string | string[];
    jobTitle?: string | string[];
    jobCategory?: string | string[];
    jobLocation?: string | string[];
  }>();
  const requestedMode = parseAccountMode(params.mode);
  const mode = requestedMode ?? storedMode(signUp.unsafeMetadata?.buildpairMode);
  const jobTitle = scalar(params.jobTitle);
  const jobCategory = scalar(params.jobCategory);
  const jobLocation = scalar(params.jobLocation);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const busy = fetchStatus === 'fetching';
  const needsEmailVerification = signUp.status === 'missing_requirements'
    && signUp.unverifiedFields.includes('email_address')
    && signUp.missingFields.length === 0;
  const verificationEmail = signUp.emailAddress ?? email.trim().toLowerCase();
  const title = mode === 'trader' ? 'Create Tradesperson Account' : mode === 'customer' ? 'Create Homeowner Account' : 'Create your account';
  const subtitle = mode === 'trader'
    ? 'Build your trade profile and start on Starter Free. Upgrade only when you want paid marketplace access.'
    : mode === 'customer'
      ? 'Post work, compare quotes and hire trusted trades.'
      : 'One BuildPair login can hold both Homeowner and Tradesperson profiles.';

  async function startEmailSignUp() {
    try {
      setError('');
      const emailAddress = email.trim().toLowerCase();
      const result = await signUp.password({
        emailAddress,
        password,
        unsafeMetadata: requestedMode ? { buildpairMode: requestedMode } : undefined,
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

      if (signUp.status !== 'complete') {
        const missing = signUp.missingFields?.join(', ');
        throw new Error(missing ? `Account verification still needs: ${missing}.` : `Account verification is incomplete (${signUp.status}).`);
      }

      const finalized = await signUp.finalize({
        navigate: async ({ session }) => {
          if (session?.currentTask) {
            throw new Error('Account needs another Clerk setup step before BuildPair can continue.');
          }
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
      const result = await signUp.verifications.sendEmailCode();
      if (result.error) throw result.error;
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function changeEmail() {
    await signUp.reset();
    setEmail('');
    setPassword('');
    setCode('');
    setError('');
  }

  const jobContext = jobTitle ? <AppCard style={styles.contextCard}>
    <Text variant="labelLarge" style={styles.contextLabel}>Joining this job to quote</Text>
    <Text variant="titleLarge" style={styles.contextTitle}>{jobTitle}</Text>
    <Text style={styles.contextMeta}>{[jobCategory, jobLocation].filter(Boolean).join(' · ')}</Text>
  </AppCard> : null;

  if (needsEmailVerification) {
    return (
      <Screen title="Verify your email" subtitle={`We sent a 6-digit code to ${verificationEmail}.`}>
        {jobContext}
        <TextInput
          label="Verification code"
          accessibilityLabel="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          mode="outlined"
        />
        <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
        <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyEmail()} contentStyle={styles.button}>
          Verify and continue
        </Button>
        <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
        <Button disabled={busy} onPress={() => void changeEmail()}>Change email</Button>
      </Screen>
    );
  }

  return (
    <Screen title={title} subtitle={subtitle}>
      {jobContext}
      <SocialAuthButtons onError={setError} mode={mode} />
      <TextInput
        label="Email address"
        accessibilityLabel="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        mode="outlined"
      />
      <TextInput
        label="Password"
        accessibilityLabel="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        mode="outlined"
      />
      <Text variant="bodySmall" style={styles.hint}>Use at least 8 characters. Clerk also checks passwords against known data breaches.</Text>
      <View nativeID="clerk-captcha" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button
        mode="contained"
        loading={busy}
        disabled={busy || !email.trim() || password.length < 8}
        onPress={() => void startEmailSignUp()}
        contentStyle={styles.button}
      >
        Create account with email
      </Button>
      <View style={styles.footer}>
        <Text>Already registered?</Text>
        <Link href={mode ? signInHref(mode) : '/auth/account'} asChild><Button>Sign in</Button></Link>
      </View>
      <Link href="/auth/account" asChild><Button>Back to account options</Button></Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48 },
  hint: { opacity: 0.7, marginTop: -4 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  contextCard: { backgroundColor: '#FFF8F3' },
  contextLabel: { color: colors.primary, fontWeight: '900' },
  contextTitle: { color: colors.charcoal, fontWeight: '900' },
  contextMeta: { color: colors.muted, fontWeight: '700' },
});
