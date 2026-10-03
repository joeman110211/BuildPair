import { useSSO } from '@clerk/expo';
import type { OAuthStrategy } from '@clerk/expo/types';
import * as AuthSession from 'expo-auth-session';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { controlHeights, spacing } from '@/constants/theme';
import { modeSetupHref, safeInternalReturnTo } from '@/lib/account-mode';
import { errorMessage } from '@/lib/api';
import type { UserRole } from '@/types';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onError: (message: string) => void;
  mode?: UserRole | null;
  returnTo?: string | null;
};

const providers: Array<{ strategy: OAuthStrategy; label: string }> = [
  { strategy: 'oauth_google', label: 'Continue with Google' },
  { strategy: 'oauth_facebook', label: 'Continue with Facebook' },
];

export function SocialAuthButtons({ onError, mode = null, returnTo = null }: Props) {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [loadingStrategy, setLoadingStrategy] = useState<OAuthStrategy | null>(null);
  const safeReturnTo = safeInternalReturnTo(returnTo ?? undefined);

  function continuationHref() {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (safeReturnTo) params.set('returnTo', safeReturnTo);
    const query = params.toString();
    return (`/auth/social-continue${query ? `?${query}` : ''}`) as Href;
  }

  async function continueWith(strategy: OAuthStrategy) {
    try {
      setLoadingStrategy(strategy);
      onError('');

      // Clerk's Expo SSO flow expects a concrete callback URL. On web this resolves
      // to the current BuildPair origin; on Android/iOS it resolves to buildpair://.
      const callback = AuthSession.makeRedirectUri({
        scheme: 'buildpair',
        path: 'auth/social-continue',
      });
      const query = new URLSearchParams();
      if (mode) query.set('mode', mode);
      if (safeReturnTo) query.set('returnTo', safeReturnTo);
      const redirectUrl = query.size ? `${callback}${callback.includes('?') ? '&' : '?'}${query.toString()}` : callback;

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              router.replace(continuationHref());
              return;
            }
            router.replace(modeSetupHref(mode, safeReturnTo));
          },
        });
        return;
      }

      // A first-time social user commonly has no existing Clerk account yet.
      // Clerk preserves the in-progress flow so the continuation screen can
      // transfer SignIn -> SignUp and finish creating the account.
      router.replace(continuationHref());
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setLoadingStrategy(null);
    }
  }

  return (
    <View style={styles.container}>
      {providers.map((provider) => (
        <Button
          key={provider.strategy}
          mode="outlined"
          loading={loadingStrategy === provider.strategy}
          disabled={loadingStrategy !== null}
          onPress={() => void continueWith(provider.strategy)}
          contentStyle={styles.button}
        >
          {provider.label}
        </Button>
      ))}
      <View style={styles.orRow}>
        <Divider style={styles.divider} />
        <Text variant="bodySmall" style={styles.orText}>or continue with email</Text>
        <Divider style={styles.divider} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  button: { minHeight: controlHeights.standard },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xxs },
  divider: { flex: 1 },
  orText: { opacity: 0.65 },
});
