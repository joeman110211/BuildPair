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
          <Chip compact icon="gift-outline" style={styles.chip} textStyle={styles.chipText}>Founding trade bonuses</Chip>
          <Chip compact icon="shield-check-outline" style={styles.chip} textStyle={styles.chipText}>BuildPay available</Chip>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>Get in early. BuildPair is nearly ready.</Text>
        <Text style={[styles.body, compact && styles.bodyCompact]}>A new way for homeowners and tradespeople to find each other, compare proper quotes and keep the job organised. Tradespeople should not have to keep buying dead-end leads or pay oversized fees regardless of whether any work actually lands.</Text>
        <View style={styles.offerBox}>
          <Text style={styles.offer}><Text style={styles.strong}>Trades launch offer:</Text> the first 100 eligible tradespeople to complete registration during the launch offer receive <Text style={styles.strong}>3 months of BuildPair Pro free.</Text> Other eligible tradespeople joining during the launch offer receive <Text style={styles.strong}>3 months of BuildPair Plus free.</Text></Text>
          <Text style={styles.offerNote}>No pay-per-lead charges. Predictable membership options. Use BuildPair to win suitable work and keep using it to quote, manage and complete the job.</Text>
        </View>
        <Text style={styles.small}>Join the launch list now and, if you want to start sooner, request limited early access when you sign up.</Text>
      </View>
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <Link href={waitlistHref('trader', 'homepage-banner')} asChild><Button mode="contained" icon="account-clock-outline" style={compact ? styles.actionButtonCompact : undefined} contentStyle={styles.actionContent}>Join & request early access</Button></Link>
        <Link href="/(public)/rewards" asChild><Button mode="outlined" style={compact ? styles.actionButtonCompact : undefined} contentStyle={styles.actionContent}>See launch rewards</Button></Link>
        <Link href="/auth/sign-in" asChild><Button mode="text" style={compact ? styles.actionButtonCompact : undefined} contentStyle={styles.actionContent}>Existing member sign in</Button></Link>
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
  offerBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#EDC6A7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, gap: 6 },
  offer: { color: colors.charcoalSoft, lineHeight: 20, fontSize: 14 },
  offerNote: { color: colors.text, lineHeight: 19, fontSize: 13, fontWeight: '700' },
  strong: { color: colors.charcoal, fontWeight: '900' },
  small: { color: colors.muted, lineHeight: 17, fontSize: 12 },
  actions: { minWidth: 230, gap: spacing.sm },
  actionsCompact: { minWidth: 0, width: '100%', gap: 8 },
  actionButtonCompact: { width: '100%' },
  actionContent: { minHeight: 44 },
});
