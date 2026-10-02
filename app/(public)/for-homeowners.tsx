import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function ForHomeownersPage() {
  return <PublicInfoPage
    eyebrow="For homeowners"
    title="Find well. Compare clearly. Stay in control."
    intro="Find suitable local tradespeople, compare clearer quotes and keep the job organised from first search to completion."
    sections={[
      { title: 'Start with the problem', body: 'You do not need to know the exact trade before you search. Describe what is happening in ordinary language and BuildPair can use trade categories, services and related terms to help narrow the right starting point.' },
      { title: 'Search directly or post a job', body: 'Browse tradespeople by category and service, request a quote from a suitable profile or post the job to the marketplace. Clear details about the property, scope, location, timing, budget and useful photos help tradespeople decide whether the work is a good fit.' },
      { title: 'Control how many quotes you deal with', body: 'Marketplace quotes are kept together on one comparison screen. BuildPair limits excessive quote volume internally, and you can stop new tradespeople sending quotes as soon as you have enough to compare. Existing quotes stay available for discussion, revision, acceptance or decline, and you can reopen quote intake while the job is still available.' },
      { title: 'Compare more than the total price', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Work price and any separately disclosed BuildPay service fee.</Text><Text style={infoStyles.item}>• Scope and what is included.</Text><Text style={infoStyles.item}>• Exclusions, materials, deposit and payment stages.</Text><Text style={infoStyles.item}>• Proposed start date and expected duration.</Text><Text style={infoStyles.item}>• Warranty information where supplied.</Text><Text style={infoStyles.item}>• Profile history, services, work examples, availability and reviews.</Text></View> },
      { title: 'Use a site visit when the job needs one', body: 'Not every job can be priced from photos or a description. A tradesperson can arrange a site visit through the BuildPair job. You confirm it before the private address is shared. Once the confirmed visit has happened, the tradesperson marks it complete and sends the formal structured quote afterwards.' },
      { title: 'Accept one quote and archive the rest', body: 'You can decline individual quotes or accept the one you want. Once a quote is accepted, the winning tradesperson gets the job and the other active quotes leave your live comparison. Those tradespeople are notified that another quote was chosen, while the old quote records remain available to BuildPair as project history rather than being erased.' },
      { title: 'Pay your way', body: 'Use BuildPay for agreed payment stages, or agree with the tradesperson to pay directly. The Payments page explains the detailed rules for each route.' },
      { title: 'Keep the project history together', body: 'Messages, quotes, agreed variations, project events and payment stages can remain attached to the same job. Even where both sides agree to pay directly, BuildPair can retain the structured project record and optional two-party payment confirmations, although it does not process or protect the direct payment.' },
      { title: 'Save trades for later', body: 'Shortlist useful profiles so you can return to them for future work instead of starting from scratch each time.' },
      { title: 'Privacy and final checks', body: 'Public marketplace jobs use outward location information rather than exposing precise matching coordinates. Before appointing anyone, check the registrations, qualifications, insurance, references and permissions appropriate to regulated or specialist work.' },
    ]}
  />;
}