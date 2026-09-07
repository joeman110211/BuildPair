import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function ForHomeownersPage() {
  return <PublicInfoPage
    eyebrow="For homeowners"
    title="From “something’s wrong” to a properly managed job."
    intro="BuildPair helps homeowners identify likely trades, compare local professionals with useful context and keep the project record together after somebody is hired."
    sections={[
      { title: 'Describe the problem in normal English', body: 'You do not have to know whether a leak needs a plumber, bathroom fitter, roofer or another specialist before you search. BuildPair uses trade categories, services and related search terms to turn the problem you describe into more relevant results.' },
      { title: 'Search or post a structured job', body: 'Search profiles directly or create a job with category, property type, description, photos, postcode, urgency, timing and budget information. Better initial detail gives tradespeople a better chance of deciding whether the work genuinely suits them.' },
      { title: 'Compare more than the headline price', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Scope and what is actually included.</Text><Text style={infoStyles.item}>• Exclusions, deposit and payment stages.</Text><Text style={infoStyles.item}>• Proposed start date and expected duration.</Text><Text style={infoStyles.item}>• Warranty information where supplied.</Text><Text style={infoStyles.item}>• Profile history, services, work examples, availability and reviews.</Text></View> },
      { title: 'Request a quote from a specific trade', body: 'When a suitable searchable profile is available, a homeowner can send a direct quote request rather than posting the job to everybody. BuildPair checks the relevant account, category and marketplace eligibility before creating the job-specific connection.' },
      { title: 'Keep the project history together', body: 'Messages, quotes, agreed variations, job events and payment milestones can stay attached to the project. That matters when memories differ later about what was included, what changed and what was approved.' },
      { title: 'Save trades and come back later', body: 'Homeowners can shortlist useful profiles instead of trying to remember who they saw during the first search. That gives repeat customers a simple way to build a trusted local network over time.' },
      { title: 'Privacy where it matters', body: 'Public marketplace listings use outward postcode/location information rather than publishing the homeowner’s full matching coordinates. More precise matching information remains server-side.' },
      { title: 'Make the final checks', body: 'BuildPair provides information and workflow tools, but the appointment decision remains yours. For regulated or specialist work, check registrations, qualifications, insurance, references and any permissions appropriate to the job before work starts.' },
    ]}
  />;
}
