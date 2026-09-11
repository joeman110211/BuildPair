import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function ForTradespeoplePage() {
  return <PublicInfoPage
    eyebrow="For tradespeople"
    title="Win suitable work, present your business professionally and keep the job organised."
    intro="BuildPair gives tradespeople a professional profile, local marketplace opportunities, structured quoting and practical tools for managing work after the lead is won."
    sections={[
      { title: 'Build a profile that shows what you actually do', body: 'Present your trade categories, services, experience, service area, work galleries, before-and-after projects, qualifications, registers and business links in one profile. The aim is to make relevant experience and workmanship easier for homeowners to assess.' },
      { title: 'Choose the work you want to be found for', body: 'BuildPair separates broad trade categories from the services underneath them. Plan limits apply to main categories, while the services within those categories can be kept up to date as your business changes.' },
      { title: 'Find local opportunities in several ways', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Browse open marketplace jobs that match your category and service radius.</Text><Text style={infoStyles.item}>• Receive direct quote requests from homeowners who choose your searchable profile.</Text><Text style={infoStyles.item}>• Publish availability so customers can see when you may be able to take work.</Text><Text style={infoStyles.item}>• Use saved searches and alerts to surface relevant opportunities.</Text><Text style={infoStyles.item}>• Opt into emergency availability where it suits your business.</Text></View> },
      { title: 'Send clearer quotes', body: 'Structured quote fields keep scope, exclusions, start date, duration, materials, payment stages, warranty and VAT information clear. AI quote assistance can help draft wording, while the tradesperson remains responsible for checking the final quote before it is sent.' },
      { title: 'Use BuildPay for staged jobs', body: 'On supported jobs, BuildPay gives both sides a visible record of what has been funded, what has been released and what remains due. Materials can be released to your connected Stripe account for the job, while funded work stages are released after you reach the recorded completion point and the homeowner approves release.' },
      { title: 'Record changes before extra work starts', body: 'Variations can record the requested change, price effect, timing effect and approval status. That gives both sides a clearer record when the scope changes after the original quote.' },
      { title: 'Keep using BuildPair after the lead is won', body: 'Messaging, BuildPay stages, variations, invoices, availability, project stories and analytics are designed to remain useful throughout the customer relationship, not just at the introduction.' },
      { title: 'Starter, Plus and Pro', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Starter: £0/month, up to 2 main categories and a shareable profile.</Text><Text style={infoStyles.item}>• BuildPair Plus: £19.99/month, up to 4 main categories, searchable profile, direct quote requests and 15 open-marketplace offers per month.</Text><Text style={infoStyles.item}>• BuildPair Pro: £29.99/month, up to 6 main categories, 35 offers per month, advanced analytics, priority alerts and a modest search boost.</Text><Link href="/(public)/pricing" asChild><Button mode="outlined">Compare memberships</Button></Link></View> },
      { title: 'Professional responsibilities remain yours', body: 'Tradespeople remain responsible for accurate profile claims, safe working practices and any registration, qualification, licence, insurance, notification or permission required for the work they undertake. BuildPair can organise evidence and marketplace information but does not replace a regulator or competent-person scheme.' },
    ]}
  />;
}
