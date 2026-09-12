import type { Href } from 'expo-router';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { colors } from '@/constants/theme';
import { LAUNCH_DATE_LABEL, waitlistHref } from '@/lib/launch';
import type { UserRole } from '@/types';

type Benefit = readonly [string, string];
type Faq = readonly [string, string];

const HOMEOWNER_BENEFITS: Benefit[] = [
  ['Find', 'Search local trades or post what you need.'],
  ['Compare', 'Compare clear, structured quotes instead of vague messages.'],
  ['Manage', 'Keep messages, agreed changes and supported payments with the job.'],
];

const TRADE_BENEFITS: Benefit[] = [
  ['Get found', 'Build your profile and receive relevant local opportunities.'],
  ['Win work', 'Send professional quotes with scope, exclusions and stages made clear.'],
  ['Run the job', 'Keep customers, messages, changes, payments and paperwork together.'],
];

const COMPARISON_ROWS = [
  ['Lead model', 'Pay for individual leads', 'Monthly membership, not pay-per-lead'],
  ['Quoting', 'Often happens somewhere else', 'Structured quotes stay with the job'],
  ['Communication', 'Messages spread across channels', 'Job communication stays together'],
  ['Payments', 'Left entirely outside the platform', 'BuildPay supports agreed payment stages'],
  ['After the introduction', 'The platform largely steps away', 'BuildPair stays with the project'],
] as const;

const PRODUCT_STEPS = [
  ['01', 'Post the job', 'Describe the work, add photos and give local trades a useful starting brief.'],
  ['02', 'Compare quotes', 'See scope, exclusions, timing and payment stages in a consistent format.'],
  ['03', 'Manage the project', 'Keep messages, decisions and agreed changes attached to the job.'],
  ['04', 'Complete & review', 'Finish the work with the project history and review trail still connected.'],
] as const;

const TRUST_ITEMS: Benefit[] = [
  ['Structured quotes', 'See what is included before work begins.'],
  ['Project-linked reviews', 'Completed BuildPair activity can add useful context to reviews.'],
  ['Changes recorded', 'Extra work can be agreed and recorded instead of becoming a memory contest later.'],
  ['Payment records', 'Supported BuildPay transactions stay connected to the project.'],
];

const FAQS: Faq[] = [
  ['Is BuildPair free for homeowners?', 'Yes. Homeowners can use BuildPair to find tradespeople, compare quotes and manage their projects without a homeowner membership fee.'],
  ['Do tradespeople pay for individual leads?', 'No. BuildPair is built around monthly membership rather than charging a separate fee every time a tradesperson wants to pursue a lead.'],
  ['How are tradespeople checked?', 'BuildPair can show profile, credential and project-history information where available. No platform can replace the checks appropriate to the specific work, so homeowners should still verify anything important to their project.'],
  ['What is BuildPay?', 'BuildPay is the payment part of BuildPair for supported jobs. It keeps agreed payment stages connected to the accepted quote and project record.'],
  ['What happens if there is a dispute?', 'BuildPair keeps the job record, messages, agreed quote and recorded changes together so both sides have clearer evidence. Payment and dispute options depend on how the payment was made and the circumstances of the job.'],
  ['When does BuildPair launch?', `BuildPair launches ${LAUNCH_DATE_LABEL}. Join the launch list now and we’ll email you when registration opens.`],
];

function SectionHeading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <View style={styles.sectionHeading}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text variant="headlineMedium" style={styles.sectionTitle}>{title}</Text>
    {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
  </View>;
}

function BenefitCards({ items, tone = 'home' }: { items: Benefit[]; tone?: 'home' | 'trade' }) {
  return <View style={styles.benefitGrid}>
    {items.map(([title, body], index) => <View key={title} style={[styles.benefitCard, tone === 'trade' && styles.benefitCardTrade]}>
      <View style={[styles.numberBadge, tone === 'trade' && styles.numberBadgeTrade]}><Text style={styles.numberBadgeText}>{index + 1}</Text></View>
      <Text variant="titleMedium" style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{body}</Text>
    </View>)}
  </View>;
}

