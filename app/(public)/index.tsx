import { Redirect } from 'expo-router';
import LandingPage from '@/components/LandingPage';

export default function PublicIndex() {
  if (process.env.EXPO_PUBLIC_ADMIN_APP === '1') {
    return <Redirect href="/admin" />;
  }

  return <LandingPage />;
}
