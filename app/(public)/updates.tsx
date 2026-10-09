import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Chip, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { PrelaunchBanner } from '@/components/PrelaunchBanner';
import { PublicSeo } from '@/components/PublicSeo';
import { PublicFooter } from '@/components/PublicFooter';
import { colors, publicResponsiveMetrics } from '@/constants/theme';

const RECENT = [
  ['Four clear trade plans', 'Starter, Core, Plus and Pro now scale marketplace access and business tools without turning paid membership into a trust badge.'],
  ['Main trades + real service choices', 'A main category uses one plan slot. Tradespeople then choose at least one and up to every genuine subcategory/service inside it.'],
  ['Explore real trade profiles', 'Browse business details, service areas, portfolios and review sources to find a good fit for your project.'],
  ['Better trade discovery', 'Compare profiles, sort by best match, rating or responsiveness, filter by availability, revisit recent profiles and see similar trades.'],
  ['Quote customers from anywhere', 'Tradespeople can create itemised quotes for customers who came from referrals, phone calls, social media or anywhere outside BuildPair.'],
  ['Quote revisions', 'Sent outside-customer quotes can be revised without overwriting the earlier agreed record. Accepted work changes move into the project variation flow.'],
  ['Bring an outside job into BuildPair', 'An accepted external quote can become a managed BuildPair project with its scope, price and agreed payment stages carried across.'],
  ['Whole-job workspace', 'Tasks, progress notes, materials, expenses, snagging, handover and warranty records can stay with the job instead of disappearing into separate apps.'],
  ['Tiered availability', 'Core can publish a simple next-available window, Plus can plan roughly 12 weeks ahead and Pro can publish up to six months. Private diary details stay private.'],
  ['Project+ planning tools', 'Project+ adds AI room concepts and project-planning help for homeowners. BuildPair Pro includes the same tools for tradespeople to use with customers.'],
  ['Trade customer book', 'Outside-customer quotes and invoices now feed a simple customer history so tradespeople can keep using BuildPair when the lead came from somewhere else.'],
  ['Working calendar', 'Plus and Pro can see scheduled job starts, site visits and published availability together. Plus covers roughly 12 weeks and Pro roughly six months.'],
  ['Project evidence', 'The shared job workspace can attach moderated photos or document images to progress, materials, expenses, snagging, handover and warranty records.'],
  ['Friendly quote & invoice reminders', 'Tradespeople can send a polite reminder when a quote has been waiting at least 48 hours, or when an invoice is approaching its due date or overdue. BuildPair blocks repeat reminders for 48 hours to avoid pestering customers.'],
  ['Calendar subscription', 'Plus and Pro trades can subscribe to their BuildPair working calendar from Google Calendar, Outlook, Apple Calendar or another calendar app without uploading their private diary into BuildPair.'],
  ['Project handover packs', 'Each managed job can produce one clean handover record containing the agreed scope, accepted variations, payment history, shared evidence, handover notes, warranty and aftercare.'],
  ['Quote choices & optional extras', 'Outside-customer quotes can show optional upgrades and alternative choices separately from the agreed core price, so useful choices do not muddy the base scope.'],
  ['Aftercare follow-ups', 'Warranty and aftercare items can stay on the completed project record with due dates and a controlled customer reminder when it is genuinely useful.'],
  ['Project+ trade add-on', 'Project+ can be added to a Starter, Core or Plus trade account for £4.99/month. It remains included with BuildPair Pro.'],
  ['Next action + repeat work', 'The homeowner dashboard surfaces the clearest next job action. Completed work can now feed a private Home Record, and a homeowner can reuse a previous job or hire the same active tradesperson again without overwriting the old project.'],
  ['Repeat-customer shortcuts', 'The trade customer book can start a fresh quote or invoice with the known customer details already filled, reducing duplicate admin while keeping repeat work inside BuildPair.'],
  ['Saved property profiles', 'Homeowners can save a private property once and reuse its property type, postcode, address and access notes on future jobs. The exact address stays out of the public marketplace listing.'],
  ['Needs Attention centre', 'Homeowners and tradespeople get one focused action list for decisions, payment stages, quote follow-ups, invoices and upcoming aftercare rather than hunting across separate screens.'],
  ['Structured project updates', 'Either side can record a delay or project problem with a reason, note and optional revised date. The other party is notified and the update stays on the project timeline.'],
  ['Property Passport care loop', 'The Home Record now surfaces upcoming warranty and aftercare dates alongside the project and tradesperson that created them, making repeat maintenance easier to act on.'],
] as const;

function FeatureCard({ title, body }: { title: string; body: string }) {
  return <View style={styles.card}>
    <Chip compact icon="check-circle-outline">Available now</Chip>
    <Text variant="titleMedium" style={styles.title}>{title}</Text>
    <Text style={styles.body}>{body}</Text>
  </View>;
}

export default function UpdatesPage() {
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <PublicSeo title="BuildPair features" description="Explore the tools available for homeowners and tradespeople on BuildPair." />
    <PrelaunchBanner />
    <View style={[styles.hero, metrics.phone && styles.heroMobile]}>
      <Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>BuildPair features</Text>
      <Text variant="displaySmall" style={[styles.heroTitle, { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>Built around the whole job.</Text>
      <Text variant="bodyLarge" style={styles.heroBody}>Explore the tools available to homeowners and tradespeople today.</Text>
      <View style={styles.actions}><Link href="/(public)/how-it-works" asChild><Button mode="contained">How BuildPair works</Button></Link><Link href="/(public)/pricing" asChild><Button mode="outlined">Trade membership</Button></Link></View>
    </View>

    <View style={[styles.section, metrics.phone && styles.sectionMobile]}>
      <View style={styles.heading}><Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>Available now</Text><Text variant="headlineMedium" style={[styles.sectionTitle, { fontSize: metrics.sectionTitleFontSize, lineHeight: metrics.sectionTitleLineHeight }]}>A clearer way to manage the whole project.</Text></View>
      <View style={styles.grid}>{RECENT.map(([title, body]) => <FeatureCard key={title} title={title} body={body} />)}</View>
    </View>

    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1 },
  hero: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 52, gap: 14, alignItems: 'center' },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 38, gap: 11 },
  eyebrow: { color: colors.primary, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  heroTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center', maxWidth: 820 },
  heroBody: { color: colors.muted, lineHeight: 24, textAlign: 'center', maxWidth: 800 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  section: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 38, gap: 20 },
  sectionMobile: { paddingHorizontal: 16, paddingVertical: 30, gap: 16 },
  comingSection: { maxWidth: '100%', backgroundColor: colors.surfaceSoft, paddingHorizontal: 28 },
  heading: { gap: 7, alignItems: 'center' },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  grid: { width: '100%', maxWidth: 1140, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 310, minWidth: 0, maxWidth: '100%', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, gap: 8 },
  comingCard: { backgroundColor: '#FFF9F3' },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 22 },
});
