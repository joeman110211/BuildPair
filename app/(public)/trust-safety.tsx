import { StyleSheet, Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';
import { colors, radii, shadows, spacing } from '@/constants/theme';

export default function TrustSafetyPage() {
  return <PublicInfoPage
    eyebrow="Trust & safety"
    title="Check the work. Trust the relationship. Build the pair."
    intro="See the evidence behind a profile, keep project history connected and report concerns from either side."
    summary={<View style={styles.signalGrid}>
      {[['PROFILE', 'Real work', 'Services, area, availability and portfolio'], ['CREDENTIALS', 'Clear status', 'Reviewed evidence shown with its status'], ['REVIEWS', 'Useful context', 'Project-linked reviews where available'], ['REPORTING', 'Two-way', 'Homeowners and tradespeople can report concerns']].map(([label, title, body]) => <View key={label} style={styles.signal}><Text style={styles.label}>{label}</Text><Text style={styles.signalTitle}>{title}</Text><Text style={styles.signalBody}>{body}</Text></View>)}
    </View>}
    sections={[
      { title: 'Profiles with useful context', body: 'Trade profiles can show categories and services, experience, service area, work galleries, project examples, availability and submitted credentials. Users should still make the checks appropriate to regulated or specialist work.' },
      { title: 'Credential review status', body: 'BuildPair can review submitted credential evidence and show a clear status. A verified item means the submitted evidence passed the relevant BuildPair review workflow; it does not make BuildPair the issuing regulator or guarantee future work.' },
      { title: 'Reviews linked to BuildPair activity', body: 'Where applicable, reviews can be connected to the underlying BuildPair job and completion history. Review manipulation, fabricated experiences and pressure to leave misleading feedback are not permitted.' },
      { title: 'Home location privacy', body: 'Public marketplace jobs use outward postcode or location information rather than exposing precise matching coordinates. More detailed location data used for service-radius matching remains server-side.' },
      { title: 'Messaging safety and AI assistance', body: 'BuildPair may use automated systems for optional reply suggestions and safety signals such as possible scams, threats or targeted abuse. AI can make mistakes, so generated drafts must be checked by the user and automated flags are not treated as proof of wrongdoing.' },
      { title: 'Two-way reporting and human moderation', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Homeowners can report tradespeople and tradespeople can report homeowners.</Text><Text style={infoStyles.item}>• Reports can cover fraud, harassment, safety, workmanship, misleading profiles, non-payment, payment disputes, no-shows, spam and other marketplace concerns.</Text><Text style={infoStyles.item}>• A report starts a review; it is not an automatic finding against the reported user.</Text><Text style={infoStyles.item}>• Authorised moderators can review relevant evidence and apply proportionate actions where appropriate.</Text><Text style={infoStyles.item}>• Immediate danger, crime or serious legal concerns should still be reported to the appropriate emergency service or authority.</Text></View> },
      { title: 'Illegal and harmful content', body: 'BuildPair does not permit illegal content or conduct such as child sexual exploitation or grooming, terrorism content, unlawful hate or threats, stalking or harassment, intimate-image abuse, fraud and scams, unlawful drugs or weapons content, sexual exploitation, cyberflashing or unlawful encouragement of suicide or serious self-harm. BuildPair may restrict or remove content and may warn, restrict or suspend accounts where proportionate.' },
      { title: 'Report without an account', body: 'You do not need a BuildPair account to report suspected illegal or harmful content. The public Report page provides a direct safety-reporting route. Signed-in users can additionally submit an account-linked marketplace report so relevant job, message or account context can be reviewed.' },
      { title: 'Moderation complaints', body: 'If you believe BuildPair handled a safety report or moderation decision incorrectly, email info@buildpair.co.uk with the relevant report reference, account email or content reference where available and ask for a review. Do not download, copy or email suspected child sexual abuse images or videos. If anyone is in immediate danger, call 999.' },
      { title: 'Your checks still matter', body: 'For gas, electrical, structural, asbestos and other regulated or specialist work, check the registrations, qualifications, insurance, references and permissions appropriate to the job. BuildPair helps organise information; it does not replace professional judgement or statutory requirements.' },
    ]}
  />;
}

const styles = StyleSheet.create({
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  signal: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 210, minWidth: 0, borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, padding: spacing.lg, gap: spacing.xs, ...shadows.subtle },
  label: { color: colors.accentDark, fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 1 },
  signalTitle: { color: colors.charcoal, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  signalBody: { color: colors.muted, lineHeight: 20 },
});
