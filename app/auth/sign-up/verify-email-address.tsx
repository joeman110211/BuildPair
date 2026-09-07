import { useSignUp } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { modeSetupHref, parseAccountMode, signUpHref } from '@/lib/account-mode';
import { errorMessage } from '@/lib/api';

function storedMode(value: unknown) {
  return typeof value === 'string' ? parseAccountMode(value) : null;
}

export default function VerifyEmailAddressScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';
  const mode = storedMode(signUp.unsafeMetadata?.buildpairMode);
  const emailAddress = signUp.emailAddress ?? 'your email address';
  const needsEmailVerification = signUp.status === 'missing_requirements'
    && signUp.unverifiedFields.includes('email_address')
    && signUp.missingFields.length === 0;

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

  async function restart() {
    await signUp.reset();
    router.replace(mode ? signUpHref(mode) : '/auth/sign-up');
  }

  if (!needsEmailVerification) {
    return (
      <Screen title="Email verification" subtitle="That verification step is no longer active. You can safely restart the sign-up process.">
        <Button mode="contained" onPress={() => void restart()}>Restart sign-up</Button>
        <Button onPress={() => router.replace('/auth/account')}>Back to account options</Button>
      </Screen>
    );
  }

  return (
    <Screen title="Verify your email" subtitle={`We sent a 6-digit code to ${emailAddress}.`}>
      <TextInput
        label="Verification code"
        accessibilityLabel="Enter verification code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        mode="outlined"
      />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyEmail()}>
        Verify and continue
      </Button>
      <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
      <Button disabled={busy} onPress={() => void restart()}>Change email</Button>
    </Screen>
  );
}
