import { Link, Stack, usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { NativeBottomNav } from '@/components/NativeBottomNav';
import { PublicHeader } from '@/components/PublicHeader';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { LAUNCH_DATE_LABEL, MARKETPLACE_OPEN, waitlistHref } from '@/lib/launch';

const MARKETPLACE_PATHS = ['/directory', '/jobs', '/traders', '/quote'];

function PublicMarketplaceLocked() {
  return <Screen title="BuildPair marketplace opens at launch" subtitle={`Launching ${LAUNCH_DATE_LABEL}.`}>
    <AppCard style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
      <Chip icon="lock-clock">Pre-launch</Chip>
      <Text variant="headlineSmall" style={{ color: colors.charcoal, fontWeight: '900' }}>The marketplace is not accepting homeowner activity yet.</Text>
      <Text style={{ color: colors.text, lineHeight: 22 }}>Surrey tradespeople can create and prepare their real profiles now. Homeowner search, jobs, quotes, messaging and payments open when BuildPair launches.</Text>
      <Link href={waitlistHref('customer', 'public-marketplace-lock')} asChild><Button mode="contained">Get homeowner launch updates</Button></Link>
      <Link href="/auth/founding-trade-signup?source=public-marketplace-lock" asChild><Button mode="outlined">I’m a tradesperson</Button></Link>
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
