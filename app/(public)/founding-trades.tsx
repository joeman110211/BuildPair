import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { FOUNDING_TRADER_LIMIT, LAUNCH_DATE_LABEL } from '@/lib/launch';

export default function FoundingTradesPage() {
  return <Screen
    title={`BuildPair Founding ${FOUNDING_TRADER_LIMIT}: Surrey trades`}
    subtitle="Create the real account now. Build the real profile now. Marketplace access starts later."
  >
    <AppCard style={styles.hero}>
      <View style={styles.chips}>
        <Chip icon="hammer-wrench">Trades registration open</Chip>
        <Chip icon="lock-outline">Marketplace locked</Chip>
        <Chip icon="star-circle-outline">3 months Pro at launch</Chip>
      </View>
      <Text variant="headlineSmall" style={styles.title}>Be ready on day one instead of sitting on a waiting list.</Text>
      <Text style={styles.body}>Tradespeople can create a BuildPair account now and complete the profile homeowners will eventually see: business details, services, working area, photos, qualifications and reputation information.</Text>
      <Text style={styles.body}>Until BuildPair launches, your profile stays private. You cannot receive homeowner requests, browse live marketplace work, send quotes, use marketplace messaging, activate BuildPay, set up payouts or buy a paid membership.</Text>
      <Text style={styles.body}><Text style={styles.strong}>Founding Pro does not run down while BuildPair is closed.</Text> Eligible Founding {FOUNDING_TRADER_LIMIT} profiles receive three months of Pro from the marketplace launch, not from the day the profile is created.</Text>
      <Link href="/auth/sign-up?mode=trader" asChild>
        <Button mode="contained" icon="account-plus-outline" contentStyle={styles.primary}>Create my trade account</Button>
      </Link>
      <Text style={styles.small}>Planned public launch: {LAUNCH_DATE_LABEL}. Marketplace access will only be enabled when BuildPair is ready to operate it.</Text>
    </AppCard>

    <View style={styles.grid}>
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>Set up now</Text>
        <Text style={styles.item}>✓ Business and trading name</Text>
        <Text style={styles.item}>✓ Main trades and specialist services</Text>
        <Text style={styles.item}>✓ Genuine service base and working radius</Text>
        <Text style={styles.item}>✓ Bio, qualifications and business links</Text>
        <Text style={styles.item}>✓ Work photos and before/after projects</Text>
        <Text style={styles.item}>✓ Google business reputation connection where available</Text>
      </AppCard>
      <AppCard>
        <Text variant="titleLarge" style={styles.title}>Locked until launch</Text>
        <Text style={styles.item}>• Homeowner accounts and job posting</Text>
        <Text style={styles.item}>• Public search visibility</Text>
        <Text style={styles.item}>• Marketplace jobs and quote requests</Text>
        <Text style={styles.item}>• Messaging tied to marketplace jobs</Text>
        <Text style={styles.item}>• Membership billing and quote allowances</Text>
        <Text style={styles.item}>• BuildPay, Stripe payout onboarding and live payments</Text>
      </AppCard>
    </View>

    <AppCard style={styles.note}>
      <Text variant="titleMedium" style={styles.title}>Already have a BuildPair trade account?</Text>
      <Text style={styles.body}>Sign in and finish the profile. Existing pre-launch profiles remain private until marketplace access is deliberately switched on.</Text>
      <Link href="/auth/sign-in?mode=trader" asChild><Button mode="outlined">Tradesperson sign in</Button></Link>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primarySoft, borderColor: colors.primary, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  title: { color: colors.charcoal, fontWeight: '900' },
  strong: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  small: { color: colors.muted, lineHeight: 18, fontSize: 12 },
  primary: { minHeight: 50 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  item: { color: colors.text, lineHeight: 22 },
  note: { backgroundColor: colors.surfaceSoft },
});
