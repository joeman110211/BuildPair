import { Stack } from 'expo-router';
import { AdminGate } from '@/components/AdminGate';

export default function AdminLayout() {
  return <AdminGate><Stack screenOptions={{ headerTintColor: '#D35400', headerShadowVisible: false }}>
    <Stack.Screen name="users" options={{ title: 'User Control Centre' }} />
    <Stack.Screen name="moderation" options={{ title: 'Moderation' }} />
    <Stack.Screen name="credentials" options={{ title: 'Credential Verification' }} />
  </Stack></AdminGate>;
}
