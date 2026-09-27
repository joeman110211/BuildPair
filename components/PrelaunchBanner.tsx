import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, ProgressBar, Text } from 'react-native-paper';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { LAUNCH_DATE_LABEL, waitlistHref } from '@/lib/launch';

type FoundingProgress = {
  onboarded: number;
  target: number;
  remaining: number;
  filled: boolean;
};

export function PrelaunchBanner() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [progress, setProgress] = useState<FoundingProgress | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<FoundingProgress>('/api/founding-trades')
      .then((result) => {
        if (active) setProgress(result);
      })
      .catch(() => {
        if (active) setProgress(null);
      })
      .finally(() => {
        if (active) setProgressLoaded(true);
      });
    return () => { active = false; };
  }, []);

  const progressValue = progress?.target ? Math.min(1, progress.onboarded / progress.target) : 0;

  return <View style={styles.shell}>
    <View style={[styles.inner, compact && styles.innerCompact]}>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <View style={[styles.chips, compact && styles.chipsCompact]}>
          <Chip compact icon="rocket-launch-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Target launch {LAUNCH_DATE_LABEL}</Chip>
          <Chip compact icon="gift-outline" style={[styles.chip, compact && styles.chipCompact]} textStyle={[styles.chipText, compact && styles.chipTextCompact]}>Founding 50 Surrey trades</Chip>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>We’re building the first 50 Surrey trades before we open the gates to homeowners.</Text>
        <Text style={[styles.body, compact && styles.bodyCompact]}>Trades can build their profiles now while homeowners join the launch list. We want homeowners to arrive to genuine local choice, not an empty marketplace.</Text>
        <View style={[styles.progressCard, compact && styles.progressCardCompact]}>
          <Text style={styles.progressEyebrow}>FOUNDING 50 PROGRESS</Text>
          {progress ? <>
            <View style={styles.progressRow}>
              <Text style={[styles.progressCount, compact && styles.progressCountCompact]}>{progress.onboarded} / {progress.target} onboard</Text>
              <Text style={styles.progressRemaining}>{progress.filled ? 'Founding 50 filled' : `${progress.remaining} places remaining`}</Text>
            </View>
            <ProgressBar progress={progressValue} color={colors.primary} style={styles.progressBar} />
          </> : <Text style={styles.progressUnavailable}>{progressLoaded ? 'Live count temporarily unavailable' : 'Checking the live count…'}</Text>}
        </View>
        <Text style={[styles.reputation, compact && styles.reputationCompact]}><Text style={styles.strong}>Pre-launch is profile setup only.</Text> Jobs, quoting, homeowner messaging, BuildPay and paid subscriptions remain locked while we build the Founding 50.</Text>
        <View style={[styles.offerBox, compact && styles.offerBoxCompact]}>
          <Text style={[styles.offer, compact && styles.offerCompact]}><Text style={styles.strong}>Founding 50 Surrey trades receive 3 months of BuildPair Pro free from launch day.</Text> There are no pay-per-lead charges and no pre-launch subscription fee.</Text>
        </View>
        <Text style={[styles.small, compact && styles.smallCompact]}>Once the Founding 50 are onboard, we can open homeowner registration and the marketplace with useful local coverage already in place.</Text>
      </View>
      {compact ? <View style={[styles.actions, styles.actionsCompact]}>
        <Button mode="contained" icon="account-clock-outline" style={styles.actionButton} contentStyle={styles.actionContent} onPress={() => router.push(waitlistHref('trader', 'homepage-banner'))}>Create trade profile</Button>
        <View style={styles.actionRow}>
          <Button mode="outlined" style={[styles.actionButton, styles.halfAction]} contentStyle={styles.actionContent} onPress={() => router.push('/(public)/rewards')}>Founding rewards</Button>
          <Button mode="outlined" style={[styles.actionButton, styles.halfAction]} contentStyle={styles.actionContent} onPress={() => router.push('/auth/sign-in')}>Sign in</Button>
        </View>
      </View> : <View style={styles.actions}>
        <Link href={waitlistHref('trader', 'homepage-banner')} asChild>
          <Button mode="contained" icon="account-clock-outline" style={styles.actionButton} contentStyle={styles.actionContent}>Create my trade profile</Button>
        </Link>
        <Link href="/(public)/rewards" asChild>
          <Button mode="outlined" style={styles.actionButton} contentStyle={styles.actionContent}>Founding rewards</Button>
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
  progressCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDC6A7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
  progressCardCompact: { borderRadius: 11, paddingHorizontal: 10, paddingVertical: 9, gap: 7 },
  progressEyebrow: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  progressCount: { color: colors.charcoal, fontSize: 21, lineHeight: 25, fontWeight: '900' },
  progressCountCompact: { fontSize: 18, lineHeight: 22 },
  progressRemaining: { color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: '#F0DDD0' },
  progressUnavailable: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
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
