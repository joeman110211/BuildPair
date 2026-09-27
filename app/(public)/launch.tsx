import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';
import { LAUNCH_DATE_LABEL, waitlistHref } from '@/lib/launch';

export default function LaunchPage() {
  return <PublicInfoPage
    eyebrow="BuildPair launch"
    title={`BuildPair opens the Surrey marketplace on ${LAUNCH_DATE_LABEL}.`}
    intro="The main BuildPair website shows the platform as it is designed to work. This page keeps the temporary launch information, founding offer and pre-launch access details in one place."
    sections={[
      {
        title: 'What BuildPair is',
        body: 'BuildPair is a marketplace and project platform for homeowners and tradespeople. It helps people find the right local trade, compare structured quotes and keep messages, agreed changes, project records and supported payments connected to the same job.'
      },
      {
        title: 'Why BuildPair is different',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>• Built around the whole project, not just the introduction.</Text>
          <Text style={infoStyles.item}>• No pay-per-lead model for tradespeople.</Text>
          <Text style={infoStyles.item}>• Real service-area matching rather than vague nationwide coverage.</Text>
          <Text style={infoStyles.item}>• Structured quotes designed to make scope, price and stages easier to understand.</Text>
          <Text style={infoStyles.item}>• Project-linked messages, changes, records and optional BuildPay staged payments.</Text>
        </View>
      },
      {
        title: 'What is open before launch',
        body: 'Surrey trades can create and complete a real BuildPair profile now, including services, service area, work examples and trust information. Marketplace jobs, homeowner registration, paid memberships and BuildPay open with the marketplace.'
      },
      {
        title: 'Founding 50 Surrey trades',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>The first 50 eligible Surrey trades receive 3 months of BuildPair Pro free from launch day. There is no pre-launch subscription fee and BuildPair does not charge per lead.</Text>
          <Link href={waitlistHref('trader', 'launch-page')} asChild><Button mode="contained">Create my trade profile</Button></Link>
        </View>
      },
      {
        title: 'For homeowners',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>Homeowners can join launch updates now. When the marketplace opens, they will be able to search local trades, post projects, compare quotes and manage accepted work through BuildPair.</Text>
          <Link href={waitlistHref('customer', 'launch-page')} asChild><Button mode="outlined">Join homeowner updates</Button></Link>
        </View>
      },
      {
        title: 'See the full product',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>The rest of the website explains BuildPair as the working product rather than as a temporary launch advert.</Text>
          <Link href="/(public)/how-it-works" asChild><Button mode="outlined">How BuildPair works</Button></Link>
        </View>
      },
    ]}
  />;
}
