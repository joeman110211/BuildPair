import { useSignIn } from '@clerk/expo';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { modeSetupHref, parseAccountMode, signInHref } from '@/lib/account-mode';
import { errorMessage } from '@/lib/api';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = parseAccountMode(params.mode);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';

  async function sendCode() {
    try {
      setError('');
      const address = email.trim().toLowerCase();
      const { error: createError } = await signIn.create({ identifier: address });
      if (createError) throw createError;
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) throw sendError;
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function verifyCode() {
    try {
      setError('');
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyError) throw verifyError;
      if (signIn.status !== 'needs_new_password') throw new Error(`Password reset is incomplete (${signIn.status}).`);
      setStep('password');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function setNewPassword() {
    try {
      setError('');
      if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
      if (password !== confirmPassword) throw new Error('The two passwords do not match.');
      const { error: passwordError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (passwordError) throw passwordError;

      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize({
          navigate: async ({ session }) => {
            if (session?.currentTask) throw new Error('Your account needs another security step before BuildPair can continue.');
            router.replace(modeSetupHref(mode));
          },
        });
        if (finalizeError) throw finalizeError;
        return;
      }

      if (signIn.status === 'needs_second_factor') {
        throw new Error('Your password was changed. Sign in again to complete your account security check.');
      }
      throw new Error(`Password reset is incomplete (${signIn.status}).`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (step === 'email') {
    return <Screen title="Reset your password" subtitle="Enter the email address on your BuildPair account and we’ll send a reset code.">
      <TextInput label="Email address" accessibilityLabel="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" mode="outlined" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={busy} disabled={busy || !email.trim()} contentStyle={styles.button} onPress={() => void sendCode()}>Send reset code</Button>
      <Link href={mode ? signInHref(mode) : '/auth/sign-in'} asChild><Button>Back to sign in</Button></Link>
    </Screen>;
  }

  if (step === 'code') {
    return <Screen title="Check your email" subtitle={`Enter the password reset code sent to ${email.trim().toLowerCase()}.`}>
      <TextInput label="Reset code" accessibilityLabel="Reset code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" mode="outlined" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={busy} disabled={busy || !code.trim()} contentStyle={styles.button} onPress={() => void verifyCode()}>Verify code</Button>
      <Button disabled={busy} onPress={() => void sendCode()}>Send another code</Button>
      <Button disabled={busy} onPress={() => { signIn.reset(); setCode(''); setError(''); setStep('email'); }}>Use a different email</Button>
    </Screen>;
  }

  return <Screen title="Choose a new password" subtitle="Use a new password you do not use elsewhere.">
    <TextInput label="New password" accessibilityLabel="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" mode="outlined" />
    <TextInput label="Confirm new password" accessibilityLabel="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" mode="outlined" />
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" loading={busy} disabled={busy || !password || !confirmPassword} contentStyle={styles.button} onPress={() => void setNewPassword()}>Set new password</Button>
  </Screen>;
}

const styles = StyleSheet.create({ button: { minHeight: 48 } });
