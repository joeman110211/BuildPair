import { SignIn } from '@clerk/expo/web';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/constants/theme';
import { modeSetupHref, parseAccountMode, signUpHref } from '@/lib/account-mode';
import { clerkWebAppearance } from '@/lib/clerk-web';

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignInWebScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[]; admin?: string | string[] }>();
  const admin = scalar(params.admin) === '1';
  const mode = parseAccountMode(params.mode);
  const redirectUrl = admin ? '/admin' : String(modeSetupHref(mode));
  const createUrl = mode ? String(signUpHref(mode)) : '/auth/account';
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
      <SignIn
        routing="path"
        path="/auth/sign-in"
        withSignUp={!admin}
        signUpUrl={admin ? undefined : createUrl}
        forceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
        appearance={clerkWebAppearance}
      />
    </View>
  );
}
