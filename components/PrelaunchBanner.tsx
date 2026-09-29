import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { waitlistHref } from '@/lib/launch';

const DISMISSED_KEY = 'buildpair-prelaunch-popup-dismissed-session';
const POPUP_DELAY_MS = 2200;

export function PrelaunchBanner() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISSED_KEY) === '1') return;
    } catch {
      // If session storage is unavailable, the popup can still be shown and dismissed.
    }

    const timer = setTimeout(() => setVisible(true), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Dismissing should still work if session storage is unavailable.
    }
  }

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityLabel="Close launch popup">
        <Pressable
          style={[styles.popup, compact && styles.popupCompact]}
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.inner, compact && styles.innerCompact]}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close launch popup"
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

            {compact ? (
              <View style={[styles.actions, styles.actionsCompact]}>
                <Button mode="contained" icon="account-plus-outline" style={styles.actionButton} contentStyle={styles.actionContent} onPress={() => router.push(waitlistHref('trader', 'homepage-popup'))}>Create trade profile</Button>
                <View style={styles.actionRow}>
                  <Button mode="outlined" style={[styles.actionButton, styles.halfAction]} contentStyle={styles.actionContent} onPress={() => router.push('/(public)/rewards')}>Rewards</Button>
                  <Button mode="outlined" style={[styles.actionButton, styles.halfAction]} contentStyle={styles.actionContent} onPress={() => router.push('/auth/sign-in')}>Sign in</Button>
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                <Link href={waitlistHref('trader', 'homepage-popup')} asChild>
                  <Button mode="contained" icon="account-plus-outline" style={styles.actionButton} contentStyle={styles.actionContent}>Create trade profile</Button>
                </Link>
                <Link href="/(public)/rewards" asChild>
                  <Button mode="outlined" style={styles.actionButton} contentStyle={styles.actionContent}>Rewards</Button>
                </Link>
                <Link href="/auth/sign-in" asChild>
                  <Button mode="outlined" style={styles.actionButton} contentStyle={styles.actionContent}>Sign in</Button>
                </Link>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 32, 0.64)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  popup: {
    width: '92%',
    maxWidth: 780,
    maxHeight: '88%',
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8B98F',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
    overflow: 'hidden',
  },
  popupCompact: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: 18,
  },
  scroll: { width: '100%' },
  inner: {
    position: 'relative',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    paddingRight: 62,
    gap: spacing.lg,
  },
  innerCompact: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 48,
    gap: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: '#E9C3A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.charcoalSoft, fontSize: 28, lineHeight: 30, fontWeight: '600' },
  copy: { width: '100%', gap: 10 },
  copyCompact: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chipsCompact: { gap: 5 },
  chip: { backgroundColor: '#FFF8F2', borderWidth: 1, borderColor: '#F0C9AA' },
  chipCompact: { minHeight: 27 },
  chipText: { color: colors.charcoal, fontSize: 12, fontWeight: '800' },
  chipTextCompact: { fontSize: 10.5, lineHeight: 13 },
  title: { color: colors.charcoal, fontWeight: '900', fontSize: 29, lineHeight: 34, letterSpacing: -0.4 },
  titleCompact: { fontSize: 22, lineHeight: 26, letterSpacing: -0.25 },
  body: { color: colors.text, lineHeight: 22, fontSize: 14.5 },
  bodyCompact: { lineHeight: 19, fontSize: 13 },
  offerBox: { backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: '#EDC6A7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11 },
  offerBoxCompact: { borderRadius: 11, paddingHorizontal: 10, paddingVertical: 9 },
  offer: { color: colors.charcoalSoft, lineHeight: 20, fontSize: 14 },
  offerCompact: { lineHeight: 17, fontSize: 12.5 },
  strong: { color: colors.charcoal, fontWeight: '900' },
  actions: { width: '100%', maxWidth: 520, gap: spacing.sm, alignSelf: 'center', alignItems: 'stretch' },
  actionsCompact: { minWidth: 0, maxWidth: '100%', flexDirection: 'column', flexWrap: 'nowrap', gap: 8 },
  actionRow: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  actionButton: { width: '100%', borderRadius: radii.md },
  halfAction: { flex: 1, width: 'auto', minWidth: 0 },
  actionContent: { minHeight: controlHeights.standard, paddingHorizontal: 8 },
});
