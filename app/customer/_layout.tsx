import { Link, Slot, Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NativeBottomNav } from '@/components/NativeBottomNav';
import { RoleGate } from '@/components/RoleGate';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { LAUNCH_DATE_LABEL, MARKETPLACE_OPEN, waitlistHref } from '@/lib/launch';

function HomeownerPrelaunchLocked() {
  return <Screen title="Homeowner accounts open at launch" subtitle={`BuildPair launches ${LAUNCH_DATE_LABEL}.`}>
    <AppCard style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
      <Chip icon="lock-clock">Marketplace not live yet</Chip>
      <Text variant="headlineSmall" style={{ color: colors.charcoal, fontWeight: '900' }}>We’re preparing the trade side first.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}>Homeowner job posting, quote requests, messaging and payments remain closed until launch. This keeps BuildPair in setup mode while founding trades finish their profiles.</Text>
      <Link href={waitlistHref('customer', 'customer-prelaunch-lock')} asChild><Button mode="contained">Get homeowner launch updates</Button></Link>
      <Link href="/" asChild><Button mode="outlined">Back to BuildPair</Button></Link>
    </AppCard>
  </Screen>;
}

export default function CustomerLayout() {
  if (!MARKETPLACE_OPEN) return <RoleGate role="customer"><HomeownerPrelaunchLocked /></RoleGate>;
  if (Platform.OS === 'web') return <RoleGate role="customer"><Slot /></RoleGate>;

  return <RoleGate role="customer"><View style={{ flex: 1, minHeight: 0 }}><DashboardHeader home="/customer/dashboard" /><Stack screenOptions={{ headerTintColor: '#D35400', headerShadowVisible: false }}>
    <Stack.Screen name="dashboard" options={{ headerShown: false }} />
    <Stack.Screen name="jobs" options={{ headerShown: false }} />
    <Stack.Screen name="profile" options={{ headerShown: false }} />
    <Stack.Screen name="saved-trades" options={{ headerShown: false }} />
    <Stack.Screen name="home-record" options={{ headerShown: false }} />
    <Stack.Screen name="project-plus" options={{ headerShown: false }} />
    <Stack.Screen name="claim-quote" options={{ title: 'Add accepted quote' }} />
    <Stack.Screen name="notifications" options={{ headerShown: false }} />
    <Stack.Screen name="settings" options={{ headerShown: false }} />
    <Stack.Screen name="new-job" options={{ title: 'Post a job' }} />
    <Stack.Screen name="jobs/[id]" options={{ title: 'Job details' }} />
    <Stack.Screen name="compare/[jobId]" options={{ title: 'Compare quotes' }} />
    <Stack.Screen name="messages" options={{ headerShown: false }} />
    <Stack.Screen name="messages/[id]" options={{ title: 'Conversation' }} />
  </Stack><NativeBottomNav variant="customer" /></View></RoleGate>;
}
