import { PublicInfoPage } from '@/components/PublicInfoPage';

export default function PaymentsPage() {
  return <PublicInfoPage
    eyebrow="BuildPay"
    title="How BuildPay works"
    intro="BuildPay is BuildPair's staged-payment workflow for supported jobs. Stripe processes the card payment and tradesperson payout activity, while BuildPair records the agreed stages, funding status, release requests and disputes."
    updated="11 September 2026"
    sections={[
      { title: '1. The agreed payment schedule', body: 'The tradesperson proposes a quote and payment schedule. Before accepting the quote, the homeowner can propose changes to the split or stage descriptions without changing the total quote price. Any revised schedule must be agreed by the tradesperson before acceptance.' },
      { title: '2. Starting a staged job', body: 'Where an agreed schedule starts with a materials payment followed by a work stage, BuildPay can fund those first two amounts together. The materials amount is released to the tradesperson’s connected Stripe account once Stripe confirms the payment. The first work-stage amount is recorded as funded in BuildPay and is not transferred to the tradesperson until the agreed stage is completed and release is approved.' },
      { title: '3. Stripe processing and payouts', body: 'Supported BuildPay card payments and tradesperson payouts use Stripe. Tradespeople must complete Stripe onboarding before BuildPay can be used with them. A release to a connected Stripe account is not the same thing as money reaching the tradesperson’s bank account; bank payout timing is handled by Stripe and can vary.' },
      { title: '4. Progress and final stages', body: 'For a progress or final stage, the homeowner funds the agreed amount first. The tradesperson reaches the recorded completion point and requests release. The homeowner can then approve release or raise an issue. BuildPair does not inspect the work or decide whether a completion point has genuinely been reached.' },
      { title: '5. Release and the next stage', body: 'When a non-final stage is approved, BuildPay releases that stage according to the agreed payment route and can take the homeowner directly to the next explicit funding step. Later stages are never silently charged simply because an earlier stage was released.' },
      { title: '6. Issues and BuildPay disputes', body: 'Before an unreleased work stage is transferred, the homeowner can raise an issue. BuildPay pauses that stage while the issue is discussed. The tradesperson can respond, the homeowner can resolve the issue and return to release, or either side can escalate it for BuildPair review. An internal BuildPay dispute is not the same as a card-network chargeback or an automatic refund.' },
      { title: '7. Fees', body: 'BuildPair’s current platform fee applies to labour/service only and is allocated across service-stage payouts rather than being loaded onto the final stage. Materials do not carry the BuildPair percentage fee. Stripe processing costs recorded for the job are recovered progressively from service payouts. Release records show the contract stage amount, deductions and net transfer where applicable.' },
      { title: '8. Private payments', body: 'Users may arrange payment privately instead. BuildPair can keep the quote, messages, variations and project record, but BuildPay cannot process, pause, release, refund or recover money paid outside BuildPair.' },
      { title: '9. Important limits', body: 'BuildPay is a payment workflow, not an escrow service and not a guarantee of workmanship, completion or recovery of loss. Tradespeople remain responsible for their work, and users retain any statutory, contractual and payment rights that cannot lawfully be excluded.' },
    ]}
  />;
}