function ProductHeroMockup() {
  return <View style={styles.productHero} accessibilityLabel="BuildPair project workflow preview">
    <View style={styles.productTopbar}>
      <View><Text style={styles.productLabel}>BATHROOM PROJECT</Text><Text style={styles.productTitle}>Leaking basin repair</Text></View>
      <View style={styles.statusPill}><Text style={styles.statusText}>Quote selected</Text></View>
    </View>
    <View style={styles.productProgress}>
      {['Job posted', '3 quotes', 'Accepted', 'Complete'].map((label, index) => <View key={label} style={styles.progressItem}>
        <View style={[styles.progressDot, index < 3 && styles.progressDotActive]} />
        <Text style={styles.progressText}>{label}</Text>
      </View>)}
    </View>
    <View style={styles.quotePreview}>
      <View style={styles.quoteHeader}><Text style={styles.quoteBusiness}>Local Plumbing Services</Text><Text style={styles.quotePrice}>£140</Text></View>
      <Text style={styles.quoteScope}>Repair leaking basin waste and replace failed seal.</Text>
      <View style={styles.stageRow}><Text style={styles.stageText}>Materials</Text><Text style={styles.stageValue}>£45</Text></View>
      <View style={styles.stageRow}><Text style={styles.stageText}>Progress</Text><Text style={styles.stageValue}>£47.50</Text></View>
      <View style={styles.stageRow}><Text style={styles.stageText}>Final</Text><Text style={styles.stageValue}>£47.50</Text></View>
    </View>
    <View style={styles.productFooter}><Text style={styles.productFooterText}>Quote • Messages • Changes • BuildPay • Review</Text></View>
  </View>;
}

function MiniProductCard({ step, title, body }: { step: string; title: string; body: string }) {
  return <View style={styles.demoCard}>
    <View style={styles.demoVisual}>
      <Text style={styles.demoStep}>{step}</Text>
      {step === '01' ? <>
        <View style={styles.demoLineLong} /><View style={styles.demoLineMedium} /><View style={styles.demoPhotoRow}><View style={styles.demoPhoto} /><View style={styles.demoPhoto} /><View style={styles.demoPhoto} /></View>
      </> : null}
      {step === '02' ? <>
        <View style={styles.demoQuoteRow}><Text style={styles.demoTiny}>Quote A</Text><Text style={styles.demoTinyStrong}>£140</Text></View>
        <View style={styles.demoQuoteRow}><Text style={styles.demoTiny}>Quote B</Text><Text style={styles.demoTinyStrong}>£165</Text></View>
        <View style={styles.demoQuoteRow}><Text style={styles.demoTiny}>Quote C</Text><Text style={styles.demoTinyStrong}>£190</Text></View>
      </> : null}
      {step === '03' ? <>
        <View style={styles.messageBubble}><Text style={styles.demoTiny}>Stage 1 complete</Text></View>
        <View style={[styles.messageBubble, styles.messageBubbleAlt]}><Text style={styles.demoTiny}>Approved ✓</Text></View>
        <View style={styles.demoLineMedium} />
      </> : null}
      {step === '04' ? <>
        <View style={styles.completeRing}><Text style={styles.completeTick}>✓</Text></View>
        <Text style={styles.demoTinyStrong}>Project complete</Text>
        <Text style={styles.stars}>★★★★★</Text>
      </> : null}
    </View>
    <Text variant="titleLarge" style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardText}>{body}</Text>
  </View>;
}

