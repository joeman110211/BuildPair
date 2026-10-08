import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { PAYMENT_LANGUAGE } from '@/constants/site-language';
import { colors, radii, shadows, spacing } from '@/constants/theme';

export default function PaymentsPage() {
  return <PublicInfoPage
    eyebrow="Payments"
    title="Direct payments now. BuildPay coming soon."
    intro="BuildPair is open for jobs, quotes and project management. BuildPay card payments and protected stage releases are not available yet."
    summary={<View style={styles.summary}>
      <View style={styles.choice}>
        <Text style={styles.kicker}>AVAILABLE NOW</Text>
        <Text variant="titleLarge" style={styles.title}>Pay your tradesperson directly</Text>
        <Text style={styles.copy}>Agree the amount and payment terms before work starts. Make payments privately using a method you both accept, while keeping the quote and project record in BuildPair.</Text>
      </View>
      <View style={[styles.choice, styles.buildPay]}>
        <Text style={styles.kicker}>BUILDPAY · COMING SOON</Text>
        <Text variant="titleLarge" style={styles.title}>Staged payment tools</Text>
        <Text style={styles.copy}>BuildPay will be announced separately when its payment-processing and release features are ready. It cannot currently be selected or funded.</Text>
      </View>
    </View>}
    updated="8 October 2026"
    sections={[
      { title: '1. Agree the quote before paying', body: 'Check the scope, exclusions, materials, labour, VAT (where applicable), expected dates and payment terms before accepting a quote. A site visit may be needed before a firm price can be agreed.' },
      { title: '2. Arrange money outside BuildPair', body: 'Both parties agree how and when direct payments will be made. BuildPair does not take, receive, hold, transfer, protect, refund or recover money paid directly to a tradesperson.' },
      { title: '3. Keep a clear record', body: 'Use BuildPair messages, accepted quotes, agreed variations and optional payment confirmations to keep important job details together. Any statement that money has been sent or received is a declaration by the parties, not independent verification by BuildPair.' },
      { title: '4. What BuildPay coming soon means', body: 'BuildPay cannot currently be selected for a job. Do not attempt to pay job money to BuildPair or rely on an unavailable staged-payment protection service. Any future BuildPay terms, fees and availability will be published separately before people opt in.' },
      { title: '5. Your rights and responsibilities', body: 'The homeowner and tradesperson are responsible for their own contract and payment agreement. Paying directly does not remove statutory consumer rights or legal responsibilities. BuildPair does not certify the work or guarantee that every trader will be suitable for a particular job.' },
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
