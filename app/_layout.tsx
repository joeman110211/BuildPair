import { ClerkProvider } from '@clerk/expo';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
// Metro and TypeScript resolve the .native/.web implementation; ESLint's generic resolver does not.
// eslint-disable-next-line import/no-unresolved
import { AppStripeProvider } from '@/components/AppStripeProvider';
// eslint-disable-next-line import/no-unresolved
import { OtaUpdateManager } from '@/components/OtaUpdateManager';
import { PaperIcon } from '@/components/PaperIcon';
import { PresenceHeartbeat } from '@/components/PresenceHeartbeat';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { VisitorAnalytics } from '@/components/VisitorAnalytics';
import { colors, paperTheme } from '@/constants/theme';
import { AuthAvailabilityProvider } from '@/lib/auth-availability';
import { tokenCache } from '@/lib/token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AppShell({ trackPresence = false }: { trackPresence?: boolean }) {
  return (
    <SafeAreaProvider>
      <Head>
        <title>BuildPair | Local trades and clearer projects</title>
        <meta name="description" content="Find local tradespeople, compare clear quotes and keep the whole job together." />
      </Head>
      <PaperProvider theme={paperTheme} settings={{ icon: PaperIcon }}>
        <AppStripeProvider>
          <StatusBar style="dark" />
          <OtaUpdateManager />
          <PwaInstallPrompt />
          {trackPresence ? <><PresenceHeartbeat /><VisitorAnalytics /></> : null}
          <Stack screenOptions={{ headerTintColor: colors.primary, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(public)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="customer" options={{ headerShown: false }} />
            <Stack.Screen name="trader" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
          </Stack>
        </AppStripeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <AuthAvailabilityProvider value={false}>
        <AppShell />
      </AuthAvailabilityProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthAvailabilityProvider value>
        <AppShell trackPresence />
      </AuthAvailabilityProvider>
    </ClerkProvider>
  );
}
