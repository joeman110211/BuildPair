import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function ForHomeownersPage() {
  return <PublicInfoPage
    eyebrow="For homeowners"
    title="Find the right trade, compare the job properly and keep the project organised."
    intro="BuildPair helps homeowners move from an initial problem or idea to a clearer job, suitable local tradespeople and one connected project record."
    sections={[
      { title: 'Start with the problem', body: 'You do not need to know the exact trade before you search. Describe what is happening in ordinary language and BuildPair can use trade categories, services and related terms to help narrow the right starting point.' },
      { title: 'Search directly or post a job', body: 'Browse tradespeople by category and service, request a quote from a suitable profile or post the job to the marketplace. Clear details about the property, scope, location, timing, budget and useful photos help tradespeople decide whether the work is a good fit.' },
      { title: 'Compare more than the total price', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Scope and what is included.</Text><Text style={infoStyles.item}>• Exclusions, deposit and payment stages.</Text><Text style={infoStyles.item}>• Proposed start date and expected duration.</Text><Text style={infoStyles.item}>• Warranty information where supplied.</Text><Text style={infoStyles.item}>• Profile history, services, work examples, availability and reviews.</Text></View> },
      { title: 'Use a site visit when the job needs one', body: 'Not every job can be priced from photos or a description. A tradesperson can arrange a site visit through the BuildPair job and send the formal quote afterwards, keeping the process connected.' },
      { title: 'Use BuildPay for staged payments', body: 'On supported jobs, BuildPay keeps the agreed payment stages attached to the project. Materials can be released for the job while funded work stages remain unreleased until the recorded completion point is reached and you approve release. If something is wrong before release, you can raise a BuildPay issue instead.' },
      { title: 'Keep the project history together', body: 'Messages, quotes, agreed variations, project events and BuildPay history can remain attached to the same job. That makes it easier to see what was agreed, what changed, what has been funded or released and what happens next.' },
      { title: 'Save trades for later', body: 'Shortlist useful profiles so you can return to them for future work instead of starting from scratch each time.' },
      { title: 'Privacy and final checks', body: 'Public marketplace jobs use outward location information rather than exposing precise matching coordinates. Before appointing anyone, check the registrations, qualifications, insurance, references and permissions appropriate to regulated or specialist work.' },
    ]}
  />;
}
