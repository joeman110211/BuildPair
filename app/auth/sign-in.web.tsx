import { useClerk, useSignIn } from '@clerk/expo';
import { SignIn } from '@clerk/expo/web';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { modeSetupHref, parseAccountMode, safeInternalReturnTo, signUpHref } from '@/lib/account-mode';
import { errorMessage } from '@/lib/api';
import { clerkWebAppearance } from '@/lib/clerk-web';

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function AdminSignInForm() {
  const { signIn, fetchStatus } = useSignIn();
  const { signOut } = useClerk();
  const { user, loading: currentUserLoading, error: currentUserError, refresh, isSignedIn } = useCurrentUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';

  async function finishSignIn() {
    await signIn.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          throw new Error('Your account needs another Clerk setup step before BuildPair can continue.');
        }
        router.replace('/admin');
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

  if (currentUserLoading) {
    return (
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 18, gap: 12 }}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', color: colors.charcoalSoft }}>
          Checking your existing BuildPair session…
        </Text>
      </View>
    );
  }

  if (isSignedIn) {
    if (user?.isAdmin) {
      return (
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 18, gap: 12 }}>
          <Text variant="bodyLarge" style={{ textAlign: 'center', color: colors.charcoalSoft }}>
            You are already signed in with an authorised administrator account.
          </Text>
          <Button mode="contained" onPress={() => router.replace('/admin')} contentStyle={{ minHeight: 48 }}>
            Open administrator console
          </Button>
          <Button onPress={() => signOut(() => router.replace('/auth/sign-in?admin=1'))}>
            Sign in with a different account
          </Button>
        </View>
      );
    }

    if (!user) {
      return (
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 18, gap: 12 }}>
          <Text variant="bodyLarge" style={{ textAlign: 'center', color: colors.charcoalSoft }}>
            BuildPair could not verify whether your current account has administrator access.
          </Text>
          <HelperText type="error" visible>{currentUserError || 'Unable to load the current account.'}</HelperText>
          <Button mode="contained" onPress={() => void refresh()} contentStyle={{ minHeight: 48 }}>
            Check again
          </Button>
          <Button onPress={() => signOut(() => router.replace('/auth/sign-in?admin=1'))}>
            Sign out and sign in again
          </Button>
        </View>
      );
    }

    return (
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 18, gap: 12 }}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', color: colors.charcoalSoft }}>
          You are already signed in, but this account does not have BuildPair administrator access.
        </Text>
        <Button mode="contained" onPress={() => signOut(() => router.replace('/auth/sign-in?admin=1'))} contentStyle={{ minHeight: 48 }}>
          Sign out and use administrator account
        </Button>
      </View>
    );
  }

  if (verifying) {
    return (
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 18, gap: 12 }}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', color: colors.charcoalSoft }}>
          Enter the verification code sent to {email.trim().toLowerCase()}.
        </Text>
        <TextInput
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          mode="outlined"
        />
        <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
        <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyEmailCode()} contentStyle={{ minHeight: 48 }}>
          Verify and sign in
        </Button>
        <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
        <Button disabled={busy} onPress={() => { signIn.reset(); setVerifying(false); setCode(''); setError(''); }}>Start over</Button>
      </View>
    );
  }

  return (
    <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 18, gap: 12 }}>
      <Text variant="bodyLarge" style={{ textAlign: 'center', color: colors.charcoalSoft }}>
        Sign in with an authorised BuildPair administrator account.
      </Text>
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
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button
        mode="contained"
        loading={busy}
        disabled={busy || !email.trim() || !password}
        onPress={() => void signInWithEmail()}
        contentStyle={{ minHeight: 48 }}
      >
        Sign in with email
      </Button>
    </View>
  );
}

export default function SignInWebScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[]; admin?: string | string[]; returnTo?: string | string[] }>();
  const admin = scalar(params.admin) === '1';
  const mode = parseAccountMode(params.mode);
  const returnTo = safeInternalReturnTo(params.returnTo);
  const redirectUrl = String(modeSetupHref(mode, returnTo));
  const createUrl = mode ? String(signUpHref(mode, returnTo)) : '/auth/account';
  const title = admin
    ? 'BuildPair Administrator Sign In'
    : mode === 'trader'
      ? '🔨 Tradesperson Sign In'
      : mode === 'customer'
        ? '🏠 Homeowner Sign In'
        : 'Sign in to BuildPair';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 18, paddingHorizontal: 12 }}>
      <Text variant="headlineSmall" style={{ textAlign: 'center', fontWeight: '900', color: colors.charcoal }}>{title}</Text>
      {admin ? (
        <AdminSignInForm />
      ) : (
        <SignIn
          routing="path"
          path="/auth/sign-in"
          withSignUp
          signUpUrl={createUrl}
          forceRedirectUrl={redirectUrl}
          signUpForceRedirectUrl={redirectUrl}
          appearance={clerkWebAppearance}
        />
      )}
    </View>
  );
}
