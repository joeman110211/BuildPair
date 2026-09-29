import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PublicInfoPage } from '@/components/PublicInfoPage';
import { PAYMENT_LANGUAGE } from '@/constants/site-language';
import { colors, radii, shadows, spacing } from '@/constants/theme';

export default function PaymentsPage() {
  return <PublicInfoPage
    eyebrow="Payments"
    title={PAYMENT_LANGUAGE.title}
    intro={PAYMENT_LANGUAGE.short}
    summary={<View style={styles.summary}>
      <View style={[styles.choice, styles.buildPay]}><Text style={styles.kicker}>BUILDPAY</Text><Text variant="titleLarge" style={styles.title}>Protected stages</Text><Text style={styles.copy}>Agree the quote, fund the next stage and release protected work payments when the recorded stage is ready.</Text></View>
      <View style={styles.choice}><Text style={styles.kicker}>DIRECT</Text><Text variant="titleLarge" style={styles.title}>Pay directly</Text><Text style={styles.copy}>If both sides agree, arrange payment privately while keeping the quote, messages and project record in BuildPair.</Text></View>
    </View>}
    updated="13 September 2026"
    sections={[
      { title: '1. Site visits and in-person quotes are allowed', body: 'BuildPair does not require every job to be priced remotely. A tradesperson can arrange a site visit through the job when inspection is needed. Once a confirmed visit has taken place it is marked complete, and the tradesperson sends the resulting structured quote through BuildPair so scope, exclusions, timing, price and payment stages are recorded clearly.' },
      { title: '2. Agree the quote before money moves', body: 'The tradesperson sends a structured BuildPair quote showing scope, exclusions, labour/service, materials, VAT where applicable, timing and a payment schedule. The homeowner can request different service-stage splits before accepting, but the quoted total and materials amount cannot be silently changed. Any homeowner-edited stage plan must be accepted by the tradesperson.' },
      { title: '3. BuildPay can be requested by either side', body: 'A tradesperson can include BuildPay in the quote, or a homeowner can request BuildPay protection. The party who asks to add BuildPay carries its cost: if the tradesperson requests it, the tradesperson absorbs the BuildPay cost from controlled service payouts; if the homeowner introduces it, the homeowner pays the separately disclosed BuildPay service fee. The applicable total and responsibility are shown before commitment.' },
      { title: '4. Direct payment requires both parties to agree', body: 'Either the homeowner or tradesperson can propose paying outside BuildPair. The other person must explicitly agree before the project switches to direct payment. This allows bank transfer, cash or another privately agreed method without pretending BuildPay protection applies. BuildPair does not force use of BuildPay merely because the introduction, site visit or quote happened on the platform.' },
      { title: '5. Opening BuildPay payment: materials plus first protected stage', body: 'Where a staged BuildPay schedule begins with quoted materials followed by a protected work stage, the homeowner funds both contract amounts together in one opening card payment. After Stripe confirms the payment, the tradesperson acknowledges it in BuildPair. Only the exact materials allocation is transferred at that point so procurement can begin. The first work-stage allocation remains controlled and is not transferred merely because the opening card payment succeeded.' },
      { title: '6. Deposits, progress stages and final payments are controlled', body: 'A protected BuildPay deposit, progress stage or final stage is transferred only after the recorded completion point is reached and the release workflow is approved. Later stages remain locked until earlier stages progress. When one stage is released, the next unpaid stage becomes the next funding action rather than BuildPair silently charging the homeowner again.' },
      { title: '7. Releases create real Stripe transfers', body: 'When an eligible BuildPay materials allocation or approved work stage is released, BuildPair instructs Stripe to create a transfer to the tradesperson’s connected Stripe account. BuildPair requires the tradesperson’s Stripe payout setup to be completed before protected payment can proceed. Bank payout timing from the connected Stripe account is then subject to the account’s Stripe payout settings and Stripe availability rules.' },
      { title: '8. Issues before release', body: 'If the homeowner raises an issue before a protected work-stage transfer, that release is paused. The tradesperson can respond in the project record. The homeowner can resolve the issue and return the stage to release review, request a refund where available, or escalate the record for BuildPair admin attention. BuildPair admin review helps manage the platform workflow and evidence record; it is not an inspection of workmanship or an automatic legal adjudication.' },
      { title: '9. Refunds and payment disputes', body: 'An unreleased BuildPay stage can be refunded where the workflow and payment position allow it, including where both parties agree a refund. Stripe, card-network, fraud, refund and chargeback procedures can also apply separately. Once money has already been transferred to a tradesperson, BuildPair cannot promise that the transfer can simply be reversed.' },
      { title: '10. BuildPay fees are kept separate from the work price', body: 'BuildPair’s platform fee is based on labour/service value rather than quoted materials or VAT. The homeowner-facing BuildPay charge, where applicable, is presented as a separately disclosed BuildPay service fee rather than as a card surcharge. The accepted work price, BuildPay fee responsibility and all-in homeowner amount are recorded separately so a tradesperson is not accidentally charged twice.' },
      { title: '11. Direct-payment records are declarations, not payment processing', body: 'When both parties have agreed direct payment, BuildPair can optionally record that the homeowner says a payment was sent and the tradesperson says it was received. A stage is recorded as directly paid only after both sides confirm their part. Those confirmations are user declarations. BuildPair did not receive, hold, protect, release, refund or independently verify the money.' },
      { title: '12. What changes with direct payment', body: 'BuildPay stage protection, Stripe transaction records and BuildPair release controls do not apply to money paid directly. The tradesperson remains responsible for the work and both parties remain responsible for their own agreement and payment conduct. Choosing direct payment does not remove statutory consumer rights, contractual rights or any liability that cannot lawfully be excluded.' },
      { title: '13. BuildPair is not an escrow or workmanship guarantor', body: 'BuildPay is a payment workflow, not a legal escrow account. BuildPair does not attend the property, certify workmanship or decide whether building work complies with a contract, regulation or professional standard. The recorded quote, messages, variations, stage actions and payment events are intended to make the project clearer and easier to evidence.' },
    ]}
  />;
}


const styles = StyleSheet.create({
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  choice: { flexGrow: 1, flexBasis: 320, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.sm, ...shadows.subtle },
  buildPay: { backgroundColor: colors.accentSoft },
  kicker: { color: colors.primary, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  copy: { color: colors.muted, lineHeight: 22 },
});
