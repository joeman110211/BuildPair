import { StyleSheet, Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';
import { colors, radii, spacing } from '@/constants/theme';

export default function TrustSafetyPage() {
  return <PublicInfoPage
    eyebrow="Trust & safety"
    title="Trust comes from evidence, not a badge."
    intro="BuildPair gives homeowners and tradespeople clearer information, project records and a fair way to raise concerns. A paid plan is a product level, not a trust score."
    sections={[
      {
        title: 'Fair for both sides',
        body: <View style={styles.twoSide}>
          <View style={styles.sideCard}>
            <Text style={styles.sideEyebrow}>HOMEOWNER</Text>
            <Text style={styles.sideTitle}>Clearer choices</Text>
            <Text style={styles.sideBody}>See useful profile information, compare structured quotes and keep project decisions connected to the job.</Text>
          </View>
          <View style={styles.sideCard}>
            <Text style={styles.sideEyebrow}>TRADESPERSON</Text>
            <Text style={styles.sideTitle}>Fairer treatment</Text>
            <Text style={styles.sideBody}>Present genuine experience and evidence without paying for a trust label or losing credibility because you are on a cheaper plan.</Text>
          </View>
        </View>,
      },
      {
        title: 'Profiles show useful evidence',
        body: 'Trade profiles can show services, experience, service area, portfolio work, availability, submitted credentials and other business information. BuildPair can show the review status of submitted evidence without pretending to be the issuing regulator.',
      },
      {
        title: 'Reviews have context',
        body: 'Where applicable, reviews can be linked to underlying BuildPair job and completion activity. Google reviews can be shown separately when an approved business listing is connected, so different reputation sources remain clear.',
      },
      {
        title: 'Local without exposing a home address',
        body: 'Marketplace matching uses a tradesperson’s saved service base and working radius. Public job information uses outward location details while more precise matching data remains server-side.',
      },
      {
        title: 'Reporting works both ways',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>• Homeowners can report tradespeople and tradespeople can report homeowners.</Text>
          <Text style={infoStyles.item}>• Reports can cover fraud, harassment, safety, misleading profiles, non-payment, workmanship concerns, payment disputes, no-shows and spam.</Text>
          <Text style={infoStyles.item}>• A report starts a review. It is not an automatic finding against the person reported.</Text>
          <Text style={infoStyles.item}>• Authorised moderators can review relevant project evidence and apply proportionate platform action where appropriate.</Text>
        </View>,
      },
      {
        title: 'Specialist checks still matter',
        body: 'For gas, electrical, structural, asbestos and other regulated or specialist work, users should still check the registrations, qualifications, insurance, references and permissions appropriate to the job. BuildPair helps organise evidence; it does not replace professional judgement, regulators or statutory requirements.',
      },
    ]}
  />;
}

const styles = StyleSheet.create({
  twoSide: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sideCard: { flexGrow: 1, flexBasis: 260, minWidth: 220, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft, padding: spacing.lg, gap: spacing.xs },
  sideEyebrow: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  sideTitle: { color: colors.charcoal, fontSize: 18, fontWeight: '900' },
  sideBody: { color: colors.muted, lineHeight: 22 },
});
