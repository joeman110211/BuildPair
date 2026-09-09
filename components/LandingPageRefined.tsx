import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { FeaturedTraderHero } from '@/components/FeaturedTraderHero';
import { PricingCards } from '@/components/PricingCards';
import { PublicFooter } from '@/components/PublicFooter';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';

const POPULAR_TRADES = ['Tiling', 'Plumbing', 'Electrical', 'Building & Extensions', 'Roofing & Roofline', 'Painting & Decorating', 'Kitchens', 'Bathrooms'] as const;
const HERO_BENEFITS = ['Plan clearly', 'Compare properly', 'Hire confidently', 'Keep everything connected'] as const;

const FAQS = [
  ['What happens if a tradesperson cannot quote from photos?', 'They can arrange a site visit through the BuildPair job before quoting. The formal quote and proposed payment stages then come back through BuildPair so the project stays connected.'],
  ['How do BuildPair payments work?', 'After a quote is accepted, the homeowner can choose BuildPair payments. Upfront materials payments and deposits are transferred when paid. Progress and final stages are transferred only after release is requested and approved.'],
  ['Can we arrange payment ourselves?', 'Yes. Users can arrange payment privately while keeping the quote, messages and project record in BuildPair. BuildPair cannot process, pause, refund or recover money paid outside BuildPair.'],
  ['What memberships are available to tradespeople?', 'Starter is £0/month, BuildPair Plus is £19.99/month and BuildPair Pro is £29.99/month. Paid plans add marketplace selling capacity and deeper business tools.'],
] as const;

function SectionHeading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <View style={styles.sectionHeading}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text variant="headlineMedium" style={styles.sectionTitle}>{title}</Text>
    {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
  </View>;
}

