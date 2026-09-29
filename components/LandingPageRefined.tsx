import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { FeaturedTraderHero } from '@/components/FeaturedTraderHero';
import { PrelaunchBanner } from '@/components/PrelaunchBanner';
import { PricingCards } from '@/components/PricingCards';
import { Reveal } from '@/components/Reveal';
import { PublicFooter } from '@/components/PublicFooter';
import { TRADE_CATEGORIES } from '@/constants/options';
import { FAIR_FOR_BOTH, PAYMENT_LANGUAGE, WHY_BUILDPAIR } from '@/constants/site-language';
import { colors, controlHeights, publicResponsiveMetrics, radii } from '@/constants/theme';
import { waitlistHref } from '@/lib/launch';

const POPULAR_TRADES = ['Tiling', 'Plumbing', 'Electrical', 'Building & Extensions', 'Roofing & Roofline', 'Painting & Decorating', 'Kitchens', 'Bathrooms'] as const;
const HERO_BENEFITS = WHY_BUILDPAIR.slice(0, 4);

const FAQS = [
  ['What if a tradesperson needs to visit first?', 'They can arrange a site visit through the job, then send the structured quote through BuildPair afterwards.'],
  ['How does BuildPay work?', 'BuildPay follows agreed payment stages. The detailed funding, release, refund and fee rules are explained on the Payments page.'],
  ['How does BuildPair keep jobs local?', 'Tradespeople set a real service base and working radius so matching stays focused on areas they genuinely cover.'],
  ['Can we pay directly?', 'Yes. If both sides agree, payment can be arranged privately while the quote, messages and project record stay in BuildPair.'],
  ['What does BuildPair cost tradespeople?', 'Starter is free. Core, Plus and Pro add increasing marketplace access and business tools. See Pricing for the current plan details.'],
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
  const [hasFeaturedProfiles, setHasFeaturedProfiles] = useState(true);

  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };
  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <PrelaunchBanner />

    <View style={[styles.hero, mobile && styles.heroMobile, narrowMobile && styles.heroNarrow, wide && styles.heroWide]}>
      <View style={[styles.heroCopy, wide && styles.heroCopyWide]} testID="home-hero-copy">
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>{FAIR_FOR_BOTH.eyebrow}</Text></View>
        <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Find trusted local tradespeople. Compare quotes clearly. Manage the whole job in one place.</Text>
        <Text variant="titleMedium" style={styles.heroSubtitle}>A fairer way for homeowners and tradespeople to find each other, agree the job and keep the project moving in one place.</Text>
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

    <Reveal><View style={[styles.featuredBand, !hasFeaturedProfiles && styles.hidden]}>
      <View style={[styles.featuredSection, mobile && styles.featuredSectionMobile, narrowMobile && styles.featuredSectionNarrow]}>
        <SectionHeading eyebrow="Tradespeople joining BuildPair" title="Meet the people behind the profiles." body="Real BuildPair profiles appear here as tradespeople join. No invented ratings, fake counters or placeholder businesses." />
        <FeaturedTraderHero wide={wide} onAvailabilityChange={setHasFeaturedProfiles} />
      </View>
    </View></Reveal>

    <Reveal delay={50}><View style={styles.tradeBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Find a trade" title="Search by the job, not the jargon." body="Choose a trade when you know what you need, or describe the work and let BuildPair guide you to the right starting point." />
        <View style={styles.tradeGrid}>
          {POPULAR_TRADES.map((trade) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button"><Text style={styles.tradeName}>{trade}</Text><Text style={styles.tradeArrow}>→</Text></Pressable>)}
        </View>
        <Link href="/(public)/directory" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>Browse all {TRADE_CATEGORIES.length} trade categories →</Button></Link>
      </View>
    </View></Reveal>

    <Reveal delay={80}><View style={styles.audienceBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow={FAIR_FOR_BOTH.eyebrow} title="Better for the homeowner. Fairer for the trade." body="BuildPair is designed around the job itself, so one side does not have to lose for the other side to get value." />
        <View style={styles.audienceGrid}>
          <View style={[styles.audienceCard, styles.homeownerCard]}>
            <Text style={styles.audienceEyebrow}>FOR HOMEOWNERS</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>{FAIR_FOR_BOTH.homeownerTitle}</Text>
            <Text style={styles.cardText}>{FAIR_FOR_BOTH.homeownerBody}</Text>
            {mobile ? <View style={styles.audienceActions}><View style={styles.mobileActionRow}><Button mode="contained" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push(waitlistHref('customer', 'homepage-audience'))}>Join launch list</Button></View></View> : <View style={styles.audienceActions}><Button mode="contained" style={styles.buttonBase} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Link href={waitlistHref('customer', 'homepage-audience')} asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Join homeowner launch list</Button></Link></View>}
          </View>
          <View style={[styles.audienceCard, styles.tradeAudienceCard]}>
            <Text style={[styles.audienceEyebrow, styles.tradeAudienceEyebrow]}>FOR TRADESPEOPLE</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>{FAIR_FOR_BOTH.tradeTitle}</Text>
            <Text style={styles.cardText}>{FAIR_FOR_BOTH.tradeBody}</Text>
            {mobile ? <View style={styles.audienceActions}><Button mode="contained" style={[styles.buttonBase, styles.mobileWideAction]} contentStyle={styles.buttonContent} onPress={() => router.push(waitlistHref('trader', 'homepage-trade-card'))}>Create trade profile</Button><View style={styles.mobileActionRow}><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/for-tradespeople')}>Trade features</Button><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/pricing')}>Pricing</Button></View></View> : <View style={styles.audienceActions}><Link href={waitlistHref('trader', 'homepage-trade-card')} asChild><Button mode="contained" style={styles.buttonBase} contentStyle={styles.buttonContent}>Create my trade profile</Button></Link><Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>See trade features</Button></Link><Link href="/(public)/pricing" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>View pricing</Button></Link></View>}
          </View>
        </View>
        <View style={styles.fairBridge}><Text style={styles.fairBridgeEyebrow}>BUILDPAIR</Text><Text variant="titleLarge" style={styles.fairBridgeTitle}>{FAIR_FOR_BOTH.bridge}</Text><Text style={styles.fairBridgeText}>Clearer decisions for homeowners. Fairer access and better tools for tradespeople.</Text></View>
      </View>
    </View></Reveal>

    <Reveal delay={110}><View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
      <SectionHeading eyebrow="How it works" title="Three clear stages." body="Find the right fit, agree the work clearly, then keep the project together." />
      <View style={styles.routeGrid}>
        {[
          ['01', 'Find the right fit', 'Describe the job or search local profiles, then request quotes from suitable tradespeople.'],
          ['02', 'Compare and agree', 'Compare structured quotes, arrange a visit if needed and agree the scope, timing and payment route.'],
          ['03', 'Manage the project', 'Keep messages, changes, payment stages and project history connected through to completion.'],
        ].map(([number, title, copy]) => <View key={number} style={styles.routeCard}><Text style={styles.routeNumber}>{number}</Text><Text variant="titleLarge" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
      </View>
      <Link href="/(public)/how-it-works" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>See the full process →</Button></Link>
    </View></Reveal>

    <Reveal delay={140}><View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
      <SectionHeading eyebrow="Why BuildPair" title="More than another lead directory." body="The difference is not one flashy feature. It is a fairer model and a project that stays useful after the introduction." />
      <View style={styles.featureGrid}>
        {WHY_BUILDPAIR.slice(0, 6).map((title) => {
          const copy: Record<string, string> = {
            'No pay per lead': 'Tradespeople are not charged every time a homeowner enquiry appears.',
            'No bidding wars': 'Homeowners compare suitable quotes without turning the job into an endless race to the bottom.',
            'Clear quotes': 'Scope, labour, materials, timing and stages are easier to compare.',
            'Local matching': 'Service areas and working radius keep opportunities relevant.',
            'Manage the whole job': 'Messages, changes and project history stay connected after the quote.',
            'Staged payments': 'Use BuildPay when protected staged payments suit the job.',
          };
          return [title, copy[title] ?? 'Built to keep the project clearer for both sides.'];
        }).map(([title, copy]) => <View key={title} style={styles.featureCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
      </View>
    </View></Reveal>

    <Reveal delay={170}><View style={styles.paymentBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Payments" title={PAYMENT_LANGUAGE.title} body={PAYMENT_LANGUAGE.short} />
        <View style={styles.paymentGrid}>
          <View style={[styles.paymentCard, styles.protectedCard]}>
            <Chip icon="credit-card-check-outline" style={styles.cardChip}>BuildPay</Chip>
            <Text variant="titleLarge" style={styles.cardTitle}>Protected staged payments.</Text>
            <Text style={styles.cardText}>Keep agreed stages connected to the quote and release workflow. Full rules live on the Payments page.</Text>
          </View>
          <View style={[styles.paymentCard, styles.privateCard]}>
            <Chip icon="account-arrow-right-outline" style={styles.cardChip}>Private payment arrangement</Chip>
            <Text variant="titleLarge" style={styles.cardTitle}>Pay directly.</Text>
            <Text style={styles.cardText}>If both sides agree, arrange payment privately and keep the project record in BuildPair.</Text>
          </View>
        </View>
        <Link href="/(public)/payments" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Learn about payments</Button></Link>
      </View>
    </View></Reveal>

    <Reveal delay={200}><View style={styles.trustBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Trust & safety" title="See the evidence, not just a badge." body="Profiles, credentials, project-linked reviews, service area and reporting give both sides more useful context." />
        <View style={styles.trustGrid}>
          {[
            ['Local service area', 'See where a tradesperson actually works.'],
            ['Credential status', 'See the review status of submitted evidence.'],
            ['Project-linked reviews', 'See review context where BuildPair activity supports it.'],
            ['Two-way reporting', 'Either side can report a concern for review.'],
          ].map(([title, copy]) => <View key={title} style={styles.trustCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
        </View>
        <Link href="/(public)/trust-safety" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Read about trust & safety</Button></Link>
      </View>
    </View></Reveal>

    <Reveal delay={230}><View style={styles.pricingBand}>
      <View style={[styles.section, mobile && styles.sectionMobile, narrowMobile && styles.sectionNarrow]}>
        <SectionHeading eyebrow="Pricing" title="Start free. Upgrade for what you need." body="Starter gets you established. Core helps you win work. Plus helps you run more jobs. Pro helps you run the business." />
        <PricingCards compact />
        <Link href="/(public)/pricing" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>Compare pricing →</Button></Link>
      </View>
    </View></Reveal>

    <Reveal delay={260}><View style={styles.faqBand}>
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
    </View></Reveal>


    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1, width: '100%', maxWidth: '100%' },
  hidden: { display: 'none' },
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
  fairBridge: { width: '100%', alignItems: 'center', gap: 6, padding: 18, borderRadius: 20, backgroundColor: colors.charcoal },
  fairBridgeEyebrow: { color: colors.secondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  fairBridgeTitle: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center' },
  fairBridgeText: { color: '#D9DEE2', lineHeight: 21, textAlign: 'center' },
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
