import { Link, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { LAUNCH_DATE_LABEL, waitlistHref } from '@/lib/launch';

export function PrelaunchBanner() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return <View style={[styles.banner, compact && styles.bannerCompact]}>
    <View style={[styles.inner, compact && styles.innerCompact]}>
      <View style={styles.copy}>
        <View style={styles.chips}>
          <Chip compact icon="rocket-launch-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Launching {LAUNCH_DATE_LABEL}</Chip>
          <Chip compact icon="gift-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Founding 50 Surrey trades</Chip>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>BuildPair is opening the Surrey marketplace soon.</Text>
        <Text style={[styles.body, compact && styles.bodyCompact]}>Trades can create their profile now. Homeowners can join launch updates. Founding 50 trades receive 3 months of BuildPair Pro free from launch day.</Text>
      </View>
      {compact ? <View style={styles.compactActions}>
        <Button mode="contained" icon="account-plus-outline" style={styles.actionButton} contentStyle={styles.actionContent} onPress={() => router.push(waitlistHref('trader', 'homepage-banner'))}>Create trade profile</Button>
        <View style={styles.compactSecondaryRow}>
          <Button mode="outlined" style={[styles.actionButton, styles.halfAction]} contentStyle={styles.actionContent} onPress={() => router.push('/(public)/launch')}>Launch details</Button>
          <Button mode="outlined" style={[styles.actionButton, styles.halfAction]} contentStyle={styles.actionContent} onPress={() => router.push(waitlistHref('customer', 'homepage-banner'))}>Homeowner updates</Button>
        </View>
      </View> : <View style={styles.actions}>
        <Link href={waitlistHref('trader', 'homepage-banner')} asChild>
          <Button mode="contained" icon="account-plus-outline" style={styles.actionButton} contentStyle={styles.actionContent}>Create trade profile</Button>
        </Link>
        <Link href="/(public)/launch" asChild>
          <Button mode="outlined" style={styles.actionButton} contentStyle={styles.actionContent}>Launch details</Button>
        </Link>
        <Link href={waitlistHref('customer', 'homepage-banner')} asChild>
          <Button mode="outlined" style={styles.actionButton} contentStyle={styles.actionContent}>Homeowner updates</Button>
        </Link>
      </View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { width: '100%', backgroundColor: colors.primarySoft, borderBottomWidth: 1, borderBottomColor: '#E8B98F' },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', justifyContent: 'space-between' },
  innerCompact: { paddingHorizontal: 14, paddingVertical: 12, gap: 10, alignItems: 'stretch' },
  copy: { flex: 1, minWidth: 280, maxWidth: 860, gap: 9 },
  copyCompact: { minWidth: 0, maxWidth: '100%', gap: 7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chipsCompact: { gap: 5 },
  chip: { backgroundColor: '#FFF8F2', borderWidth: 1, borderColor: '#F0C9AA' },
  chipCompact: { minHeight: 27 },
  chipText: { color: colors.charcoal, fontSize: 12, fontWeight: '800' },
  chipTextCompact: { fontSize: 10.5, lineHeight: 13 },
  title: { color: colors.charcoal, fontWeight: '900', fontSize: 27, lineHeight: 32, letterSpacing: -0.4 },
  titleCompact: { fontSize: 21, lineHeight: 24, letterSpacing: -0.25 },
  body: { color: colors.text, lineHeight: 22, fontSize: 14.5 },
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
  actions: { width: 250, maxWidth: '100%', gap: spacing.sm, alignItems: 'stretch' },
  actionsCompact: { minWidth: 0, width: '100%', flexDirection: 'column', flexWrap: 'nowrap', gap: 8 },
  actionRow: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  actionButton: { width: '100%', borderRadius: radii.md },
  halfAction: { flex: 1, width: 'auto', minWidth: 0 },
  actionContent: { minHeight: controlHeights.standard, paddingHorizontal: 8 },
});
