import { StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import type { Quote } from '@/types';

function customerTotal(quote: Quote) {
  const fee = quote.buildPayRequestedBy && quote.buildPayFeeMode === 'customer_pays'
    ? Math.max(0, quote.buildPayCustomerFeeEstimate ?? 0)
    : 0;
  return quote.totalAmount + fee;
}

export function QuoteComparisonOverview({ quotes }: { quotes: Quote[] }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const active = quotes.filter((quote) => quote.status === 'pending');
  if (active.length < 2) return null;
  const lowest = Math.min(...active.map(customerTotal));
  const earliest = Math.min(...active.filter((quote) => quote.proposedStartAt).map((quote) => new Date(quote.proposedStartAt!).getTime()), Number.POSITIVE_INFINITY);

  return <AppCard style={styles.shell}>
    <View style={styles.heading}>
      <View style={styles.flex}>
        <Text variant="titleLarge" style={styles.title}>Compare at a glance</Text>
        <Text style={styles.muted}>Price is only one part of the job. Compare scope, timing, warranty and whether BuildPay protection is included before opening the full quotes below.</Text>
      </View>
      <Chip icon="compare-horizontal">{active.length} quotes</Chip>
    </View>
    <View style={styles.grid}>
      {active.map((quote) => {
        const allIn = customerTotal(quote);
        const isLowest = allIn === lowest;
        const isEarliest = Boolean(quote.proposedStartAt) && new Date(quote.proposedStartAt!).getTime() === earliest;
        const exclusions = quote.exclusions?.trim() ?? '';
        const exclusionsDiffer = active.some((other) => other.id !== quote.id && (other.exclusions?.trim() ?? '') !== exclusions);
        const stageCount = quote.paymentSchedule?.length ?? 0;
        return <View key={quote.id} style={[styles.quote, compact && styles.quoteCompact, isLowest && styles.quoteBest]}>
          <Text variant="titleMedium" numberOfLines={2} style={styles.title}>{quote.businessName ?? 'Tradesperson'}</Text>
          <Text variant="headlineSmall" style={styles.price}>{formatMoney(allIn)}</Text>
          <Text variant="bodySmall" style={styles.muted}>{quote.buildPayRequestedBy ? 'BuildPay included in proposal' : 'BuildPay optional after acceptance'}</Text>
          <View style={styles.tags}>{isLowest ? <Chip compact icon="cash-check">Lowest total</Chip> : null}{isEarliest ? <Chip compact icon="calendar-fast">Earliest start</Chip> : null}{exclusionsDiffer ? <Chip compact icon="text-box-search-outline">Different exclusions</Chip> : null}{quote.warrantyMonths == null ? <Chip compact icon="alert-circle-outline">Warranty not stated</Chip> : null}</View>
          <View style={styles.fact}><Text style={styles.label}>Start</Text><Text style={styles.value}>{quote.proposedStartAt ? new Date(quote.proposedStartAt).toLocaleDateString('en-GB') : 'To agree'}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Duration</Text><Text style={styles.value}>{quote.durationDays ? `${quote.durationDays} day${quote.durationDays === 1 ? '' : 's'}` : 'To agree'}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Warranty</Text><Text style={styles.value}>{quote.warrantyMonths != null ? `${quote.warrantyMonths} months` : 'Not stated'}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Materials</Text><Text style={styles.value}>{formatMoney(quote.materialsCost)}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Labour/service</Text><Text style={styles.value}>{formatMoney(quote.laborCost)}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Deposit</Text><Text style={styles.value}>{quote.depositAmount > 0 ? formatMoney(quote.depositAmount) : 'None stated'}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Payment stages</Text><Text style={styles.value}>{stageCount || 'Single / not staged'}</Text></View>
          <View style={styles.differenceBox}><Text style={styles.differenceLabel}>Exclusions</Text><Text style={styles.differenceText}>{exclusions ? exclusions.slice(0, 220) : 'No exclusions stated'}</Text></View>
        </View>;
      })}
    </View>
    <Text variant="bodySmall" style={styles.muted}>Full structured scope, exclusions, payment stages and accept/decline controls are directly below. On a phone these summaries stack cleanly instead of forcing a microscopic spreadsheet onto the screen.</Text>
  </AppCard>;
}

const styles = StyleSheet.create({
  shell: { gap: 14 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 4 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quote: { flexGrow: 1, flexBasis: 240, minWidth: 0, flexShrink: 1, maxWidth: 380, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 8, backgroundColor: '#FFFFFF' },
  quoteCompact: { flexBasis: '100%', maxWidth: '100%' },
  quoteBest: { borderWidth: 2, borderColor: colors.primary },
  price: { color: colors.charcoal, fontWeight: '900' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 7 },
  label: { color: colors.muted, fontWeight: '700' },
  value: { color: colors.charcoal, fontWeight: '800', textAlign: 'right' },
  differenceBox: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  differenceLabel: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  differenceText: { color: colors.charcoalSoft, lineHeight: 19, fontSize: 12 },
});
