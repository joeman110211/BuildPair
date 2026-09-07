import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function HowItWorksPage() {
  return <PublicInfoPage
    eyebrow="How it works"
    title="From the first problem to the final project record."
    intro="BuildPair connects discovery, marketplace decisions and project workflow so the useful information does not disappear after a homeowner finds a tradesperson."
    sections={[
      { title: '1. Describe what you need', body: 'Search by a trade, a service or the problem in ordinary language. Homeowners can also post a fuller job with property details, description, photos, postcode, timing, urgency and budget information.' },
      { title: '2. Match the problem to relevant trades', body: 'BuildPair searches across broad trade categories, specific services and related terms. A bathroom leak, for example, may sensibly involve plumbing, bathroom fitting, tiling or repair work rather than one rigid category.' },
      { title: '3. Compare profiles with context', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Services and working area.</Text><Text style={infoStyles.item}>• Experience, gallery work and project stories.</Text><Text style={infoStyles.item}>• Availability and submitted credentials.</Text><Text style={infoStyles.item}>• Customer ratings and genuine marketplace review history.</Text></View> },
      { title: '4. Request or receive structured quotes', body: 'A homeowner can post to the marketplace or approach a suitable searchable profile directly. Quotes can record scope, exclusions, start date, duration, deposit, stages, warranty and other useful detail so comparison is not reduced to one headline number.' },
      { title: '5. Keep communication attached to the job', body: 'BuildPair conversations remain tied to the relevant job. Optional AI assistance can help draft replies and automated systems may surface safety signals, while users remain responsible for what they send.' },
      { title: '6. Record changes instead of relying on memory', body: 'When extra work or a scope change appears, a variation can document what changed, the price or timing effect and whether it was approved. This creates a clearer record for both sides.' },
      { title: '7. Track milestones and project history', body: 'Timeline events and payment stages can keep progress visible as the job moves from quote acceptance toward completion. The project history remains connected to the original job instead of being split between messages, notes and bank references.' },
      { title: '8. Complete the job and build useful reputation', body: 'Completed marketplace work can feed into review and reputation history. Tradespeople can also turn finished projects into portfolio stories, while homeowners build a shortlist of trades they may want to use again.' },
    ]}
  />;
}
