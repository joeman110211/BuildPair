import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function ForHomeownersPage() {
  return <PublicInfoPage
    eyebrow="For homeowners"
    title="Find the right trade and keep the job clear."
    intro="BuildPair helps you find suitable local tradespeople, compare clear quotes and keep the important parts of the project together."
    sections={[
      { title: 'Start with the job', body: 'Search for a trade when you know what you need, or describe the problem in ordinary language and use BuildPair to narrow the right starting point.' },
      { title: 'Find suitable local tradespeople', body: 'Browse profiles or post the job to the marketplace. Services, service area, portfolio work, availability, credentials and reviews can help you decide who is worth considering.' },
      { title: 'Visit first when needed', body: 'Some work cannot be priced properly from a description or photos. A tradesperson can arrange a site visit through the job before sending the structured quote.' },
      { title: 'Compare clear quotes', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• Scope and exclusions.</Text>
        <Text style={infoStyles.item}>• Labour, materials, VAT and total price.</Text>
        <Text style={infoStyles.item}>• Timing, warranty information and proposed stages.</Text>
        <Text style={infoStyles.item}>• BuildPay terms where BuildPay is requested.</Text>
      </View> },
      { title: 'Choose how to pay', body: 'Use BuildPay for protected staged payments, or agree to pay directly. The payment route is recorded with the project so both sides can see what was agreed.' },
      { title: 'Manage the project', body: 'Messages, accepted quotes, agreed changes, project events and payment stages can stay attached to the same job instead of being scattered across different chats and notes.' },
      { title: 'Keep useful history', body: 'Completed work can remain part of your BuildPair record so you can return to previous projects, saved tradespeople and relevant aftercare later.' },
      { title: 'Make the checks that matter', body: 'For regulated or specialist work, check the registrations, qualifications, insurance, references and permissions appropriate to the job. BuildPair helps organise information; it does not replace those checks.' },
    ]}
  />;
}
