import { Redirect } from 'expo-router';
import { View } from 'react-native';
import LandingPageRefined from '@/components/LandingPageRefined';
import { PrelaunchBanner } from '@/components/PrelaunchBanner';

export default function PublicIndex() {
  if (process.env.EXPO_PUBLIC_ADMIN_APP === '1') {
    return <Redirect href="/admin" />;
  }
  return <View style={{ flex: 1 }}><PrelaunchBanner /><LandingPageRefined /></View>;
}
