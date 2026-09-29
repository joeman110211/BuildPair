import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function HowItWorksPage() {
  return <PublicInfoPage
    eyebrow="How it works"
    title="Find. Compare. Manage."
    intro="BuildPair keeps the journey from first search to finished job connected, while leaving room for site visits, quote revisions and the payment route that suits the project."
    sections={[
      { title: 'Find', body: 'Search for a trade or describe the job in ordinary language. Browse suitable local profiles or post the work to the marketplace.' },
      { title: 'Talk or visit', body: 'Ask questions through the job and arrange a site visit when the work needs inspecting before it can be priced properly.' },
      { title: 'Compare', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• Compare scope, exclusions and total price.</Text>
        <Text style={infoStyles.item}>• See labour, materials and VAT where supplied.</Text>
        <Text style={infoStyles.item}>• Review timing, warranty information and proposed payment stages.</Text>
        <Text style={infoStyles.item}>• Check profile evidence and reputation alongside the quote.</Text>
      </View> },
      { title: 'Choose', body: 'Accept the quote that suits the job. Other active quotes leave the live comparison, while the project keeps the important history attached to the job.' },
      { title: 'Pay your way', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>Use BuildPay for protected staged payments, or agree to pay directly. BuildPay is optional and its disclosed cost is carried by the party who asks to add it.</Text>
        <Link href="/(public)/payments" asChild><Button mode="text">How BuildPay works</Button></Link>
      </View> },
      { title: 'Manage', body: 'Keep messages, stages, agreed variations, project updates and next actions attached to the same job while the work is underway.' },
      { title: 'Complete', body: 'Finish the project with the accepted quote, relevant payment history, agreed changes and review context still connected for future reference.' },
      { title: 'Know the limits', body: <View style={infoStyles.callout}><Text style={infoStyles.calloutText}>BuildPair provides marketplace and project tools. It does not carry out the building work, guarantee workmanship or replace the checks and professional advice appropriate to the job.</Text></View> },
    ]}
  />;
}
