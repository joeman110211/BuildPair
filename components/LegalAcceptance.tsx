import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

export function LegalAcceptance({ accepted, onChange, disabled = false }: { accepted: boolean; onChange: (accepted: boolean) => void; disabled?: boolean }) {
  return <View style={styles.container}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted, disabled }} accessibilityLabel="I agree to the Terms of Use and acknowledge the Privacy Policy." onPress={() => onChange(!accepted)} disabled={disabled} style={styles.checkbox}>
      <View style={[styles.box, accepted && styles.boxAccepted]}><Text style={styles.tick}>{accepted ? '✓' : ''}</Text></View>
      <Text style={styles.label}>I agree to the Terms of Use and acknowledge the Privacy Policy.</Text>
    </Pressable>
    <View style={styles.links}>
      <Link href="/(public)/terms" style={styles.link}>Read Terms of Use</Link>
      <Link href="/(public)/privacy" style={styles.link}>Read Privacy Policy</Link>
    </View>
    <Text style={styles.note}>This does not sign you up for unrelated marketing.</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 6 },
  checkbox: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  box: { width: 24, height: 24, borderRadius: 5, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  boxAccepted: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  label: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 21, textAlign: 'left', flexShrink: 1 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingLeft: 12 },
  link: { color: colors.primaryDark, fontSize: 14, lineHeight: 22, textDecorationLine: 'underline' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingLeft: 12 },
});
