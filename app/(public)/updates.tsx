import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { colors } from '@/constants/theme';

const RECENT = [
  ['Four clear trade plans', 'Starter, Core, Plus and Pro now scale marketplace access and business tools without turning paid membership into a trust badge.'],
  ['Main trades + real service choices', 'A main category uses one plan slot. Tradespeople then choose at least one and up to every genuine subcategory/service inside it.'],
  ['Browse founding trades before launch', 'Real completed trade profiles can be viewed before launch while quotes, private contact and marketplace transactions remain locked.'],
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
  ['Quote & invoice reminders', 'Tradespeople can send bounded customer reminders and turn on sensible automatic follow-ups without creating an endless spam machine.'],
  ['Calendar sync', 'Plus and Pro can subscribe to a private live BuildPair calendar in Google Calendar, Outlook, Apple Calendar and compatible diary apps.'],
  ['Documents & handover library', 'Project certificates, receipt images, handover evidence and warranty records now sit in a dedicated grouped library inside the shared job workspace.'],
  ['Quote choices & optional extras', 'Standalone quotes can offer upgrades or grouped alternatives separately from the core price, with the customer choice written into the accepted total and payment record.'],
  ['Aftercare', 'Tradespeople can schedule warranty, service and follow-up dates against the finished project so useful customer relationships continue after final payment.'],
  ['Optional business add-ons', 'Tradespeople can request extra opportunity capacity, team seats, AI/design capacity or SMS credits separately from their permanent membership. Nothing is charged merely by requesting access.'],
] as const;

const COMING = [
  ['Self-serve add-on checkout', 'Optional add-ons can already be requested without charge. Direct self-serve activation will only be switched on once live Stripe pricing and purchase flows are configured and tested.'],
  ['Richer file formats', 'The grouped project document library supports moderated document images today. Dedicated PDF and broader file upload can follow once file scanning and download safety are in place.'],
  ['Clearly labelled promoted placement', 'Optional sponsored visibility may be tested later. If used, it will be labelled as promoted and will never be presented as verification or trust.'],
] as const;

function FeatureCard({ title, body, coming = false }: { title: string; body: string; coming?: boolean }) {
  return <View style={[styles.card, coming && styles.comingCard]}>
    <Chip compact icon={coming ? 'clock-outline' : 'check-circle-outline'}>{coming ? 'Coming soon' : 'Recently added'}</Chip>
    <Text variant="titleMedium" style={styles.title}>{title}</Text>
    <Text style={styles.body}>{body}</Text>
  </View>;
}

export default function UpdatesPage() {
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>BuildPair product updates</Text>
      <Text variant="displaySmall" style={styles.heroTitle}>BuildPair is being built around the whole job, not just the lead.</Text>
      <Text variant="bodyLarge" style={styles.heroBody}>See what has just been added and what is deliberately next. Features shown as coming soon are plans, not promises that they are already live.</Text>
      <View style={styles.actions}><Link href="/(public)/how-it-works" asChild><Button mode="contained">How BuildPair works</Button></Link><Link href="/(public)/pricing" asChild><Button mode="outlined">Trade membership</Button></Link></View>
    </View>

    <View style={styles.section}>
      <View style={styles.heading}><Text style={styles.eyebrow}>Recently added</Text><Text variant="headlineMedium" style={styles.sectionTitle}>The marketplace is becoming a proper project system.</Text></View>
      <View style={styles.grid}>{RECENT.map(([title, body]) => <FeatureCard key={title} title={title} body={body} />)}</View>
    </View>

    <View style={[styles.section, styles.comingSection]}>
      <View style={styles.heading}><Text style={styles.eyebrow}>Coming soon</Text><Text variant="headlineMedium" style={styles.sectionTitle}>The next pieces we are building.</Text><Text style={styles.heroBody}>We will add these in stages and keep the core workflow understandable. BuildPair should remove admin, not become a cockpit nobody asked for.</Text></View>
      <View style={styles.grid}>{COMING.map(([title, body]) => <FeatureCard key={title} title={title} body={body} coming />)}</View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1 },
  hero: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 52, gap: 14, alignItems: 'center' },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  heroTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center', maxWidth: 820 },
  heroBody: { color: colors.muted, lineHeight: 24, textAlign: 'center', maxWidth: 800 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  section: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 38, gap: 20 },
  comingSection: { maxWidth: '100%', backgroundColor: colors.surfaceSoft, paddingHorizontal: 28 },
  heading: { gap: 7, alignItems: 'center' },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  grid: { width: '100%', maxWidth: 1140, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 310, minWidth: 250, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, gap: 8 },
  comingCard: { backgroundColor: '#FFF9F3' },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 22 },
});
