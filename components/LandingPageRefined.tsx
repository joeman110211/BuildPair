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
import { colors, controlHeights, publicResponsiveMetrics, radii } from '@/constants/theme';
import { waitlistHref } from '@/lib/launch';

const POPULAR_TRADES = ['Tiling', 'Plumbing', 'Electrical', 'Building & Extensions', 'Roofing & Roofline', 'Painting & Decorating', 'Kitchens', 'Bathrooms'] as const;
const HERO_BENEFITS = ['No pay-per-lead', 'Clear structured quotes', 'Local matching', 'Manage the whole job'] as const;

const FAQS = [
  ['What if a tradesperson needs to visit before quoting?', 'They can arrange a site visit through the BuildPair job. Once the confirmed visit has happened, it is marked complete and the formal structured quote can be sent through the same project record.'],
  ['How do BuildPay payments work?', 'BuildPay follows the agreed staged schedule. Materials can release after the opening payment is acknowledged, while protected work stages release later through the recorded approval flow.'],
  ['How does BuildPair keep jobs local?', 'Tradespeople set a genuine service base and working radius. Open marketplace jobs are matched inside that area, so homeowners are not inviting quotes from businesses claiming to be local from hundreds of miles away.'],
  ['Can we arrange payment privately?', 'Yes. Either side can propose paying outside BuildPair and the other person must explicitly agree before the job switches to direct payment. The quote, messages and project record can stay in BuildPair, but BuildPair cannot process, hold, protect, refund or recover money paid outside its payment flow.'],
  ['What plans are available to tradespeople?', 'Starter is £0/month, Core is £9.99/month, Plus is £19.99/month and Pro is £29.99/month. Each plan adds more marketplace access and business tools.'],
] as const;

function SectionHeading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  return <View style={styles.sectionHeading}>
    {eyebrow ? <Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>{eyebrow}</Text> : null}
    <Text variant="headlineMedium" style={[styles.sectionTitle, { fontSize: metrics.sectionTitleFontSize, lineHeight: metrics.sectionTitleLineHeight }]}>{title}</Text>
    {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
  </View>;
}

