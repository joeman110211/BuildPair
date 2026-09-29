import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/constants/theme';

type AppCardVariant = 'default' | 'soft' | 'outlined';

export function AppCard({
  children,
  style,
  elevated = true,
  variant = 'default',
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; elevated?: boolean; variant?: AppCardVariant }>) {
  return <View style={[
    styles.card,
    variant === 'soft' && styles.soft,
    variant === 'outlined' && styles.outlined,
    elevated && variant === 'default' && styles.elevated,
    style,
  ]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: '#E8E1DA',
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  soft: {
    backgroundColor: colors.surfaceSoft,
    borderColor: '#ECE4DC',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  elevated: shadows.raised,
});
