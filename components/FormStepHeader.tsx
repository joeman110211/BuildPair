import { StyleSheet, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import { colors, radii, spacing, typography } from '@/constants/theme';

export function FormStepHeader({
  current,
  total,
  hint,
}: {
  current: number;
  total: number;
  hint?: string;
}) {
  const step = Math.min(Math.max(current, 1), Math.max(total, 1));
  const progress = step / Math.max(total, 1);

  return <View style={styles.shell}>
    <View style={styles.row}>
      <Text style={styles.step}>Step {step} of {total}</Text>
      <Text style={styles.remaining}>{step === total ? 'Ready to finish' : `${total - step} left`}</Text>
    </View>
    <ProgressBar progress={progress} color={colors.primary} style={styles.progress} />
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: '#ECE4DC',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  step: { ...typography.label, color: colors.charcoal },
  remaining: { ...typography.bodySmall, color: colors.muted },
  progress: { height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceStrong },
  hint: { ...typography.bodySmall, color: colors.muted },
});
