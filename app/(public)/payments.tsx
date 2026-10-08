import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { colors, radii, shadows, spacing } from '@/constants/theme';

export default function PaymentsPage() {
  return <PublicInfoPage
    eyebrow="Payments"
    title="Agree payments directly"
    intro="BuildPay is coming soon. For now, homeowners and tradespeople arrange and pay for work directly, outside BuildPair."
    summary={<View style={styles.summary}>
      <View style={styles.choice}>
        <Text style={styles.kicker}>DIRECT PAYMENTS</Text>
        <Text variant="titleLarge" style={styles.title}>Your money stays between you</Text>
        <Text style={styles.copy}>BuildPair keeps quotes, messages and job records together. It does not receive, hold, process, protect or refund payments made directly to a tradesperson.</Text>
      </View>
    </View>}
    updated="8 October 2026"
    sections={[
      { title: '1. Agree what is included', body: 'Review the written quote, scope, exclusions, materials, VAT if applicable, and start date before agreeing to proceed. Arrange an inspection or site visit where one is needed.' },
      { title: '2. Agree how and when to pay', body: 'The homeowner and tradesperson must agree the payment method, timing and any deposit or stages themselves. Payments take place directly between them, not through BuildPair.' },
      { title: '3. Keep your project record', body: 'Use BuildPair messages to keep changes and decisions clear. If you record that money was sent or received, this is a declaration by the parties and not independent verification by BuildPair.' },
      { title: '4. Stay alert to fraud', body: 'Check the tradesperson and payment details independently. Do not send money to an unexpected account or on the basis of a suspicious message. Report concerns through BuildPair.' },
      { title: '5. BuildPay is coming soon', body: 'BuildPay card payment processing, protected-stage funding and releases are not currently available. Direct payments have no BuildPay protection. Statutory consumer rights and contractual rights still apply.' },
    ]}
  />;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  choice: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 320, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.sm, ...shadows.subtle },
  buildPay: { backgroundColor: colors.accentSoft },
  kicker: { color: colors.primary, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  copy: { color: colors.muted, lineHeight: 22 },
});
