import { PublicInfoPage } from '@/components/PublicInfoPage';

export default function PaymentsPage() {
  return <PublicInfoPage
    eyebrow="Payments"
    title="How BuildPair staged payments work"
    intro="BuildPair lets an accepted quote continue as a managed project with an agreed payment schedule. Homeowners fund the next agreed stage when it is needed rather than paying the whole project price upfront. You can also choose to pay privately, but the payment-stage controls described here then do not apply."
    updated="9 September 2026"
    sections={[
      { title: '1. The payment plan starts with the quote', body: 'The tradesperson proposes the total quote and a payment schedule. That schedule can include a materials payment, deposit, progress stages and a final payment. Each progress stage should describe the point the work must reach before release is requested.' },
      { title: '2. The homeowner can propose stage changes', body: 'Before accepting the quote, the homeowner can propose a different split or timing for the stages without changing the tradesperson’s total quoted price. The tradesperson must agree the revised schedule before the quote can be accepted.' },
      { title: '3. Deposit and materials money can be used to start the job', body: 'An agreed deposit or materials payment is processed through Stripe and released to the tradesperson when paid so agreed materials or mobilisation costs can be covered. It is not held for a later completion approval, so homeowners should only agree an upfront amount they understand and consider appropriate.' },
      { title: '4. Progress stages are funded before they are needed', body: 'The homeowner funds the next agreed progress stage through Stripe before the tradesperson relies on that stage payment. BuildPair records it as funded, but it is not transferred to the tradesperson merely because the charge succeeded. BuildPair does not require the homeowner to pay the whole accepted quote upfront.' },
      { title: '5. The tradesperson requests release', body: 'When the agreed trigger has been reached, the tradesperson marks the stage complete and requests release. The homeowner is notified and can compare the work with the agreed trigger.' },
      { title: '6. Approve release or raise an issue', body: 'The homeowner can approve release or raise an issue before an unreleased progress or final stage is transferred. Raising an issue pauses that BuildPair release workflow while the matter is addressed. Stripe, card-network and legal dispute processes can still operate separately.' },
      { title: '7. Final payout deductions are transparent', body: 'BuildPair’s service fee is currently 1% of the accepted quote total after agreed deposit stages are excluded. BuildPair also recovers the actual Stripe processing fees recorded for that job. Those amounts are retained from the final tradesperson payout rather than reducing every earlier progress-stage transfer. The final release record shows the gross stage amount, Stripe processing costs, BuildPair service fee and net tradesperson transfer.' },
      { title: '8. Private payments are allowed', body: 'Users can choose a private payment arrangement instead. BuildPair can keep the quote, messages, variations and project history, but it cannot process, control, release, refund or recover privately exchanged money and its staged-payment controls do not apply.' },
      { title: '9. What BuildPair protection does not mean', body: 'BuildPair does not describe its payment workflow as legal escrow and does not guarantee workmanship, completion, defect-free work or recovery of every loss. Tradespeople remain independent businesses and users retain any rights and responsibilities available under applicable law.' },
      { title: '10. Stripe handles payment credentials', body: 'Supported card payments and tradesperson payout onboarding use Stripe. BuildPair stores transaction references and project-payment status needed to run the workflow, but does not store raw card or bank-account numbers entered into Stripe interfaces.' },
    ]}
  />;
}
