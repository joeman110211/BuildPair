import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function TrustSafetyPage() {
  return <PublicInfoPage
    eyebrow="Trust & safety"
    title="Better decisions need more than a star rating."
    intro="BuildPair is designed to show useful context about tradespeople and completed work while keeping marketplace safety, privacy, reporting and moderation visible rather than hiding them behind a generic trust badge."
    sections={[
      { title: 'Profiles with useful context', body: 'Trade profiles can show selected categories and services, experience, service area, work galleries, project examples, availability and submitted credentials. Profile information is not treated as a substitute for checks required for regulated or specialist work.' },
      { title: 'Credential status is kept separate', body: 'BuildPair supports credential submission and administrative review so evidence can be shown with a meaningful status. A verified item means the submitted evidence has passed the relevant BuildPair review workflow; it does not turn BuildPair into the issuing regulator or guarantee future work.' },
      { title: 'Reviews tied to real marketplace activity', body: 'BuildPair is designed to make completed-job reputation more meaningful by connecting reviews to the underlying job and payment/completion workflow where applicable. Review manipulation, fabricated experiences and pressure to leave misleading feedback are not acceptable.' },
      { title: 'Home location privacy', body: 'Public marketplace jobs use outward postcode/location information rather than exposing the homeowner’s full matching coordinates. More precise location data used for service-radius matching stays server-side.' },
      { title: 'Messaging safety and AI assistance', body: 'Job conversations may use automated systems for optional reply suggestions and safety signals such as possible scams, threats or targeted abuse. AI can make mistakes, so generated drafts must be checked by the user and automated flags do not by themselves prove wrongdoing.' },
      { title: 'Two-way reporting and human moderation', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Homeowners can report tradespeople and tradespeople can report homeowners.</Text><Text style={infoStyles.item}>• Reports can cover fraud, harassment, safety, workmanship, misleading profiles, non-payment, payment disputes, no-shows, spam and other marketplace concerns.</Text><Text style={infoStyles.item}>• A report is a request for review, not an automatic finding against the reported person.</Text><Text style={infoStyles.item}>• Authorised moderators can record evidence and reasons, dismiss a report, warn an account, warn or restrict a conversation, close or reopen a conversation, suspend an account or restore it where appropriate.</Text><Text style={infoStyles.item}>• Serious legal or immediate safety concerns should still be reported to the appropriate emergency service, regulator or authority.</Text></View> },
      { title: 'Your checks still matter', body: 'For work involving gas, electrics, structural safety, asbestos or any other regulated or specialist activity, users should check the registrations, qualifications, insurance, references and permissions appropriate to the job. BuildPair helps organise information; it does not replace professional judgement or statutory requirements.' },
    ]}
  />;
}
