import { Link, Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { dashboardHref, signInHref, signUpHref } from '@/lib/account-mode';
import { LAUNCH_DATE_LABEL } from '@/lib/launch';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function AccountEntryScreen() {
  const { user, loading, isSignedIn } = useCurrentUser();

  if (loading) return <LoadingScreen label="Loading BuildPair…" />;
  if (isSignedIn && user?.activeMode) return <Redirect href={dashboardHref(user.activeMode)} />;
  if (isSignedIn) return <Redirect href="/auth/choose-role" />;

  return <Screen>
    <View style={styles.hero}>
      <BuildPairLogo tagline />
      <Chip icon="rocket-launch-outline">Launching {LAUNCH_DATE_LABEL}</Chip>
      <Text variant="headlineSmall" style={styles.heading}>Trades can get launch-ready now. Homeowner accounts open later.</Text>
      <Text style={styles.subheading}>Tradespeople can create an account and build their full profile now. The marketplace itself stays locked until launch, so profiles remain private and no live jobs, quotes, payments or homeowner contact can happen yet.</Text>
    </View>

    <View style={styles.cards}>
      <AppCard style={styles.roleCard}>
        <View style={styles.roleTop}>
          <View style={styles.roleIcon}><Text style={styles.emoji}>🏠</Text></View>
          <View style={styles.roleHeading}>
            <Text variant="headlineSmall" style={styles.title}>I’m a Homeowner</Text>
            <Text variant="bodySmall" style={styles.kicker}>POST • COMPARE • HIRE</Text>
          </View>
        </View>
        <Text style={styles.body}>Homeowner account creation and job posting stay closed until the marketplace launches.</Text>
        <Link href={signUpHref('customer')} asChild><Button mode="outlined" icon="bell-outline" contentStyle={styles.primaryButton} style={styles.primaryAction}>Get homeowner launch updates</Button></Link>
        <Link href={signInHref('customer')} asChild><Button mode="text">Existing Homeowner Sign In</Button></Link>
      </AppCard>

      <AppCard style={styles.roleCard}>
        <View style={styles.roleTop}>
          <View style={styles.roleIcon}><Text style={styles.emoji}>🔨</Text></View>
          <View style={styles.roleHeading}>
            <Text variant="headlineSmall" style={styles.title}>I’m a Tradesperson</Text>
            <Chip compact style={styles.trialChip} textStyle={styles.trialChipText}>Founding offer</Chip>
          </View>
        </View>
        <Text style={styles.body}>Create the real account now and complete your business profile before launch. Eligible Founding 50 profiles get 3 months of Pro from launch day, so the free period does not run down while the marketplace is closed.</Text>
        <Link href={signUpHref('trader')} asChild><Button mode="contained" icon="account-plus-outline" contentStyle={styles.primaryButton} style={styles.primaryAction}>Create Founding Trade Account</Button></Link>
        <Link href={signInHref('trader')} asChild><Button mode="text">Existing Tradesperson Sign In</Button></Link>
      </AppCard>
    </View>

    <AppCard elevated={false} style={styles.browseCard}>
      <View style={styles.browseCopy}>
        <Text variant="titleMedium" style={styles.title}>Explore BuildPair now</Text>
        <Text style={styles.browseText}>The public information site stays open while we finish launch work. You can read how BuildPair, pricing and BuildPay are intended to work, but the live marketplace remains switched off.</Text>
      </View>
      <View style={styles.browseActions}>
        <Link href="/(public)/how-it-works" asChild><Button mode="outlined" contentStyle={styles.browseButton}>How it works</Button></Link>
        <Link href="/(public)/payments" asChild><Button mode="outlined" icon="shield-check-outline" contentStyle={styles.browseButton}>BuildPay</Button></Link>
      </View>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { width: '100%', maxWidth: 820, alignSelf: 'center', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.surfaceStrong, gap: 10 },
  heading: { maxWidth: 680, textAlign: 'center', fontWeight: '900', color: colors.charcoal, lineHeight: 31, marginTop: 6 },
  subheading: { maxWidth: 620, textAlign: 'center', color: colors.muted, fontSize: 16, lineHeight: 23 },
  cards: { width: '100%', maxWidth: 820, alignSelf: 'center', gap: 16 },
  roleCard: { padding: 20 },
  roleTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  roleIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 27 },
  roleHeading: { flex: 1, alignItems: 'flex-start', gap: 6 },
  title: { fontWeight: '900', color: colors.charcoal },
  kicker: { color: colors.muted, fontWeight: '800', letterSpacing: 1.1 },
  body: { color: colors.muted, lineHeight: 23, fontSize: 16 },
  trialChip: { alignSelf: 'flex-start', backgroundColor: '#FFF0DB' },
  trialChipText: { color: colors.primaryDark, fontWeight: '800' },
  primaryButton: { minHeight: 52 },
  primaryAction: { borderRadius: 16 },
  browseCard: { width: '100%', maxWidth: 820, alignSelf: 'center', backgroundColor: colors.surfaceSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  browseCopy: { flex: 1, minWidth: 220, gap: 3 },
  browseText: { color: colors.muted, lineHeight: 21 },
  browseActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  browseButton: { minHeight: 44, minWidth: 145 },
});
