import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
import { colors, radii, spacing } from '@/constants/theme';
import { formatMoney, poundsToPence } from '@/lib/money';
import { fullFundingSchedule } from '@/lib/payment-plan';
import type { PaymentStagePlan, Quote } from '@/types';

type PaymentChoice = 'full' | 'milestones';
type Props = {
  quotes: Quote[];
  accepting?: string;
  messaging?: string;
  acting?: string;
  onAccept: (quote: Quote, paymentChoice: PaymentChoice) => void;
  onMessage?: (quote: Quote) => void;
  onDecline?: (quote: Quote) => void;
  onEditPlan?: (quote: Quote, schedule: PaymentStagePlan[]) => void;
};
type EditableStage = PaymentStagePlan & { amountText: string };

export function QuoteComparison({ quotes, accepting, messaging, acting, onAccept, onMessage, onDecline, onEditPlan }: Props) {
  const [renderedAt] = useState(() => Date.now());
  const [expandedCostId, setExpandedCostId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<EditableStage[]>([]);
  const [choices, setChoices] = useState<Record<string, PaymentChoice>>({});
  const pending = useMemo(() => quotes.filter((quote) => quote.status === 'pending'), [quotes]);
  const lowestTotal = useMemo(() => Math.min(...pending.map((quote) => quote.totalAmount), Number.POSITIVE_INFINITY), [pending]);
  const earliestStart = useMemo(() => Math.min(...pending.filter((quote) => quote.proposedStartAt).map((quote) => new Date(quote.proposedStartAt!).getTime()), Number.POSITIVE_INFINITY), [pending]);

  function beginEdit(quote: Quote) {
    const source = quote.paymentSchedule?.length ? quote.paymentSchedule : fullFundingSchedule(quote.totalAmount, quote.materialsCost);
    setDraft(source.map((stage) => ({ ...stage, amountText: (stage.amount / 100).toFixed(2) })));
    setEditingId(quote.id);
    setChoices((current) => ({ ...current, [quote.id]: 'milestones' }));
  }

  function updateDraft(index: number, patch: Partial<EditableStage>) { setDraft((current) => current.map((stage, i) => i === index ? { ...stage, ...patch } : stage)); }
  function addDraftStage() {
    setDraft((current) => {
      const finalIndex = current.findIndex((stage) => stage.kind === 'final');
      const next: EditableStage = { key: `customer-stage-${Date.now()}`, title: `Stage ${current.filter((stage) => stage.kind === 'stage').length + 1}`, amount: 0, amountText: '', kind: 'stage', trigger: '', sortOrder: Math.max(1, finalIndex + 1) };
      if (finalIndex < 0) return [...current, next];
      return [...current.slice(0, finalIndex), next, ...current.slice(finalIndex)];
    });
  }
  function removeDraftStage(index: number) { setDraft((current) => current.filter((stage, i) => i !== index || stage.kind === 'final')); }
  function savePlan(quote: Quote) {
    const schedule = draft.map(({ amountText, ...stage }, index) => ({ ...stage, amount: poundsToPence(amountText), sortOrder: index + 1 }));
    onEditPlan?.(quote, schedule);
    setEditingId(undefined);
  }

  return <View style={styles.list}>
    {quotes.map((quote) => {
      const expired = Boolean(quote.validUntil && new Date(quote.validUntil).getTime() < renderedAt);
      const lowest = quote.status === 'pending' && quote.totalAmount === lowestTotal && Number.isFinite(lowestTotal);
      const earliest = quote.status === 'pending' && quote.proposedStartAt && new Date(quote.proposedStartAt).getTime() === earliestStart && Number.isFinite(earliestStart);
      const expanded = expandedCostId === quote.id;
      const editing = editingId === quote.id;
      const awaitingTrader = quote.paymentScheduleStatus === 'customer_edited';
      const choice = choices[quote.id] ?? 'milestones';
      const stagedPlan = quote.paymentSchedule?.length ? quote.paymentSchedule : fullFundingSchedule(quote.totalAmount, quote.materialsCost);
      const selectedPlan = choice === 'full' ? fullFundingSchedule(quote.totalAmount, quote.materialsCost) : stagedPlan;
      const draftTotal = draft.reduce((sum, stage) => sum + poundsToPence(stage.amountText), 0);
      const draftMaterials = draft.filter((stage) => stage.kind === 'materials').reduce((sum, stage) => sum + poundsToPence(stage.amountText), 0);
      const draftValid = editing && draft.length > 0 && draftTotal === quote.totalAmount && draftMaterials === quote.materialsCost && draft.every((stage) => poundsToPence(stage.amountText) >= 30) && draft.filter((stage) => stage.kind === 'final').length === 1 && draft.at(-1)?.kind === 'final';

      return <AppCard key={quote.id} style={[styles.card, lowest && styles.bestCard]}>
        <View style={styles.summaryTop}>
          <View style={styles.flex}>
            <View style={styles.badges}>{lowest ? <Chip compact icon="cash-check">Lowest total</Chip> : null}{earliest ? <Chip compact icon="calendar-fast">Earliest start</Chip> : null}<Chip compact>{expired && quote.status === 'pending' ? 'Expired' : quote.status}</Chip></View>
            <Text variant="titleLarge" style={styles.title}>{quote.businessName ?? 'Trade quote'}</Text>
            <Text variant="displaySmall" style={styles.total}>{formatMoney(quote.totalAmount)}</Text>
            <Text style={styles.muted}>Quoted job total. Materials remain outside BuildPair's 1% labour/service fee.</Text>
          </View>
          <View style={styles.summaryFacts}>
            <Fact label="Start" value={quote.proposedStartAt ? new Date(quote.proposedStartAt).toLocaleDateString('en-GB') : 'To agree'} />
            <Fact label="Timeline" value={quote.durationDays ? `${quote.durationDays} day${quote.durationDays === 1 ? '' : 's'}` : 'To agree'} />
            <Fact label="Warranty" value={quote.warrantyMonths != null ? `${quote.warrantyMonths} month${quote.warrantyMonths === 1 ? '' : 's'}` : 'Not stated'} />
          </View>
        </View>

        {quote.scope ? <View style={styles.scopeBox}><Text variant="labelLarge" style={styles.title}>What you're getting</Text><Text style={styles.body}>{quote.scope}</Text>{quote.exclusions ? <><Text variant="labelLarge" style={styles.title}>Not included</Text><Text style={styles.muted}>{quote.exclusions}</Text></> : null}</View> : null}

        <Divider />
        <Pressable accessibilityRole="button" onPress={() => setExpandedCostId(expanded ? undefined : quote.id)} style={styles.expandHeader}>
          <View><Text variant="titleMedium" style={styles.title}>Cost breakdown</Text><Text style={styles.muted}>Materials, labour/service and VAT</Text></View>
          <Chip compact icon={expanded ? 'chevron-up' : 'chevron-down'}>{expanded ? 'Hide' : 'View'}</Chip>
        </Pressable>
        {expanded ? <View style={styles.breakdown}>
          <PriceRow label="Materials" value={formatMoney(quote.materialsCost)} note="Paid as the exact quoted materials amount when using BuildPair Protected Payments." />
          <PriceRow label="Labour / service" value={formatMoney(quote.laborCost)} note="BuildPair's 1% platform fee applies only to this amount." />
          {quote.vatAmount > 0 ? <PriceRow label="VAT" value={formatMoney(quote.vatAmount)} note="Shown separately and excluded from the BuildPair 1% fee base." /> : null}
          <Divider />
          <View style={styles.priceRow}><Text style={styles.strong}>Quote total</Text><Text style={styles.strong}>{formatMoney(quote.totalAmount)}</Text></View>
        </View> : null}

        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.title}>Choose how to fund the job</Text>
          <Text style={styles.muted}>The quote total does not change. This choice only changes when the protected service balance is funded and released.</Text>
          <View style={styles.optionGrid}>
            <PaymentOption selected={choice === 'full'} title="Pay in full" subtitle="Materials first, then fund the remaining service balance as one protected payment. It releases after final approval." onPress={() => setChoices((current) => ({ ...current, [quote.id]: 'full' }))} />
            <PaymentOption selected={choice === 'milestones'} title="Staged protected payments" subtitle="Fund one agreed stage at a time. The next stage stays locked until the previous one is completed and approved." onPress={() => setChoices((current) => ({ ...current, [quote.id]: 'milestones' }))} />
          </View>
        </View>

        <View style={styles.protectionBox}>
          <Chip compact icon="shield-lock-outline">BuildPair Protected Payments</Chip>
          <Text style={styles.body}>Stripe processes the payments. Materials are released for procurement; deposits and work stages stay controlled until the agreed completion point is marked complete and the homeowner approves release.</Text>
          <Text variant="bodySmall" style={styles.muted}>BuildPair does not call this escrow and does not inspect workmanship. Payment decisions, approvals and disputes are recorded against the project.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text variant="titleLarge" style={styles.title}>{choice === 'full' ? 'Full funding plan' : 'Milestone plan'}</Text>{awaitingTrader && choice === 'milestones' ? <Chip compact icon="clock-outline">Awaiting trader</Chip> : null}</View>
          <MilestoneTimeline items={selectedPlan.map((stage) => ({ id: stage.key, title: stage.title, amount: stage.amount, kind: stage.kind, trigger: stage.trigger }))} />
          {choice === 'milestones' && quote.paymentScheduleStatus === 'agreed' ? <Chip compact icon="check-circle-outline">Payment stages agreed by both sides</Chip> : null}
        </View>

        {editing ? <AppCard elevated={false} style={styles.editor}>
          <Text variant="titleMedium" style={styles.title}>Request different milestone stages</Text>
          <Text style={styles.muted}>The quoted total and materials amount stay fixed. Change only the service-stage split or completion points.</Text>
          {draft.map((stage, index) => <View key={stage.key} style={styles.editStage}>
            <TextInput mode="outlined" label="Stage name" value={stage.title} onChangeText={(value) => updateDraft(index, { title: value })} disabled={stage.kind === 'materials' || stage.kind === 'final'} />
            <TextInput mode="outlined" label="Amount (£)" value={stage.amountText} onChangeText={(value) => updateDraft(index, { amountText: value })} keyboardType="decimal-pad" disabled={stage.kind === 'materials'} />
            <TextInput mode="outlined" label="Release point" value={stage.trigger} onChangeText={(value) => updateDraft(index, { trigger: value })} multiline disabled={stage.kind === 'materials'} />
            {stage.kind === 'stage' ? <Button mode="text" onPress={() => removeDraftStage(index)}>Remove stage</Button> : null}
          </View>)}
          <Button mode="outlined" icon="plus" disabled={draft.length >= 10} onPress={addDraftStage}>Add service milestone</Button>
          <HelperText type={draftValid ? 'info' : 'error'}>{draftValid ? `Stages total ${formatMoney(quote.totalAmount)} and preserve the exact ${formatMoney(quote.materialsCost)} materials payment.` : `Stages must total ${formatMoney(quote.totalAmount)} and materials must remain exactly ${formatMoney(quote.materialsCost)}.`}</HelperText>
          <View style={styles.actions}><Button onPress={() => setEditingId(undefined)}>Cancel</Button><Button mode="contained" disabled={!draftValid || Boolean(acting)} onPress={() => savePlan(quote)}>Send stage changes</Button></View>
        </AppCard> : null}

        {quote.paymentTerms ? <Text variant="bodySmall" style={styles.muted}>{quote.paymentTerms}</Text> : null}
        {quote.validUntil ? <Text variant="bodySmall" style={expired ? styles.expired : styles.muted}>{expired ? 'Expired' : 'Valid until'} {new Date(quote.validUntil).toLocaleDateString('en-GB')}</Text> : null}

        {!editing ? <View style={styles.actions}>
          {onMessage ? <Button mode="outlined" icon="message-text-outline" loading={messaging === quote.id} disabled={Boolean(messaging)} onPress={() => onMessage(quote)}>Request changes</Button> : null}
          {quote.status === 'pending' && !expired && choice === 'milestones' && onEditPlan ? <Button mode="text" icon="tune-variant" disabled={Boolean(acting)} onPress={() => beginEdit(quote)}>Edit milestones</Button> : null}
          {quote.status === 'pending' && !expired && onDecline ? <Button mode="text" textColor={colors.danger} disabled={Boolean(acting)} onPress={() => onDecline(quote)}>Decline</Button> : null}
          {quote.status === 'pending' && !expired ? <Button mode="contained" icon="check-circle-outline" loading={accepting === quote.id} disabled={Boolean(accepting) || Boolean(acting) || (choice === 'milestones' && awaitingTrader)} onPress={() => onAccept(quote, choice)}>{choice === 'full' ? 'Accept & choose full funding' : awaitingTrader ? 'Waiting for trader' : 'Accept & use milestones'}</Button> : null}
        </View> : null}
      </AppCard>;
    })}
  </View>;
}

function PaymentOption({ selected, title, subtitle, onPress }: { selected: boolean; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
    <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioInner} /> : null}</View>
    <View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{title}</Text><Text style={styles.muted}>{subtitle}</Text></View>
  </Pressable>;
}

function PriceRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return <View style={styles.costRow}><View style={styles.flex}><Text style={styles.strong}>{label}</Text>{note ? <Text variant="bodySmall" style={styles.muted}>{note}</Text> : null}</View><Text style={styles.strong}>{value}</Text></View>;
}
function Fact({ label, value }: { label: string; value: string }) { return <View style={styles.fact}><Text variant="bodySmall" style={styles.muted}>{label}</Text><Text style={styles.strong}>{value}</Text></View>; }

const styles = StyleSheet.create({
  list: { width: '100%', alignItems: 'center', gap: spacing.lg },
  card: { width: '100%', maxWidth: 860, gap: spacing.lg },
  bestCard: { borderColor: colors.primary, borderWidth: 2 },
  summaryTop: { gap: spacing.md },
  flex: { flex: 1, minWidth: 180, gap: 4 },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  title: { fontWeight: '900', color: colors.text },
  total: { color: colors.primary, fontWeight: '900' },
  strong: { color: colors.text, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted, lineHeight: 20 },
  expired: { color: colors.danger, fontWeight: '800' },
  summaryFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fact: { flex: 1, minWidth: 120, backgroundColor: colors.surfaceSoft, borderRadius: radii.md, padding: spacing.md, gap: 2 },
  scopeBox: { gap: spacing.sm, backgroundColor: colors.surfaceSoft, borderRadius: radii.md, padding: spacing.md },
  expandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  breakdown: { backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  section: { gap: spacing.md },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  optionGrid: { gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surfaceRaised },
  optionSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioSelected: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  protectionBox: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  editor: { gap: spacing.sm, backgroundColor: colors.surfaceSoft },
  editStage: { gap: spacing.sm, paddingVertical: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
});
