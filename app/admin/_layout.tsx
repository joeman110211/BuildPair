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
          <Stack screenOptions={{ headerTintColor: '#D35400', headerShadowVisible: false }}>
            <Stack.Screen name="dashboard" options={{ title: 'Owner Console' }} />
            <Stack.Screen name="users" options={{ title: 'User Control Centre' }} />
            <Stack.Screen name="insights" options={{ title: 'User & Product Insights' }} />
            <Stack.Screen name="system" options={{ title: 'System Health' }} />
            <Stack.Screen name="presence" options={{ title: 'Live Users' }} />
            <Stack.Screen name="jobs" options={{ title: 'Jobs' }} />
            <Stack.Screen name="profiles" options={{ title: 'Trade Profiles' }} />
            <Stack.Screen name="messages" options={{ title: 'Messages' }} />
            <Stack.Screen name="media" options={{ title: 'Photos & Media' }} />
            <Stack.Screen name="activity" options={{ title: 'Marketplace Activity' }} />
            <Stack.Screen name="moderation" options={{ title: 'Moderation' }} />
            <Stack.Screen name="credentials" options={{ title: 'Credential Verification' }} />
          </Stack>
        </View>
      </View>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#F7F3EE' },
  content: { flex: 1 },
});
