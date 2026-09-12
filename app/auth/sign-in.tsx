import { useSignIn } from '@clerk/expo';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { forgotPasswordHref, modeSetupHref, parseAccountMode, safeInternalReturnTo, signUpHref } from '@/lib/account-mode';
import { errorMessage } from '@/lib/api';

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; admin?: string | string[]; returnTo?: string | string[] }>();
  const admin = Array.isArray(params.admin) ? params.admin[0] === '1' : params.admin === '1';
  const mode = parseAccountMode(params.mode);
  const returnTo = safeInternalReturnTo(params.returnTo);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const busy = fetchStatus === 'fetching';
  const title = admin
    ? 'BuildPair Administrator Sign In'
    : mode === 'trader'
      ? 'Tradesperson Sign In'
      : mode === 'customer'
        ? 'Homeowner Sign In'
        : 'Welcome back';
  const subtitle = admin
    ? 'Sign in with an authorised BuildPair administrator account.'
    : mode === 'trader'
      ? 'Sign in to find work, manage quotes and run your trade profile.'
      : mode === 'customer'
        ? 'Sign in to post work, compare quotes and manage your jobs.'
        : 'Sign in to BuildPair.';

  async function finishSignIn() {
    await signIn.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          throw new Error('Your account needs another Clerk setup step before BuildPair can continue.');
        }
        if (admin) {
          router.replace('/admin');
          return;
        }
        router.replace(modeSetupHref(mode, returnTo));
      },
    });
  }

  async function signInWithEmail() {
    try {
      setError('');
      const result = await signIn.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      if (result.error) throw result.error;

      if (signIn.status === 'complete') {
        await finishSignIn();
        return;
      }

      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        const emailFactor = signIn.supportedSecondFactors?.find((factor) => factor.strategy === 'email_code');
        if (!emailFactor) throw new Error('This sign-in needs another verification step, but no email-code factor is available.');
        await signIn.mfa.sendEmailCode();
        setCode('');
        setVerifying(true);
        return;
      }

      throw new Error(`Sign-in is incomplete (${signIn.status}).`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function verifyEmailCode() {
    try {
      setError('');
      await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (signIn.status !== 'complete') throw new Error(`Email verification is incomplete (${signIn.status}).`);
      await finishSignIn();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function resendCode() {
    try {
      setError('');
      await signIn.mfa.sendEmailCode();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (verifying) {
    return (
      <Screen title="Confirm it's you" subtitle={`Enter the code Clerk sent to ${email.trim().toLowerCase()}.`}>
        <TextInput
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          mode="outlined"
        />
        <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
        <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyEmailCode()} contentStyle={styles.button}>
          Verify and sign in
        </Button>
        <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
        <Button disabled={busy} onPress={() => { signIn.reset(); setVerifying(false); setCode(''); setError(''); }}>Start over</Button>
      </Screen>
    );
  }

  return (
    <Screen title={title} subtitle={subtitle}>
      {admin ? null : <SocialAuthButtons onError={setError} mode={mode} returnTo={returnTo} />}
      <TextInput
        label="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        mode="outlined"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        mode="outlined"
      />
      {admin ? null : <Link href={forgotPasswordHref(mode)} asChild><Button compact>Forgot password?</Button></Link>}
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button
        mode="contained"
        loading={busy}
        disabled={busy || !email.trim() || !password}
        onPress={() => void signInWithEmail()}
        contentStyle={styles.button}
      >
        Sign in with email
      </Button>
      {admin ? null : (
        <>
          <View style={styles.footer}>
            <Text>New to BuildPair?</Text>
            <Link href={mode ? signUpHref(mode, returnTo) : '/auth/account'} asChild><Button>Create account</Button></Link>
          </View>
          <Link href="/auth/account" asChild><Button>Back to account options</Button></Link>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
});
