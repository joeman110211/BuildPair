import { Link, Stack, usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { NativeBottomNav } from '@/components/NativeBottomNav';
import { PublicHeader } from '@/components/PublicHeader';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { MARKETPLACE_OPEN, waitlistHref } from '@/lib/launch';

// Trader discovery is intentionally public before launch so founding profiles can be browsed.
// Transactional homeowner marketplace routes stay locked until launch.
const MARKETPLACE_PATHS = ['/jobs'];

function PublicMarketplaceLocked() {
  return <Screen title="Marketplace launching soon" subtitle="Homeowners can join the launch list now.">
    <AppCard style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
      <Chip icon="lock-clock">Pre-launch</Chip>
      <Text variant="headlineSmall" style={{ color: colors.charcoal, fontWeight: '900' }}>The marketplace is not accepting homeowner activity yet.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}>Tradespeople can create and publish their real profiles now, and visitors can browse those profiles before launch. Homeowner job posting, quote requests, messaging and payments open when BuildPair launches.</Text>
      <Link href={waitlistHref('customer', 'public-marketplace-lock')} asChild><Button mode="contained">Join launch list</Button></Link>
      <Link href="/auth/founding-trade-signup?source=public-marketplace-lock" asChild><Button mode="outlined">Create profile</Button></Link>
    </AppCard>
  </Screen>;
}

export default function PublicLayout() {
  const pathname = usePathname();
  const marketplacePath = MARKETPLACE_PATHS.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  return <View style={{ flex: 1, minHeight: 0 }}>
    <PublicHeader />
    {!MARKETPLACE_OPEN && marketplacePath ? <PublicMarketplaceLocked /> : <Stack screenOptions={{ headerShown: false }} />}
    {Platform.OS === 'web' ? null : <NativeBottomNav variant="public" />}
  </View>;
}
