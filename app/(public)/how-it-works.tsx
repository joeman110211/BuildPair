import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function HowItWorksPage() {
  return <PublicInfoPage
    eyebrow="How it works"
    title="From the first vague problem to a useful finished-project record."
    intro="BuildPair connects discovery, planning, site visits, quotes, communication, payment schedules, variations and completion so the useful information does not disappear after the introduction."
    sections={[
      { title: '1. Start with the job, service or symptom', body: 'A homeowner can search directly for a trade or service, or describe what is happening in ordinary language. Real people often know the problem before they know the profession, so “water through the ceiling” or “I want this room completely refitted” are valid starting points.' },
      { title: '2. Turn rough information into a clearer job', body: 'BuildPair can help narrow the likely trade and organise homeowner answers into a clearer brief. AI-assisted features are constrained to useful drafting and matching tasks; they do not inspect the property, certify safety or replace professional judgement.' },
      { title: '3. Find relevant tradespeople or post to the marketplace', body: 'Profiles combine trade categories, specific services, location, service radius, experience, portfolio work, reviews and other available trust signals. A homeowner can make a direct request to a suitable profile or publish a job to the wider marketplace.' },
      { title: '4. Message first when the job needs clarification', body: 'BuildPair messaging stays linked to the job. A tradesperson can ask for missing information and the homeowner can reply without the conversation becoming the end of the workflow.' },
      { title: '5. Quote now or arrange a site visit', body: 'Some work can be priced from the information supplied and some cannot. The tradesperson can send a structured quote immediately or arrange a site visit through the BuildPair job. After the visit, the formal quote is sent back through BuildPair so the project remains connected.' },
      { title: '6. Compare structured quotes and proposed payment stages', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• Price: labour, materials, VAT and total.</Text>
        <Text style={infoStyles.item}>• Scope: what the tradesperson is actually pricing to do.</Text>
        <Text style={infoStyles.item}>• Exclusions: what is not included.</Text>
        <Text style={infoStyles.item}>• Timing: proposed start, estimated duration and warranty where supplied.</Text>
        <Text style={infoStyles.item}>• Payment schedule: materials, deposit, progress stages and final payment with the timing or completion point for each stage.</Text>
      </View> },
      { title: '7. The homeowner can propose different stages without changing the total', body: 'Before accepting a quote, the homeowner may propose a different payment split or stage description without editing the tradesperson’s total quoted price. The tradesperson must agree that revised schedule before the quote can be accepted.' },
      { title: '8. The accepted quote becomes the active project', body: 'Once accepted, the job remains visible on both dashboards rather than disappearing into notifications. BuildPair shows the next action, agreed quote, messages, payment stages, variations and timeline from one project record.' },
      { title: '9. Choose BuildPair payments or a private arrangement', body: 'The homeowner can choose BuildPair payments or arrange payment privately. Private payments are allowed, but BuildPair cannot process, pause, release, refund or recover money exchanged outside its payment flow and its payment-stage controls do not apply.' },
      { title: '10. BuildPair payments follow the agreed schedule', body: 'Stripe processes supported BuildPair payments. Upfront materials payments and deposits are transferred to the tradesperson when the payment succeeds. For progress and final stages, the homeowner pays the stage first; the tradesperson requests release after reaching the agreed completion point, and the homeowner then approves release or raises an issue before transfer.' },
      { title: '11. Record variations before extra work becomes an argument', body: 'If scope, price or time changes, the tradesperson can propose a variation and the homeowner can approve or decline it. That creates a stronger project history than trying to reconstruct a phone conversation after the work has changed.' },
      { title: '12. Complete the job and leave useful history', body: 'When agreed BuildPair stages have been released and outstanding variations are resolved, the project can be marked complete. The quote, messages, timeline, payment history and review context remain attached to the job. Privately paid jobs can also be closed, but BuildPair does not present private payment status as verified.' },
      { title: 'Important payment limits', body: <View style={infoStyles.callout}><Text style={infoStyles.calloutText}>BuildPair is not described as an escrow service and does not guarantee workmanship, completion or recovery of loss. Stripe handles supported payment processing and tradesperson payout onboarding. BuildPair records the project workflow and release instructions, while users retain their applicable statutory, contractual and payment rights.</Text></View> },
    ]}
  />;
}
