import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { colors, spacing } from '@/constants/theme';
import { LAUNCH_DATE_LABEL, PUBLIC_CONTACT_EMAIL, waitlistHref } from '@/lib/launch';

export function PrelaunchBanner() {
  return <View style={styles.shell}>
    <View style={styles.inner}>
      <View style={styles.copy}>
        <View style={styles.chips}><Chip compact icon="rocket-launch-outline">Launching {LAUNCH_DATE_LABEL}</Chip><Chip compact icon="shield-check-outline">Introducing BuildPay</Chip></View>
        <Text variant="headlineSmall" style={styles.title}>BuildPair is in its final release steps.</Text>
        <Text style={styles.body}>Explore the full public site now. New account registration is paused until launch, so join the waiting list and we’ll let you know the moment sign-up opens.</Text>
        <Text style={styles.offer}><Text style={styles.strong}>Tradespeople:</Text> the first 50 eligible waiting-list trades who complete registration within 24 hours of launch get <Text style={styles.strong}>3 months of Pro free.</Text></Text>
        <Text style={styles.small}>Real-world testers can also register interest for limited pre-launch testing places. Questions, partnerships or suggestions: {PUBLIC_CONTACT_EMAIL}</Text>
      </View>
      <View style={styles.actions}>
        <Link href={waitlistHref(null, 'homepage-banner')} asChild><Button mode="contained" icon="account-clock-outline">Join launch waitlist</Button></Link>
        <Link href="/auth/sign-in" asChild><Button mode="outlined">Existing member sign in</Button></Link>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { width: '100%', backgroundColor: colors.primarySoft, borderBottomWidth: 1, borderBottomColor: colors.primary },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', justifyContent: 'space-between' },
  copy: { flex: 1, minWidth: 280, maxWidth: 860, gap: 7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22, fontSize: 15 },
  offer: { color: colors.charcoalSoft, lineHeight: 21 },
  strong: { fontWeight: '900' },
  small: { color: colors.muted, lineHeight: 18, fontSize: 12 },
  actions: { minWidth: 210, gap: spacing.sm },
});
