import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { formatMoney, poundsToPence } from '@/lib/money';
import type { PaymentStagePlan, Quote } from '@/types';

type Props = {
  quotes: Quote[];
  accepting?: string;
  messaging?: string;
  acting?: string;
  onAccept: (quote: Quote) => void;
  onMessage?: (quote: Quote) => void;
  onDecline?: (quote: Quote) => void;
  onEditPlan?: (quote: Quote, schedule: PaymentStagePlan[]) => void;
};

type EditableStage = PaymentStagePlan & { amountText: string };

export function QuoteComparison({ quotes, accepting, messaging, acting, onAccept, onMessage, onDecline, onEditPlan }: Props) {
  const [renderedAt] = useState(() => Date.now());
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<EditableStage[]>([]);
  const pending = useMemo(() => quotes.filter((quote) => quote.status === 'pending'), [quotes]);
  const lowestTotal = useMemo(() => Math.min(...pending.map((quote) => quote.totalAmount), Number.POSITIVE_INFINITY), [pending]);
  const earliestStart = useMemo(() => Math.min(...pending.filter((quote) => quote.proposedStartAt).map((quote) => new Date(quote.proposedStartAt!).getTime()), Number.POSITIVE_INFINITY), [pending]);
  const longestWarranty = useMemo(() => Math.max(...pending.map((quote) => quote.warrantyMonths ?? 0), 0), [pending]);

  function beginEdit(quote: Quote) {
    const source = quote.paymentSchedule?.length ? quote.paymentSchedule : [{ key: 'final', title: 'Full payment', amount: quote.totalAmount, kind: 'final' as const, trigger: 'Due after the agreed work is complete.', sortOrder: 1 }];
    setDraft(source.map((stage) => ({ ...stage, amountText: (stage.amount / 100).toFixed(2) })));
    setEditingId(quote.id);
  }
  function updateDraft(index: number, patch: Partial<EditableStage>) { setDraft((current) => current.map((stage, i) => i === index ? { ...stage, ...patch } : stage)); }
  function savePlan(quote: Quote) {
    const schedule = draft.map(({ amountText, ...stage }, index) => ({ ...stage, amount: poundsToPence(amountText), sortOrder: index + 1 }));
    onEditPlan?.(quote, schedule);
    setEditingId(undefined);
  }

  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {quotes.map((quote) => {
      const expired = Boolean(quote.validUntil && new Date(quote.validUntil).getTime() < renderedAt);
      const lowest = quote.status === 'pending' && quote.totalAmount === lowestTotal && Number.isFinite(lowestTotal);
      const earliest = quote.status === 'pending' && quote.proposedStartAt && new Date(quote.proposedStartAt).getTime() === earliestStart && Number.isFinite(earliestStart);
      const warrantyLeader = quote.status === 'pending' && Boolean(longestWarranty) && (quote.warrantyMonths ?? 0) === longestWarranty;
      const plan = quote.paymentSchedule ?? [];
      const editing = editingId === quote.id;
      const draftTotal = draft.reduce((sum, stage) => sum + poundsToPence(stage.amountText), 0);
      const draftValid = editing && draft.length > 0 && draftTotal === quote.totalAmount && draft.every((stage) => poundsToPence(stage.amountText) > 0) && draft.filter((stage) => stage.kind === 'final').length === 1 && draft.at(-1)?.kind === 'final';
      const awaitingTrader = quote.paymentScheduleStatus === 'customer_edited';

      return <View key={quote.id} style={styles.column}><AppCard style={[styles.card, lowest && styles.lowestCard]}>
        <View style={styles.heading}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>{quote.businessName ?? 'Trade quote'}</Text><Text variant="headlineMedium" style={styles.total}>{formatMoney(quote.totalAmount)}</Text></View><View style={styles.badges}>{lowest ? <Chip compact icon="cash-check">Lowest total</Chip> : null}{earliest ? <Chip compact icon="calendar-fast">Earliest start</Chip> : null}{warrantyLeader ? <Chip compact icon="shield-check-outline">Longest warranty</Chip> : null}<Chip compact>{expired && quote.status === 'pending' ? 'expired' : quote.status}</Chip></View></View>

        <View style={styles.breakdown}><PriceRow label="Labour" value={formatMoney(quote.laborCost)} /><PriceRow label="Materials" value={formatMoney(quote.materialsCost)} /><PriceRow label="VAT" value={formatMoney(quote.vatAmount)} /><View style={styles.divider} /><PriceRow label="Quote total" value={formatMoney(quote.totalAmount)} strong /></View>
        <View style={styles.facts}><Fact label="Proposed start" value={quote.proposedStartAt ? new Date(quote.proposedStartAt).toLocaleDateString('en-GB') : 'Not specified'} /><Fact label="Estimated duration" value={quote.durationDays ? `${quote.durationDays} day${quote.durationDays === 1 ? '' : 's'}` : 'Not specified'} /><Fact label="Warranty" value={quote.warrantyMonths != null ? `${quote.warrantyMonths} month${quote.warrantyMonths === 1 ? '' : 's'}` : 'Not specified'} /></View>
        {quote.validUntil ? <Text variant="bodySmall" style={expired ? styles.expired : styles.muted}>{expired ? 'Expired' : 'Valid until'} {new Date(quote.validUntil).toLocaleDateString('en-GB')}</Text> : null}
        {quote.scope ? <View style={styles.terms}><Text variant="labelLarge" style={styles.title}>Included scope</Text><Text style={styles.body}>{quote.scope}</Text></View> : null}
        {quote.exclusions ? <View style={styles.terms}><Text variant="labelLarge" style={styles.title}>Exclusions / assumptions</Text><Text style={styles.body}>{quote.exclusions}</Text></View> : null}

        <Divider />
        <View style={styles.terms}>
          <View style={styles.heading}><Text variant="titleMedium" style={styles.title}>Proposed payment stages</Text>{awaitingTrader ? <Chip compact icon="clock-outline">Awaiting trader approval</Chip> : quote.paymentScheduleStatus === 'agreed' ? <Chip compact icon="check">Agreed</Chip> : null}</View>
          {!editing ? (plan.length ? plan.map((stage) => <View key={stage.key} style={styles.stage}><View style={styles.priceRow}><Text style={styles.strong}>{stage.title}</Text><Text style={styles.strong}>{formatMoney(stage.amount)}</Text></View>{stage.trigger ? <Text variant="bodySmall" style={styles.muted}>{stage.trigger}</Text> : null}<Chip compact>{stage.kind}</Chip></View>) : <Text style={styles.muted}>This older quote has no custom stage plan. BuildPair will use its deposit/final-balance fallback.</Text>) : <>
            <Text style={styles.muted}>You can change the payment split and stage descriptions, but the builder's total stays fixed at {formatMoney(quote.totalAmount)}.</Text>
            {draft.map((stage, index) => <View key={stage.key} style={styles.editStage}>
              <TextInput mode="outlined" label="Stage name" value={stage.title} onChangeText={(value) => updateDraft(index, { title: value })} disabled={stage.kind === 'final'} />
              <TextInput mode="outlined" label="Amount (£)" value={stage.amountText} onChangeText={(value) => updateDraft(index, { amountText: value })} keyboardType="decimal-pad" />
              <TextInput mode="outlined" label="When is this due?" value={stage.trigger} onChangeText={(value) => updateDraft(index, { trigger: value })} multiline />
            </View>)}
            <HelperText type={draftValid ? 'info' : 'error'}>{draftValid ? `Stages total ${formatMoney(quote.totalAmount)}.` : `Stages currently total ${formatMoney(draftTotal)}. They must equal the fixed quote total ${formatMoney(quote.totalAmount)}.`}</HelperText>
            <View style={styles.actions}><Button mode="text" onPress={() => setEditingId(undefined)}>Cancel</Button><Button mode="contained" disabled={!draftValid || Boolean(acting)} onPress={() => savePlan(quote)}>Send revised stages</Button></View>
          </>}
        </View>

        <View style={styles.terms}><Text variant="labelLarge" style={styles.title}>Payment terms</Text><Text style={styles.body}>{quote.paymentTerms}</Text>{quote.notes ? <Text style={styles.muted}>{quote.notes}</Text> : null}</View>
        <Text variant="bodySmall" style={styles.muted}>The quote total belongs to the tradesperson and cannot be edited here. Only the timing and split of the payment stages can be proposed back to them.</Text>
        {!editing ? <View style={styles.actions}>
          {onMessage ? <Button mode="outlined" icon="message-text-outline" loading={messaging === quote.id} disabled={Boolean(messaging)} onPress={() => onMessage(quote)}>Message</Button> : null}
          {quote.status === 'pending' && !expired && onEditPlan ? <Button mode="outlined" icon="pencil-outline" disabled={Boolean(acting)} onPress={() => beginEdit(quote)}>Edit payment stages</Button> : null}
          {quote.status === 'pending' && !expired && onDecline ? <Button mode="text" textColor={colors.danger} disabled={Boolean(acting)} onPress={() => onDecline(quote)}>Decline</Button> : null}
          {quote.status === 'pending' && !expired ? <Button mode="contained" icon="check-circle-outline" loading={accepting === quote.id} disabled={Boolean(accepting) || Boolean(acting) || awaitingTrader} onPress={() => onAccept(quote)}>{awaitingTrader ? 'Waiting for trader' : 'Accept quote'}</Button> : null}
        </View> : null}
      </AppCard></View>;
    })}
  </ScrollView>;
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <View style={styles.priceRow}><Text style={strong ? styles.strong : styles.muted}>{label}</Text><Text style={strong ? styles.strong : styles.body}>{value}</Text></View>; }
function Fact({ label, value }: { label: string; value: string }) { return <View style={styles.fact}><Text variant="bodySmall" style={styles.muted}>{label}</Text><Text style={styles.strong}>{value}</Text></View>; }

const styles = StyleSheet.create({
  row: { gap: 14, paddingBottom: 10, paddingHorizontal: 1 }, column: { width: 390 }, card: { minHeight: 520 }, lowestCard: { borderColor: colors.primary, borderWidth: 2 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }, flex: { flex: 1, minWidth: 180, gap: 4 }, badges: { gap: 5, alignItems: 'flex-end' }, title: { fontWeight: '900', color: colors.text }, total: { color: colors.primary, fontWeight: '900' },
  breakdown: { backgroundColor: colors.background, borderRadius: 14, padding: 12, gap: 8 }, priceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, divider: { height: 1, backgroundColor: colors.border }, facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, fact: { flexGrow: 1, flexBasis: 100, backgroundColor: colors.surfaceSoft, borderRadius: 12, padding: 10, gap: 2 },
  body: { color: colors.text, lineHeight: 21 }, strong: { color: colors.text, fontWeight: '900' }, muted: { color: colors.muted, lineHeight: 21 }, expired: { color: colors.danger, fontWeight: '800' }, terms: { gap: 7 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }, stage: { gap: 4, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceSoft }, editStage: { gap: 7, paddingVertical: 6 },
});
