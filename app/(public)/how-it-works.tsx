import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function HowItWorksPage() {
  return <PublicInfoPage
    eyebrow="How it works"
    title="A clear path from first search to completed project."
    intro="BuildPair connects discovery, planning, site visits, quotes, communication, agreed changes, payment stages and completion in one project workflow."
    sections={[
      { title: '1. Start with the job', body: 'Search directly for a trade or service, or describe the problem in ordinary language. BuildPair can help narrow the likely trade and organise the information into a clearer starting brief.' },
      { title: '2. Find suitable tradespeople', body: 'Browse profiles using trade categories, services, location, service radius, experience, work examples, reviews and other available information. You can request a quote from a specific profile or post the job to the wider marketplace.' },
      { title: '3. Clarify the work', body: 'Use job-linked messaging to answer questions and fill in missing details. If the work cannot be priced properly from the information supplied, the tradesperson can arrange a site visit through the job.' },
      { title: '4. Compare structured quotes', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• Price: labour, materials, VAT and total.</Text>
        <Text style={infoStyles.item}>• Scope: what the quote includes.</Text>
        <Text style={infoStyles.item}>• Exclusions: what is not included.</Text>
        <Text style={infoStyles.item}>• Timing: proposed start, expected duration and warranty where supplied.</Text>
        <Text style={infoStyles.item}>• Payment schedule: deposits, materials, progress stages and final payment.</Text>
      </View> },
      { title: '5. Agree the quote and payment stages', body: 'Before accepting a quote, the homeowner can propose a different payment split or stage description without changing the tradesperson’s total quoted price. Any revised schedule must be agreed by the tradesperson before acceptance.' },
      { title: '6. Run the project from one record', body: 'Once a quote is accepted, the job remains visible on both dashboards with the agreed quote, messages, payment stages, variations, timeline and next actions. If the scope, price or timing changes, a variation can record that change before approval.' },
      { title: '7. Choose how to pay', body: 'The homeowner can use BuildPair payments or arrange payment privately. Private payments are allowed, but BuildPair cannot process, pause, release, refund or recover money paid outside its payment flow.' },
      { title: '8. Complete the job and keep the history', body: 'When the agreed work and outstanding variations are resolved, the project can be completed. The quote, messages, timeline, payment history and review context remain attached to the job where applicable.' },
      { title: 'Important payment limits', body: <View style={infoStyles.callout}><Text style={infoStyles.calloutText}>BuildPair is not an escrow service and does not guarantee workmanship, completion or recovery of loss. Stripe handles supported payment processing and tradesperson payout onboarding. Users retain their applicable statutory, contractual and payment rights.</Text></View> },
    ]}
  />;
}