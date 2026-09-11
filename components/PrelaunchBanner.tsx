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
        <View style={styles.chips}>
          <Chip compact icon="rocket-launch-outline" style={styles.chip} textStyle={styles.chipText}>Launching {LAUNCH_DATE_LABEL}</Chip>
          <Chip compact icon="shield-check-outline" style={styles.chip} textStyle={styles.chipText}>Introducing BuildPay</Chip>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>BuildPair is in its final release steps.</Text>
        <Text style={[styles.body, compact && styles.bodyCompact]}>Explore the full public site now. New account registration is paused until launch, so join the waiting list and we’ll let you know the moment sign-up opens.</Text>
        <View style={styles.offerBox}>
          <Text style={styles.offer}><Text style={styles.strong}>Tradespeople:</Text> the first 50 eligible waiting-list trades who complete registration within 24 hours of launch get <Text style={styles.strong}>3 months of Pro free.</Text></Text>
        </View>
        <Text style={styles.small}>Real-world testers can also register interest for limited pre-launch testing places.</Text>
      </View>
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <Link href={waitlistHref(null, 'homepage-banner')} asChild><Button mode="contained" icon="account-clock-outline" style={compact ? styles.actionButtonCompact : undefined} contentStyle={styles.actionContent}>Join launch waitlist</Button></Link>
        <Link href="/auth/sign-in" asChild><Button mode="outlined" style={compact ? styles.actionButtonCompact : undefined} contentStyle={styles.actionContent}>Existing member sign in</Button></Link>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { width: '100%', backgroundColor: colors.primarySoft, borderBottomWidth: 1, borderBottomColor: '#E8B98F' },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', justifyContent: 'space-between' },
  innerCompact: { paddingHorizontal: 18, paddingVertical: 20, gap: 14, alignItems: 'stretch' },
  copy: { flex: 1, minWidth: 280, maxWidth: 860, gap: 8 },
  copyCompact: { minWidth: 0, maxWidth: '100%', gap: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { backgroundColor: '#FFF8F2', borderWidth: 1, borderColor: '#F0C9AA' },
  chipText: { color: colors.charcoal, fontSize: 12, fontWeight: '800' },
  title: { color: colors.charcoal, fontWeight: '900', fontSize: 28, lineHeight: 33, letterSpacing: -0.45 },
  titleCompact: { fontSize: 26, lineHeight: 30, letterSpacing: -0.35 },
  body: { color: colors.text, lineHeight: 22, fontSize: 15 },
  bodyCompact: { lineHeight: 20, fontSize: 14 },
  offerBox: { backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: '#EDC6A7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  offer: { color: colors.charcoalSoft, lineHeight: 20, fontSize: 14 },
  strong: { color: colors.charcoal, fontWeight: '900' },
  small: { color: colors.muted, lineHeight: 17, fontSize: 12 },
  actions: { minWidth: 210, gap: spacing.sm },
  actionsCompact: { minWidth: 0, width: '100%', gap: 8 },
  actionButtonCompact: { width: '100%' },
  actionContent: { minHeight: 44 },
});
