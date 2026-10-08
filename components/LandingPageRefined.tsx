import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { createElement, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { FeaturedTraderHero } from '@/components/FeaturedTraderHero';
import { PrelaunchBanner } from '@/components/PrelaunchBanner';
import { MARKETPLACE_OPEN } from '@/lib/launch';
import { PricingCards } from '@/components/PricingCards';
import { ProductPreview } from '@/components/ProductPreview';
import { PublicFooter } from '@/components/PublicFooter';
import { PublicSeo } from '@/components/PublicSeo';
import { Reveal } from '@/components/Reveal';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors, controlHeights, publicResponsiveMetrics, radii } from '@/constants/theme';

const POPULAR_TRADES = ['Tiling', 'Plumbing', 'Electrical', 'Building & Extensions', 'Roofing & Roofline', 'Painting & Decorating', 'Kitchens', 'Bathrooms'] as const;
const FAQS = [
  ['Can a tradesperson visit before quoting?', 'Yes. Arrange a site visit through the job when the work needs a closer look, then agree a written quote through BuildPair.'],
  ['Who pays the BuildPay fee?', 'The party requesting BuildPay carries the disclosed cost. The fee, payment stages and total are shown before you commit.'],
  ['Can we pay directly?', 'Yes, when both sides agree. BuildPair keeps the project record, but does not process, hold or refund money paid directly.'],
  ['What do trade memberships include?', 'Starter is free. Core, Plus and Pro add marketplace allowances and business tools. The Pricing page sets out each plan’s features and limits.'],
] as const;

function SemanticHeading({ level, style, children }: { level: 1 | 2 | 3; style: StyleProp<TextStyle>; children: string }) {
  if (Platform.OS === 'web') {
    const flattened = StyleSheet.flatten(style) ?? {};
    const lineHeight = typeof flattened.lineHeight === 'number' ? `${flattened.lineHeight}px` : flattened.lineHeight;
    return createElement(`h${level}`, {
      style: { margin: 0, whiteSpace: 'pre-line', ...flattened, lineHeight },
    }, children);
  }

  return <Text accessibilityRole="header" style={style}>{children}</Text>;
}

function Heading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  return <View style={styles.heading}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <SemanticHeading level={2} style={[styles.sectionTitle, { fontSize: metrics.sectionTitleFontSize, lineHeight: metrics.sectionTitleLineHeight }]}>{title}</SemanticHeading>
    {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
  </View>;
}

