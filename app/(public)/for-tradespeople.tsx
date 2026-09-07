import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function ForTradespeoplePage() {
  return <PublicInfoPage
    eyebrow="For tradespeople"
    title="Win suitable work, present your business properly and keep the admin connected."
    intro="BuildPair is designed to be useful beyond lead generation. A tradesperson can build a professional profile, find relevant local opportunities, quote, message, manage project changes and understand how the business is performing from one account."
    sections={[
      { title: 'Build a profile that represents the business properly', body: 'Show broad trade categories, specific services, experience, working radius, service areas, work galleries, before-and-after projects, qualifications, registers, social links and structured project stories. The goal is to let workmanship and relevant experience do more of the selling.' },
      { title: 'Choose the work you actually offer', body: 'BuildPair separates broad categories from the services underneath them. Plan limits apply to main categories, while services inside an already-selected category can be updated more freely. That keeps search useful without charging a separate slot for every individual service.' },
      { title: 'Find local work in more than one way', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Browse open marketplace jobs that match your category and service radius.</Text><Text style={infoStyles.item}>• Receive direct quote requests from homeowners who choose your searchable profile.</Text><Text style={infoStyles.item}>• Publish availability so customers can see when you may be able to take work.</Text><Text style={infoStyles.item}>• Use saved job searches and alerts to surface relevant opportunities.</Text><Text style={infoStyles.item}>• Opt into appropriate emergency availability rather than being interrupted by irrelevant broadcasts.</Text></View> },
      { title: 'Produce clearer quotes', body: 'Structured quote fields keep scope, exclusions, start date, duration, deposit, payment stages, warranty and VAT information easier to compare. AI quote assistance can help draft wording, but the tradesperson remains responsible for checking the final quote before it is sent.' },
      { title: 'Keep changes out of vague message threads', body: 'Variations can record the requested change, price effect, timing effect and approval status. That creates a clearer shared record when a customer asks for extra work or the scope changes after the original quote.' },
      { title: 'Use BuildPair after the lead is won', body: 'Messaging, invoices, job stages, project stories, availability and analytics are designed to make the platform useful during and after the project, rather than disappearing the moment two users exchange contact details.' },
      { title: 'Starter, Plus and Pro', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Starter: £0/month, 2 main categories and a shareable profile, but no open-marketplace offers or marketplace search listing.</Text><Text style={infoStyles.item}>• BuildPair Plus: £19.99/month, 4 main categories, searchable profile, direct quote requests and 15 open-marketplace offers per month.</Text><Text style={infoStyles.item}>• BuildPair Pro: £29.99/month, 6 main categories, 35 offers per month, advanced analytics, priority alerts and a modest search boost.</Text><Link href="/(public)/pricing" asChild><Button mode="outlined">Compare memberships</Button></Link></View> },
      { title: 'Your professional responsibilities remain yours', body: 'Tradespeople remain responsible for accurate profile claims, safe working practices and any registration, qualification, licence, insurance, notification or permission required for the work they undertake. BuildPair can organise evidence and marketplace signals but does not replace a regulator or competent-person scheme.' },
    ]}
  />;
}
