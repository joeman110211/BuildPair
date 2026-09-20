import { Link, Slot, Stack, usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NativeBottomNav } from '@/components/NativeBottomNav';
import { RoleGate } from '@/components/RoleGate';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { FOUNDING_PRO_MONTHS, LAUNCH_DATE_LABEL, MARKETPLACE_OPEN } from '@/lib/launch';

const PRELAUNCH_SETUP_ROUTES = [
  '/trader/onboarding',
  '/trader/profile',
  '/trader/settings',
  '/trader/trust',
  '/trader/google-reviews',
  '/trader/stories',
];

function TraderPrelaunchHome() {
  return <Screen title="Your BuildPair profile is in pre-launch" subtitle={`Marketplace launch: ${LAUNCH_DATE_LABEL}`}>
    <AppCard style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
      <Chip icon="hammer-wrench">Profile setup open</Chip>
      <Text variant="headlineSmall" style={{ color: colors.charcoal, fontWeight: '900' }}>Get everything ready before the first jobs go live.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}>You can complete and edit your real business profile, service area, portfolio, credentials, Google reviews and account settings now.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}><Text style={{ fontWeight: '900' }}>Jobs, quotes, homeowner messaging, invoices, BuildPay, payouts and paid plan checkout are locked during pre-launch.</Text> They unlock when BuildPair officially launches.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}>Eligible founding trades reserve <Text style={{ fontWeight: '900' }}>{FOUNDING_PRO_MONTHS} months of BuildPair Pro free</Text>. The promotional clock starts at launch, not while you are setting up.</Text>
      <Link href="/trader/onboarding" asChild><Button mode="contained" icon="account-edit-outline">Complete my launch-ready profile</Button></Link>
      <Link href="/trader/profile" asChild><Button mode="outlined">Preview my profile</Button></Link>
    </AppCard>
  </Screen>;
}

function TraderPrelaunchLocked() {
  return <Screen title="This part opens at launch" subtitle={`BuildPair marketplace activity is locked until ${LAUNCH_DATE_LABEL}.`}>
    <AppCard>
      <Chip icon="lock-clock">Pre-launch setup only</Chip>
      <Text variant="titleLarge" style={{ color: colors.charcoal, fontWeight: '900' }}>Your account is real. The marketplace is not live yet.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}>For now, use BuildPair to finish your trade profile and trust information. Jobs, quotes, customer messaging, invoices, BuildPay and subscriptions remain unavailable until launch.</Text>
      <Link href="/trader/onboarding" asChild><Button mode="contained">Continue profile setup</Button></Link>
      <Link href="/trader/dashboard" asChild><Button mode="outlined">Back to pre-launch dashboard</Button></Link>
    </AppCard>
  </Screen>;
}

export default function TraderLayout() {
  const pathname = usePathname();
  if (!MARKETPLACE_OPEN) {
    const content = pathname === '/trader/dashboard'
      ? <TraderPrelaunchHome />
      : PRELAUNCH_SETUP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
        ? <Slot />
        : <TraderPrelaunchLocked />;
    return <RoleGate role="trader">{content}</RoleGate>;
  }

  if (Platform.OS === 'web') return <RoleGate role="trader"><Slot /></RoleGate>;

  return <RoleGate role="trader"><View style={{ flex: 1, minHeight: 0 }}><DashboardHeader home="/trader/dashboard" /><Stack screenOptions={{ headerTintColor: '#D35400', headerShadowVisible: false }}>
    <Stack.Screen name="dashboard" options={{ headerShown: false }} />
    <Stack.Screen name="job-board" options={{ headerShown: false }} />
    <Stack.Screen name="my-jobs" options={{ headerShown: false }} />
    <Stack.Screen name="profile" options={{ headerShown: false }} />
    <Stack.Screen name="notifications" options={{ headerShown: false }} />
    <Stack.Screen name="settings" options={{ headerShown: false }} />
    <Stack.Screen name="trust" options={{ headerShown: false }} />
    <Stack.Screen name="google-reviews" options={{ title: 'Google reviews' }} />
    <Stack.Screen name="analytics" options={{ headerShown: false }} />
    <Stack.Screen name="saved-searches" options={{ headerShown: false }} />
    <Stack.Screen name="stories" options={{ headerShown: false }} />
    <Stack.Screen name="jobs/[id]" options={{ title: 'Manage job' }} />
    <Stack.Screen name="onboarding" options={{ title: 'Manage your profile' }} />
    <Stack.Screen name="subscription" options={{ title: 'Plans and payouts' }} />
    <Stack.Screen name="quotes/index" options={{ headerShown: false }} />
    <Stack.Screen name="quotes/new" options={{ title: 'Create quote' }} />
    <Stack.Screen name="quotes/review" options={{ title: 'Review payment changes' }} />
    <Stack.Screen name="visits/new" options={{ title: 'Arrange site visit' }} />
    <Stack.Screen name="invoices/new" options={{ title: 'Create invoice' }} />
    <Stack.Screen name="messages" options={{ headerShown: false }} />
    <Stack.Screen name="messages/[id]" options={{ title: 'Conversation' }} />
  </Stack><NativeBottomNav variant="trader" /></View></RoleGate>;
}
