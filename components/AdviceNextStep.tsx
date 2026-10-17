import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { SemanticHeading } from '@/components/SemanticHeading';
import { colors, radii } from '@/constants/theme';
import type { AdviceGuide } from '@/lib/advice-library';
import { adviceNextStep } from '@/lib/advice-growth';

export function AdviceNextStep({ guide }: { guide: AdviceGuide }) {
  const action = adviceNextStep(guide);
  return <View style={styles.panel} testID="advice-next-step">
    <View style={styles.copy}>
      <SemanticHeading level={2} style={styles.heading}>{action.title}</SemanticHeading>
      <Text style={styles.description}>{action.description}</Text>
    </View>
    <Link href={action.href} asChild>
      <Button mode="contained" icon="arrow-right" style={styles.button}>{action.label}</Button>
    </Link>
  </View>;
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl,
    backgroundColor: colors.surfaceRaised, padding: 20,
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    alignItems: 'center', justifyContent: 'space-between',
  },
  copy: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0, gap: 6 },
  heading: { color: colors.charcoal, fontWeight: '800', fontSize: 21, lineHeight: 27 },
  description: { color: colors.charcoalSoft, fontSize: 15, lineHeight: 23 },
  button: { flexShrink: 1 },
});
