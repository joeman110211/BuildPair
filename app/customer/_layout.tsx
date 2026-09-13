import { Slot, Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NativeBottomNav } from '@/components/NativeBottomNav';
import { RoleGate } from '@/components/RoleGate';

export default function CustomerLayout() {
  if (Platform.OS === 'web') return <RoleGate role="customer"><Slot /></RoleGate>;

  return <RoleGate role="customer"><View style={{ flex: 1, minHeight: 0 }}><DashboardHeader home="/customer/dashboard" /><Stack screenOptions={{ headerTintColor: '#D35400', headerShadowVisible: false }}>
    <Stack.Screen name="dashboard" options={{ headerShown: false }} />
    <Stack.Screen name="jobs" options={{ headerShown: false }} />
    <Stack.Screen name="profile" options={{ headerShown: false }} />
    <Stack.Screen name="saved-trades" options={{ headerShown: false }} />
    <Stack.Screen name="notifications" options={{ headerShown: false }} />
    <Stack.Screen name="settings" options={{ headerShown: false }} />
    <Stack.Screen name="new-job" options={{ title: 'Post a job' }} />
    <Stack.Screen name="jobs/[id]" options={{ title: 'Job details' }} />
    <Stack.Screen name="compare/[jobId]" options={{ title: 'Compare quotes' }} />
    <Stack.Screen name="messages" options={{ headerShown: false }} />
    <Stack.Screen name="messages/[id]" options={{ title: 'Conversation' }} />
  </Stack><NativeBottomNav variant="customer" /></View></RoleGate>;
}
