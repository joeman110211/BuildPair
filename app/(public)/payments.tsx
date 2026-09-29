import { PublicInfoPage } from '@/components/PublicInfoPage';

export default function PaymentsPage() {
  return <PublicInfoPage
    eyebrow="Payments"
    title="Pay your way."
    intro="Use BuildPay for protected staged payments, or agree to pay directly. Either route can stay connected to the same BuildPair project so the quote, messages and agreed changes remain easy to follow."
    sections={[
      {
        title: 'Agree the job first',
        body: 'The tradesperson sends a structured BuildPair quote covering the scope, exclusions, labour or service, materials, VAT where applicable, timing and the proposed payment schedule. A site visit can happen first when the work needs inspecting. Money should only move after the quote and payment route are agreed.',
      },
      {
        title: 'Choose BuildPay or direct payment',
        body: 'BuildPay is optional. Either side can request it, or both sides can agree to pay privately by bank transfer, cash or another method. BuildPair records which route was agreed so neither side should have to guess later.',
      },
      {
        title: 'The requester carries the BuildPay cost',
        body: 'If the tradesperson asks to use BuildPay, the BuildPay cost is absorbed from controlled service payouts. If the homeowner adds BuildPay, the separately disclosed BuildPay service fee is added to the homeowner total. The work price and BuildPay fee responsibility stay visible as separate figures.',
      },
      {
        title: 'Protected stages move in order',
        body: 'Where the schedule starts with materials and a protected work stage, the opening card payment can fund both together. After the tradesperson acknowledges the payment, only the quoted materials allocation is released. Work-stage money remains controlled until the recorded completion point and release workflow are reached.',
      },
      {
        title: 'Issues can pause a release',
        body: 'A homeowner can raise an issue before a protected work-stage transfer. The release is then paused while the issue is recorded and the tradesperson can respond. Where the payment position allows it, the parties can resolve the issue, return the stage to release review, agree a refund or escalate the record for BuildPair admin attention.',
      },
      {
        title: 'Direct payments stay direct',
        body: 'When both sides choose direct payment, BuildPair can record that a payment was said to be sent and received, but BuildPair did not receive, hold, protect, release, refund or independently verify that money. BuildPay protection and Stripe transaction controls do not apply to privately paid funds.',
      },
      {
        title: 'What BuildPair does and does not do',
        body: 'BuildPay is a payment workflow, not legal escrow and not a workmanship guarantee. BuildPair does not attend the property or certify the standard of building work. The purpose of the project record is to keep the quote, messages, variations, stages and payment events clearer for both sides. Stripe, card-network, refund and chargeback rules can also apply separately.',
      },
    ]}
  />;
}
