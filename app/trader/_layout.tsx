import { Link, Slot, Stack, usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NativeBottomNav } from '@/components/NativeBottomNav';
import { RoleGate } from '@/components/RoleGate';
import { LoadingScreen, Screen } from '@/components/Screen';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LAUNCH_OFFER } from '@/constants/site-language';
import { colors } from '@/constants/theme';
import { MARKETPLACE_OPEN } from '@/lib/launch';

const PRELAUNCH_SETUP_ROUTES = [
  '/trader/onboarding',
  '/trader/profile',
  '/trader/settings',
  '/trader/trust',
  '/trader/google-reviews',
  '/trader/stories',
  '/trader/templates',
  '/trader/quotes',
  '/trader/invoices',
  '/trader/customers',
  '/trader/calendar',
  '/trader/project-plus',
];

function TraderPrelaunchHome() {
  return <Screen title="Your BuildPair profile is in pre-launch" subtitle="Marketplace launching soon">
    <AppCard style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
      <Chip icon="hammer-wrench">Profile setup open</Chip>
      <Text variant="headlineSmall" style={{ color: colors.charcoal, fontWeight: '900' }}>Get everything ready before the first jobs go live.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}>You can complete and edit your real public business profile, service area, portfolio, credentials, Google reviews and Pro business tools now. Visitors can browse completed trade profiles before launch, but contact, quotes and marketplace messaging remain locked.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}><Text style={{ fontWeight: '900' }}>Marketplace jobs, marketplace messaging, BuildPay money movement, payouts and paid plan checkout are locked during pre-launch. Your standalone Quote Builder, invoices, templates and availability tools are available now for launch preparation.</Text> They unlock when BuildPair officially launches.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}><Text style={{ fontWeight: '900' }}>{LAUNCH_OFFER.short}</Text></Text>
      <Link href="/trader/onboarding" asChild><Button mode="contained" icon="account-edit-outline">Create profile</Button></Link>
      <Link href="/trader/profile" asChild><Button mode="outlined">View my public profile</Button></Link>
      <Link href="/trader/templates" asChild><Button mode="outlined" icon="text-box-multiple-outline">Set up Pro templates</Button></Link>
    </AppCard>
  </Screen>;
}

function TraderPrelaunchLocked() {
  return <Screen title="This part opens at launch" subtitle="Marketplace activity opens at launch.">
    <AppCard>
      <Chip icon="lock-clock">Pre-launch setup only</Chip>
      <Text variant="titleLarge" style={{ color: colors.charcoal, fontWeight: '900' }}>Your account is real. The marketplace is not live yet.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}>For now, use BuildPair to finish your trade profile and business setup. Standalone quotes, invoices and availability are available; marketplace jobs, marketplace messaging, BuildPay and subscriptions remain unavailable until launch.</Text>
      <Link href="/trader/onboarding" asChild><Button mode="contained">Continue profile setup</Button></Link>
      <Link href="/trader/dashboard" asChild><Button mode="outlined">Back to pre-launch dashboard</Button></Link>
    </AppCard>
  </Screen>;
}

export default function TraderLayout() {
  const pathname = usePathname();
  const { user, loading } = useCurrentUser();
  if (!MARKETPLACE_OPEN && loading) return <LoadingScreen label="Checking internal preview access…" />;
  if (!MARKETPLACE_OPEN && !user?.isAdmin) {
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
    <Stack.Screen name="attention" options={{ headerShown: false }} />
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
    <Stack.Screen name="templates" options={{ headerShown: false }} />
    <Stack.Screen name="customers" options={{ headerShown: false }} />
    <Stack.Screen name="calendar" options={{ headerShown: false }} />
    <Stack.Screen name="project-plus" options={{ headerShown: false }} />
    <Stack.Screen name="jobs/[id]" options={{ title: 'Manage job' }} />
    <Stack.Screen name="onboarding" options={{ title: 'Manage your profile' }} />
    <Stack.Screen name="subscription" options={{ title: 'Plans and payouts' }} />
    <Stack.Screen name="quotes/index" options={{ headerShown: false }} />
    <Stack.Screen name="quotes/new" options={{ title: 'Create quote' }} />
    <Stack.Screen name="quotes/review" options={{ title: 'Review payment changes' }} />
    <Stack.Screen name="visits/new" options={{ title: 'Arrange site visit' }} />
    <Stack.Screen name="proposals/new" options={{ title: 'Quick proposal' }} />
    <Stack.Screen name="invoices/new" options={{ title: 'Create invoice' }} />
    <Stack.Screen name="messages" options={{ headerShown: false }} />
    <Stack.Screen name="messages/[id]" options={{ title: 'Conversation' }} />
  </Stack><NativeBottomNav variant="trader" /></View></RoleGate>;
}