export default function LandingPageRefined() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const mobile = width < 720;
  const wide = width >= 920;
  const metrics = publicResponsiveMetrics(width);
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hasFeaturedProfiles, setHasFeaturedProfiles] = useState(true);
  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
    <PublicSeo title="Find local tradespeople. Keep the whole job together" description="Find local tradespeople, compare clear quotes and keep messages, changes and payment stages together. Business tools for tradespeople, with no pay-per-lead fees." />
    {MARKETPLACE_OPEN ? <View style={styles.localNotice}><Text style={styles.localNoticeText}>BuildPair is welcoming homeowners and tradespeople in London, Surrey and nearby areas. Local coverage is growing. BuildPay payments are not yet available.</Text></View> : <PrelaunchBanner />}
    <View style={[styles.hero, mobile && styles.heroMobile]}>
      <Text style={styles.eyebrow}>ONE PROJECT. BOTH SIDES CONNECTED.</Text>
      <SemanticHeading level={1} style={[styles.heroTitle, mobile && styles.heroTitleMobile, mobile && { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>{"Find local tradespeople.\nKeep the whole job together."}</SemanticHeading>
      <Text style={styles.heroBody}>Compare clear quotes. Agree the work. Keep messages, changes and payment stages in one place.</Text>
      <View style={styles.heroActions}>
        <Link href="/(public)/directory" asChild><Button mode="contained" style={styles.button} contentStyle={styles.buttonContent}>Browse local trades</Button></Link>
        <Link href="/(public)/how-it-works" asChild><Button mode="text" textColor={colors.primaryDark} style={styles.button} contentStyle={styles.buttonContent}>See how it works →</Button></Link>
      </View>
      <View style={styles.benefits}><Text style={styles.benefit}>Clear quotes</Text><Text style={styles.benefitDot}>·</Text><Text style={styles.benefit}>Local trades</Text><Text style={styles.benefitDot}>·</Text><Text style={styles.benefit}>No pay per lead</Text></View>
    </View>

    <Reveal><View style={[styles.band, styles.whiteBand, !hasFeaturedProfiles && styles.hidden]}>
      <View style={styles.section}>
        <Heading eyebrow="Featured tradespeople" title="Explore tradespeople on BuildPair" body="Browse local tradespeople, their work and profile details before choosing who to contact." />
        <FeaturedTraderHero wide={wide} onAvailabilityChange={setHasFeaturedProfiles} />
      </View>
    </View></Reveal>

    <Reveal delay={40}><View style={styles.section}>
      <Heading eyebrow="Find a trade" title="What needs doing?" body="Choose a trade or describe the job in your own words." />
      <View style={[styles.searchRow, mobile && styles.searchRowMobile]}>
        <TextInput accessibilityLabel="Describe the job or trade" mode="outlined" value={search} onChangeText={setSearch} onSubmitEditing={() => goSearch(search)} placeholder="e.g. bathroom tiling or a leaking tap" outlineStyle={styles.inputOutline} style={styles.searchInput} />
        <Button mode="contained" style={[styles.button, mobile && styles.fullButton]} contentStyle={styles.buttonContent} onPress={() => goSearch(search)}>Find a trade</Button>
      </View>
      <View style={styles.tradeGrid}>{POPULAR_TRADES.map((trade) => <Pressable key={trade} style={({ pressed }) => [styles.tradeCard, pressed && styles.pressed]} onPress={() => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href)} accessibilityRole="button"><Text style={styles.tradeName}>{trade}</Text><Text style={styles.tradeArrow}>→</Text></Pressable>)}</View>
      <Link href="/(public)/directory" asChild><Button mode="text" style={styles.button} contentStyle={styles.buttonContent}>Browse all {TRADE_CATEGORIES.length} trade categories →</Button></Link>
    </View></Reveal>

    <Reveal delay={80}><View style={[styles.band, styles.whiteBand]}><View style={styles.section}>
      <Heading eyebrow="How BuildPair works" title="From first search to finished job." />
      <View style={styles.stepGrid}>{[
        ['01', 'Find the right fit', 'Explore local profiles and request quotes for the work you need.'],
        ['02', 'Agree the details', 'Compare scope, materials, timing and price. Arrange a visit when needed.'],
        ['03', 'Keep it organised', 'Manage messages, agreed changes and payment stages through the project.'],
      ].map(([number, title, copy]) => <View key={number} style={styles.step}><Text style={styles.stepNumber}>{number}</Text><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}</View>
      <Link href="/(public)/how-it-works" asChild><Button mode="text" style={styles.button} contentStyle={styles.buttonContent}>Explore the full process →</Button></Link>
    </View></View></Reveal>

    <Reveal delay={120}><View style={[styles.band, styles.productBand]}><View style={styles.section}>
      <Heading eyebrow="More than an introduction" title="The useful part starts with the job." body="Clearer projects for homeowners. Practical tools for tradespeople and their existing customers." />
      <ProductPreview />
    </View></View></Reveal>

    <Reveal delay={160}><View style={styles.section}>
      <Heading eyebrow="Payments & trust" title="Clear choices. A better record." />
      <View style={styles.choiceGrid}>
        <View style={[styles.choice, styles.paymentChoice]}><Text style={styles.eyebrow}>BUILDPAY</Text><Text style={styles.cardTitle}>Agree stages. Record releases.</Text><Text style={styles.cardText}>Stripe processes supported payments. BuildPair connects funding and release decisions to the agreed work.</Text><Text style={styles.smallText}>BuildPay is not escrow, insurance or a guarantee of workmanship or refunds.</Text><Link href="/(public)/payments" asChild><Button mode="text" style={styles.button} contentStyle={styles.buttonContent}>How payments work →</Button></Link></View>
        <View style={styles.choice}><Text style={styles.eyebrow}>DIRECT PAYMENT</Text><Text style={styles.cardTitle}>Pay directly when you both agree.</Text><Text style={styles.cardText}>Keep the quote, messages and project record in BuildPair while arranging payment privately.</Text><Text style={styles.smallText}>BuildPair does not receive, hold, release or refund money paid directly.</Text><Link href="/(public)/payments" asChild><Button mode="text" style={styles.button} contentStyle={styles.buttonContent}>Compare payment routes →</Button></Link></View>
      </View>
      <View style={styles.trustStrip}><Text style={styles.trustTitle}>Make an informed choice.</Text><Text style={styles.cardText}>Explore real work, service areas, review sources and the status of submitted credentials. Report concerns for review.</Text><Link href="/(public)/trust-safety" asChild><Button mode="text" style={styles.button} contentStyle={styles.buttonContent}>Trust & safety →</Button></Link></View>
    </View></Reveal>

    <Reveal delay={200}><View style={[styles.band, styles.whiteBand]}><View style={styles.section}>
      <Heading eyebrow="For tradespeople" title="Start free. Build from there." body="Monthly memberships combine marketplace access with quoting, customer and project tools. No pay-per-lead charges." />
      <PricingCards compact />
      <View style={styles.heroActions}><Link href="/(public)/pricing" asChild><Button mode="contained" style={styles.button} contentStyle={styles.buttonContent}>Compare plans & allowances</Button></Link><Link href="/(public)/for-tradespeople" asChild><Button mode="text" style={styles.button} contentStyle={styles.buttonContent}>Explore trade tools →</Button></Link></View>
    </View></View></Reveal>

    <Reveal delay={240}><View style={styles.section}>
      <Heading eyebrow="Your questions" title="A few things worth knowing." />
      <View style={styles.faqList}>{FAQS.map(([question, answer], index) => <Pressable key={question} style={styles.faqCard} onPress={() => setOpenFaq(openFaq === index ? null : index)} accessibilityRole="button" accessibilityState={{ expanded: openFaq === index }}><View style={styles.faqRow}><Text style={styles.faqQuestion}>{question}</Text><Text style={styles.faqToggle}>{openFaq === index ? '−' : '+'}</Text></View>{openFaq === index ? <Text style={styles.cardText}>{answer}</Text> : null}</Pressable>)}</View>
      <Link href="/(public)/contact" asChild><Button mode="text" style={styles.button} contentStyle={styles.buttonContent}>Need a hand? Contact BuildPair →</Button></Link>
    </View></Reveal>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  localNotice: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surfaceRaised, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  localNoticeText: { maxWidth: 1100, color: colors.charcoalSoft, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  page: { flex: 1, backgroundColor: colors.background }, pageContent: { flexGrow: 1, width: '100%', maxWidth: '100%' }, hidden: { display: 'none' },
  hero: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 64, alignItems: 'center', gap: 20 },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 36, gap: 16 }, heroTitle: { color: colors.charcoal, fontSize: 48, lineHeight: 55, fontWeight: '900', letterSpacing: -1.6, textAlign: 'center' }, heroTitleMobile: { fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  heroBody: { color: colors.charcoalSoft, fontSize: 17, lineHeight: 26, textAlign: 'center', maxWidth: 580 }, heroActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
  benefits: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }, benefit: { color: colors.muted, fontSize: 12, fontWeight: '700' }, benefitDot: { color: colors.primary },
  band: { width: '100%' }, whiteBand: { backgroundColor: colors.surfaceRaised }, productBand: { backgroundColor: colors.navySoft },
  section: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 36, gap: 22 }, heading: { width: '100%', maxWidth: 740, alignSelf: 'center', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.primaryDark, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' }, sectionTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 }, sectionBody: { color: colors.muted, lineHeight: 23, textAlign: 'center', maxWidth: 640 },
  button: { borderRadius: radii.md, alignSelf: 'center', maxWidth: '100%' }, buttonContent: { minHeight: controlHeights.standard, paddingHorizontal: 12 }, fullButton: { width: '100%' },
  searchRow: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', gap: 10, alignItems: 'center' }, searchRowMobile: { flexDirection: 'column', alignItems: 'stretch' }, searchInput: { flex: 1, width: '100%', minWidth: 0, backgroundColor: colors.surfaceRaised }, inputOutline: { borderRadius: radii.md },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, tradeCard: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 150, minWidth: 0, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surfaceRaised, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 52 }, tradeName: { flex: 1, color: colors.charcoal, fontSize: 14, fontWeight: '700' }, tradeArrow: { color: colors.primary, fontSize: 18 }, pressed: { opacity: 0.8 },
  stepGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, step: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 280, minWidth: 0, gap: 8, padding: 12 }, stepNumber: { color: colors.primary, fontSize: 26, fontWeight: '900' }, cardTitle: { color: colors.charcoal, fontSize: 20, lineHeight: 26, fontWeight: '800' }, cardText: { color: colors.charcoalSoft, lineHeight: 23 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, choice: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 360, minWidth: 0, borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 12 }, paymentChoice: { backgroundColor: colors.accentSoft, borderColor: '#CDE2DE' }, smallText: { color: colors.muted, fontSize: 12, lineHeight: 18 }, trustStrip: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 22, gap: 8 }, trustTitle: { color: colors.charcoal, fontSize: 17, fontWeight: '800' },
  faqList: { gap: 8, width: '100%', maxWidth: 820, alignSelf: 'center' }, faqCard: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 16, gap: 12 }, faqRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'center' }, faqQuestion: { flex: 1, color: colors.charcoal, fontSize: 16, lineHeight: 23, fontWeight: '700' }, faqToggle: { color: colors.primary, fontSize: 22 },
});