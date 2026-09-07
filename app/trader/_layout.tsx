import { Stack } from 'expo-router';
import { View } from 'react-native';
import { AppBottomNav } from '@/components/AppBottomNav';
import { DashboardHeader } from '@/components/DashboardHeader';
import { RoleGate } from '@/components/RoleGate';

export default function TraderLayout() {
  return <RoleGate role="trader"><View style={{ flex: 1, minHeight: 0 }}><DashboardHeader home="/trader/dashboard" /><Stack screenOptions={{ headerTintColor: '#D35400', headerShadowVisible: false }}>
    <Stack.Screen name="dashboard" options={{ headerShown: false }} />
    <Stack.Screen name="job-board" options={{ headerShown: false }} />
    <Stack.Screen name="my-jobs" options={{ headerShown: false }} />
    <Stack.Screen name="profile" options={{ headerShown: false }} />
    <Stack.Screen name="notifications" options={{ headerShown: false }} />
    <Stack.Screen name="settings" options={{ headerShown: false }} />
    <Stack.Screen name="trust" options={{ headerShown: false }} />
    <Stack.Screen name="analytics" options={{ headerShown: false }} />
    <Stack.Screen name="saved-searches" options={{ headerShown: false }} />
    <Stack.Screen name="stories" options={{ headerShown: false }} />
    <Stack.Screen name="jobs/[id]" options={{ title: 'Manage job' }} />
    <Stack.Screen name="onboarding" options={{ title: 'Build your profile' }} />
    <Stack.Screen name="subscription" options={{ title: 'Plans and payouts' }} />
    <Stack.Screen name="quotes/new" options={{ title: 'Create quote' }} />
    <Stack.Screen name="invoices/new" options={{ title: 'Create invoice' }} />
    <Stack.Screen name="messages" options={{ headerShown: false }} />
    <Stack.Screen name="messages/[id]" options={{ title: 'Conversation' }} />
  </Stack><AppBottomNav role="trader" /></View></RoleGate>;
}
