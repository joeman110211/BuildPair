import { PublicInfoPage } from '@/components/PublicInfoPage';

export default function PaymentsPage() {
  return <PublicInfoPage
    eyebrow="Payments"
    title="How BuildPair staged payments work"
    intro="BuildPair lets an accepted quote continue as a managed project with an agreed payment schedule. You can also choose to pay privately, but the payment-stage controls described here then do not apply."
    updated="8 September 2026"
    sections={[
      { title: '1. The payment plan starts with the quote', body: 'The tradesperson proposes the total quote and a payment schedule. That schedule can include a materials payment, deposit, progress stages and a final payment. Each progress stage should describe the point the work must reach before release is requested.' },
      { title: '2. The homeowner can propose stage changes', body: 'Before accepting the quote, the homeowner can propose a different split or timing for the stages without changing the tradesperson’s total quoted price. The tradesperson must agree the revised schedule before the quote can be accepted.' },
      { title: '3. Materials are different', body: 'If an agreed materials payment is required so materials can be bought, that payment is processed through Stripe and released to the tradesperson when paid. It is therefore not waiting for a later homeowner release decision.' },
      { title: '4. Controlled stages are funded first', body: 'For an eligible deposit, progress stage or final stage, the homeowner funds the next agreed stage through Stripe. BuildPair records the stage as funded, but the payment is not treated as released to the tradesperson merely because the charge succeeded.' },
      { title: '5. The tradesperson requests release', body: 'When the agreed trigger has been reached, the tradesperson marks the stage complete and requests release. The homeowner is notified and can compare the work with the agreed trigger.' },
      { title: '6. Approve release or raise an issue', body: 'The homeowner can approve release or raise an issue before an unreleased controlled stage is transferred. Raising an issue pauses that BuildPair release workflow while the matter is addressed. Stripe, card-network and legal dispute processes can still operate separately.' },
      { title: '7. The fee is taken at the final payout', body: 'BuildPair’s configured transaction fee is calculated from the accepted quote total and is designed to be retained from the final tradesperson payout rather than taken from each earlier stage. The applicable rate is shown in BuildPair pricing or payment information and can change for future jobs.' },
      { title: '8. Private payments are allowed', body: 'Users can choose a private payment arrangement instead. BuildPair can keep the quote, messages, variations and project history, but it cannot process, control, release, refund or recover privately exchanged money and its staged-payment controls do not apply.' },
      { title: '9. What BuildPair protection does not mean', body: 'BuildPair does not describe its payment workflow as legal escrow and does not guarantee workmanship, completion, defect-free work or recovery of every loss. Tradespeople remain independent businesses and users retain any rights and responsibilities available under applicable law.' },
      { title: '10. Stripe handles payment credentials', body: 'Supported card payments and tradesperson payout onboarding use Stripe. BuildPair stores transaction references and project-payment status needed to run the workflow, but does not store raw card or bank-account numbers entered into Stripe interfaces.' },
    ]}
  />;
}
