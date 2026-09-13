import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AdminGate } from '@/components/AdminGate';
import { AdminNav } from '@/components/AdminNav';

export default function AdminLayout() {
  return (
    <AdminGate>
      <View style={styles.shell}>
        <AdminNav />
        <View style={styles.content}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="assistant" />
            <Stack.Screen name="users" />
            <Stack.Screen name="waitlist" />
            <Stack.Screen name="insights" />
            <Stack.Screen name="visitors" />
            <Stack.Screen name="system" />
            <Stack.Screen name="presence" />
            <Stack.Screen name="jobs" />
            <Stack.Screen name="profiles" />
            <Stack.Screen name="google-reviews" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="media" />
            <Stack.Screen name="activity" />
            <Stack.Screen name="moderation" />
            <Stack.Screen name="credentials" />
            <Stack.Screen name="payment-disputes" />
          </Stack>
        </View>
      </View>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#F7F3EE' },
  content: { flex: 1, minWidth: 0 },
});
