import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { colors, spacing } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import type { PaymentStageKind, PaymentStageStatus } from '@/types';

export type MilestoneTimelineItem = {
  id: string;
  title: string;
  amount: number;
  kind: PaymentStageKind;
  trigger?: string | null;
  status?: PaymentStageStatus | 'upcoming';
};

export function MilestoneTimeline({ items, compact = false }: { items: MilestoneTimelineItem[]; compact?: boolean }) {
  const currentIndex = items.findIndex((item) => item.status !== 'paid');
  return <View style={styles.wrap}>
    {items.map((item, index) => {
      const status = item.status ?? (index === 0 ? 'pending' : 'upcoming');
      const completed = status === 'paid';
      const active = !completed && index === (currentIndex < 0 ? items.length - 1 : currentIndex);
      const disputed = status === 'disputed';
      const dotStyle = completed ? styles.dotDone : disputed ? styles.dotIssue : active ? styles.dotActive : styles.dotUpcoming;
      return <View key={item.id} style={styles.row}>
        <View style={styles.rail}>
          <View style={[styles.dot, dotStyle]} />
          {index < items.length - 1 ? <View style={[styles.line, completed && styles.lineDone]} /> : null}
        </View>
        <View style={[styles.copy, compact && styles.copyCompact]}>
          <View style={styles.headingRow}>
            <View style={styles.titleWrap}>
              <Text variant="titleSmall" style={[styles.title, active && styles.activeText]}>{item.title}</Text>
              {!compact && item.trigger ? <Text variant="bodySmall" style={styles.muted}>{item.trigger}</Text> : null}
            </View>
            <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
          </View>
          <View style={styles.chips}>
            <Chip compact>{kindLabel(item.kind)}</Chip>
            {item.status ? <Chip compact icon={statusIcon(status)}>{statusLabel(status)}</Chip> : null}
          </View>
        </View>
      </View>;
    })}
  </View>;
}

function kindLabel(kind: PaymentStageKind) {
  if (kind === 'materials') return 'Materials';
  if (kind === 'deposit') return 'Protected deposit';
  if (kind === 'final') return 'Final';
  return 'Milestone';
}

function statusLabel(status: MilestoneTimelineItem['status']) {
  if (status === 'paid') return 'Released';
  if (status === 'funded') return 'Protected';
  if (status === 'completed') return 'Approval needed';
  if (status === 'disputed') return 'Paused';
  if (status === 'upcoming') return 'Upcoming';
  return 'Next payment';
}

function statusIcon(status: MilestoneTimelineItem['status']) {
  if (status === 'paid') return 'check-circle-outline';
  if (status === 'funded') return 'shield-lock-outline';
  if (status === 'completed') return 'account-check-outline';
  if (status === 'disputed') return 'alert-circle-outline';
  return 'clock-outline';
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', gap: spacing.md, minHeight: 74 },
  rail: { width: 22, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, marginTop: 3, zIndex: 2 },
  dotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotIssue: { backgroundColor: colors.danger, borderColor: colors.danger },
  dotUpcoming: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.accent },
  copy: { flex: 1, paddingBottom: spacing.lg, gap: spacing.xs },
  copyCompact: { paddingBottom: spacing.md },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  titleWrap: { flex: 1, gap: 2 },
  title: { color: colors.text, fontWeight: '800' },
  activeText: { color: colors.primaryDark },
  amount: { color: colors.text, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 18 },
  chips: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
});
