import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function AboutPage() {
  return <PublicInfoPage
    eyebrow="About BuildPair"
    title="A better way to manage home-improvement work from first search to completion."
    intro="BuildPair is a UK marketplace and project platform for homeowners and tradespeople. It brings discovery, quoting, communication, agreed changes and project history into one connected workflow."
    sections={[
      {
        title: 'Why BuildPair exists',
        body: 'Finding a tradesperson is only the beginning. Homeowners still need to compare the work being offered, keep scope clear and manage decisions as the job changes. Tradespeople need suitable opportunities, professional quoting tools and a simpler way to keep project information together. BuildPair is designed around that full journey, not just the introduction.'
      },
      {
        title: 'One connected project',
        body: 'A BuildPair job can keep the original brief, messages, quotes, agreed variations, payment stages, timeline and completion history together. That gives both sides a clearer record of what was discussed, agreed and changed.'
      },
      {
        title: 'Search and matching built around real jobs',
        body: 'Homeowners can search by trade, service or ordinary-language problem. Tradespeople can present the categories, services, service area, experience and work examples that matter when deciding whether a job is a good fit.'
      },
      {
        title: 'AI where it improves clarity',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>• Trade matching can help interpret a homeowner’s description and identify likely categories.</Text>
          <Text style={infoStyles.item}>• Job-spec assistance can turn rough information into a clearer brief.</Text>
          <Text style={infoStyles.item}>• Quote assistance can help tradespeople draft clearer scope, exclusions and terms.</Text>
          <Text style={infoStyles.item}>• Message assistance can suggest concise, job-aware replies.</Text>
        </View>
      },
      {
        title: 'AI assists. People remain responsible for the decision.',
        body: <View style={infoStyles.callout}>
          <Text style={infoStyles.calloutText}>BuildPair AI features support matching, drafting and communication. They do not inspect a property, certify work, replace a qualified professional or make contractual decisions for the user. Prices, measurements, qualifications and safety-critical decisions must still be checked properly.</Text>
        </View>
      },
      {
        title: 'Clearer quoting, changes and payments',
        body: 'Structured quotes can show labour, materials, VAT, scope, exclusions, timing, warranty and payment stages in a consistent format. If the work changes, variations can record the effect on price or timing before approval. BuildPay staged payments are coming soon. Payments for current jobs are made directly between the homeowner and tradesperson.'
      },
      {
        title: 'Useful for trades after the lead is won',
        body: 'Tradespeople can use BuildPair for profiles, local opportunities, direct quote requests, messaging, project stages, invoices, availability, project stories and business analytics. The aim is to provide lasting business value rather than a marketplace that stops at lead generation.'
      },
      {
        title: 'Built for the UK',
        body: 'BuildPair uses UK trade categories, postcode-led matching and UK-focused guidance. Public advice links point users towards current official sources for consumer rights, building standards and regulated work.'
      },
      {
        title: 'What BuildPair is not',
        body: 'BuildPair is not the contractor carrying out the work, an employer of independent tradespeople, a regulator, a building-control body or a substitute for professional advice. It provides marketplace, communication and project-management technology. BuildPay payment tools are coming soon.'
      },
    ]}
  />;
}