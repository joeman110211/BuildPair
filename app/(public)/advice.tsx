import { Link } from 'expo-router';
import { Linking, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { colors, publicResponsiveMetrics } from '@/constants/theme';

type Resource = { title: string; body: string; label: string; url: string };

const HOMEOWNER_RESOURCES: Resource[] = [
  {
    title: 'Know your consumer rights',
    body: 'Paid services should be carried out with reasonable care and skill. If work goes wrong, the available remedies depend on the contract and circumstances, so start with current official consumer guidance.',
    label: 'GOV.UK consumer rights',
    url: 'https://www.gov.uk/consumer-protection-rights',
  },
  {
    title: 'Problems with building or home-improvement work',
    body: 'Citizens Advice recommends keeping contracts, receipts, photos and a dated record of what happened before raising a problem with the trader.',
    label: 'Citizens Advice guidance',
    url: 'https://www.citizensadvice.org.uk/consumer/getting-home-improvements-done/problem-with-home-improvements/',
  },
  {
    title: 'Check registered work where it matters',
    body: 'For work that relies on formal registration or self-certification, use the relevant official register rather than relying on a badge or profile claim alone.',
    label: 'GOV.UK competent person schemes',
    url: 'https://www.gov.uk/building-regulations-approval/use-a-competent-person-scheme',
  },
  {
    title: 'Check gas engineers',
    body: 'Gas work should be checked against the Gas Safe Register. HSE explains how to confirm both the business and the individual engineer.',
    label: 'HSE Gas Safe check',
    url: 'https://www.hse.gov.uk/gas/gas-safe-register-check.htm',
  },
  {
    title: 'Electrical work: minor, notifiable and competent (England)',
    body: 'Some maintenance and alterations to existing circuits may not need formal Building Regulations approval, but safety standards and competence still apply. Consumer-unit replacement, new circuits and certain work around baths or showers can require notification or an authorised self-certification route.',
    label: 'GOV.UK Approved Document P',
    url: 'https://www.gov.uk/government/publications/electrical-safety-approved-document-p',
  },
  {
    title: 'Rental electrical checks: the five-year rule (England)',
    body: 'Landlords must have fixed electrical installations inspected and tested at least every five years by a properly qualified person and provide the required report to tenants. Check the current guidance for the property and tenancy involved.',
    label: 'GOV.UK rental electrical safety',
    url: 'https://www.gov.uk/government/publications/electrical-safety-standards-in-the-private-and-social-rented-sectors-guidance/electrical-safety-standards-in-the-private-and-social-rented-sectors-guidance',
  },
  {
    title: 'Check electrical competence',
    body: 'The Registered Competent Person Electrical search allows householders to find or check registered electrical businesses for relevant domestic work.',
    label: 'Electrical Competent Person Register',
    url: 'https://www.electricalcompetentperson.co.uk/Search',
  },
];

const TRADE_RESOURCES: Resource[] = [
  {
    title: 'Consumer-law basics for supplying services',
    body: 'Clear quotes, estimates, service standards and written changes reduce avoidable disputes. Business Companion explains the relevant consumer-law principles for service providers.',
    label: 'Business Companion: supplying services',
    url: 'https://www.businesscompanion.info/en/quick-guides/services/supplying-services-s',
  },
  {
    title: 'Contracts agreed away from business premises',
    body: 'Home visits, distance contracts and cancellation rights can have specific legal requirements. Use current guidance rather than relying on generic templates or assumptions.',
    label: 'Business Companion: off-premises sales',
    url: 'https://www.businesscompanion.info/en/quick-guides/off-premises-sales/consumer-contracts-off-premises-sales',
  },
  {
    title: 'Electrical certificates: use the right record',
    body: 'BS 7671 uses different records for different purposes, including Electrical Installation Certificates, Minor Electrical Installation Works Certificates and EICRs. The IET publishes current model forms. Certification does not replace Building Regulations notification where notification is required.',
    label: 'IET current electrical model forms',
    url: 'https://electrical.theiet.org/bs-7671-18th-edition-wiring-regulations/model-forms/',
  },
  {
    title: 'Small-builder health and safety',
    body: 'HSE guidance covers the CDM 2015 duties that apply to small builders, contractors, subcontractors and self-employed people carrying out construction work.',
    label: 'HSE small-builder guidance',
    url: 'https://www.hse.gov.uk/construction/areyou/builder.htm',
  },
  {
    title: 'Current building standards',
    body: 'Use the rules for the UK nation where the work is taking place and check the edition and transitional provisions that apply. BuildPair keeps the official starting points together in one page.',
    label: 'Open BuildPair Building Rules',
    url: 'internal:building-regulations',
  },
];

const SMART_HABITS = [
  'Write down the scope, exclusions, price or pricing method, timing and who supplies materials.',
  'Record variations before extra work starts wherever practical.',
  'Keep photos, quotes, invoices, receipts and important messages attached to the job.',
  'Check regulated qualifications and registrations against the appropriate source.',
  'If a dispute develops, preserve the evidence and use the appropriate complaint, reporting or legal route.',
] as const;

function ResourceCard({ item }: { item: Resource }) {
  const internal = item.url.startsWith('internal:');
  return <View style={styles.card}>
    <Text variant="titleLarge" style={styles.title}>{item.title}</Text>
    <Text style={styles.body}>{item.body}</Text>
    {internal
      ? <Link href="/(public)/building-regulations" asChild><Button mode="outlined" icon="book-open-page-variant-outline">{item.label}</Button></Link>
      : <Button mode="outlined" icon="open-in-new" onPress={() => Linking.openURL(item.url)}>{item.label}</Button>}
  </View>;
}

export default function AdviceHub() {
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <View style={[styles.hero, metrics.phone && styles.heroMobile]}>
      <View style={styles.heroInner}>
        <Chip style={styles.heroChip} textStyle={styles.heroChipText}>Free BuildPair advice hub</Chip>
        <Text variant="displaySmall" style={[styles.heroTitle, { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>Practical guidance before, during and after a home-improvement job.</Text>
        <Text variant="bodyLarge" style={styles.heroBody}>Straightforward guidance for homeowners and tradespeople, with direct links to official UK sources for consumer rights, regulated work, building standards and safety.</Text>
        <View style={styles.heroActions}>
          <Link href="/(public)/building-regulations" asChild><Button mode="contained" icon="book-open-page-variant-outline">Building rules by UK nation</Button></Link>
          <Link href="/(public)/report" asChild><Button mode="outlined" textColor="#FFFFFF" icon="alert-outline">Report a BuildPair user</Button></Link>
        </View>
      </View>
    </View>

    <View style={[styles.content, metrics.phone && styles.contentMobile]}>
      <View style={styles.notice}>
        <Text variant="titleMedium" style={styles.title}>A clear record prevents avoidable disputes</Text>
        <Text style={styles.body}>Written scope, agreed changes, sensible evidence and verified credentials make a project easier to manage and much easier to understand later if something goes wrong.</Text>
        <View style={styles.habits}>{SMART_HABITS.map((item) => <Text key={item} style={styles.habit}>✓ {item}</Text>)}</View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>For homeowners</Text>
        <Text variant="headlineMedium" style={[styles.sectionTitle, { fontSize: metrics.sectionTitleFontSize, lineHeight: metrics.sectionTitleLineHeight }]}>Know what to check and where to get authoritative guidance.</Text>
        <Text style={styles.body}>Use BuildPair records for project clarity, then use the official services below when you need consumer, safety or registration guidance. Electrical Building Regulations differ across the UK, so the Part P examples below apply specifically to England.</Text>
      </View>
      <View style={styles.grid}>{HOMEOWNER_RESOURCES.map((item) => <ResourceCard key={item.title} item={item} />)}</View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>For tradespeople</Text>
        <Text variant="headlineMedium" style={[styles.sectionTitle, { fontSize: metrics.sectionTitleFontSize, lineHeight: metrics.sectionTitleLineHeight }]}>Protect your business with clear agreements and current guidance.</Text>
        <Text style={styles.body}>Good records protect both the customer and the trade. Use the resources below for current guidance on consumer obligations, certificates, health and safety and building standards.</Text>
      </View>
      <View style={styles.grid}>{TRADE_RESOURCES.map((item) => <ResourceCard key={item.title} item={item} />)}</View>

      <View style={styles.safetyCard}>
        <View style={styles.flex}>
          <Text variant="headlineSmall" style={styles.lightTitle}>Need to report something on BuildPair?</Text>
          <Text style={styles.lightBody}>Homeowners can report tradespeople and tradespeople can report homeowners. Reports are reviewed through the BuildPair moderation process and are not treated as an automatic finding against either side.</Text>
        </View>
        <Link href="/(public)/report" asChild><Button mode="contained" buttonColor={colors.secondary} textColor={colors.charcoal}>Open reporting form</Button></Link>
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.charcoal, paddingHorizontal: 20, paddingVertical: 64 },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 42 },
  heroInner: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 14 },
  heroChip: { alignSelf: 'flex-start', backgroundColor: '#3A4148' },
  heroChipText: { color: '#FFFFFF', fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', maxWidth: 850, letterSpacing: -1 },
  heroBody: { color: '#DDE1E3', maxWidth: 850, lineHeight: 27 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 20, gap: 26 },
  contentMobile: { paddingHorizontal: 16, paddingVertical: 16, gap: 20 },
  notice: { backgroundColor: colors.primarySoft, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#F0C9AE', gap: 10 },
  habits: { gap: 7, marginTop: 4 },
  habit: { color: colors.text, lineHeight: 22 },
  sectionHeader: { gap: 6, marginTop: 12 },
  eyebrow: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', maxWidth: 820 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 310, minWidth: 0, maxWidth: '100%', backgroundColor: colors.surfaceRaised, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 10 },
  safetyCard: { backgroundColor: colors.charcoal, borderRadius: 28, padding: 24, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 18 },
  flex: { flex: 1, minWidth: 0, maxWidth: '100%', gap: 6 },
  lightTitle: { color: '#FFFFFF', fontWeight: '900' },
  lightBody: { color: '#DDE1E3', lineHeight: 23 },
});