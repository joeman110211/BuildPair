import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { FeaturedTraderHero } from '@/components/FeaturedTraderHero';
import { PrelaunchBanner } from '@/components/PrelaunchBanner';
import { PricingCards } from '@/components/PricingCards';
import { PublicFooter } from '@/components/PublicFooter';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';
import { waitlistHref } from '@/lib/launch';

const POPULAR_TRADES = [
  ['Tiling', 'Floors, walls & wet rooms'],
  ['Plumbing', 'Leaks, repairs & installs'],
  ['Electrical', 'Repairs, upgrades & testing'],
  ['Building & Extensions', 'Structural & general building'],
  ['Roofing & Roofline', 'Repairs, roofs & guttering'],
  ['Painting & Decorating', 'Interior & exterior finishes'],
  ['Kitchens', 'Fitting, upgrades & renovation'],
  ['Bathrooms', 'Fitting, plumbing & tiling'],
] as const;

const PROJECT_STEPS = [
  ['Brief', true],
  ['Quotes', true],
  ['Agreed', true],
  ['Build', false],
] as const;

const JOURNEY = [
  ['01', 'Describe it', 'Explain the job in normal language and add useful photos.'],
  ['02', 'Compare properly', 'See suitable local trades and clear, structured quotes.'],
  ['03', 'Agree the job', 'Keep scope, timing, changes and payment stages recorded.'],
  ['04', 'Run it together', 'Messages, progress and completion stay with one project.'],
] as const;

const FEATURE_RAIL = [
  ['LOCAL', 'Genuinely local matching', 'Service areas and working radius help keep opportunities relevant.'],
  ['QUOTE', 'Structured quotes', 'Compare scope, exclusions, materials, VAT and stages clearly.'],
  ['CHAT', 'Project-linked messages', 'Keep decisions attached to the work instead of scattered across apps.'],
  ['CHANGE', 'Recorded variations', 'Changes to scope or price stay visible to both sides.'],
  ['PAY', 'Stage-based payments', 'Use recorded payment stages when both sides want them.'],
  ['REVIEW', 'Project-linked reviews', 'Completed BuildPair activity can add context behind reviews.'],
] as const;

const PROJECT_RECORD = [
  ['✓', 'Quote accepted', 'Scope and price recorded'],
  ['●', 'Message thread', 'Conversation attached to job'],
  ['+', 'Variation agreed', 'Change visible to both sides'],
  ['£', 'Stage release', 'Decision recorded'],
] as const;

const FAQS = [
  ['Do I have to know which trade I need?', 'No. Search by the work you need done and BuildPair can help narrow down the right trade category.'],
  ['Can a tradesperson visit before quoting?', 'Yes. A site visit can happen first, then the formal quote and proposed stages can stay attached to the same project.'],
  ['Do I have to use BuildPair payments?', 'No. Private payment remains an option, but BuildPair can only manage payments made through its own payment flow.'],
  ['How are jobs kept local?', 'Tradespeople set a genuine service base and working radius so marketplace opportunities can be matched to the areas they actually cover.'],
] as const;

function SectionHeading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <View style={styles.sectionHeading}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text variant="headlineMedium" style={styles.sectionTitle}>{title}</Text>
    {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
  </View>;
}

function FloatingTag({ label, value, position }: { label: string; value: string; position: 'topLeft' | 'topRight' | 'bottomRight' }) {
  const positionStyle = position === 'topLeft' ? styles.floatTopLeft : position === 'topRight' ? styles.floatTopRight : styles.floatBottomRight;
  return <View style={[styles.floatTag, positionStyle]}>
    <Text style={styles.floatLabel}>{label}</Text>
    <Text style={styles.floatValue}>{value}</Text>
  </View>;
}

