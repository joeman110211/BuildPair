import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function HowItWorksPage() {
  return <PublicInfoPage
    eyebrow="How it works"
    title="A clear path from first search to completed project."
    intro="BuildPair connects discovery, planning, optional site visits, structured quote comparison, communication, agreed changes, payment decisions and completion in one project record."
    updated="13 September 2026"
    sections={[
      { title: '1. Start with the job', body: 'Search directly for a trade or service, or describe the problem in ordinary language. BuildPair can help narrow the likely trade and organise the information into a clearer starting brief.' },
      { title: '2. Find suitable tradespeople', body: 'Browse profiles using trade categories, services, location, service radius, experience, work examples, reviews and other available information. You can request a quote from a specific profile or post the job to the wider marketplace.' },
      { title: '3. Talk first or arrange a site visit', body: 'Quotes do not have to be produced from photographs alone. Homeowners and tradespeople can discuss the job in person. Where a proper price needs inspection, the tradesperson can propose a site visit through BuildPair. The homeowner confirms it and privately shares the address. A confirmed visit is marked complete before the post-visit structured quote is sent.' },
      { title: '4. Receive enough quotes, then stop', body: 'Marketplace jobs can receive structured quotes from suitable tradespeople. You can keep quote requests manageable, and the homeowner can pause new quotes as soon as they have enough to compare. Existing quotes remain available for discussion, revision, acceptance or decline. The homeowner can reopen quote intake while the job is still unawarded and there is room for more active quotes.' },
      { title: '5. Compare structured quotes', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• Price: labour/service, materials, VAT where applicable and the all-in amount.</Text>
        <Text style={infoStyles.item}>• Scope: exactly what the quote includes.</Text>
        <Text style={infoStyles.item}>• Exclusions: what is not included.</Text>
        <Text style={infoStyles.item}>• Timing: proposed start, expected duration and warranty where supplied.</Text>
        <Text style={infoStyles.item}>• Payment schedule: materials, deposits, progress stages and final payment.</Text>
        <Text style={infoStyles.item}>• Agreed direct-payment arrangements. BuildPay is not available yet.</Text>
      </View> },
      { title: '6. Accept one quote', body: 'The homeowner can decline individual quotes or accept the one they want. Once a quote is accepted, the job is awarded to that tradesperson, other active quotes move out of the live comparison and those tradespeople are notified that another quote was chosen. Non-winning quotes are retained in the project record rather than being physically deleted.' },
      { title: '7. Agree the payment stages', body: 'Before accepting a quote, the homeowner can propose a different service-stage split or completion point without silently changing the tradesperson’s quoted total or materials amount. If the homeowner changes the staged schedule, the tradesperson must accept the revision before the quote can be awarded.' },
      { title: '8. Agree direct payment', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• BuildPay is coming soon and is not part of the current payment flow.</Text>
        <Text style={infoStyles.item}>• Direct payment: either side can propose arranging payment outside BuildPair. The other party must explicitly agree before the whole job switches to direct payment.</Text>
        <Text style={infoStyles.item}>• BuildPair does not force BuildPay simply because the introduction, site visit or quote happened on BuildPair.</Text>
        <Text style={infoStyles.item}>• If payment is arranged privately, BuildPair can retain the quote, messages, variations and optional two-party payment confirmations, but it does not process or protect the money.</Text>
      </View> },
      { title: '9. Record direct payments', body: 'Homeowners and tradespeople arrange payments privately after agreeing their quote and terms. BuildPair can record each party’s own payment confirmations, but cannot verify, protect, transfer or recover money paid directly. BuildPay protected payments are coming soon.' },
      { title: '10. Run the project from one record', body: 'The job remains visible on both dashboards with the agreed quote, messages, payment stages, variations, timeline and next actions. If scope, price or timing changes, a variation should record and agree that change before the additional work proceeds.' },
      { title: '11. Complete the job and keep the history', body: 'When the agreed work and outstanding variations are resolved, the project can be completed. The accepted quote, messages, timeline, payment record and review context remain attached to the job where applicable.' },
      { title: 'Important payment limits', body: <View style={infoStyles.callout}><Text style={infoStyles.calloutText}>BuildPair is not an escrow service and does not guarantee workmanship, completion or recovery of loss. BuildPay payment processing and payout onboarding are not available yet. Direct payments remain between the homeowner and tradesperson. Users retain their applicable statutory, contractual and payment rights.</Text></View> },
    ]}
  />;
}