export default function LandingPageRefined() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };
  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <View style={[styles.hero, wide && styles.heroWide]}>
      <View style={[styles.heroCopy, wide && styles.heroCopyWide]} testID="home-hero-copy">
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>Built for UK homeowners and tradespeople</Text></View>
        <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Find the right trade. Compare properly. Keep the whole job together.</Text>
        <Text variant="titleMedium" style={styles.heroSubtitle}>More than a trades directory. BuildPair connects local trade discovery with AI-assisted job planning, structured quotes, job-linked messaging, agreed changes, staged payments and reputation tools in one project record.</Text>
        <View style={styles.heroBenefits}>
          {HERO_BENEFITS.map((item) => <View key={item} style={styles.heroBenefit}><Text style={styles.heroBenefitMark}>✓</Text><Text style={styles.heroBenefitText}>{item}</Text></View>)}
        </View>
        <View style={styles.heroSearch}>
          <TextInput mode="outlined" value={search} onChangeText={setSearch} onSubmitEditing={() => goSearch(search)} placeholder="What do you need done? e.g. bathroom tiling" outlineStyle={styles.inputOutline} />
          <Button mode="contained" contentStyle={styles.searchButton} onPress={() => goSearch(search)}>Find a trade</Button>
        </View>
        <View style={styles.heroActions} testID="home-hero-actions">
          <Link href="/auth/account" asChild><Button mode="outlined" style={styles.heroActionButton}>Post a job</Button></Link>
          <Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" style={styles.heroActionButton}>I’m a tradesperson</Button></Link>
          <Link href="/(public)/how-it-works" asChild><Button mode="outlined" style={styles.heroActionButton}>How it works</Button></Link>
        </View>
      </View>
      <FeaturedTraderHero wide={wide} />
    </View>

    <View style={styles.credibilityBand}>
      <View style={styles.credibilityInner}>
        <View style={styles.credibilityItem}><Text style={styles.credibilityValue}>{TRADE_CATEGORIES.length}</Text><Text style={styles.credibilityLabel}>broad UK trade categories</Text></View>
        <View style={styles.credibilityItem}><Text style={styles.credibilityValue}>LIVE</Text><Text style={styles.credibilityLabel}>featured profile from current marketplace data</Text></View>
        <View style={styles.credibilityItem}><Text style={styles.credibilityValue}>2</Text><Text style={styles.credibilityLabel}>payment routes after hiring</Text></View>
        <View style={styles.credibilityItem}><Text style={styles.credibilityValue}>4</Text><Text style={styles.credibilityLabel}>purpose-built AI assistants</Text></View>
      </View>
    </View>

    <View style={styles.proofBand}>
      <View style={styles.proofInner}>
        <View style={styles.proofCopy}>
          <Text style={styles.proofEyebrow}>EARLY ACCESS MARKETPLACE</Text>
          <Text variant="titleLarge" style={styles.proofTitle}>Real activity only. No invented launch numbers.</Text>
          <Text style={styles.proofText}>The featured tradesperson above is drawn from current eligible BuildPair profiles. Ratings, verified reviews and completed-job counts are shown only when that activity exists in BuildPair.</Text>
        </View>
        <Link href="/(public)/directory" asChild><Button mode="outlined">Browse live profiles</Button></Link>
      </View>
    </View>

    <View style={styles.audienceBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Two ways in" title="One platform. Two clear routes." body="Homeowners need control over the job. Tradespeople need serious work and tools that help them run it. Both sides stay inside the same project record." />
        <View style={styles.audienceGrid}>
          <View style={[styles.audienceCard, styles.homeownerCard]}>
            <Text style={styles.audienceEyebrow}>I NEED WORK DONE</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Find, compare and manage the job.</Text>
            <Text style={styles.cardText}>Describe the work, find suitable trades, compare structured quotes and keep messages, changes and payments connected from start to finish.</Text>
            <View style={styles.audienceActions}><Button mode="contained" onPress={() => goSearch('')}>Find a trade</Button><Link href="/auth/account" asChild><Button mode="text">Post a job</Button></Link></View>
          </View>
          <View style={[styles.audienceCard, styles.tradeAudienceCard]}>
            <Text style={[styles.audienceEyebrow, styles.tradeAudienceEyebrow]}>I’M A TRADESPERSON</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Start free. Pay when you need marketplace reach and deeper tools.</Text>
            <Text style={styles.cardText}>Starter gives you the profile. Plus makes you searchable and lets homeowners request quotes directly. Pro adds more marketplace capacity, analytics and priority alerts.</Text>
            <View style={styles.planPreview}>
              <View style={styles.planPreviewRow}><Text style={styles.planPreviewName}>Starter · £0</Text><Text style={styles.planPreviewText}>Shareable profile · 2 main categories</Text></View>
              <View style={styles.planPreviewRow}><Text style={styles.planPreviewName}>Plus · £19.99</Text><Text style={styles.planPreviewText}>Searchable · direct requests · 15 marketplace offers</Text></View>
              <View style={styles.planPreviewRow}><Text style={styles.planPreviewName}>Pro · £29.99</Text><Text style={styles.planPreviewText}>35 offers · analytics · priority alerts · modest search boost</Text></View>
            </View>
            <View style={styles.audienceActions}><Link href="/(public)/for-tradespeople" asChild><Button mode="outlined">See BuildPair for trades</Button></Link><Link href="/(public)/pricing" asChild><Button mode="text">Compare plans</Button></Link></View>
          </View>
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="How the job moves" title="From vague problem to a connected project." body="BuildPair supports remote quotes and site visits. The point is not to force every job into one neat form. It is to keep the decisions that follow connected." />
      <View style={styles.routeGrid}>
        {[
          ['01', 'Describe and find', 'Post the job or find a suitable trade. Add photos when useful, not because the internet demands photographic evidence of every cracked tile.'],
          ['02', 'Visit or quote', 'The tradesperson can ask questions, quote from the information available or arrange a site visit before pricing.'],
          ['03', 'Agree and run the job', 'Scope, exclusions, timing, payment stages, messages, variations, approvals and completion stay attached to the same project.'],
        ].map(([number, title, copy]) => <View key={number} style={styles.routeCard}><Text style={styles.routeNumber}>{number}</Text><Text variant="titleLarge" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
      </View>
    </View>

    <View style={styles.featureBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Useful after the match" title="The workflow is the product." body="Finding someone is only the first ten minutes. BuildPair is designed for the much messier bit that follows." />
        <View style={styles.featureGrid}>
          {[
            ['Structured quotes', 'Compare labour, materials, VAT, scope, exclusions, timing, warranty and proposed payment stages instead of deciphering scattered messages.'],
            ['Job-linked messages', 'Keep the conversation and next actions attached to the project rather than losing the agreement inside a WhatsApp archaeology dig.'],
            ['Variations and timeline', 'Record scope or price changes before extra work starts and keep the important project events easier to reconstruct later.'],
            ['Purpose-built AI', 'Use AI to clarify job briefs, assist trade matching, help draft quotes and improve messages without pretending it replaces qualified judgement.'],
          ].map(([title, copy]) => <View key={title} style={styles.featureCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
        </View>
      </View>
    </View>

    <View style={styles.paymentBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Payments" title="Two clear routes after hiring." body="Use BuildPair payments for recorded stages and release decisions, or arrange payment privately. The project record remains useful either way, but the protections and controls are not the same." />
        <View style={styles.paymentGrid}>
          <View style={[styles.paymentCard, styles.protectedCard]}>
            <Chip icon="credit-card-check-outline" style={styles.cardChip}>BuildPair payments</Chip>
            <Text variant="titleLarge" style={styles.cardTitle}>Stages follow the accepted quote.</Text>
            <Text style={styles.cardText}>Upfront materials payments and deposits transfer when paid. Progress and final stages transfer only after the tradesperson requests release and the homeowner approves it.</Text>
          </View>
          <View style={[styles.paymentCard, styles.privateCard]}>
            <Chip icon="account-arrow-right-outline" style={styles.cardChip}>Private payment arrangement</Chip>
            <Text variant="titleLarge" style={styles.cardTitle}>Pay directly if both sides prefer.</Text>
            <Text style={styles.cardText}>BuildPair can keep the quote, messages and project record, but it cannot process, pause, refund or recover money paid outside BuildPair.</Text>
          </View>
        </View>
        <Link href="/(public)/payments" asChild><Button mode="outlined">See exactly how payments work</Button></Link>
      </View>
    </View>

    <View style={styles.trustBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Trust is a workflow" title="Show what was checked, what happened and what BuildPair can actually stand behind." body="No vague shield icon pretending risk has vanished. BuildPair organises evidence and marketplace records while keeping the limits explicit." />
        <View style={styles.trustGrid}>
          {[
            ['Credential review status', 'Submitted credentials can carry a visible review status. A reviewed item means the evidence passed BuildPair’s review workflow, not that BuildPair became the issuing regulator.'],
            ['Project-linked reviews', 'Verified review context is tied to completed BuildPair activity where applicable, making the source of the reputation signal clearer than an isolated star score.'],
            ['Human moderation trail', 'Reports can be reviewed by authorised moderators who can record evidence, reasons and proportionate actions rather than treating every report as an automatic verdict.'],
            ['Home location privacy', 'Public jobs use outward location information while more precise matching data remains server-side rather than being exposed on the marketplace.'],
          ].map(([title, copy]) => <View key={title} style={styles.trustCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
        </View>
        <View style={styles.trustLimit}><Text style={styles.trustLimitTitle}>What BuildPair does not claim</Text><Text style={styles.trustLimitText}>BuildPair does not guarantee workmanship, replace statutory registrations, certify every trade claim or remove the need for users to make checks appropriate to regulated or specialist work.</Text></View>
        <Link href="/(public)/trust-safety" asChild><Button mode="outlined">See the full trust & safety process</Button></Link>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Find a starting point" title="Search by the work, not the vocabulary." body="Pick a trade if you know it. If you do not, describe the problem and let BuildPair narrow the starting point." />
      <View style={styles.tradeGrid}>
        {POPULAR_TRADES.map((trade) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button"><Text style={styles.tradeName}>{trade}</Text><Text style={styles.tradeArrow}>→</Text></Pressable>)}
      </View>
      <Link href="/(public)/directory" asChild><Button mode="text">Browse all {TRADE_CATEGORIES.length} trade categories →</Button></Link>
    </View>

    <View style={styles.pricingBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Tradesperson membership" title="Choose the plan for the amount of marketplace reach you actually need." body="Starter establishes the profile. Plus unlocks searchable marketplace participation and direct opportunities. Pro adds higher capacity, analytics and priority tools." />
        <PricingCards compact />
        <Link href="/(public)/pricing" asChild><Button mode="text">See full membership details →</Button></Link>
      </View>
    </View>

    <View style={styles.faqBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Questions" title="The useful bits before you create an account." />
        <View style={styles.faqList}>
          {FAQS.map(([question, answer], index) => {
            const open = openFaq === index;
            return <Pressable key={question} style={styles.faqCard} onPress={() => setOpenFaq(open ? null : index)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
              <View style={styles.faqRow}><Text variant="titleMedium" style={styles.cardTitle}>{question}</Text><Text style={styles.faqToggle}>{open ? '−' : '+'}</Text></View>
              {open ? <Text style={styles.cardText}>{answer}</Text> : null}
            </Pressable>;
          })}
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <View style={styles.finalCta}>
        <View style={styles.finalCopy}><Text style={styles.finalEyebrow}>BUILDPAIR UK</Text><Text variant="headlineSmall" style={styles.finalTitle}>Start with the job. Keep going until it is finished.</Text><Text style={styles.finalText}>Search, visit, quote, agree, pay, change, complete and review in one connected project.</Text></View>
        <View style={styles.finalButtons}><Button mode="contained" buttonColor="#FFFFFF" textColor={colors.navy} onPress={() => goSearch('')}>Find a trade</Button><Link href="/auth/account" asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.finalOutline}>Join BuildPair</Button></Link></View>
      </View>
    </View>

    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1, width: '100%', maxWidth: '100%' },
  hero: { width: '100%', maxWidth: 1240, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 32, gap: 24 },
  heroWide: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 42, gap: 30 },
  heroCopy: { width: '100%', maxWidth: '100%', minWidth: 0, flexShrink: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  heroCopyWide: { flex: 1, flexShrink: 1 },
  heroBadge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primarySoft, borderRadius: 999, borderWidth: 1, borderColor: '#F2D7C3' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  heroBadgeText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  heroTitle: { color: colors.charcoal, fontSize: 50, lineHeight: 55, fontWeight: '900', letterSpacing: -1.8, textAlign: 'center' },
  heroTitleCompact: { fontSize: 36, lineHeight: 41 },
  heroSubtitle: { color: colors.charcoalSoft, lineHeight: 27, maxWidth: 660, textAlign: 'center' },
  heroBenefits: { width: '100%', maxWidth: 700, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  heroBenefit: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 999 },
  heroBenefitMark: { color: colors.accent, fontWeight: '900' },
  heroBenefitText: { flexShrink: 1, color: colors.charcoalSoft, fontSize: 12, fontWeight: '800' },
  heroSearch: { gap: 9, width: '100%', maxWidth: 700 },
  inputOutline: { borderRadius: 16 },
  searchButton: { minHeight: 50 },
  heroActions: { width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' },
  heroActionButton: { borderRadius: 999, maxWidth: '100%' },
  credibilityBand: { backgroundColor: colors.navy },
  credibilityInner: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  credibilityItem: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 140, maxWidth: '100%', alignItems: 'center', gap: 2 },
  credibilityValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  credibilityLabel: { color: '#DCE7EE', fontSize: 11, textAlign: 'center' },
  proofBand: { backgroundColor: '#FFF8F1', borderBottomWidth: 1, borderBottomColor: '#F0DFD0' },
  proofInner: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' },
  proofCopy: { flex: 1, minWidth: 260, maxWidth: 800, gap: 4 },
  proofEyebrow: { color: colors.primary, fontWeight: '900', fontSize: 10, letterSpacing: 1.1 },
  proofTitle: { color: colors.charcoal, fontWeight: '900' },
  proofText: { color: colors.muted, lineHeight: 21 },
  section: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 34, gap: 20 },
  sectionHeading: { width: '100%', maxWidth: 820, minWidth: 0, alignSelf: 'center', alignItems: 'center', gap: 7 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  sectionBody: { color: colors.muted, lineHeight: 23, textAlign: 'center' },
  audienceBand: { backgroundColor: '#FBF8F5' },
  audienceGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  audienceCard: { flexGrow: 1, flexShrink: 1, flexBasis: 430, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.border },
  homeownerCard: { borderTopWidth: 4, borderTopColor: colors.primary },
  tradeAudienceCard: { borderTopWidth: 4, borderTopColor: colors.navy },
  audienceEyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  tradeAudienceEyebrow: { color: colors.navy },
  audienceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  planPreview: { gap: 6, marginTop: 2 },
  planPreviewRow: { backgroundColor: colors.surfaceSoft, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, gap: 2 },
  planPreviewName: { color: colors.charcoal, fontSize: 12, fontWeight: '900' },
  planPreviewText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  routeCard: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3, borderTopColor: colors.primary, borderRadius: 18, padding: 17, gap: 7 },
  routeNumber: { color: colors.primary, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { minWidth: 0, maxWidth: '100%', color: colors.charcoal, fontWeight: '900' },
  cardText: { minWidth: 0, maxWidth: '100%', color: colors.muted, lineHeight: 22 },
  featureBand: { backgroundColor: colors.surfaceSoft },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { flexGrow: 1, flexShrink: 1, flexBasis: 250, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: 18, padding: 17, gap: 7, borderWidth: 1, borderColor: colors.border },
  paymentBand: { backgroundColor: '#FFF4EA' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  paymentCard: { flexGrow: 1, flexShrink: 1, flexBasis: 400, minWidth: 0, borderRadius: 20, padding: 20, gap: 10, borderWidth: 1 },
  protectedCard: { backgroundColor: '#F6FBFA', borderColor: '#CDE2DE' },
  privateCard: { backgroundColor: '#FFFFFF', borderColor: '#E8D7C7' },
  cardChip: { alignSelf: 'flex-start', maxWidth: '100%' },
  trustBand: { backgroundColor: '#F6FBFA' },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  trustCard: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, gap: 7, borderWidth: 1, borderColor: '#CDE2DE' },
  trustLimit: { maxWidth: 900, alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 14, gap: 4, borderWidth: 1, borderColor: '#CDE2DE' },
  trustLimitTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  trustLimitText: { color: colors.muted, lineHeight: 20, textAlign: 'center' },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tradeCard: { flexGrow: 1, flexShrink: 1, flexBasis: 230, minWidth: 0, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeName: { flexShrink: 1, minWidth: 0, color: colors.charcoal, fontWeight: '800' },
  tradeArrow: { flexShrink: 0, color: colors.primary, fontWeight: '900' },
  pricingBand: { backgroundColor: '#FBF8F5' },
  faqBand: { backgroundColor: colors.surfaceSoft },
  faqList: { gap: 9, maxWidth: 900, width: '100%', minWidth: 0, alignSelf: 'center' },
  faqCard: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, gap: 8 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqToggle: { flexShrink: 0, color: colors.primary, fontSize: 24, fontWeight: '900' },
  finalCta: { width: '100%', backgroundColor: colors.navy, borderRadius: 26, padding: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 18 },
  finalCopy: { flex: 1, minWidth: 240, maxWidth: '100%', gap: 6 },
  finalEyebrow: { color: '#FFD7BA', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  finalTitle: { color: '#FFFFFF', fontWeight: '900' },
  finalText: { color: '#DCE7EE', lineHeight: 22 },
  finalButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  finalOutline: { borderColor: '#FFFFFF', maxWidth: '100%' },
});