export default function LandingPageNextGen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const railCardWidth = wide ? 270 : Math.max(240, Math.min(width - 72, 310));
  const audienceCardWidth = wide ? 520 : Math.max(270, width - 58);

  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };

  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <PrelaunchBanner />

    <View style={[styles.hero, wide && styles.heroWide]}>
      <View style={[styles.heroCopy, wide && styles.heroCopyWide]} testID="home-hero-copy">
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>The trades marketplace built around the whole job</Text></View>
        <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Find the right trade. Run the job properly.</Text>
        <Text variant="titleMedium" style={[styles.heroSubtitle, !wide && styles.textCenter]}>BuildPair brings local trade discovery, clearer quotes, project messages, changes and payment stages into one connected place.</Text>
        <View style={styles.heroProofRow}>
          {['Local matching', 'Clear quotes', 'One project record'].map((item) => <View key={item} style={styles.heroProof}><Text style={styles.heroProofMark}>✓</Text><Text style={styles.heroProofText}>{item}</Text></View>)}
        </View>
        <View style={[styles.heroActions, wide && styles.heroActionsWide]}>
          <Link href={waitlistHref('customer', 'homepage-hero')} asChild><Button mode="contained" style={styles.pillButton} contentStyle={styles.buttonContent}>Join homeowner launch list</Button></Link>
          <Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" style={styles.pillButton} contentStyle={styles.buttonContent}>I’m a tradesperson</Button></Link>
        </View>
      </View>

      <View style={[styles.heroVisual, wide && styles.heroVisualWide]} testID="home-hero-visual">
        <View style={styles.visualGlowOne} />
        <View style={styles.visualGlowTwo} />
        <View style={styles.projectMockup}>
          <View style={styles.mockupHeader}>
            <View style={styles.mockupHeaderCopy}><Text style={styles.mockupEyebrow}>LIVE PROJECT</Text><Text style={styles.mockupTitle}>Bathroom renovation</Text></View>
            <View style={styles.mockupStatus}><Text style={styles.mockupStatusText}>On track</Text></View>
          </View>
          <View style={styles.mockupTimeline}>
            {PROJECT_STEPS.map(([label, done], index) => <View key={label} style={styles.timelineItem}>
              <View style={[styles.timelineDot, done && styles.timelineDotDone]}><Text style={[styles.timelineDotText, done && styles.timelineDotTextDone]}>{done ? '✓' : index + 1}</Text></View>
              <Text style={styles.timelineLabel}>{label}</Text>
            </View>)}
          </View>
          <View style={styles.quotePreview}>
            <View style={styles.quoteTop}><Text style={styles.quoteLabel}>Quote comparison</Text><Text style={styles.quoteCount}>2 received</Text></View>
            <View style={styles.quoteBars}><View style={[styles.quoteBar, styles.quoteBarLong]} /><View style={[styles.quoteBar, styles.quoteBarMedium]} /><View style={[styles.quoteBar, styles.quoteBarShort]} /></View>
          </View>
          <View style={styles.mockupFooter}><Text style={styles.mockupFooterText}>Everything important stays with the job.</Text><Text style={styles.mockupFooterArrow}>→</Text></View>
        </View>
        <FloatingTag label="LOCAL MATCH" value="3 suitable trades" position="topLeft" />
        <FloatingTag label="QUOTE READY" value="Scope + stages" position="topRight" />
        <FloatingTag label="PROJECT" value="One shared record" position="bottomRight" />
      </View>
    </View>

    <View style={styles.featuredBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Featured tradespeople" title="Meet trades already on BuildPair." body="Swipe through current real profiles on the platform." />
        <FeaturedTraderHero wide={wide} />
      </View>
    </View>

    <View style={styles.tradeBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Find a trade" title="Start with the job, not the jargon." body="Search in plain English or swipe through popular trades." />
        <View style={styles.searchShell}>
          <TextInput mode="outlined" value={search} onChangeText={setSearch} onSubmitEditing={() => goSearch(search)} placeholder="What do you need done? e.g. leaking tap or bathroom tiling" style={styles.searchInput} outlineStyle={styles.inputOutline} />
          <Button mode="contained" style={[styles.searchButton, !wide && styles.searchButtonMobile]} contentStyle={styles.buttonContent} onPress={() => goSearch(search)}>Find a trade</Button>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tradeRail}>
          {POPULAR_TRADES.map(([trade, description]) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button">
            <View style={styles.tradeIcon}><Text style={styles.tradeIconText}>{trade.slice(0, 1)}</Text></View>
            <Text style={styles.tradeName}>{trade}</Text>
            <Text style={styles.tradeDescription}>{description}</Text>
            <View style={styles.tradeFoot}><Text style={styles.tradeExplore}>Explore trade</Text><Text style={styles.tradeArrow}>→</Text></View>
          </Pressable>)}
        </ScrollView>
        <View style={styles.centerAction}><Link href="/(public)/directory" asChild><Button mode="outlined" style={styles.pillButton}>Browse all {TRADE_CATEGORIES.length} trade categories</Button></Link></View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="How it works" title="Four steps. One connected project." body="Swipe through the journey instead of reading another wall of text." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.journeyRail}>
        {JOURNEY.map(([number, title, copy], index) => <View key={number} style={[styles.journeyCard, { width: railCardWidth }]}>
          <View style={styles.journeyTop}>
            <Text style={styles.journeyNumber}>{number}</Text>
            <View style={styles.progressTrack}>{JOURNEY.map(([stepNumber], stepIndex) => <View key={`${number}-${stepNumber}`} style={[styles.progressSegment, stepIndex <= index && styles.progressSegmentActive]} />)}</View>
          </View>
          <Text variant="titleLarge" style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{copy}</Text>
          <Text style={styles.journeyArrow}>→</Text>
        </View>)}
      </ScrollView>
      <View style={styles.centerAction}><Link href="/(public)/how-it-works" asChild><Button mode="text">See the full process →</Button></Link></View>
    </View>

    <View style={styles.differenceBand}>
      <View style={[styles.section, styles.differenceSection]}>
        <View style={[styles.differenceGrid, wide && styles.differenceGridWide]}>
          <View style={styles.differenceCopy}>
            <Text style={styles.eyebrowLeft}>BUILT AROUND THE PROJECT</Text>
            <Text variant="headlineMedium" style={styles.differenceTitle}>Not another directory that disappears once you get a phone number.</Text>
            <Text style={styles.differenceText}>BuildPair stays useful after the introduction. Quotes, messages, changes, stages and completion can remain connected to the same job.</Text>
            <Link href="/(public)/for-homeowners" asChild><Button mode="outlined" style={styles.pillButton}>See the homeowner experience</Button></Link>
          </View>
          <View style={styles.projectVisualCard}>
            <View style={styles.projectVisualHeader}><Text style={styles.projectVisualLabel}>PROJECT RECORD</Text><Text style={styles.projectVisualBadge}>Connected</Text></View>
            <View style={styles.projectVisualRows}>
              {PROJECT_RECORD.map(([mark, title, copy]) => <View key={title} style={styles.projectVisualRow}>
                <View style={styles.projectVisualMark}><Text style={styles.projectVisualMarkText}>{mark}</Text></View>
                <View style={styles.projectVisualRowCopy}><Text style={styles.projectVisualRowTitle}>{title}</Text><Text style={styles.projectVisualRowText}>{copy}</Text></View>
              </View>)}
            </View>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featureRail}>
          {FEATURE_RAIL.map(([tag, title, copy]) => <View key={tag} style={[styles.featureCard, { width: railCardWidth }]}>
            <View style={styles.featureTag}><Text style={styles.featureTagText}>{tag}</Text></View>
            <Text variant="titleMedium" style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardText}>{copy}</Text>
          </View>)}
        </ScrollView>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Built for both sides" title="Same project. Different tools." body="Swipe between the homeowner and tradesperson experience." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={audienceCardWidth + 12} decelerationRate="fast" contentContainerStyle={styles.audienceRail}>
        <View style={[styles.audienceCard, styles.homeownerCard, { width: audienceCardWidth }]}>
          <View style={styles.audienceTop}><View style={styles.audienceIcon}><Text style={styles.audienceIconText}>H</Text></View><Text style={styles.audienceEyebrow}>FOR HOMEOWNERS</Text></View>
          <Text variant="headlineSmall" style={styles.cardTitle}>Find, compare and stay in control.</Text>
          <Text style={styles.cardText}>Post or search for work, compare suitable trades and keep the important decisions in one project record.</Text>
          <View style={styles.audienceVisual}><Text style={styles.audienceVisualText}>Search</Text><Text style={styles.audienceVisualArrow}>→</Text><Text style={styles.audienceVisualText}>Compare</Text><Text style={styles.audienceVisualArrow}>→</Text><Text style={styles.audienceVisualText}>Manage</Text></View>
          <Link href={waitlistHref('customer', 'homepage-audience')} asChild><Button mode="contained" style={styles.pillButton}>Join homeowner launch list</Button></Link>
        </View>
        <View style={[styles.audienceCard, styles.tradeAudienceCard, { width: audienceCardWidth }]}>
          <View style={styles.audienceTop}><View style={[styles.audienceIcon, styles.audienceIconNavy]}><Text style={styles.audienceIconText}>T</Text></View><Text style={[styles.audienceEyebrow, styles.tradeAudienceEyebrow]}>FOR TRADESPEOPLE</Text></View>
          <Text variant="headlineSmall" style={styles.cardTitle}>Win suitable work and run it professionally.</Text>
          <Text style={styles.cardText}>Build your profile, find relevant opportunities, send structured quotes and keep customers and jobs organised.</Text>
          <View style={styles.audienceVisual}><Text style={styles.audienceVisualText}>Profile</Text><Text style={styles.audienceVisualArrow}>→</Text><Text style={styles.audienceVisualText}>Quote</Text><Text style={styles.audienceVisualArrow}>→</Text><Text style={styles.audienceVisualText}>Deliver</Text></View>
          <Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" style={styles.pillButton}>See trade features</Button></Link>
        </View>
      </ScrollView>
    </View>

    <View style={styles.assuranceBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Payments & trust" title="Clear choices, visible records." body="Swipe through the safeguards and payment options without drowning in legal-sounding copy." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assuranceRail}>
          <View style={[styles.assuranceCard, styles.paymentCard, { width: audienceCardWidth }]}>
            <View style={styles.assuranceBadge}><Text style={styles.assuranceBadgeText}>PAYMENTS</Text></View>
            <Text variant="headlineSmall" style={styles.cardTitle}>Recorded stages when you want them.</Text>
            <View style={styles.stageVisual}>
              {['Materials', 'Progress', 'Final'].map((stage, index) => <View key={stage} style={styles.stageRow}><View style={[styles.stageDot, index === 0 && styles.stageDotActive]} /><Text style={styles.stageName}>{stage}</Text><Text style={styles.stageState}>{index === 0 ? 'Paid' : 'Awaiting stage'}</Text></View>)}
            </View>
            <Text style={styles.cardText}>BuildPair payments can follow the accepted quote. Private payment remains an option, but sits outside BuildPair’s payment controls.</Text>
            <Link href="/(public)/payments" asChild><Button mode="outlined" style={styles.pillButton}>How payments work</Button></Link>
          </View>
          <View style={[styles.assuranceCard, styles.trustCard, { width: audienceCardWidth }]}>
            <View style={[styles.assuranceBadge, styles.trustBadge]}><Text style={styles.assuranceBadgeText}>TRUST</Text></View>
            <Text variant="headlineSmall" style={styles.cardTitle}>Useful signals without pretending risk disappears.</Text>
            <View style={styles.trustChecks}>{['Local service area', 'Credential status', 'Project-linked reviews', 'Two-way reporting'].map((item) => <View key={item} style={styles.trustCheck}><Text style={styles.trustCheckMark}>✓</Text><Text style={styles.trustCheckText}>{item}</Text></View>)}</View>
            <Text style={styles.cardText}>BuildPair can organise evidence and history, while homeowners still make the checks appropriate to the work.</Text>
            <Link href="/(public)/trust-safety" asChild><Button mode="outlined" style={styles.pillButton}>Trust & safety</Button></Link>
          </View>
        </ScrollView>
      </View>
    </View>

    <View style={styles.pricingBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Tradesperson membership" title="Start free. Upgrade for more marketplace reach." body="Simple plans, clear features and no need to buy individual leads." />
        <PricingCards compact />
        <View style={styles.centerAction}><Link href="/(public)/pricing" asChild><Button mode="text">Compare membership plans →</Button></Link></View>
      </View>
    </View>

    <View style={styles.faqBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Questions" title="The essentials, without the waffle." />
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
        <View style={styles.finalCopy}><Text style={styles.finalEyebrow}>BUILDPAIR UK</Text><Text variant="headlineSmall" style={styles.finalTitle}>A trades marketplace that keeps working after the match.</Text><Text style={styles.finalText}>Find the right trade, agree the job and keep the project connected from first contact to completion.</Text></View>
        <View style={styles.finalButtons}><Button mode="contained" buttonColor="#FFFFFF" textColor={colors.navy} style={styles.pillButton} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Link href={waitlistHref(null, 'homepage-final')} asChild><Button mode="outlined" textColor="#FFFFFF" style={[styles.pillButton, styles.finalOutline]} contentStyle={styles.buttonContent}>Join launch list</Button></Link></View>
      </View>
    </View>

    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' },
  hero: { width: '100%', maxWidth: 1220, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 34, paddingBottom: 42, gap: 28 },
  heroWide: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 58, gap: 42 },
  heroCopy: { width: '100%', minWidth: 0, alignItems: 'center', gap: 16 },
  heroCopyWide: { flex: 1, alignItems: 'flex-start' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primarySoft, borderRadius: 999, borderWidth: 1, borderColor: '#F2D7C3' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  heroBadgeText: { flexShrink: 1, color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
  heroTitle: { maxWidth: 690, color: colors.charcoal, fontSize: 52, lineHeight: 56, fontWeight: '900', letterSpacing: -2.1, textAlign: 'left' },
  heroTitleCompact: { fontSize: 38, lineHeight: 42, textAlign: 'center', letterSpacing: -1.3 },
  heroSubtitle: { maxWidth: 650, color: colors.charcoalSoft, lineHeight: 27, textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  heroProofRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  heroProof: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  heroProofMark: { color: colors.primary, fontWeight: '900' },
  heroProofText: { color: colors.charcoalSoft, fontSize: 12, fontWeight: '800' },
  heroActions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center' },
  heroActionsWide: { justifyContent: 'flex-start' },
  pillButton: { borderRadius: 999, maxWidth: '100%' },
  buttonContent: { minHeight: 48, paddingHorizontal: 5 },
  heroVisual: { width: '100%', minHeight: 410, justifyContent: 'center', paddingHorizontal: 6, position: 'relative' },
  heroVisualWide: { flex: 0.95, minHeight: 500 },
  visualGlowOne: { position: 'absolute', top: 36, right: 20, width: 180, height: 180, borderRadius: 999, backgroundColor: '#FFE4CE', opacity: 0.72 },
  visualGlowTwo: { position: 'absolute', bottom: 28, left: 10, width: 160, height: 160, borderRadius: 999, backgroundColor: '#DCEEEB', opacity: 0.9 },
  projectMockup: { width: '88%', maxWidth: 500, alignSelf: 'center', gap: 18, padding: 20, borderRadius: 30, backgroundColor: colors.navy, borderWidth: 1, borderColor: '#243C4E' },
  mockupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  mockupHeaderCopy: { flex: 1, minWidth: 0 },
  mockupEyebrow: { color: '#FFCCAA', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  mockupTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 28, fontWeight: '900' },
  mockupStatus: { flexShrink: 0, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#D9F0EA' },
  mockupStatusText: { color: '#24594E', fontSize: 10, fontWeight: '900' },
  mockupTimeline: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  timelineItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
  timelineDot: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A4151', borderWidth: 1, borderColor: '#3D5565' },
  timelineDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  timelineDotText: { color: '#AFC1CB', fontSize: 10, fontWeight: '900' },
  timelineDotTextDone: { color: '#FFFFFF' },
  timelineLabel: { color: '#C7D5DD', fontSize: 10, fontWeight: '800' },
  quotePreview: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: '#FFFFFF' },
  quoteTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  quoteLabel: { color: colors.charcoal, fontWeight: '900' },
  quoteCount: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  quoteBars: { gap: 7 },
  quoteBar: { height: 8, borderRadius: 999, backgroundColor: '#E8EDF0' },
  quoteBarLong: { width: '92%' },
  quoteBarMedium: { width: '72%' },
  quoteBarShort: { width: '48%' },
  mockupFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  mockupFooterText: { flexShrink: 1, color: '#D4E0E7', fontSize: 12, fontWeight: '700' },
  mockupFooterArrow: { flexShrink: 0, color: '#FFCCAA', fontSize: 20, fontWeight: '900' },
  floatTag: { position: 'absolute', zIndex: 3, maxWidth: 155, gap: 2, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  floatTopLeft: { top: 22, left: 0 },
  floatTopRight: { top: 82, right: 0 },
  floatBottomRight: { bottom: 18, right: 12 },
  floatLabel: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  floatValue: { color: colors.charcoal, fontSize: 11, fontWeight: '900' },
  section: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 44, gap: 24 },
  sectionHeading: { width: '100%', maxWidth: 760, minWidth: 0, alignSelf: 'center', alignItems: 'center', gap: 7 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  eyebrowLeft: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' },
  sectionBody: { maxWidth: 690, color: colors.muted, lineHeight: 23, textAlign: 'center' },
  featuredBand: { backgroundColor: '#FBF8F5' },
  tradeBand: { backgroundColor: colors.surfaceSoft },
  searchShell: { width: '100%', maxWidth: 850, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 10, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  searchInput: { flexGrow: 1, flexBasis: 470, minWidth: 0, backgroundColor: '#FFFFFF' },
  inputOutline: { borderRadius: 15 },
  searchButton: { flexGrow: 0, flexShrink: 0, alignSelf: 'center', borderRadius: 999 },
  searchButtonMobile: { width: '100%' },
  tradeRail: { gap: 10, paddingHorizontal: 1, paddingBottom: 4 },
  tradeCard: { width: 210, minHeight: 180, gap: 8, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  tradeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  tradeIconText: { color: colors.primary, fontWeight: '900' },
  tradeName: { color: colors.charcoal, fontSize: 16, lineHeight: 20, fontWeight: '900' },
  tradeDescription: { flexGrow: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  tradeFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tradeExplore: { color: colors.charcoalSoft, fontSize: 11, fontWeight: '800' },
  tradeArrow: { color: colors.primary, fontWeight: '900' },
  centerAction: { alignItems: 'center' },
  journeyRail: { gap: 12, paddingHorizontal: 1, paddingBottom: 4 },
  journeyCard: { minHeight: 220, gap: 9, padding: 18, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  journeyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  journeyNumber: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  progressTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 5, borderRadius: 999, backgroundColor: '#E8EDF0' },
  progressSegmentActive: { backgroundColor: colors.primary },
  journeyArrow: { marginTop: 'auto', alignSelf: 'flex-end', color: colors.primary, fontSize: 22, fontWeight: '900' },
  cardTitle: { minWidth: 0, maxWidth: '100%', color: colors.charcoal, fontWeight: '900' },
  cardText: { minWidth: 0, maxWidth: '100%', color: colors.muted, lineHeight: 22 },
  differenceBand: { backgroundColor: '#F6FBFA' },
  differenceSection: { gap: 28 },
  differenceGrid: { gap: 20 },
  differenceGridWide: { flexDirection: 'row', alignItems: 'center', gap: 36 },
  differenceCopy: { flex: 1, minWidth: 0, gap: 12, alignItems: 'flex-start' },
  differenceTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.7 },
  differenceText: { color: colors.muted, lineHeight: 23 },
  projectVisualCard: { flex: 1, minWidth: 0, gap: 16, padding: 20, borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFE2DD' },
  projectVisualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  projectVisualLabel: { color: colors.navy, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  projectVisualBadge: { color: '#24594E', fontSize: 10, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: '#DFF1EC' },
  projectVisualRows: { gap: 9 },
  projectVisualRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: '#F8FBFA' },
  projectVisualMark: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  projectVisualMarkText: { color: '#FFFFFF', fontWeight: '900' },
  projectVisualRowCopy: { flex: 1, minWidth: 0 },
  projectVisualRowTitle: { color: colors.charcoal, fontWeight: '900' },
  projectVisualRowText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  featureRail: { gap: 12, paddingHorizontal: 1, paddingBottom: 4 },
  featureCard: { minHeight: 190, gap: 9, padding: 17, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFE2DD' },
  featureTag: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.primarySoft },
  featureTagText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  audienceRail: { gap: 12, paddingHorizontal: 1, paddingBottom: 4 },
  audienceCard: { minHeight: 310, gap: 12, padding: 20, borderRadius: 24, borderWidth: 1 },
  homeownerCard: { backgroundColor: '#FFF9F4', borderColor: '#F0D6C3' },
  tradeAudienceCard: { backgroundColor: '#F5F8FA', borderColor: '#D4DFE6' },
  audienceTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  audienceIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  audienceIconNavy: { backgroundColor: colors.navy },
  audienceIconText: { color: '#FFFFFF', fontWeight: '900' },
  audienceEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tradeAudienceEyebrow: { color: colors.navy },
  audienceVisual: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, paddingVertical: 3 },
  audienceVisualText: { color: colors.charcoalSoft, fontSize: 11, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  audienceVisualArrow: { color: colors.primary, fontWeight: '900' },
  assuranceBand: { backgroundColor: '#FFF8F0' },
  assuranceRail: { gap: 12, paddingHorizontal: 1, paddingBottom: 4 },
  assuranceCard: { minHeight: 365, gap: 12, padding: 20, borderRadius: 24, borderWidth: 1 },
  paymentCard: { backgroundColor: '#FFFFFF', borderColor: '#E8D7C7' },
  trustCard: { backgroundColor: '#F7FCFA', borderColor: '#CAE1DA' },
  assuranceBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primary },
  trustBadge: { backgroundColor: '#337464' },
  assuranceBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  stageVisual: { gap: 8, padding: 12, borderRadius: 16, backgroundColor: '#FFF9F4' },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  stageDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: '#D8DEE2' },
  stageDotActive: { backgroundColor: colors.primary },
  stageName: { flex: 1, color: colors.charcoal, fontSize: 12, fontWeight: '900' },
  stageState: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  trustChecks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trustCheck: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8E8E3' },
  trustCheckMark: { color: '#337464', fontWeight: '900' },
  trustCheckText: { color: colors.charcoalSoft, fontSize: 11, fontWeight: '800' },
  pricingBand: { backgroundColor: '#FBF8F5' },
  faqBand: { backgroundColor: colors.surfaceSoft },
  faqList: { gap: 9, maxWidth: 900, width: '100%', minWidth: 0, alignSelf: 'center' },
  faqCard: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 16, gap: 8 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqToggle: { flexShrink: 0, color: colors.primary, fontSize: 24, fontWeight: '900' },
  finalCta: { width: '100%', backgroundColor: colors.navy, borderRadius: 28, padding: 26, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 18 },
  finalCopy: { flex: 1, minWidth: 240, maxWidth: 650, gap: 6 },
  finalEyebrow: { color: '#FFD7BA', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  finalTitle: { color: '#FFFFFF', fontWeight: '900' },
  finalText: { color: '#DCE7EE', lineHeight: 22 },
  finalButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  finalOutline: { borderColor: '#FFFFFF' },
});