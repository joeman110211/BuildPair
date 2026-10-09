import { useClerk, useSignIn, useSignUp } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { Screen } from '@/components/Screen';
import { modeSetupHref, parseAccountMode, safeInternalReturnTo, signInHref, signUpHref } from '@/lib/account-mode';
import { errorMessage } from '@/lib/api';
import { REGISTRATION_OPEN } from '@/lib/launch-config';
import { waitlistHref } from '@/lib/launch';

export default function SocialContinueScreen() {
  const clerk = useClerk();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; returnTo?: string | string[] }>();
  const mode = parseAccountMode(params.mode);
  const returnTo = safeInternalReturnTo(params.returnTo);
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const started = useRef(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(true);

  async function navigateAfterAuth(session: { currentTask?: { key?: unknown } | null } | null | undefined) {
    if (session?.currentTask) {
      setWorking(false);
      setError(`Your existing account needs another security step before BuildPair can continue (${String(session.currentTask.key ?? 'session task')}).`);
      return;
    }
    router.replace(modeSetupHref(mode, returnTo));
  }

  async function advanceFlow() {
    try {
      setError('');
      if (signIn.status === 'complete') {
        await signIn.finalize({ navigate: async ({ session }) => navigateAfterAuth(session) });
        return;
      }

      // An OAuth attempt may initially look like sign-up even when the account
      // already exists. This transfer is sign-up -> sign-in only; it never creates
      // a new BuildPair registration while the launch gate is closed.
      if (signUp.isTransferable) {
        const transferred = await signIn.create({ transfer: true });
        if (transferred.error) throw transferred.error;
        if ((signIn.status as string) === 'complete') {
          await signIn.finalize({ navigate: async ({ session }) => navigateAfterAuth(session) });
          return;
        }
      }

      const existingSessionId = signIn.existingSession?.sessionId ?? signUp.existingSession?.sessionId;
      if (existingSessionId) {
        await clerk.setActive({ session: existingSessionId, navigate: async ({ session }) => navigateAfterAuth(session) });
        return;
      }

      if (REGISTRATION_OPEN && signIn.isTransferable) {
        // Google/Facebook may identify a person with no existing account.
        // Transfer the completed OAuth step into signup now registration is open.
        const transferred = await signUp.create({ transfer: true });
        if (transferred.error) throw transferred.error;
        if (signUp.status === 'complete') {
          await signUp.finalize({ navigate: async ({ session }) => navigateAfterAuth(session) });
          return;
        }
        router.replace(signUpHref(mode ?? 'customer', returnTo));
        return;
      }

      if (REGISTRATION_OPEN && signUp.status === 'complete') {
        await signUp.finalize({ navigate: async ({ session }) => navigateAfterAuth(session) });
        return;
      }

      router.replace(REGISTRATION_OPEN ? signUpHref(mode ?? 'customer', returnTo) : waitlistHref(mode, 'social-signup'));
    } catch (e) {
      setWorking(false);
      setError(errorMessage(e));
    }
  }

  useEffect(() => {
    if (!clerk.loaded || started.current) return;
    started.current = true;
    void advanceFlow();
    // Intentionally run once after Clerk restores the OAuth attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerk.loaded]);

  if (working) return <Screen title="Finishing sign in" subtitle="Checking for an existing BuildPair account…"><Text>Please wait…</Text><View nativeID="clerk-captcha" /></Screen>;

  return <Screen title="Couldn’t finish sign in" subtitle="You can still create an account or sign in with email.">
    <HelperText type="error" visible>{error || 'Your social sign-in could not be completed. Please try again or use email.'}</HelperText>
    <Button mode="contained" onPress={() => router.replace((mode ? signInHref(mode, returnTo) : '/auth/account') as Href)}>Back to sign in</Button>
    <Button mode="outlined" onPress={() => router.replace(REGISTRATION_OPEN ? signUpHref(mode ?? 'customer', returnTo) : waitlistHref(mode, 'social-signup-error'))}>{REGISTRATION_OPEN ? 'Create an account' : 'Join waitlist'}</Button>
  </Screen>;
}
