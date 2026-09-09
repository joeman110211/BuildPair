import { PublicInfoPage } from '@/components/PublicInfoPage';

export default function PaymentsPage() {
  return <PublicInfoPage
    eyebrow="Payments"
    title="How BuildPair payments work"
    intro="BuildPair can process agreed job payments through Stripe in stages. This page explains when payments are transferred, what BuildPair records and what changes if you arrange payment privately."
    updated="9 September 2026"
    sections={[
      { title: '1. The agreed payment schedule', body: 'The tradesperson proposes a quote and payment schedule. Before accepting the quote, the homeowner can propose changes to the split or timing of the stages without changing the total quote price. Any revised schedule must be agreed by the tradesperson.' },
      { title: '2. Stripe processes BuildPair payments', body: 'Supported payments and tradesperson payouts are processed using Stripe. Tradespeople must complete Stripe onboarding before they can receive BuildPair payments. Stripe handles payment and payout information entered into its interfaces. BuildPair receives account, transaction and status references needed to operate the payment workflow.' },
      { title: '3. Materials payments and deposits', body: 'A materials payment or deposit identified as an upfront payment is transferred to the tradesperson when Stripe confirms the payment. It is not subject to a later stage-completion approval. The homeowner is shown this before authorising the payment.' },
      { title: '4. Progress and final stages', body: 'For a progress or final stage, Stripe processes the homeowner’s payment first. BuildPair records the stage as funded but does not instruct transfer to the tradesperson until the tradesperson requests release and the homeowner approves it. BuildPair does not inspect the work or decide whether the agreed completion point has been reached.' },
      { title: '5. Approval, issues and reversals', body: 'Approving a progress or final stage is the homeowner’s instruction to BuildPair to arrange transfer of that stage to the tradesperson. If the homeowner raises an issue before transfer, the BuildPair release workflow is paused. Once a transfer has been made, BuildPair cannot guarantee that it can be reversed. Stripe, card-network, refund and chargeback procedures may apply separately.' },
      { title: '6. Fees', body: 'The current BuildPair service fee is 1% of the accepted quote total after agreed deposit stages are excluded. BuildPair also recovers the actual Stripe processing fees recorded for the job. Under the current workflow, those amounts are deducted from the final tradesperson payout and the release record shows the gross amount, deductions and net transfer.' },
      { title: '7. Private payments', body: 'Users may arrange payment privately instead. BuildPair can keep the quote, messages, variations and project record, but it cannot process, pause, release, refund or recover money paid outside BuildPair. BuildPair payment-stage controls do not apply to private payments.' },
      { title: '8. Important limits', body: 'BuildPair is a marketplace and project-workflow platform. Its payment workflow is not described as escrow and is not a guarantee of workmanship, completion or recovery of loss. Tradespeople remain responsible for their work and users retain any statutory, contractual and payment rights that cannot lawfully be excluded.' },
    ]}
  />;
}
