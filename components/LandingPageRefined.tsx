import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { FeaturedTraderHero } from '@/components/FeaturedTraderHero';
import { PrelaunchBanner } from '@/components/PrelaunchBanner';
import { PricingCards } from '@/components/PricingCards';
import { PublicFooter } from '@/components/PublicFooter';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors, controlHeights, radii } from '@/constants/theme';
import { waitlistHref } from '@/lib/launch';

const POPULAR_TRADES = ['Tiling', 'Plumbing', 'Electrical', 'Building & Extensions', 'Roofing & Roofline', 'Painting & Decorating', 'Kitchens', 'Bathrooms'] as const;
const HERO_BENEFITS = ['Local trades matched to your area', 'Compare structured quotes clearly', 'Keep decisions and changes recorded', 'Manage the project in one place'] as const;

const FAQS = [
  ['What if a tradesperson needs to visit before quoting?', 'They can arrange a site visit through the BuildPair job. Once the confirmed visit has happened, it is marked complete and the formal structured quote can be sent through the same project record.'],
  ['How do BuildPay payments work?', 'For a staged job that starts with materials, the opening card payment can fund the quoted materials and the first protected work stage together. After the tradesperson acknowledges the payment, only the materials allocation is released. Protected work stages transfer later only after their recorded completion point is reached and release is approved.'],
  ['How does BuildPair keep jobs local?', 'Tradespeople set a genuine service base and working radius. Open marketplace jobs are matched inside that area, so homeowners are not inviting quotes from businesses claiming to be local from hundreds of miles away.'],
  ['Can we arrange payment privately?', 'Yes. Either side can propose paying outside BuildPair and the other person must explicitly agree before the job switches to direct payment. The quote, messages and project record can stay in BuildPair, but BuildPair cannot process, hold, protect, refund or recover money paid outside its payment flow.'],
  ['What memberships are available to tradespeople?', 'Starter is £0/month, Core is £9.99/month, Plus is £19.99/month and Pro is £29.99/month. Each step adds materially more marketplace access and business tools.'],
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
  const mobile = width < 720;
  const wide = width >= 920;
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };
  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <PrelaunchBanner />

    <View style={[styles.hero, wide && styles.heroWide]}>
      <View style={[styles.heroCopy, wide && styles.heroCopyWide]} testID="home-hero-copy">
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>Built for UK homeowners and tradespeople</Text></View>
        <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Find the right trade. Compare quotes clearly. Keep the whole job in one place.</Text>
        <Text variant="titleMedium" style={styles.heroSubtitle}>BuildPair connects homeowners with local tradespeople and keeps the project organised from first search to final review. Compare structured quotes, message, agree changes and manage the job in one place.</Text>
        <View style={styles.heroBenefits}>
          {HERO_BENEFITS.map((item) => <View key={item} style={styles.heroBenefit}><Text style={styles.heroBenefitMark}>✓</Text><Text style={styles.heroBenefitText}>{item}</Text></View>)}
        </View>
        <View style={styles.heroSearch}>
          <TextInput mode="outlined" value={search} onChangeText={setSearch} onSubmitEditing={() => goSearch(search)} placeholder="Describe the job, e.g. bathroom tiling" outlineStyle={styles.inputOutline} />
          <Button mode="contained" style={[styles.buttonBase, styles.buttonFull]} contentStyle={[styles.buttonContent, mobile && styles.mobilePrimaryContent]} onPress={() => goSearch(search)}>Find a trade</Button>
        </View>
        {mobile ? <View style={styles.mobileHeroSecondary} testID="home-hero-actions">
          <Button mode="text" compact textColor={colors.primaryDark} style={styles.mobileHeroLink} contentStyle={styles.mobileHeroLinkContent} onPress={() => router.push(waitlistHref('customer', 'homepage-hero'))}>Join homeowner launch list</Button>
        </View> : <View style={styles.heroActions} testID="home-hero-actions">
          <Link href={waitlistHref('customer', 'homepage-hero')} asChild><Button mode="outlined" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent}>Join homeowner launch list</Button></Link>
          <Link href={waitlistHref('trader', 'homepage-hero-trader')} asChild><Button mode="contained" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent}>Create trade profile</Button></Link>
          <Link href="/(public)/how-it-works" asChild><Button mode="outlined" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent}>How it works</Button></Link>
        </View>}
      </View>
    </View>

    <View style={styles.featuredBand}>
      <View style={styles.featuredSection}>
        <SectionHeading eyebrow="Featured tradespeople" title="Meet tradespeople already on BuildPair." body="Explore real BuildPair profiles. Swipe or scroll through featured tradespeople and open any profile for more detail." />
        <FeaturedTraderHero wide={wide} />
      </View>
    </View>

    <View style={styles.tradeBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Find a trade" title="Search by the job, not the jargon." body="Choose a trade when you know what you need, or describe the work and let BuildPair guide you to the right starting point." />
        <View style={styles.tradeGrid}>
          {POPULAR_TRADES.map((trade) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button"><Text style={styles.tradeName}>{trade}</Text><Text style={styles.tradeArrow}>→</Text></Pressable>)}
        </View>
        <Link href="/(public)/directory" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>Browse all {TRADE_CATEGORIES.length} trade categories →</Button></Link>
      </View>
    </View>

    <View style={styles.audienceBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Built for both sides" title="One project. Clear tools for both sides." body="Homeowners get a simpler way to find, compare and manage work. Tradespeople get a professional way to win suitable jobs and keep projects organised." />
        <View style={styles.audienceGrid}>
          <View style={[styles.audienceCard, styles.homeownerCard]}>
            <Text style={styles.audienceEyebrow}>FOR HOMEOWNERS</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Find the right tradesperson and stay in control of the job.</Text>
            <Text style={styles.cardText}>Describe the work, compare suitable tradespeople and structured quotes, then keep messages, agreed changes and payment stages attached to the same project.</Text>
            {mobile ? <View style={styles.audienceActions}><View style={styles.mobileActionRow}><Button mode="contained" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push(waitlistHref('customer', 'homepage-audience'))}>Join launch list</Button></View></View> : <View style={styles.audienceActions}><Button mode="contained" style={styles.buttonBase} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Link href={waitlistHref('customer', 'homepage-audience')} asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Join homeowner launch list</Button></Link></View>}
          </View>
          <View style={[styles.audienceCard, styles.tradeAudienceCard]}>
            <Text style={[styles.audienceEyebrow, styles.tradeAudienceEyebrow]}>FOR TRADESPEOPLE</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Present your business professionally, quote clearly and manage work in one place.</Text>
            <Text style={styles.cardText}>Build your profile, find relevant local opportunities, arrange site visits where needed, send structured quotes and keep the project organised after the work is won.</Text>
            {mobile ? <View style={styles.audienceActions}><Button mode="contained" style={[styles.buttonBase, styles.mobileWideAction]} contentStyle={styles.buttonContent} onPress={() => router.push(waitlistHref('trader', 'homepage-trade-card'))}>Create trade profile</Button><View style={styles.mobileActionRow}><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/for-tradespeople')}>Trade features</Button><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/pricing')}>Membership</Button></View></View> : <View style={styles.audienceActions}><Link href={waitlistHref('trader', 'homepage-trade-card')} asChild><Button mode="contained" style={styles.buttonBase} contentStyle={styles.buttonContent}>Create my trade profile</Button></Link><Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>See trade features</Button></Link><Link href="/(public)/pricing" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>View membership</Button></Link></View>}
          </View>
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="How it works" title="From first search to finished job." body="Some jobs can be quoted remotely and others need a site visit. BuildPair supports both while keeping the important decisions connected to the project." />
      <View style={styles.routeGrid}>
        {[
          ['01', 'Describe the job', 'Search directly or explain the problem in ordinary language. Add useful details and photos where they help.'],
          ['02', 'Find and compare', 'Browse suitable local tradespeople, request quotes directly or post the job to the marketplace. Compare structured quotes and pause new responses when you have enough.'],
          ['03', 'Visit, quote and agree', 'The tradesperson can quote from the information supplied or arrange a site visit first. Scope, exclusions, timing and payment stages are then recorded in the structured quote.'],
          ['04', 'Run the project', 'After a quote is accepted, use BuildPay or mutually agree direct payment. Messages, changes, payment records, timeline events and completion stay attached to the same job.'],
        ].map(([number, title, copy]) => <View key={number} style={styles.routeCard}><Text style={styles.routeNumber}>{number}</Text><Text variant="titleLarge" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
      </View>
      <Link href="/(public)/how-it-works" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>See the full process →</Button></Link>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Built around the project" title="Built to support the job from first enquiry to completion." body="BuildPair keeps the important parts of a project connected instead of stopping once a homeowner and tradesperson find each other." />
      <View style={styles.featureGrid}>
        {[
          ['AI-assisted planning', 'Turn a plain-English problem into a clearer starting brief and more relevant trade suggestions.'],
          ['Structured quotes', 'Compare labour, materials, VAT, scope, exclusions, timing, warranty and proposed payment stages clearly.'],
          ['Job-linked messages', 'Keep the conversation and next actions attached to the project rather than scattered across separate channels.'],
          ['Variations and timeline', 'Record agreed scope or price changes and keep important project events easier to follow later.'],
        ].map(([title, copy]) => <View key={title} style={styles.featureCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
      </View>
    </View>

    <View style={styles.paymentBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Payments" title="Choose the payment route that suits the job." body="Use BuildPay for supported protected stages, or mutually agree to arrange payment privately. The project can stay organised either way, but BuildPair can only manage payments made through BuildPay." />
        <View style={styles.paymentGrid}>
          <View style={[styles.paymentCard, styles.protectedCard]}>
            <Chip icon="credit-card-check-outline" style={styles.cardChip}>BuildPay</Chip>
            <Text variant="titleLarge" style={styles.cardTitle}>Protected stages follow the agreed quote.</Text>
            <Text style={styles.cardText}>When a staged schedule begins with materials, the opening payment can fund the materials and first protected work stage together. Only the materials allocation releases after the tradesperson acknowledges it; protected work stages release later after their agreed completion point and approval.</Text>
          </View>
          <View style={[styles.paymentCard, styles.privateCard]}>
            <Chip icon="account-arrow-right-outline" style={styles.cardChip}>Private payment arrangement</Chip>
            <Text variant="titleLarge" style={styles.cardTitle}>Pay directly if both sides agree.</Text>
            <Text style={styles.cardText}>Either side can propose payment outside BuildPair and the other must confirm. The project record can remain in BuildPair, but BuildPair cannot process, hold, protect, pause, refund or recover money paid privately.</Text>
          </View>
        </View>
        <Link href="/(public)/payments" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>How BuildPay works</Button></Link>
      </View>
    </View>

    <View style={styles.trustBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Trust & safety" title="Clearer records, evidence and reporting." body="BuildPair organises useful trust signals and project history while keeping the limits clear. Homeowners should still carry out checks appropriate to the work being commissioned." />
        <View style={styles.trustGrid}>
          {[
            ['Local by design', 'Marketplace jobs are matched to a tradesperson’s genuine service base and working radius, helping homeowners hear from people who actually work in their area.'],
            ['Credential status', 'Submitted credentials can show a clear BuildPair review status without replacing the issuing register or authority.'],
            ['Project-linked reviews', 'Reviews can be connected to completed BuildPair activity where applicable, giving useful context behind the rating.'],
            ['Two-way reporting', 'Homeowners and tradespeople can report concerns for human review and proportionate moderation.'],
            ['Location privacy', 'Public jobs use outward location information while more precise matching data stays server-side.'],
          ].map(([title, copy]) => <View key={title} style={styles.trustCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
        </View>
        <Link href="/(public)/trust-safety" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Read about trust & safety</Button></Link>
      </View>
    </View>

    <View style={styles.pricingBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Tradesperson membership" title="Start free. Upgrade when your business needs more." body="Starter builds your presence, Core adds low-cost marketplace access, Plus is designed for active trades and Pro adds the strongest capacity, analytics and project tools." />
        <PricingCards compact />
        <Link href="/(public)/pricing" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>Compare membership plans →</Button></Link>
      </View>
    </View>

    <View style={styles.faqBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Questions" title="Key questions before you get started." />
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

    <View style={styles.updatesBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="BuildPair updates" title="What’s live now, and what’s being built next." body="BuildPair is being developed around the whole job, including work tradespeople find outside the marketplace. The roadmap stays visible so it is clear what is available now and what is still being built." />
        <View style={styles.updateColumns}>
          <View style={styles.updatePanel}>
            <Chip icon="check-circle-outline">Recently added</Chip>
            {[
              'Main categories with deliberate subcategory/service selection',
              'Quote customers from outside the BuildPair marketplace',
              'Quote revisions and accepted outside jobs becoming managed projects',
              'Project workspace for progress, materials, expenses, snagging, evidence and handover',
              'Customer book plus a working calendar for Plus and Pro',
              'Tiered public availability up to six months on Pro',
              'Project+ AI planning and room-concept tools',
            ].map((item) => <Text key={item} style={styles.updateItem}>✓ {item}</Text>)}
          </View>
          <View style={[styles.updatePanel, styles.comingPanel]}>
            <Chip icon="clock-outline">Coming soon</Chip>
            {[
              'Smarter quote and invoice reminders',
              'Google/Outlook calendar sync and richer document packs',
              'Quote alternatives, warranty/service follow-up and aftercare reminders',
              'Optional opportunity, team, AI/design and SMS add-ons',
              'Clearly labelled promoted visibility without pay-to-win trust',
            ].map((item) => <Text key={item} style={styles.updateItem}>• {item}</Text>)}
          </View>
        </View>
        <Link href="/(public)/updates" asChild><Button mode="outlined" icon="update" style={styles.buttonBase} contentStyle={styles.buttonContent}>See product updates</Button></Link>
      </View>
    </View>

    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1, width: '100%', maxWidth: '100%' },
  hero: { width: '100%', maxWidth: 1240, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 38, gap: 24 },
  heroWide: { paddingVertical: 50 },
  heroCopy: { width: '100%', maxWidth: '100%', minWidth: 0, flexShrink: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  heroCopyWide: { width: '100%', maxWidth: 900, alignSelf: 'center' },
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
  heroSearch: { gap: 10, width: '100%', maxWidth: 700 },
  inputOutline: { borderRadius: 16 },
  buttonBase: { borderRadius: radii.md, maxWidth: '100%' },
  buttonContent: { minHeight: controlHeights.standard, paddingHorizontal: 8 },
  buttonFull: { width: '100%' },
  mobilePrimaryContent: { minHeight: 44 },
  mobileHeroSecondary: { width: '100%', alignItems: 'center', marginTop: -2 },
  mobileHeroLink: { alignSelf: 'center', borderRadius: radii.md },
  mobileHeroLinkContent: { minHeight: 36, paddingHorizontal: 6 },
  mobileWideAction: { width: '100%' },
  mobileActionRow: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  mobileHalfAction: { flex: 1, minWidth: 0 },
  heroActions: { width: '100%', maxWidth: 700, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' },
  heroActionButton: { minWidth: 180, maxWidth: '100%' },
  featuredBand: { backgroundColor: '#FFFFFF' },
  featuredSection: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 28, paddingBottom: 46, gap: 20 },
  section: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 46, gap: 24 },
  sectionHeading: { width: '100%', maxWidth: 820, minWidth: 0, alignSelf: 'center', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  sectionBody: { color: colors.muted, lineHeight: 23, textAlign: 'center', maxWidth: 720 },
  audienceBand: { backgroundColor: '#FBF8F5' },
  audienceGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  audienceCard: { flexGrow: 1, flexShrink: 1, flexBasis: 430, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.border },
  homeownerCard: { borderTopWidth: 4, borderTopColor: colors.primary },
  tradeAudienceCard: { borderTopWidth: 4, borderTopColor: colors.navy },
  audienceEyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  tradeAudienceEyebrow: { color: colors.navy },
  audienceActions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 6 },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  routeCard: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3, borderTopColor: colors.primary, borderRadius: 18, padding: 17, gap: 7 },
  routeNumber: { color: colors.primary, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { minWidth: 0, maxWidth: '100%', color: colors.charcoal, fontWeight: '900' },
  cardText: { minWidth: 0, maxWidth: '100%', color: colors.muted, lineHeight: 22 },
  tradeBand: { backgroundColor: colors.surfaceSoft },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tradeCard: { flexGrow: 1, flexShrink: 1, flexBasis: 230, minWidth: 0, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeName: { flexShrink: 1, minWidth: 0, color: colors.charcoal, fontWeight: '800' },
  tradeArrow: { flexShrink: 0, color: colors.primary, fontWeight: '900' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  featureCard: { flexGrow: 1, flexShrink: 1, flexBasis: 250, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: 18, padding: 17, gap: 7, borderWidth: 1, borderColor: colors.border },
  paymentBand: { backgroundColor: '#FFF4EA' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  paymentCard: { flexGrow: 1, flexShrink: 1, flexBasis: 400, minWidth: 0, borderRadius: 20, padding: 20, gap: 10, borderWidth: 1 },
  protectedCard: { backgroundColor: '#F6FBFA', borderColor: '#CDE2DE' },
  privateCard: { backgroundColor: '#FFFFFF', borderColor: '#E8D7C7' },
  cardChip: { alignSelf: 'flex-start', maxWidth: '100%' },
  trustBand: { backgroundColor: '#F6FBFA' },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  trustCard: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, gap: 7, borderWidth: 1, borderColor: '#CDE2DE' },
  pricingBand: { backgroundColor: '#FBF8F5' },
  updatesBand: { backgroundColor: '#F6FBFA' },
  updateColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  updatePanel: { flexGrow: 1, flexShrink: 1, flexBasis: 420, minWidth: 0, padding: 18, gap: 9, borderRadius: 18, borderWidth: 1, borderColor: '#CDE2DE', backgroundColor: colors.surfaceRaised },
  comingPanel: { backgroundColor: '#FFF9F3', borderColor: '#E8D7C7' },
  updateItem: { color: colors.charcoalSoft, lineHeight: 22 },
  faqBand: { backgroundColor: colors.surfaceSoft },
  faqList: { gap: 9, maxWidth: 900, width: '100%', minWidth: 0, alignSelf: 'center' },
  faqCard: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, gap: 8 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqToggle: { flexShrink: 0, color: colors.primary, fontSize: 24, fontWeight: '900' },
});
