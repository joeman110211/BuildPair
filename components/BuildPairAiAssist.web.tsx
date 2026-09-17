import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

type Props = {
  title: string;
  body: string;
};

export function BuildPairAiAssist({ title, body }: Props) {
  function openHelper() {
    if (typeof document === 'undefined') return;
    const launcher = document.querySelector('[aria-label="Open BuildPair AI helper"]') as HTMLElement | null;
    launcher?.click();
  }

  return <Pressable
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    onPress={openHelper}
    accessibilityRole="button"
    accessibilityLabel={`${title}. Open BuildPair AI`}
  >
    <View style={styles.icon}><Text style={styles.spark}>✦</Text></View>
    <View style={styles.copy}>
      <Text variant="titleSmall" style={styles.title}>{title}</Text>
      <Text variant="bodySmall" style={styles.body}>{body}</Text>
    </View>
    <Text style={styles.action}>BuildPair AI →</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7D4C4',
    backgroundColor: '#FFF9F3',
  },
  pressed: { opacity: 0.9 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  spark: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 18 },
  action: { flexShrink: 0, color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
});
