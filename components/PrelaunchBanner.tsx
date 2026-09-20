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
          <Chip compact icon="shield-check-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>BuildPay available</Chip>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>Founding 50: Surrey trades wanted.</Text>
        <Text style={[styles.body, compact && styles.bodyCompact]}>We’re personally onboarding the first 50 Surrey trades before public launch. Build a strong profile, get early access to local opportunities, quote properly and keep the job organised without paying for individual leads.</Text>
        <Text style={[styles.reputation, compact && styles.reputationCompact]}><Text style={styles.strong}>We’ll help you get set up.</Text> Founding trades can bring their existing reputation, including an approved Google business listing, and shape BuildPair while the Surrey launch group is still small.</Text>
        <View style={[styles.offerBox, compact && styles.offerBoxCompact]}>
          <Text style={[styles.offer, compact && styles.offerCompact]}><Text style={styles.strong}>Founding 50 Surrey group:</Text> free early onboarding, founding-member recognition and priority launch support. The existing launch reward also gives the first 100 eligible completed registrations <Text style={styles.strong}>3 months of BuildPair Pro free.</Text></Text>
          <Text style={[styles.offerNote, compact && styles.offerNoteCompact]}>No pay-per-lead charges. No obligation to stay on a paid plan. We want useful Surrey supply first, not a giant fake signup number.</Text>
        </View>
        <Text style={[styles.small, compact && styles.smallCompact]}>Claim a founding place now. It takes under a minute and we can help finish the business profile afterwards.</Text>
      </View>
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <Link href={waitlistHref('trader', 'homepage-banner')} asChild>
          <Button mode="contained" icon="account-clock-outline" style={compact ? styles.primaryActionCompact : undefined} contentStyle={[styles.actionContent, compact && styles.actionContentCompact]}>Claim a Founding 50 place</Button>
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
