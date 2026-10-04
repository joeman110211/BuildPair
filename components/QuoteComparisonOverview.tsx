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
  const totals = active.map(customerTotal);
  const lowest = Math.min(...totals);
  const highest = Math.max(...totals);
  const earliest = Math.min(...active.filter((quote) => quote.proposedStartAt).map((quote) => new Date(quote.proposedStartAt!).getTime()), Number.POSITIVE_INFINITY);
  const latest = Math.max(...active.filter((quote) => quote.proposedStartAt).map((quote) => new Date(quote.proposedStartAt!).getTime()), Number.NEGATIVE_INFINITY);
  const durations = [...new Set(active.map((quote) => quote.durationDays ?? null))];
  const warranties = [...new Set(active.map((quote) => quote.warrantyMonths ?? null))];
  const materialValues = [...new Set(active.map((quote) => quote.materialsCost))];
  const stageCounts = [...new Set(active.map((quote) => quote.paymentSchedule?.length ?? 0))];
  const buildPayModes = [...new Set(active.map((quote) => Boolean(quote.buildPayRequestedBy)))];
  const exclusionsDiffer = new Set(active.map((quote) => (quote.exclusions || '').trim().toLowerCase())).size > 1;
  const differenceSignals = [
    highest > lowest ? `Totals differ by ${formatMoney(highest - lowest)}` : null,
    Number.isFinite(earliest) && Number.isFinite(latest) && latest > earliest ? 'Proposed start dates differ' : null,
    durations.length > 1 ? 'Job durations differ' : null,
    warranties.length > 1 ? 'Warranty terms differ' : null,
    materialValues.length > 1 ? 'Materials allowances differ' : null,
    stageCounts.length > 1 ? 'Payment stages differ' : null,
    buildPayModes.length > 1 ? 'BuildPay choices differ' : null,
    exclusionsDiffer ? 'Exclusions differ' : null,
  ].filter(Boolean) as string[];

  return <AppCard style={styles.shell}>
    <View style={styles.heading}>
      <View style={styles.flex}>
        <Text variant="titleLarge" style={styles.title}>Compare at a glance</Text>
        <Text style={styles.muted}>Price is only one part of the job. Compare scope, timing, warranty and whether BuildPay protection is included before opening the full quotes below.</Text>
      </View>
      <Chip icon="compare-horizontal">{active.length} quotes</Chip>
    </View>
    {differenceSignals.length ? <View style={styles.differences}>
      <Text variant="titleSmall" style={styles.title}>Differences worth checking</Text>
      <View style={styles.tags}>{differenceSignals.map((signal) => <Chip key={signal} compact icon="alert-circle-outline">{signal}</Chip>)}</View>
    </View> : null}
    <View style={styles.grid}>
      {active.map((quote) => {
        const allIn = customerTotal(quote);
        const isLowest = allIn === lowest;
        const isEarliest = Boolean(quote.proposedStartAt) && new Date(quote.proposedStartAt!).getTime() === earliest;
        return <View key={quote.id} style={[styles.quote, compact && styles.quoteCompact, isLowest && styles.quoteBest]}>
          <Text variant="titleMedium" numberOfLines={2} style={styles.title}>{quote.businessName ?? 'Tradesperson'}</Text>
          <Text variant="headlineSmall" style={styles.price}>{formatMoney(allIn)}</Text>
          <Text variant="bodySmall" style={styles.muted}>{quote.buildPayRequestedBy ? 'BuildPay included in proposal' : 'BuildPay optional after acceptance'}</Text>
          <View style={styles.tags}>{isLowest ? <Chip compact icon="cash-check">Lowest total</Chip> : null}{isEarliest ? <Chip compact icon="calendar-fast">Earliest start</Chip> : null}</View>
          <View style={styles.fact}><Text style={styles.label}>Start</Text><Text style={styles.value}>{quote.proposedStartAt ? new Date(quote.proposedStartAt).toLocaleDateString('en-GB') : 'To agree'}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Duration</Text><Text style={styles.value}>{quote.durationDays ? `${quote.durationDays} day${quote.durationDays === 1 ? '' : 's'}` : 'To agree'}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Warranty</Text><Text style={styles.value}>{quote.warrantyMonths != null ? `${quote.warrantyMonths} months` : 'Not stated'}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Materials</Text><Text style={styles.value}>{formatMoney(quote.materialsCost)}</Text></View>
          <View style={styles.fact}><Text style={styles.label}>Labour/service</Text><Text style={styles.value}>{formatMoney(quote.laborCost)}</Text></View>
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
  differences: { gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: colors.surfaceSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quote: { flexGrow: 1, flexBasis: 240, minWidth: 0, flexShrink: 1, maxWidth: 380, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 8, backgroundColor: '#FFFFFF' },
  quoteCompact: { flexBasis: '100%', maxWidth: '100%' },
  quoteBest: { borderWidth: 2, borderColor: colors.primary },
  price: { color: colors.charcoal, fontWeight: '900' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 7 },
  label: { color: colors.muted, fontWeight: '700' },
  value: { color: colors.charcoal, fontWeight: '800', textAlign: 'right' },
});
