import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function TrustSafetyPage() {
  return <PublicInfoPage
    eyebrow="Trust & safety"
    title="Clearer information, stronger records and a fair reporting process."
    intro="BuildPair combines profile information, credential review, project-linked reputation, privacy controls and human moderation to help users make better-informed decisions."
    sections={[
      { title: 'Profiles with useful context', body: 'Trade profiles can show categories and services, experience, service area, work galleries, project examples, availability and submitted credentials. Users should still make the checks appropriate to regulated or specialist work.' },
      { title: 'Credential review status', body: 'BuildPair can review submitted credential evidence and show a clear status. A verified item means the submitted evidence passed the relevant BuildPair review workflow; it does not make BuildPair the issuing regulator or guarantee future work.' },
      { title: 'Reviews linked to BuildPair activity', body: 'Where applicable, reviews can be connected to the underlying BuildPair job and completion history. Review manipulation, fabricated experiences and pressure to leave misleading feedback are not permitted.' },
      { title: 'Home location privacy', body: 'Public marketplace jobs use outward postcode or location information rather than exposing precise matching coordinates. More detailed location data used for service-radius matching remains server-side.' },
      { title: 'Messaging safety and AI assistance', body: 'BuildPair may use automated systems for optional reply suggestions and safety signals such as possible scams, threats or targeted abuse. AI can make mistakes, so generated drafts must be checked by the user and automated flags are not treated as proof of wrongdoing.' },
      { title: 'Two-way reporting and human moderation', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Homeowners can report tradespeople and tradespeople can report homeowners.</Text><Text style={infoStyles.item}>• Reports can cover fraud, harassment, safety, workmanship, misleading profiles, non-payment, payment disputes, no-shows, spam and other marketplace concerns.</Text><Text style={infoStyles.item}>• A report starts a review; it is not an automatic finding against the reported user.</Text><Text style={infoStyles.item}>• Authorised moderators can review relevant evidence and apply proportionate actions where appropriate.</Text><Text style={infoStyles.item}>• Immediate danger, crime or serious legal concerns should still be reported to the appropriate emergency service or authority.</Text></View> },
      { title: 'Your checks still matter', body: 'For gas, electrical, structural, asbestos and other regulated or specialist work, check the registrations, qualifications, insurance, references and permissions appropriate to the job. BuildPair helps organise information; it does not replace professional judgement or statutory requirements.' },
    ]}
  />;
}