export default function LandingPageRefined() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const mobile = width < 720;
  const narrowMobile = width < 380;
  const wide = width >= 920;
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showFeaturedProfiles, setShowFeaturedProfiles] = useState(true);

  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };
  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <PrelaunchBanner />

    <View style={[styles.hero, mobile && styles.heroMobile, narrowMobile && styles.heroNarrow, wide && styles.heroWide]}>
      <View style={[styles.heroCopy, wide && styles.heroCopyWide]} testID="home-hero-copy">
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>Fair for homeowners and tradespeople</Text></View>
        <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Find trusted local tradespeople. Compare quotes clearly. Manage the whole job in one place.</Text>
        <Text variant="titleMedium" style={styles.heroSubtitle}>BuildPair gives homeowners a clearer way to hire and gives tradespeople a fairer way to win and manage work. Search locally, compare structured quotes and keep the project connected from first enquiry to completion.</Text>
        <View style={styles.heroBenefits}>
          {HERO_BENEFITS.map((item) => <View key={item} style={styles.heroBenefit}><Text style={styles.heroBenefitMark}>✓</Text><Text style={styles.heroBenefitText}>{item}</Text></View>)}
        </View>
        <View style={styles.heroSearch}>
          <TextInput mode="outlined" value={search} onChangeText={setSearch} onSubmitEditing={() => goSearch(search)} placeholder="Describe the job, e.g. bathroom tiling" outlineStyle={styles.inputOutline} />
          <Button mode="contained" style={[styles.buttonBase, styles.buttonFull]} contentStyle={[styles.buttonContent, mobile && styles.mobilePrimaryContent]} onPress={() => goSearch(search)}>Find a trade</Button>
        </View>
        {mobile ? <View style={styles.mobileHeroSecondary} testID="home-hero-actions">
          <Button mode="text" compact textColor={colors.primaryDark} style={styles.mobileHeroLink} contentStyle={styles.mobileHeroLinkContent} onPress={() => router.push(waitlistHref('customer', 'homepage-hero'))}>Get notified</Button>
        </View> : <View style={styles.heroActions} testID="home-hero-actions">
          <Link href={waitlistHref('customer', 'homepage-hero')} asChild><Button mode="outlined" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent}>Get notified</Button></Link>
          <Link href={waitlistHref('trader', 'homepage-hero-trader')} asChild><Button mode="contained" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent}>Create profile</Button></Link>
          <Link href="/(public)/how-it-works" asChild><Button mode="outlined" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent}>How it works</Button></Link>
        </View>}
      </View>
    </View>

    {showFeaturedProfiles ? <View style={styles.featuredBand}>
      <View style={[styles.featuredSection, mobile && styles.featuredSectionMobile, narrowMobile && styles.featuredSectionNarrow]}>
        <SectionHeading eyebrow="Real profiles" title="Tradespeople joining BuildPair." body="Explore genuine profiles, portfolio work and reputation signals from tradespeople building their presence on BuildPair." />
        <FeaturedTraderHero wide={wide} onAvailabilityChange={setShowFeaturedProfiles} />
      </View>
    </View> : null}

    <View style={styles.tradeBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Find a trade" title="Search by the job, not the jargon." body="Choose a trade when you know what you need, or describe the work and let BuildPair guide you to the right starting point." />
        <View style={styles.tradeGrid}>
          {POPULAR_TRADES.map((trade) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button"><Text style={styles.tradeName}>{trade}</Text><Text style={styles.tradeArrow}>→</Text></Pressable>)}
        </View>
        <Link href="/(public)/directory" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>Browse all {TRADE_CATEGORIES.length} trade categories →</Button></Link>
      </View>
    </View>

    <View style={styles.audienceBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Fair for both sides" title="One project. Both sides connected." body="BuildPair is designed so one side does not have to lose for the other to get a better experience." />
        <View style={styles.audienceGrid}>
          <View style={[styles.audienceCard, styles.homeownerCard]}>
            <Text style={styles.audienceEyebrow}>FOR HOMEOWNERS</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Clear quotes. Better records. More control.</Text>
            <Text style={styles.cardText}>Find suitable local tradespeople, compare structured quotes and keep messages, agreed changes and project stages connected to the job.</Text>
            {mobile ? <View style={styles.audienceActions}><View style={styles.mobileActionRow}><Button mode="contained" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push(waitlistHref('customer', 'homepage-audience'))}>Get notified</Button></View></View> : <View style={styles.audienceActions}><Button mode="contained" style={styles.buttonBase} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Link href={waitlistHref('customer', 'homepage-audience')} asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Get notified</Button></Link></View>}
          </View>
          <View style={[styles.audienceCard, styles.tradeAudienceCard]}>
            <Text style={[styles.audienceEyebrow, styles.tradeAudienceEyebrow]}>FOR TRADESPEOPLE</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Fair access. No paid leads. Better tools.</Text>
            <Text style={styles.cardText}>Build a professional profile, find suitable work without buying individual leads, send clear quotes and keep won jobs organised in one place.</Text>
            {mobile ? <View style={styles.audienceActions}><Button mode="contained" style={[styles.buttonBase, styles.mobileWideAction]} contentStyle={styles.buttonContent} onPress={() => router.push(waitlistHref('trader', 'homepage-trade-card'))}>Create profile</Button><View style={styles.mobileActionRow}><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/for-tradespeople')}>Features</Button><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/pricing')}>Pricing</Button></View></View> : <View style={styles.audienceActions}><Link href={waitlistHref('trader', 'homepage-trade-card')} asChild><Button mode="contained" style={styles.buttonBase} contentStyle={styles.buttonContent}>Create profile</Button></Link><Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Features</Button></Link><Link href="/(public)/pricing" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Pricing</Button></Link></View>}
          </View>
        </View>
      </View>
    </View>

    <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
      <SectionHeading eyebrow="How it works" title="Find. Compare. Manage." body="Three clear stages, with site visits available when a job needs inspecting before it can be priced properly." />
      <View style={styles.routeGrid}>
        {[
          ['01', 'Find', 'Describe the job or search for the trade you need. Add useful details and photos where they help.'],
          ['02', 'Compare', 'Review suitable local profiles and structured quotes. Arrange a site visit first when the job needs inspecting.'],
          ['03', 'Manage', 'Accept the quote, choose BuildPay or direct payment, then keep messages, changes, stages and completion connected to the project.'],
        ].map(([number, title, copy]) => <View key={number} style={styles.routeCard}><Text style={styles.routeNumber}>{number}</Text><Text variant="titleLarge" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
      </View>
      <Link href="/(public)/how-it-works" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>See the full process →</Button></Link>
    </View>

    <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
      <SectionHeading eyebrow="Why BuildPair" title="More than another lead site." body="BuildPair is built around fair access to work and the project that follows, not just the introduction." />
      <View style={styles.featureGrid}>
        {[
          ['No pay per lead', 'Tradespeople do not buy individual leads that may go nowhere.'],
          ['No bidding wars', 'Structured quotes make scope and price easier to compare without turning every job into a race to the bottom.'],
          ['Local matching', 'Jobs and profiles are connected to genuine service areas and working radiuses.'],
          ['Clear quotes', 'Labour, materials, VAT, scope, exclusions, timing and stages can be shown clearly.'],
          ['Whole-job tools', 'Messages, changes, payments and project history stay connected after the work is won.'],
          ['Trade business tools', 'Quotes, invoices, customers, availability and project tools support work beyond the marketplace too.'],
        ].map(([title, copy]) => <View key={title} style={styles.featureCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
      </View>
    </View>

    <View style={styles.paymentBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Payments" title="Pay your way." body="Use BuildPay for protected staged payments, or agree to pay directly. The project can stay organised either way." />
        <View style={styles.paymentGrid}>
          <View style={[styles.paymentCard, styles.protectedCard]}>
            <Chip icon="credit-card-check-outline" style={styles.cardChip}>BuildPay</Chip>
            <Text variant="titleLarge" style={styles.cardTitle}>Protected staged payments.</Text>
            <Text style={styles.cardText}>Follow the agreed quote through materials, progress stages and completion. Stage money moves through the recorded BuildPay workflow.</Text>
          </View>
          <View style={[styles.paymentCard, styles.privateCard]}>
            <Chip icon="account-arrow-right-outline" style={styles.cardChip}>Direct payment</Chip>
            <Text variant="titleLarge" style={styles.cardTitle}>Pay directly if both sides agree.</Text>
            <Text style={styles.cardText}>Use bank transfer, cash or another agreed method while keeping the quote, messages and project record in BuildPair.</Text>
          </View>
        </View>
        <Link href="/(public)/payments" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>How BuildPay works</Button></Link>
      </View>
    </View>

    <View style={styles.trustBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Trust & safety" title="Evidence, not empty badges." body="Profiles can show useful evidence and project-linked reputation, while reporting and moderation work both ways." />
        <View style={styles.trustGrid}>
          {[
            ['Local by design', 'Match using genuine service areas without publishing precise home addresses.'],
            ['Credential status', 'Show the review status of submitted evidence without turning BuildPair into the issuing authority.'],
            ['Project-linked reviews', 'Connect reputation to real BuildPair activity where applicable and keep Google reviews clearly separate.'],
            ['Two-way reporting', 'Homeowners and tradespeople can both report concerns for human review.'],
          ].map(([title, copy]) => <View key={title} style={styles.trustCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
        </View>
        <Link href="/(public)/trust-safety" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Read about trust & safety</Button></Link>
      </View>
    </View>

    <View style={styles.pricingBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Pricing" title="Start free. Upgrade when it earns its place." body="Starter gets you established. Core helps you win work. Plus helps you run more jobs. Pro adds the strongest business and project tools." />
        <PricingCards compact />
        <Link href="/(public)/pricing" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>Compare pricing →</Button></Link>
      </View>
    </View>

    <View style={styles.faqBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
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


    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1, width: '100%', maxWidth: '100%' },
  hero: { width: '100%', maxWidth: 1240, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 38, gap: 24 },
  heroWide: { paddingVertical: 50 },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 30, gap: 18 },
  heroNarrow: { paddingHorizontal: 14, paddingVertical: 28 },
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
  featuredSectionMobile: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 34, gap: 16 },
  featuredSectionNarrow: { paddingHorizontal: 14 },
  section: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 46, gap: 24 },
  sectionMobile: { paddingHorizontal: 16, paddingVertical: 34, gap: 18 },
  sectionNarrow: { paddingHorizontal: 14, paddingVertical: 30 },
  sectionHeading: { width: '100%', maxWidth: 820, minWidth: 0, alignSelf: 'center', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.primary, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  sectionBody: { color: colors.muted, lineHeight: 23, textAlign: 'center', maxWidth: 720 },
  audienceBand: { backgroundColor: '#FBF8F5' },
  audienceGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  audienceCard: { flexGrow: 1, flexShrink: 1, flexBasis: 430, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.border },
  homeownerCard: { borderTopWidth: 4, borderTopColor: colors.primary },
  tradeAudienceCard: { borderTopWidth: 4, borderTopColor: colors.navy },
  audienceEyebrow: { color: colors.primary, fontSize: 12.3, lineHeight: 16, fontWeight: '900', letterSpacing: 1.1 },
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