export default function LandingPageRefined() {
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const campaign = useLocalSearchParams<{ utm_source?: string; utm_medium?: string; utm_campaign?: string }>();

  const launchHref = (mode: UserRole | null, source: string): Href => {
    const base = String(waitlistHref(mode, source));
    const params = new URLSearchParams();
    if (typeof campaign.utm_source === 'string' && campaign.utm_source) params.set('utm_source', campaign.utm_source);
    if (typeof campaign.utm_medium === 'string' && campaign.utm_medium) params.set('utm_medium', campaign.utm_medium);
    if (typeof campaign.utm_campaign === 'string' && campaign.utm_campaign) params.set('utm_campaign', campaign.utm_campaign);
    const extra = params.toString();
    return `${base}${extra ? `&${extra}` : ''}` as Href;
  };

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <View style={styles.launchStrip}>
      <Text style={styles.launchStripText}><Text style={styles.launchStrong}>BuildPair launches {LAUNCH_DATE_LABEL}</Text> · Join the launch list and we’ll tell you when registration opens.</Text>
      <Link href={launchHref(null, 'homepage-launch-strip')} asChild><Button compact mode="text" textColor="#FFFFFF">Join the launch list →</Button></Link>
    </View>

    <View style={[styles.hero, wide && styles.heroWide]}>
      <View style={[styles.heroCopy, wide && styles.heroCopyWide]}>
        <Text style={styles.heroEyebrow}>BUILT FOR UK HOMEOWNERS AND TRADESPEOPLE</Text>
        <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Find the right trade. Compare properly. Keep the whole job together.</Text>
        <Text style={styles.heroSubtitle}>BuildPair connects homeowners with local tradespeople and gives both sides the tools to manage the job from quote to completion.</Text>
        <View style={styles.heroButtons}>
          <Link href={launchHref('customer', 'homepage-hero-homeowner')} asChild><Button mode="contained" contentStyle={styles.heroButtonContent}>I’m a homeowner</Button></Link>
          <Link href={launchHref('trader', 'homepage-hero-trader')} asChild><Button mode="outlined" contentStyle={styles.heroButtonContent}>I’m a tradesperson</Button></Link>
        </View>
        <Link href="/(public)/how-it-works" asChild><Button mode="text">See how BuildPair works →</Button></Link>
      </View>
      <ProductHeroMockup />
    </View>

    <View style={styles.audienceBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Choose your side" title="Useful for the homeowner. Useful for the trade." />
        <View style={styles.audienceGrid}>
          <View style={[styles.audiencePanel, styles.homePanel]}>
            <Text style={styles.audienceEyebrow}>FOR HOMEOWNERS</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Get the job sorted without the usual chaos.</Text>
            <BenefitCards items={HOMEOWNER_BENEFITS} />
            <View style={styles.audienceActions}>
              <Link href={launchHref('customer', 'homepage-audience-homeowner')} asChild><Button mode="contained">Join as a homeowner</Button></Link>
              <Link href="/(public)/directory" asChild><Button mode="text">Explore local trades</Button></Link>
            </View>
          </View>
          <View style={[styles.audiencePanel, styles.tradePanel]}>
            <Text style={[styles.audienceEyebrow, styles.tradeEyebrow]}>FOR TRADESPEOPLE</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Find work without buying every lead.</Text>
            <BenefitCards items={TRADE_BENEFITS} tone="trade" />
            <View style={styles.audienceActions}>
              <Link href={launchHref('trader', 'homepage-audience-trader')} asChild><Button mode="contained" buttonColor={colors.navy}>Join as a tradesperson</Button></Link>
              <Link href="/(public)/for-tradespeople" asChild><Button mode="text">See trade features</Button></Link>
            </View>
            <Text style={styles.foundingNote}>First 50 eligible waiting-list trades who register within 24 hours of launch get 3 months of BuildPair Pro free.</Text>
          </View>
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Why BuildPair" title="More than another trade directory." body="Finding each other is only the start. BuildPair is designed to stay useful after the introduction." />
      <View style={styles.comparisonCard}>
        <View style={styles.comparisonHeader}>
          <Text style={[styles.comparisonHeaderText, styles.comparisonTopic]}>THE DIFFERENCE</Text>
          <Text style={styles.comparisonHeaderText}>TYPICAL LEAD PLATFORM</Text>
          <Text style={[styles.comparisonHeaderText, styles.buildPairHeader]}>BUILDPAIR</Text>
        </View>
        {COMPARISON_ROWS.map(([topic, typical, buildpair]) => <View key={topic} style={styles.comparisonRow}>
          <Text style={[styles.comparisonTopic, styles.comparisonTopicText]}>{topic}</Text>
          <Text style={styles.comparisonCell}>{typical}</Text>
          <View style={styles.buildPairCell}><Text style={styles.buildPairCellText}>✓ {buildpair}</Text></View>
        </View>)}
      </View>
    </View>

    <View style={styles.demoBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Inside BuildPair" title="See the project move, not another wall of features." body="The important parts of the job stay connected from the first brief through to completion." />
        <View style={styles.demoGrid}>
          {PRODUCT_STEPS.map(([step, title, body]) => <MiniProductCard key={step} step={step} title={title} body={body} />)}
        </View>
        <Link href="/(public)/how-it-works" asChild><Button mode="text">See the full homeowner and tradesperson journey →</Button></Link>
      </View>
    </View>

    <View style={styles.buildPayBand}>
      <View style={[styles.section, styles.buildPaySection]}>
        <View style={styles.buildPayCopy}>
          <Text style={styles.lightEyebrow}>BUILDPAY</Text>
          <Text variant="headlineMedium" style={styles.lightTitle}>The payment part of BuildPair.</Text>
          <Text style={styles.lightBody}>For supported jobs, BuildPay keeps agreed payment stages connected to the accepted quote and project record.</Text>
          <Link href="/(public)/payments" asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.lightOutline}>How BuildPay works</Button></Link>
        </View>
        <View style={styles.paymentFlow}>
          {['Agree quote', 'Fund stage', 'Complete work', 'Release payment'].map((label, index) => <View key={label} style={styles.paymentStep}>
            <View style={styles.paymentNumber}><Text style={styles.paymentNumberText}>{index + 1}</Text></View>
            <Text style={styles.paymentStepText}>{label}</Text>
          </View>)}
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Trust & clarity" title="Built around clearer jobs and better accountability." />
      <View style={styles.trustGrid}>
        {TRUST_ITEMS.map(([title, body]) => <View key={title} style={styles.trustCard}><Text style={styles.trustTick}>✓</Text><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{body}</Text></View>)}
      </View>
      <Link href="/(public)/trust-safety" asChild><Button mode="text">Read about trust & safety →</Button></Link>
    </View>

    <View style={styles.founderBand}>
      <View style={styles.section}>
        <View style={styles.founderCard}>
          <View style={styles.founderMark}><Text style={styles.founderMarkText}>BP</Text></View>
          <View style={styles.founderCopy}>
            <Text style={styles.eyebrow}>BUILT FROM REAL TRADE PROBLEMS</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>A UK platform built around what actually goes wrong on jobs.</Text>
            <Text style={styles.cardText}>BuildPair was created around problems seen first-hand in trade work and homeowner projects: paid leads that go nowhere, vague quotes, scattered messages, scope changes and payment uncertainty. The aim is simple: make the job clearer for both sides.</Text>
          </View>
        </View>
      </View>
    </View>

    <View style={styles.pricingBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Tradesperson membership" title="Simple monthly plans. No pay-per-lead charges." body="Start with a profile, then choose the marketplace capacity that suits your business." />
        <View style={styles.pricingGrid}>
          {[
            ['Starter', '£0', 'Create your profile and explore BuildPair.', ['Shareable business profile', 'Browse public jobs', '2 main trade categories'], 'pricing-starter'],
            ['Plus', '£19.99', 'For trades actively finding and quoting for work.', ['Searchable marketplace profile', 'Direct quote requests', '15 open-marketplace offers'], 'pricing-plus'],
            ['Pro', '£29.99', 'For businesses wanting more capacity and deeper tools.', ['Everything in Plus', '35 open-marketplace offers', 'Analytics & priority alerts'], 'pricing-pro'],
          ].map(([name, price, summary, features, source]) => <View key={String(name)} style={[styles.priceCard, name === 'Plus' && styles.priceCardFeatured]}>
            <Text style={styles.priceName}>{String(name)}</Text>
            <View style={styles.priceRow}><Text style={styles.price}>{String(price)}</Text><Text style={styles.priceSuffix}>/ month</Text></View>
            <Text style={styles.priceSummary}>{String(summary)}</Text>
            <View style={styles.priceFeatures}>{(features as string[]).map((feature) => <Text key={feature} style={styles.priceFeature}>✓ {feature}</Text>)}</View>
            <Link href={launchHref('trader', String(source))} asChild><Button mode={name === 'Plus' ? 'contained' : 'outlined'}>Join tradesperson launch list</Button></Link>
          </View>)}
        </View>
        <Link href="/(public)/pricing" asChild><Button mode="text">Compare all membership features →</Button></Link>
      </View>
    </View>

    <View style={styles.faqBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Frequently asked" title="Six answers. Not an instruction manual." />
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
        <Text style={styles.finalEyebrow}>LAUNCHING {LAUNCH_DATE_LABEL.toUpperCase()}</Text>
        <Text variant="headlineMedium" style={styles.finalTitle}>Join BuildPair at launch.</Text>
        <Text style={styles.finalText}>One email is enough. Choose your side and we’ll tell you when registration opens.</Text>
        <View style={styles.finalButtons}>
          <Link href={launchHref('customer', 'homepage-final-homeowner')} asChild><Button mode="contained" buttonColor="#FFFFFF" textColor={colors.navy}>Homeowner launch list</Button></Link>
          <Link href={launchHref('trader', 'homepage-final-trader')} asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.finalOutline}>Tradesperson launch list</Button></Link>
        </View>
      </View>
    </View>

    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1, width: '100%', maxWidth: '100%' },
  launchStrip: { width: '100%', backgroundColor: colors.navy, paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  launchStripText: { color: '#DCE7EE', textAlign: 'center', lineHeight: 20, fontSize: 13 },
  launchStrong: { color: '#FFFFFF', fontWeight: '900' },
  hero: { width: '100%', maxWidth: 1220, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 34, gap: 28 },
  heroWide: { flexDirection: 'row', alignItems: 'center', paddingVertical: 54, gap: 44 },
  heroCopy: { width: '100%', minWidth: 0, alignItems: 'center', gap: 16 },
  heroCopyWide: { flex: 1, alignItems: 'flex-start' },
  heroEyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.15, textAlign: 'center' },
  heroTitle: { color: colors.charcoal, fontSize: 50, lineHeight: 55, fontWeight: '900', letterSpacing: -1.8, maxWidth: 650, textAlign: 'center' },
  heroTitleCompact: { fontSize: 36, lineHeight: 41 },
  heroSubtitle: { color: colors.charcoalSoft, fontSize: 18, lineHeight: 27, maxWidth: 620, textAlign: 'center' },
  heroButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center' },
  heroButtonContent: { minHeight: 48, paddingHorizontal: 8 },
  productHero: { flex: 0.95, width: '100%', minWidth: 0, maxWidth: 520, alignSelf: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 28, padding: 18, gap: 16, shadowColor: colors.charcoal, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
  productTopbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  productLabel: { color: colors.primary, fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  productTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 20, marginTop: 2 },
  statusPill: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: colors.accentDark, fontSize: 11, fontWeight: '900' },
  productProgress: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  progressItem: { flex: 1, alignItems: 'center', gap: 5 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  progressText: { color: colors.muted, fontSize: 9, textAlign: 'center' },
  quotePreview: { backgroundColor: colors.surfaceSoft, borderRadius: 18, padding: 14, gap: 8 },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  quoteBusiness: { color: colors.charcoal, fontWeight: '900', flexShrink: 1 },
  quotePrice: { color: colors.primary, fontSize: 24, fontWeight: '900' },
  quoteScope: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 7 },
  stageText: { color: colors.charcoalSoft, fontSize: 12 },
  stageValue: { color: colors.charcoal, fontWeight: '800', fontSize: 12 },
  productFooter: { backgroundColor: colors.navy, borderRadius: 14, padding: 10 },
  productFooterText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  section: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 44, gap: 22 },
  sectionHeading: { width: '100%', maxWidth: 760, minWidth: 0, alignSelf: 'center', alignItems: 'center', gap: 7 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.15, textTransform: 'uppercase', textAlign: 'center' },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  sectionBody: { color: colors.muted, lineHeight: 23, textAlign: 'center' },
  cardTitle: { color: colors.charcoal, fontWeight: '900', minWidth: 0 },
  cardText: { color: colors.muted, lineHeight: 21, minWidth: 0 },
  audienceBand: { backgroundColor: '#FBF8F5' },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  audiencePanel: { flexGrow: 1, flexShrink: 1, flexBasis: 480, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, gap: 16, borderWidth: 1, borderColor: colors.border },
  homePanel: { borderTopWidth: 4, borderTopColor: colors.primary },
  tradePanel: { borderTopWidth: 4, borderTopColor: colors.navy },
  audienceEyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  tradeEyebrow: { color: colors.navy },
  benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  benefitCard: { flexGrow: 1, flexShrink: 1, flexBasis: 135, minWidth: 0, backgroundColor: colors.surfaceSoft, borderRadius: 16, padding: 13, gap: 6 },
  benefitCardTrade: { backgroundColor: '#F4F7F9' },
  numberBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  numberBadgeTrade: { backgroundColor: colors.blueSoft },
  numberBadgeText: { color: colors.charcoal, fontSize: 11, fontWeight: '900' },
  audienceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  foundingNote: { color: colors.navy, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  comparisonCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 22, overflow: 'hidden' },
  comparisonHeader: { flexDirection: 'row', backgroundColor: colors.navy, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  comparisonHeaderText: { flex: 1, color: '#FFFFFF', fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
  comparisonTopic: { flex: 0.55 },
  buildPairHeader: { color: '#FFD7BA' },
  comparisonRow: { flexDirection: 'row', alignItems: 'stretch', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  comparisonTopicText: { color: colors.charcoal, fontWeight: '900', fontSize: 12 },
  comparisonCell: { flex: 1, color: colors.muted, lineHeight: 19, fontSize: 12 },
  buildPairCell: { flex: 1, backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  buildPairCellText: { color: colors.charcoal, lineHeight: 18, fontSize: 12, fontWeight: '700' },
  demoBand: { backgroundColor: colors.surfaceSoft },
  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  demoCard: { flexGrow: 1, flexShrink: 1, flexBasis: 245, minWidth: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 15, gap: 9 },
  demoVisual: { minHeight: 155, backgroundColor: '#F7F4F1', borderRadius: 15, padding: 13, gap: 9, justifyContent: 'center' },
  demoStep: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  demoLineLong: { height: 12, width: '88%', borderRadius: 6, backgroundColor: '#DDE3E6' },
  demoLineMedium: { height: 10, width: '62%', borderRadius: 5, backgroundColor: '#E8ECEE' },
  demoPhotoRow: { flexDirection: 'row', gap: 6 },
  demoPhoto: { flex: 1, height: 48, borderRadius: 8, backgroundColor: '#D6E0E5' },
  demoQuoteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 9, padding: 9, borderWidth: 1, borderColor: colors.border },
  demoTiny: { color: colors.muted, fontSize: 11 },
  demoTinyStrong: { color: colors.charcoal, fontSize: 11, fontWeight: '900' },
  messageBubble: { alignSelf: 'flex-start', maxWidth: '82%', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  messageBubbleAlt: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft },
  completeRing: { width: 54, height: 54, alignSelf: 'center', borderRadius: 27, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  completeTick: { color: colors.accentDark, fontSize: 26, fontWeight: '900' },
  stars: { color: colors.gold, fontSize: 17, letterSpacing: 2, textAlign: 'center' },
  buildPayBand: { backgroundColor: colors.navy },
  buildPaySection: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 28 },
  buildPayCopy: { flex: 1, flexBasis: 360, minWidth: 0, gap: 10 },
  lightEyebrow: { color: '#FFD7BA', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  lightTitle: { color: '#FFFFFF', fontWeight: '900' },
  lightBody: { color: '#DCE7EE', lineHeight: 23, maxWidth: 560 },
  lightOutline: { alignSelf: 'flex-start', borderColor: '#FFFFFF' },
  paymentFlow: { flex: 1, flexBasis: 420, minWidth: 0, gap: 8 },
  paymentStep: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 11 },
  paymentNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  paymentNumberText: { color: '#FFFFFF', fontWeight: '900' },
  paymentStepText: { color: '#FFFFFF', fontWeight: '800' },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  trustCard: { flexGrow: 1, flexShrink: 1, flexBasis: 245, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, gap: 6, borderWidth: 1, borderColor: '#CDE2DE' },
  trustTick: { color: colors.accent, fontWeight: '900', fontSize: 18 },
  founderBand: { backgroundColor: '#FBF8F5' },
  founderCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border },
  founderMark: { width: 72, height: 72, borderRadius: 22, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  founderMarkText: { color: '#FFFFFF', fontWeight: '900', fontSize: 22, letterSpacing: -1 },
  founderCopy: { flex: 1, minWidth: 240, gap: 7 },
  pricingBand: { backgroundColor: colors.surfaceSoft },
  pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  priceCard: { flexGrow: 1, flexShrink: 1, flexBasis: 290, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: colors.border },
  priceCardFeatured: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#FFFCF9' },
  priceName: { color: colors.charcoal, fontSize: 20, fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  price: { color: colors.charcoal, fontSize: 32, lineHeight: 36, fontWeight: '900' },
  priceSuffix: { color: colors.muted, paddingBottom: 3 },
  priceSummary: { color: colors.muted, lineHeight: 20, minHeight: 40 },
  priceFeatures: { gap: 6, flexGrow: 1 },
  priceFeature: { color: colors.charcoalSoft, fontSize: 12, lineHeight: 18 },
  faqBand: { backgroundColor: '#FBF8F5' },
  faqList: { gap: 9, maxWidth: 880, width: '100%', alignSelf: 'center' },
  faqCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, gap: 8 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqToggle: { color: colors.primary, flexShrink: 0, fontSize: 24, fontWeight: '900' },
  finalCta: { width: '100%', backgroundColor: colors.navy, borderRadius: 28, padding: 28, gap: 9, alignItems: 'center' },
  finalEyebrow: { color: '#FFD7BA', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  finalTitle: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center' },
  finalText: { color: '#DCE7EE', lineHeight: 22, textAlign: 'center', maxWidth: 620 },
  finalButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 },
  finalOutline: { borderColor: '#FFFFFF' },
});