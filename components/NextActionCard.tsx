import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { colors, spacing } from '@/constants/theme';

export function NextActionCard({
  title,
  body,
  action,
  eyebrow = 'NEXT ACTION',
}: {
  title: string;
  body: string;
  action: ReactNode;
  eyebrow?: string;
}) {
  return <AppCard variant="soft" style={styles.card}>
    <View style={styles.copy}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text variant="titleLarge" style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
    <View style={styles.action}>{action}</View>
  </AppCard>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.primarySoft, borderColor: '#F0C9AA', gap: spacing.lg },
  copy: { gap: spacing.xs },
  eyebrow: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 22 },
  action: { alignSelf: 'flex-start' },
});
