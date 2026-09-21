import { Link } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { colors, spacing } from '@/constants/theme';
import { LAUNCH_DATE_LABEL, waitlistHref } from '@/lib/launch';

export function PrelaunchBanner() {
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return <View style={styles.shell}>
    <View style={[styles.inner, compact && styles.innerCompact]}>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <View style={[styles.chips, compact && styles.chipsCompact]}>
          <Chip compact icon="rocket-launch-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Launching {LAUNCH_DATE_LABEL}</Chip>
          <Chip compact icon="gift-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Founding trade bonuses</Chip>
          <Chip compact icon="star-circle-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Bring your Google reviews</Chip>
          <Chip compact icon="lock-clock" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Marketplace unlocks at launch</Chip>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>Surrey trades can set up now. BuildPair launches {LAUNCH_DATE_LABEL}.</Text>
        <Text style={[styles.body, compact && styles.bodyCompact]}>We’re onboarding the first 50 Surrey trades before public launch. Create your real BuildPair account now, complete your business profile, service area, portfolio and trust details, then arrive at launch already set up.</Text>
        <Text style={[styles.reputation, compact && styles.reputationCompact]}><Text style={styles.strong}>Pre-launch means setup only.</Text> Jobs, quoting, homeowner messaging, BuildPay and paid subscriptions stay locked until launch. Founding trades can still bring their Google reputation and get their storefront launch-ready now.</Text>
        <View style={[styles.offerBox, compact && styles.offerBoxCompact]}>
          <Text style={[styles.offer, compact && styles.offerCompact]}><Text style={styles.strong}>Founding 50 Surrey group:</Text> create the profile now and reserve <Text style={styles.strong}>3 months of BuildPair Pro free from launch day.</Text> The clock does not start while BuildPair is still in pre-launch.</Text>
          <Text style={[styles.offerNote, compact && styles.offerNoteCompact]}>No pay-per-lead charges. No pre-launch subscription charge. Homeowner account creation stays closed until the marketplace is ready.</Text>
        </View>
        <Text style={[styles.small, compact && styles.smallCompact]}>Create the account now, finish the real profile at your own pace, and be ready when the marketplace opens.</Text>
      </View>
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <Link href={waitlistHref('trader', 'homepage-banner')} asChild>
          <Button mode="contained" icon="account-clock-outline" style={compact ? styles.primaryActionCompact : undefined} contentStyle={[styles.actionContent, compact && styles.actionContentCompact]}>Create my trade profile</Button>
        </Link>
        <Link href="/(public)/rewards" asChild>
          <Button mode="outlined" style={compact ? styles.secondaryActionCompact : undefined} contentStyle={[styles.actionContent, compact && styles.actionContentCompact]}>See launch rewards</Button>
        </Link>
        <Link href="/auth/sign-in" asChild>
          <Button mode="text" style={compact ? styles.secondaryActionCompact : undefined} contentStyle={[styles.actionContent, compact && styles.actionContentCompact]}>Existing member sign in</Button>
        </Link>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { width: '100%', backgroundColor: colors.primarySoft, borderBottomWidth: 1, borderBottomColor: '#E8B98F' },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', justifyContent: 'space-between' },
  innerCompact: { paddingHorizontal: 14, paddingVertical: 12, gap: 10, alignItems: 'stretch' },
  copy: { flex: 1, minWidth: 280, maxWidth: 860, gap: 8 },
  copyCompact: { minWidth: 0, maxWidth: '100%', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chipsCompact: { gap: 5 },
  chip: { backgroundColor: '#FFF8F2', borderWidth: 1, borderColor: '#F0C9AA' },
  chipCompact: { minHeight: 27 },
  chipText: { color: colors.charcoal, fontSize: 12, fontWeight: '800' },
  chipTextCompact: { fontSize: 10.5, lineHeight: 13 },
  title: { color: colors.charcoal, fontWeight: '900', fontSize: 28, lineHeight: 33, letterSpacing: -0.45 },
  titleCompact: { fontSize: 21, lineHeight: 24, letterSpacing: -0.25 },
  body: { color: colors.text, lineHeight: 22, fontSize: 15 },
  bodyCompact: { lineHeight: 18, fontSize: 13 },
  reputation: { color: colors.charcoalSoft, lineHeight: 20, fontSize: 14 },
  reputationCompact: { lineHeight: 17, fontSize: 12.5 },
  offerBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#EDC6A7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, gap: 6 },
  offerBoxCompact: { borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  offer: { color: colors.charcoalSoft, lineHeight: 20, fontSize: 14 },
  offerCompact: { lineHeight: 17, fontSize: 12.5 },
  offerNote: { color: colors.text, lineHeight: 19, fontSize: 13, fontWeight: '700' },
  offerNoteCompact: { lineHeight: 16, fontSize: 11.5 },
  strong: { color: colors.charcoal, fontWeight: '900' },
  small: { color: colors.muted, lineHeight: 17, fontSize: 12 },
  smallCompact: { lineHeight: 15, fontSize: 11 },
  actions: { minWidth: 230, gap: spacing.sm },
  actionsCompact: { minWidth: 0, width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  primaryActionCompact: { width: '100%' },
  secondaryActionCompact: { flexGrow: 1, flexBasis: 145, minWidth: 0 },
  actionContent: { minHeight: 44 },
  actionContentCompact: { minHeight: 38 },
});
