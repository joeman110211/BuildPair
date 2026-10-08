import { Link, Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { LoadingScreen, Screen } from '@/components/Screen';
import { LAUNCH_OFFER, SITE_LANGUAGE } from '@/constants/site-language';
import { colors } from '@/constants/theme';
import { dashboardHref, signInHref, signUpHref } from '@/lib/account-mode';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function AccountEntryScreen() {
  const { user, loading, isSignedIn } = useCurrentUser();

  if (loading) return <LoadingScreen label="Loading BuildPair…" />;
  if (isSignedIn && user?.activeMode) return <Redirect href={dashboardHref(user.activeMode)} />;
  if (isSignedIn) return <Redirect href="/auth/choose-role" />;

  return <Screen>
    <View style={styles.hero}>
      <BuildPairLogo tagline />
      <Chip icon="account-multiple-check-outline">Open for local homeowners and tradespeople</Chip>
      <Text variant="headlineSmall" style={styles.heading}>Choose how you want to join BuildPair.</Text>
      <Text style={styles.subheading}>Join the London and Surrey marketplace. Homeowners can post work and tradespeople can build their business profile.</Text>
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
        <Text style={styles.body}>Find local trades, post jobs, compare quotes and manage the work.</Text>
        <Link href={signUpHref('customer')} asChild><Button mode="contained" icon="account-clock-outline" contentStyle={styles.primaryButton} style={styles.primaryAction}>Create homeowner account</Button></Link>
        <Link href={signInHref('customer')} asChild><Button mode="text">Homeowner sign in</Button></Link>
      </AppCard>

      <AppCard style={styles.roleCard}>
        <View style={styles.roleTop}>
          <View style={styles.roleIcon}><Text style={styles.emoji}>🔨</Text></View>
          <View style={styles.roleHeading}>
            <Text variant="headlineSmall" style={styles.title}>I’m a Tradesperson</Text>
            <Chip compact style={styles.trialChip} textStyle={styles.trialChipText}>{LAUNCH_OFFER.badge}</Chip>
          </View>
        </View>
        <Text style={styles.body}>{LAUNCH_OFFER.trade}</Text>
        <Link href={signUpHref('trader')} asChild><Button mode="contained" icon="account-clock-outline" contentStyle={styles.primaryButton} style={styles.primaryAction}>Create profile</Button></Link>
        <Link href={signInHref('trader')} asChild><Button mode="text">Tradesperson sign in</Button></Link>
      </AppCard>
    </View>

    <AppCard elevated={false} style={styles.browseCard}>
      <View style={styles.browseCopy}>
        <Text variant="titleMedium" style={styles.title}>Explore BuildPair now</Text>
        <Text style={styles.browseText}>Browse trade profiles, jobs, pricing and guides without creating an account. BuildPay payments are coming soon.</Text>
      </View>
      <View style={styles.browseActions}>
        <Link href="/(public)/directory" asChild><Button mode="outlined" contentStyle={styles.browseButton}>Browse trades</Button></Link>
        <Link href="/(public)/jobs" asChild><Button mode="outlined" icon="briefcase-search-outline" contentStyle={styles.browseButton}>Jobs</Button></Link>
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
  roleHeading: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 6 },
  title: { fontWeight: '900', color: colors.charcoal },
  kicker: { color: colors.muted, fontWeight: '800', letterSpacing: 1.1 },
  body: { color: colors.muted, lineHeight: 23, fontSize: 16 },
  trialChip: { alignSelf: 'flex-start', backgroundColor: '#FFF0DB' },
  trialChipText: { color: colors.primaryDark, fontWeight: '800' },
  primaryButton: { minHeight: 52 },
  primaryAction: { borderRadius: 16 },
  browseCard: { width: '100%', maxWidth: 820, alignSelf: 'center', backgroundColor: colors.surfaceSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  browseCopy: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 3 },
  browseText: { color: colors.muted, lineHeight: 21 },
  browseActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  browseButton: { minHeight: 44, minWidth: 145 },
});
