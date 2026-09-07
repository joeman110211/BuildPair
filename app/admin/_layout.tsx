import { Redirect, Stack } from 'expo-router';
import { AdminGate } from '@/components/AdminGate';

export default function AdminLayout() {
  // Administrative control lives in the separately packaged BuildPair Admin app.
  // The normal website/customer/trade client deliberately exposes no admin UI.
  if (process.env.EXPO_PUBLIC_ADMIN_SURFACE_ENABLED !== 'true') return <Redirect href="/" />;

  return <AdminGate><Stack screenOptions={{ headerTintColor: '#D35400', headerShadowVisible: false }}>
    <Stack.Screen name="users" options={{ title: 'User Control Centre' }} />
    <Stack.Screen name="moderation" options={{ title: 'Moderation' }} />
    <Stack.Screen name="credentials" options={{ title: 'Credential Verification' }} />
  </Stack></AdminGate>;
}
