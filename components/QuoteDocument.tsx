import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { colors, radii, spacing } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import type { PaymentStagePlan } from '@/types';

export type QuoteDocumentItem = {
  id?: string;
  description: string;
  category: 'labour' | 'materials' | 'other';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type QuoteChoice = {
  id?: string;
  kind: 'optional' | 'alternative';
  title: string;
  description?: string | null;
  priceDelta: number;
};

export type QuoteDocumentData = {
  businessName: string;
  quoteNumber?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  jobTitle: string;
  jobAddress?: string | null;
  workIncluded: string;
  notIncluded?: string | null;
  expectedStart?: string | null;
  durationText?: string | null;
  warrantyText?: string | null;
  items: QuoteDocumentItem[];
  options?: QuoteChoice[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: 'undecided' | 'buildpair' | 'external';
  paymentTerms: string;
  paymentSchedule: PaymentStagePlan[];
  notes?: string | null;
  showBreakdown: boolean;
  validUntil?: string | null;
  createdAt?: string | null;
};

function labelForPaymentMethod(value: QuoteDocumentData['paymentMethod']) {
  if (value === 'buildpair') return 'BuildPair payments';
  if (value === 'external') return 'Paid directly to the tradesperson';
  return 'Payment method to be agreed';
}

export function QuoteDocument({ quote }: { quote: QuoteDocumentData }) {
  const quoteDate = quote.createdAt ? new Date(quote.createdAt) : new Date();
  return <View style={styles.document}>
    <View style={styles.topRow}>
      <View style={styles.grow}>
        <Text variant="headlineMedium" style={styles.brand}>{quote.businessName}</Text>
        <Text style={styles.muted}>Professional quotation</Text>
      </View>
      <View style={styles.reference}>
        <Text style={styles.referenceLabel}>QUOTE</Text>
        <Text variant="titleMedium" style={styles.strong}>{quote.quoteNumber || 'Preview'}</Text>
        <Text style={styles.muted}>{quoteDate.toLocaleDateString('en-GB')}</Text>
      </View>
    </View>

    <Divider />

    <View style={styles.twoColumn}>
      <View style={styles.infoBlock}>
        <Text style={styles.label}>PREPARED FOR</Text>
        <Text variant="titleMedium" style={styles.strong}>{quote.customerName || 'Customer'}</Text>
        {quote.customerEmail ? <Text style={styles.body}>{quote.customerEmail}</Text> : null}
        {quote.customerPhone ? <Text style={styles.body}>{quote.customerPhone}</Text> : null}
      </View>
      <View style={styles.infoBlock}>
        <Text style={styles.label}>JOB</Text>
        <Text variant="titleMedium" style={styles.strong}>{quote.jobTitle || 'Job'}</Text>
        {quote.jobAddress ? <Text style={styles.body}>{quote.jobAddress}</Text> : null}
      </View>
    </View>

    <View style={styles.section}>
      <Text variant="titleLarge" style={styles.sectionTitle}>Work included</Text>
      <Text style={styles.body}>{quote.workIncluded}</Text>
    </View>

    {quote.notIncluded ? <View style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Not included</Text>
      <Text style={styles.body}>{quote.notIncluded}</Text>
    </View> : null}

    <View style={styles.section}>
      <Text variant="titleLarge" style={styles.sectionTitle}>Price</Text>
      {quote.showBreakdown ? <View style={styles.items}>
        {quote.items.map((item, index) => <View key={item.id || `${item.description}-${index}`} style={styles.itemRow}>
          <View style={styles.itemText}>
            <Text style={styles.strong}>{item.description}</Text>
            {item.quantity !== 1 ? <Text style={styles.muted}>{item.quantity} × {formatMoney(item.unitPrice)}</Text> : null}
          </View>
          <Text style={styles.strong}>{formatMoney(item.lineTotal)}</Text>
        </View>)}
      </View> : <Text style={styles.muted}>A single total price has been supplied for this job.</Text>}
      <View style={styles.totals}>
        <View style={styles.totalRow}><Text style={styles.muted}>Subtotal</Text><Text>{formatMoney(quote.subtotal)}</Text></View>
        {quote.vatAmount > 0 ? <View style={styles.totalRow}><Text style={styles.muted}>VAT ({quote.vatRate}%)</Text><Text>{formatMoney(quote.vatAmount)}</Text></View> : null}
        <Divider />
        <View style={styles.totalRow}><Text variant="titleLarge" style={styles.strong}>Total</Text><Text variant="headlineSmall" style={styles.total}>{formatMoney(quote.totalAmount)}</Text></View>
      </View>
    </View>

    {quote.options?.length ? <View style={styles.section}>
      <Text variant="titleLarge" style={styles.sectionTitle}>Choices & optional extras</Text>
      <Text style={styles.muted}>These are shown separately and are not included in the quoted total above. If you want one, agree it with the tradesperson before it becomes part of the job.</Text>
      <View style={styles.items}>
        {quote.options.map((option, index) => <View key={option.id || `${option.title}-${index}`} style={styles.choiceRow}>
          <View style={styles.itemText}>
            <Text style={styles.strong}>{option.title}</Text>
            <Text style={styles.muted}>{option.kind === 'alternative' ? 'Alternative option' : 'Optional extra'}{option.description ? ` · ${option.description}` : ''}</Text>
          </View>
          <Text style={styles.choicePrice}>{option.priceDelta === 0 ? 'No price change' : `${option.priceDelta > 0 ? '+' : '-'}${formatMoney(Math.abs(option.priceDelta))}`}</Text>
        </View>)}
      </View>
    </View> : null}

    {(quote.expectedStart || quote.durationText || quote.warrantyText) ? <View style={styles.facts}>
      {quote.expectedStart ? <View style={styles.fact}><Text style={styles.label}>EXPECTED START</Text><Text style={styles.strong}>{quote.expectedStart}</Text></View> : null}
      {quote.durationText ? <View style={styles.fact}><Text style={styles.label}>ESTIMATED TIME</Text><Text style={styles.strong}>{quote.durationText}</Text></View> : null}
      {quote.warrantyText ? <View style={styles.fact}><Text style={styles.label}>GUARANTEE / WARRANTY</Text><Text style={styles.strong}>{quote.warrantyText}</Text></View> : null}
    </View> : null}

    <View style={styles.section}>
      <Text variant="titleLarge" style={styles.sectionTitle}>Payment</Text>
      <Text style={styles.body}>{labelForPaymentMethod(quote.paymentMethod)}</Text>
      {quote.paymentSchedule.map((stage) => <View key={stage.key} style={styles.stage}>
        <View style={styles.totalRow}><Text style={styles.strong}>{stage.title}</Text><Text style={styles.strong}>{formatMoney(stage.amount)}</Text></View>
        {stage.trigger ? <Text style={styles.muted}>{stage.trigger}</Text> : null}
      </View>)}
      <Text style={styles.body}>{quote.paymentTerms}</Text>
    </View>

    {quote.notes ? <View style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
      <Text style={styles.body}>{quote.notes}</Text>
    </View> : null}

    <Divider />
    <View style={styles.footerRow}>
      <Text style={styles.muted}>Prepared with BuildPair</Text>
      {quote.validUntil ? <Text style={styles.muted}>Valid until {new Date(quote.validUntil).toLocaleDateString('en-GB')}</Text> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  document: { width: '100%', maxWidth: 820, alignSelf: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, flexWrap: 'wrap' },
  grow: { flex: 1, minWidth: 220, gap: 3 },
  reference: { minWidth: 150, alignItems: 'flex-end', gap: 2 },
  referenceLabel: { color: colors.primary, fontWeight: '900', letterSpacing: 1.2, fontSize: 11 },
  brand: { color: colors.charcoal, fontWeight: '900' },
  twoColumn: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  infoBlock: { flex: 1, minWidth: 220, gap: 3 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  strong: { color: colors.text, fontWeight: '800' },
  body: { color: colors.text, lineHeight: 22 },
  muted: { color: colors.muted, lineHeight: 20 },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.charcoal, fontWeight: '900' },
  items: { gap: spacing.xs },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemText: { flex: 1, minWidth: 160, gap: 2 },
  choiceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceSoft, alignItems: 'flex-start', flexWrap: 'wrap' },
  choicePrice: { color: colors.primary, fontWeight: '900' },
  totals: { marginLeft: 'auto', width: '100%', maxWidth: 360, gap: spacing.xs, paddingTop: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'center' },
  total: { color: colors.primary, fontWeight: '900' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fact: { flex: 1, minWidth: 170, backgroundColor: colors.surfaceSoft, borderRadius: radii.md, padding: spacing.md, gap: 4 },
  stage: { gap: 3, backgroundColor: colors.surfaceSoft, borderRadius: radii.md, padding: spacing.md },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
});
