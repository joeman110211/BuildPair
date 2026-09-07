import { Link } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { colors } from '@/constants/theme';

type Resource = { title: string; body: string; label: string; url: string };

const HOMEOWNER_RESOURCES: Resource[] = [
  {
    title: 'Know your consumer rights',
    body: 'Paid services should be carried out with reasonable care and skill. If work goes wrong, your exact remedies depend on the contract and circumstances, so use official consumer guidance before accepting a brush-off.',
    label: 'GOV.UK consumer rights',
    url: 'https://www.gov.uk/consumer-protection-rights',
  },
  {
    title: 'Problems with building or home-improvement work',
    body: 'Citizens Advice recommends gathering contracts, receipts, photos and a dated record of what happened before raising the problem with the trader.',
    label: 'Citizens Advice guidance',
    url: 'https://www.citizensadvice.org.uk/consumer/getting-home-improvements-done/problem-with-home-improvements/',
  },
  {
    title: 'Check registered work where it matters',
    body: 'For work that relies on formal registration or self-certification, use the official register instead of trusting a badge copied onto a van or profile.',
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
    title: 'Check electrical competence',
    body: 'The Registered Competent Person Electrical search lets householders find or check registered electrical businesses for relevant domestic work.',
    label: 'Electrical Competent Person Register',
    url: 'https://www.electricalcompetentperson.co.uk/Search',
  },
];

const TRADE_RESOURCES: Resource[] = [
  {
    title: 'Consumer-law basics for supplying services',
    body: 'Quotes, estimates, changes and service standards can create disputes when they are vague. Business Companion explains the rules and why agreed changes should be recorded in writing.',
    label: 'Business Companion: supplying services',
    url: 'https://www.businesscompanion.info/en/quick-guides/services/supplying-services-s',
  },
  {
    title: 'Contracts agreed away from business premises',
    body: 'Home visits, distance contracts and cancellation rights have specific rules. Do not rely on pub-law folklore or a template you found in somebody else’s van.',
    label: 'Business Companion: off-premises sales',
    url: 'https://www.businesscompanion.info/en/quick-guides/off-premises-sales/consumer-contracts-off-premises-sales',
  },
  {
    title: 'Small-builder health and safety',
    body: 'HSE guidance covers the CDM 2015 duties that apply to small builders, contractors, subcontractors and self-employed people carrying out construction work.',
    label: 'HSE small-builder guidance',
    url: 'https://www.hse.gov.uk/construction/areyou/builder.htm',
  },
  {
    title: 'Current building standards',
    body: 'Use the correct rules for the nation where the work is taking place and the date the application or work falls under. BuildPair keeps the official starting points together in one free page.',
    label: 'Open BuildPair Building Rules',
    url: 'internal:building-regulations',
  },
];

const SMART_HABITS = [
  'Write down scope, exclusions, price or pricing method, timing and who supplies materials.',
  'Record variations before the extra work starts wherever practical.',
  'Keep photos, quotes, invoices, receipts and important messages attached to the job.',
  'Do not treat a profile badge as proof of a regulated qualification unless the source is actually verified.',
  'Do not move a dispute straight into threats. Preserve the evidence and use the proper complaint or reporting route.',
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
  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <View style={styles.hero}>
      <View style={styles.heroInner}>
        <Chip style={styles.heroChip} textStyle={styles.heroChipText}>Free BuildPair advice hub</Chip>
        <Text variant="displaySmall" style={styles.heroTitle}>Useful advice before money, materials or tempers start disappearing.</Text>
        <Text variant="bodyLarge" style={styles.heroBody}>Straightforward guidance for homeowners and tradespeople, plus direct links to official UK sources. BuildPair is not replacing legal, building-control or professional advice. It is making the proper starting points much harder to miss.</Text>
        <View style={styles.heroActions}>
          <Link href="/(public)/building-regulations" asChild><Button mode="contained" icon="book-open-page-variant-outline">Building rules by UK nation</Button></Link>
          <Link href="/(public)/report" asChild><Button mode="outlined" textColor="#FFFFFF" icon="alert-outline">Report a BuildPair user</Button></Link>
        </View>
      </View>
    </View>

    <View style={styles.content}>
      <View style={styles.notice}>
        <Text variant="titleMedium" style={styles.title}>The boring stuff that prevents expensive arguments</Text>
        <Text style={styles.body}>A clear written scope, sensible evidence and verified credentials are considerably cheaper than trying to reconstruct an agreement from six voice notes, two cash payments and somebody’s memory of a conversation on a driveway.</Text>
        <View style={styles.habits}>{SMART_HABITS.map((item) => <Text key={item} style={styles.habit}>✓ {item}</Text>)}</View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>For homeowners</Text>
        <Text variant="headlineMedium" style={styles.sectionTitle}>Protect the project without becoming your own solicitor.</Text>
        <Text style={styles.body}>Use BuildPair records for clarity, then use the official services below when the issue needs consumer, safety or registration guidance.</Text>
      </View>
      <View style={styles.grid}>{HOMEOWNER_RESOURCES.map((item) => <ResourceCard key={item.title} item={item} />)}</View>

      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>For tradespeople</Text>
        <Text variant="headlineMedium" style={styles.sectionTitle}>Protect your business from vague jobs, moving goalposts and avoidable disputes.</Text>
        <Text style={styles.body}>Good paperwork protects the customer and the trade. It also makes it much easier to show what was actually agreed when everybody’s memory suddenly becomes extremely creative.</Text>
      </View>
      <View style={styles.grid}>{TRADE_RESOURCES.map((item) => <ResourceCard key={item.title} item={item} />)}</View>

      <View style={styles.safetyCard}>
        <View style={styles.flex}>
          <Text variant="headlineSmall" style={styles.lightTitle}>Something happened on BuildPair?</Text>
          <Text style={styles.lightBody}>Homeowners can report tradespeople and tradespeople can report homeowners. Reports go into the BuildPair moderation queue for review. A report is evidence to review, not an automatic guilty verdict.</Text>
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
  heroInner: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 14 },
  heroChip: { alignSelf: 'flex-start', backgroundColor: '#3A4148' },
  heroChipText: { color: '#FFFFFF', fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', maxWidth: 850, letterSpacing: -1 },
  heroBody: { color: '#DDE1E3', maxWidth: 850, lineHeight: 27 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 20, gap: 26 },
  notice: { backgroundColor: colors.primarySoft, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#F0C9AE', gap: 10 },
  habits: { gap: 7, marginTop: 4 },
  habit: { color: colors.text, lineHeight: 22 },
  sectionHeader: { gap: 6, marginTop: 12 },
  eyebrow: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', maxWidth: 820 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  card: { flexGrow: 1, flexBasis: 310, backgroundColor: colors.surfaceRaised, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 10 },
  safetyCard: { backgroundColor: colors.charcoal, borderRadius: 28, padding: 24, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 18 },
  flex: { flex: 1, minWidth: 260, gap: 6 },
  lightTitle: { color: '#FFFFFF', fontWeight: '900' },
  lightBody: { color: '#DDE1E3', lineHeight: 23 },
});
