import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { waitlistHref } from '@/lib/launch';

const DISMISSED_KEY = 'buildpair-prelaunch-banner-dismissed';

function initialDismissedState() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function PrelaunchBanner() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [dismissed, setDismissed] = useState(initialDismissedState);

  function dismiss() {
    setDismissed(true);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Dismissing the banner should still work if browser storage is unavailable.
    }
  }

  if (dismissed) return null;

  return <View style={styles.shell}>
    <View style={[styles.inner, compact && styles.innerCompact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss launch notice"
        hitSlop={10}
        style={styles.closeButton}
        onPress={dismiss}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>

      <View style={[styles.copy, compact && styles.copyCompact]}>
        <View style={[styles.chips, compact && styles.chipsCompact]}>
          <Chip compact icon="rocket-launch-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Launching soon</Chip>
          <Chip compact icon="gift-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>3 months Pro free</Chip>
        </View>

        <Text style={[styles.title, compact && styles.titleCompact]}>BuildPair is launching soon.</Text>
        <Text style={[styles.body, compact && styles.bodyCompact]}>Tradespeople can sign up free and create their profile now. We’ll notify you when the marketplace opens, eligible launch trades receive 3 months of BuildPair Pro free, and homeowners can start posting jobs from launch.</Text>

        <View style={[styles.offerBox, compact && styles.offerBoxCompact]}>
          <Text style={[styles.offer, compact && styles.offerCompact]}><Text style={styles.strong}>No pay-per-lead charges.</Text> Build your profile now and be ready when homeowners start posting jobs.</Text>
        </View>
      </View>

      {compact ? <View style={[styles.actions, styles.actionsCompact]}>
        <Button mode="contained" icon="account-plus-outline" style={styles.actionButton} contentStyle={styles.actionContent} onPress={() => router.push(waitlistHref('trader', 'homepage-banner'))}>Create trade profile</Button>
        <View style={styles.actionRow}>
          <Button mode="outlined" style={[styles.actionButton, styles.halfAction]} contentStyle={styles.actionContent} onPress={() => router.push('/(public)/rewards')}>Rewards</Button>
          <Button mode="outlined" style={[styles.actionButton, styles.halfAction]} contentStyle={styles.actionContent} onPress={() => router.push('/auth/sign-in')}>Sign in</Button>
        </View>
      </View> : <View style={styles.actions}>
        <Link href={waitlistHref('trader', 'homepage-banner')} asChild>
          <Button mode="contained" icon="account-plus-outline" style={styles.actionButton} contentStyle={styles.actionContent}>Create trade profile</Button>
        </Link>
        <Link href="/(public)/rewards" asChild>
          <Button mode="outlined" style={styles.actionButton} contentStyle={styles.actionContent}>Rewards</Button>
        </Link>
        <Link href="/auth/sign-in" asChild>
          <Button mode="outlined" style={styles.actionButton} contentStyle={styles.actionContent}>Sign in</Button>
        </Link>
      </View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { width: '100%', backgroundColor: colors.primarySoft, borderBottomWidth: 1, borderBottomColor: '#E8B98F' },
  inner: { position: 'relative', width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, paddingRight: 56, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', justifyContent: 'space-between' },
  innerCompact: { paddingHorizontal: 14, paddingVertical: 12, paddingRight: 46, gap: 10, alignItems: 'stretch' },
  closeButton: { position: 'absolute', top: 10, right: 12, zIndex: 2, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.charcoalSoft, fontSize: 27, lineHeight: 29, fontWeight: '500' },
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
  offerBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#EDC6A7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, gap: 6 },
  offerBoxCompact: { borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  offer: { color: colors.charcoalSoft, lineHeight: 20, fontSize: 14 },
  offerCompact: { lineHeight: 17, fontSize: 12.5 },
  strong: { color: colors.charcoal, fontWeight: '900' },
  actions: { width: 250, maxWidth: '100%', gap: spacing.sm, alignItems: 'stretch' },
  actionsCompact: { minWidth: 0, width: '100%', flexDirection: 'column', flexWrap: 'nowrap', gap: 8 },
  actionRow: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  actionButton: { width: '100%', borderRadius: radii.md },
  halfAction: { flex: 1, width: 'auto', minWidth: 0 },
  actionContent: { minHeight: controlHeights.standard, paddingHorizontal: 8 },
});
