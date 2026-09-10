import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { NativeBottomNav } from '@/components/NativeBottomNav';
import { PublicHeader } from '@/components/PublicHeader';

export default function PublicLayout() {
  return <View style={{ flex: 1, minHeight: 0 }}>
    <PublicHeader />
    <Stack screenOptions={{ headerShown: false }} />
    {Platform.OS === 'web' ? null : <NativeBottomNav variant="public" />}
  </View>;
}
