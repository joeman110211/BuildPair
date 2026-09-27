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

const POPULAR_TRADES = ['Tiling', 'Plumbing', 'Electrical', 'Building & Extensions', 'Roofing & Roofline', 'Painting & Decorating', 'Kitchens', 'Bathrooms'] as const;
const HERO_BENEFITS = ['Whole project in one place', 'Local matching by real service area', 'No pay-per-lead for trades'] as const;

const FAQS = [
  ['Is BuildPair free for tradespeople?', 'Yes. Starter is £0/month. Paid plans add more marketplace access and business tools, but BuildPair does not charge tradespeople per lead.'],
  ['Do tradespeople pay for individual leads?', 'No. BuildPair uses membership-based marketplace access rather than selling the same contact details as individual paid leads.'],
  ['What makes BuildPair different from a lead-generation site?', 'BuildPair is designed around the whole project. It helps homeowners find and compare trades, then keeps structured quotes, messages, changes, project records and supported payments connected after the introduction. Tradespeople do not pay per lead.'],
  ['How does BuildPay work?', 'BuildPay supports agreed staged payments through Stripe. A stage follows the recorded quote and release workflow. If a trade requests BuildPay, the trade carries the applicable BuildPay cost; if a homeowner adds it, the homeowner pays the separately disclosed service fee.'],
  ['What does BuildPair verification mean?', 'BuildPair can show the review status of submitted credentials and project-linked activity. It does not replace an issuing register, regulator, building-control body or the checks appropriate to the work.'],
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
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>Built around the project, not the lead</Text></View>
        <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Find trusted local tradespeople. Compare quotes clearly. Manage the whole job in one place.</Text>
        <Text variant="titleMedium" style={styles.heroSubtitle}>BuildPair connects homeowners with local tradespeople and keeps the project organised from first search to final payment. Structured quotes, messages, agreed changes and payment records stay connected to the same job.</Text>
        <View style={styles.heroBenefits}>
          {HERO_BENEFITS.map((item) => <View key={item} style={styles.heroBenefit}><Text style={styles.heroBenefitMark}>✓</Text><Text style={styles.heroBenefitText}>{item}</Text></View>)}
        </View>
        {mobile ? <View style={styles.heroActionsMobile} testID="home-hero-actions">
          <Button mode="contained" icon="magnify" style={[styles.buttonBase, styles.mobileWideAction]} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button>
          <View style={styles.mobileActionRow}>
            <Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/auth/sign-up?mode=trader')}>Create trade profile</Button>
            <Button mode="text" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/how-it-works')}>How it works</Button>
          </View>
        </View> : <View style={styles.heroActions} testID="home-hero-actions">
          <Button mode="contained" icon="magnify" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button>
          <Link href="/auth/sign-up?mode=trader" asChild><Button mode="outlined" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent}>Create trade profile</Button></Link>
          <Link href="/(public)/how-it-works" asChild><Button mode="text" style={[styles.buttonBase, styles.heroActionButton]} contentStyle={styles.buttonContent}>How it works</Button></Link>
        </View>}
      </View>
    </View>

    <View style={styles.featuredBand}>
      <View style={styles.featuredSection}>
        <SectionHeading eyebrow="Featured tradespeople" title="Meet tradespeople on BuildPair." body="Explore real local profiles, see what each business does and open a profile for more detail." />
        <FeaturedTraderHero wide={wide} />
      </View>
    </View>

    <View style={styles.tradeBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Find a trade" title="Search by the job, not the jargon." body="Know the trade? Search directly. Not sure? Describe the work in normal English and use BuildPair as the starting point." />
        <View style={styles.heroSearch}>
          <TextInput mode="outlined" value={search} onChangeText={setSearch} onSubmitEditing={() => goSearch(search)} placeholder="Describe the job, e.g. bathroom tiling" outlineStyle={styles.inputOutline} />
          <Button mode="contained" icon="magnify" style={[styles.buttonBase, styles.buttonFull]} contentStyle={[styles.buttonContent, mobile && styles.mobilePrimaryContent]} onPress={() => goSearch(search)}>Find a trade</Button>
        </View>
        <View style={styles.tradeGrid}>
          {POPULAR_TRADES.map((trade) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button"><Text style={styles.tradeName}>{trade}</Text><Text style={styles.tradeArrow}>→</Text></Pressable>)}
        </View>
        <Link href="/(public)/directory" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>Browse all {TRADE_CATEGORIES.length} trade categories →</Button></Link>
      </View>
    </View>

    <View style={styles.audienceBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Built for both sides" title="Two sides. One connected project." body="Homeowners get clarity and control. Tradespeople get a fairer way to win work and professional tools that stay useful after the job is won." />
        <View style={styles.audienceGrid}>
          <View style={[styles.audienceCard, styles.tradeAudienceCard]}>
            <Text style={[styles.audienceEyebrow, styles.tradeAudienceEyebrow]}>FOR TRADESPEOPLE</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>More than a place to find work. Quote it. Manage it. Get paid for it.</Text>
            <Text style={styles.cardText}>No pay-per-lead. Build a professional profile, find suitable local work, send structured quotes and keep customers, messages, changes and payment stages connected to the job.</Text>
            {mobile ? <View style={styles.audienceActions}><Button mode="contained" style={[styles.buttonBase, styles.mobileWideAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/auth/sign-up?mode=trader')}>Create trade profile</Button><View style={styles.mobileActionRow}><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/for-tradespeople')}>Trade features</Button><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/pricing')}>Membership</Button></View></View> : <View style={styles.audienceActions}><Link href="/auth/sign-up?mode=trader" asChild><Button mode="contained" style={styles.buttonBase} contentStyle={styles.buttonContent}>Create trade profile</Button></Link><Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>See trade features</Button></Link><Link href="/(public)/pricing" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>View membership</Button></Link></View>}
          </View>
          <View style={[styles.audienceCard, styles.homeownerCard]}>
            <Text style={styles.audienceEyebrow}>FOR HOMEOWNERS</Text>
            <Text variant="headlineSmall" style={styles.cardTitle}>Clearer quotes, fewer scattered messages and more control over the job.</Text>
            <Text style={styles.cardText}>Post once, compare structured quotes, choose the right trade and keep messages, agreed changes, project records and payment stages together.</Text>
            {mobile ? <View style={styles.audienceActions}><View style={styles.mobileActionRow}><Button mode="contained" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Button mode="outlined" style={[styles.buttonBase, styles.mobileHalfAction]} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/for-homeowners')}>For homeowners</Button></View></View> : <View style={styles.audienceActions}><Button mode="contained" style={styles.buttonBase} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button><Link href="/(public)/for-homeowners" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>For homeowners</Button></Link></View>}
          </View>
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="How BuildPair works" title="Two simple journeys. One project record." body="The platform stays useful before the job, while it is happening and after it is finished." />
      <View style={styles.journeyGrid}>
        <View style={[styles.journeyCard, styles.tradeJourneyCard]}>
          <Text style={[styles.audienceEyebrow, styles.tradeAudienceEyebrow]}>TRADESPEOPLE</Text>
          <Text variant="titleLarge" style={styles.cardTitle}>Create profile → Find work → Quote → Manage → Get paid</Text>
          <Text style={styles.cardText}>Build your presence, work inside a genuine service area and manage both marketplace jobs and customers you already find elsewhere.</Text>
        </View>
        <View style={[styles.journeyCard, styles.homeJourneyCard]}>
          <Text style={styles.audienceEyebrow}>HOMEOWNERS</Text>
          <Text variant="titleLarge" style={styles.cardTitle}>Post → Compare → Choose → Manage → Pay</Text>
          <Text style={styles.cardText}>Turn the job into a clearer brief, compare structured quotes and keep the important decisions attached to the project.</Text>
        </View>
      </View>
      <View style={styles.microCopyRow}>
        {['No more confusing quotes', 'No more scattered messages', 'Everything for the job in one place'].map((item) => <View key={item} style={styles.microCopyPill}><Text style={styles.microCopyText}>✓ {item}</Text></View>)}
      </View>
      <Link href="/(public)/how-it-works" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>See the full process →</Button></Link>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Built around the project" title="The useful bit starts after the match." body="Finding each other is only the beginning. BuildPair is designed to keep the quote, decisions, changes and project record connected after the work is won." />
      <View style={styles.featureGrid}>
        {[
          ['Structured quotes', 'Show labour, materials, VAT, scope, exclusions, timing, warranty and proposed payment stages in a clearer format.'],
          ['Project workspace', 'Keep messages, progress, variations, evidence, snagging and handover attached to the same job.'],
          ['AI-assisted planning', 'Describe the problem normally and use BuildPair to turn rough information into a clearer starting brief and more relevant trade suggestions.'],
          ['Project-linked records', 'Keep the important decisions and activity around a real project instead of losing context across separate apps.'],
        ].map(([title, copy]) => <View key={title} style={styles.featureCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
      </View>
    </View>

    <View style={styles.localBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Local by design" title="Jobs matched around where trades actually work." body="BuildPair uses a genuine service base and working radius so local means more than simply appearing in a national directory search." />
        <View style={styles.localGrid}>
          <View style={styles.localCard}><Text style={styles.localIcon}>⌖</Text><Text variant="titleMedium" style={styles.cardTitle}>Real service areas</Text><Text style={styles.cardText}>Trades set where they are based and how far they genuinely travel for work.</Text></View>
          <View style={styles.localCard}><Text style={styles.localIcon}>◎</Text><Text variant="titleMedium" style={styles.cardTitle}>Relevant local opportunities</Text><Text style={styles.cardText}>Marketplace matching is designed around trade, service and distance rather than vague nationwide coverage.</Text></View>
          <View style={styles.localCard}><Text style={styles.localIcon}>↗</Text><Text variant="titleMedium" style={styles.cardTitle}>Useful local coverage</Text><Text style={styles.cardText}>BuildPair is designed to grow area by area so local matching stays useful as the marketplace expands.</Text></View>
        </View>
      </View>
    </View>

    <View style={styles.compareBand}>
      <View style={styles.section}>
        <View style={styles.darkHeading}>
          <Text style={styles.darkEyebrow}>WHY IT IS DIFFERENT</Text>
          <Text variant="headlineMedium" style={styles.darkTitle}>Not another pay-per-lead directory.</Text>
          <Text style={styles.darkBody}>Traditional lead generation tends to focus on the introduction. BuildPair is designed around the whole project and stays useful after the work is won.</Text>
        </View>
        <View style={styles.comparisonGrid}>
          <View style={[styles.comparisonCard, styles.traditionalCard]}>
            <Text style={styles.comparisonLabel}>TRADITIONAL LEAD-GEN</Text>
            {['Often pay for individual opportunities', 'Quotes can arrive in completely different formats', 'Messages and changes can scatter across different channels', 'The platform may add little once the introduction is made'].map((item) => <Text key={item} style={styles.comparisonItemMuted}>• {item}</Text>)}
          </View>
          <View style={[styles.comparisonCard, styles.buildPairCard]}>
            <Text style={styles.comparisonLabelAccent}>BUILDPAIR</Text>
            {['No pay-per-lead', 'Structured quoting designed for clearer comparison', 'Project-linked communication, changes and records', 'Tools to quote, manage the work and handle supported staged payments'].map((item) => <Text key={item} style={styles.comparisonItem}>✓ {item}</Text>)}
          </View>
        </View>
        <Link href="/auth/sign-up?mode=trader" asChild><Button mode="contained" icon="account-plus-outline" buttonColor={colors.primary} style={styles.darkCta} contentStyle={styles.buttonContent}>Create your trade profile</Button></Link>
      </View>
    </View>

    <View style={styles.paymentBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="BuildPay" title="Protected staged payments, kept clear." body="BuildPay keeps supported payment stages connected to the accepted quote. Detailed rules stay on the payment page; the homepage only needs the important bit." />
        <View style={styles.paymentGrid}>
          <View style={styles.paymentCard}>
            <Text style={styles.paymentStepNumber}>01</Text>
            <Text variant="titleMedium" style={styles.cardTitle}>Agree the stages</Text>
            <Text style={styles.cardText}>Materials, work stages and release points are recorded against the structured quote.</Text>
          </View>
          <View style={styles.paymentCard}>
            <Text style={styles.paymentStepNumber}>02</Text>
            <Text variant="titleMedium" style={styles.cardTitle}>Fund and progress</Text>
            <Text style={styles.cardText}>Supported stages use the Stripe payment flow and release only through the recorded BuildPair stage process.</Text>
          </View>
          <View style={styles.paymentCard}>
            <Text style={styles.paymentStepNumber}>03</Text>
            <Text variant="titleMedium" style={styles.cardTitle}>The requester carries the BuildPay cost</Text>
            <Text style={styles.cardText}>If the trade requests BuildPay, the trade absorbs the applicable cost. If the homeowner adds it, the homeowner sees the separate service fee before committing.</Text>
          </View>
        </View>
        <View style={styles.directPaymentNote}>
          <Text variant="titleMedium" style={styles.cardTitle}>Prefer to pay privately?</Text>
          <Text style={styles.cardText}>Either side can propose direct payment and the other must agree. The project can remain organised in BuildPair, but BuildPay protection and Stripe release controls do not apply to money paid outside the platform.</Text>
        </View>
        <Link href="/(public)/payments" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>How BuildPay works</Button></Link>
      </View>
    </View>

    <View style={styles.trustBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Trust & safety" title="Clearer evidence. Better context. No false guarantees." body="BuildPair organises useful trust signals and project history while keeping the limits honest. The right checks still depend on the work being commissioned." />
        <View style={styles.trustGrid}>
          {[
            ['Credential status', 'Submitted credentials can show a BuildPair review status without pretending to replace the issuing register or authority.'],
            ['Project-linked reviews', 'Reviews can be connected to completed BuildPair activity where applicable, adding useful context behind the rating.'],
            ['Two-way reporting', 'Homeowners and tradespeople can report concerns for human review and proportionate moderation.'],
            ['Location privacy', 'Public jobs use outward location information while more precise matching data stays server-side.'],
          ].map(([title, copy]) => <View key={title} style={styles.trustCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
        </View>
        <Link href="/(public)/trust-safety" asChild><Button mode="outlined" style={styles.buttonBase} contentStyle={styles.buttonContent}>Read about trust & safety</Button></Link>
      </View>
    </View>

    <View style={styles.founderBand}>
      <View style={styles.section}>
        <View style={styles.founderCard}>
          <View style={styles.founderCopy}>
            <Text style={styles.darkEyebrow}>WHY BUILDPAIR EXISTS</Text>
            <Text variant="headlineSmall" style={styles.founderTitle}>Built from real trade experience, around the problems that happen on real jobs.</Text>
            <Text style={styles.founderBody}>BuildPair was created because finding a tradesperson is only the start. Clear briefs, fairer lead economics, better quotes, recorded changes and a usable project history matter to both sides.</Text>
          </View>
          <Link href="/(public)/about" asChild><Button mode="contained" buttonColor={colors.secondary} textColor={colors.charcoal} style={styles.buttonBase} contentStyle={styles.buttonContent}>Why BuildPair was built</Button></Link>
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Advice & guidance" title="Useful answers before the work starts." body="BuildPair's Advice Hub brings together practical project guidance and direct links to official UK sources where regulation, registration or consumer rights matter." />
      <View style={styles.adviceGrid}>
        <Pressable style={styles.adviceCard} onPress={() => router.push('/(public)/advice')} accessibilityRole="button"><Text style={styles.adviceKicker}>PROJECT GUIDANCE</Text><Text variant="titleMedium" style={styles.cardTitle}>Plan with fewer surprises</Text><Text style={styles.cardText}>Scope, evidence, consumer guidance and sensible habits before and during the job.</Text><Text style={styles.adviceArrow}>Open Advice Hub →</Text></Pressable>
        <Pressable style={styles.adviceCard} onPress={() => router.push('/(public)/building-regulations')} accessibilityRole="button"><Text style={styles.adviceKicker}>UK BUILDING RULES</Text><Text variant="titleMedium" style={styles.cardTitle}>Know where to check</Text><Text style={styles.cardText}>Official starting points for building standards, notifiable work and competent-person schemes.</Text><Text style={styles.adviceArrow}>View building guidance →</Text></Pressable>
        <Pressable style={styles.adviceCard} onPress={() => router.push('/(public)/trust-safety')} accessibilityRole="button"><Text style={styles.adviceKicker}>TRUST & SAFETY</Text><Text variant="titleMedium" style={styles.cardTitle}>Understand the trust signals</Text><Text style={styles.cardText}>How credentials, reviews, reports and privacy are handled without overselling what a badge can prove.</Text><Text style={styles.adviceArrow}>Read trust guidance →</Text></Pressable>
      </View>
    </View>

    <View style={styles.pricingBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Tradesperson membership" title="Start free. Pay for tools and access, not individual leads." body="Starter is £0/month. Core, Plus and Pro add increasing marketplace capacity and business tools as you need them." />
        <PricingCards compact />
        <Link href="/(public)/pricing" asChild><Button mode="text" style={styles.buttonBase} contentStyle={styles.buttonContent}>Compare membership plans and full details →</Button></Link>
      </View>
    </View>

    <View style={styles.faqBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Questions" title="Straight answers before you join." />
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
        <SectionHeading eyebrow="BuildPair roadmap" title="A working platform that keeps getting better." body="BuildPair is built around the full job, with improvements added to the marketplace, project workspace and business tools over time." />
        <View style={styles.updateColumns}>
          <View style={styles.updatePanel}>
            <Chip icon="check-circle-outline">Core platform</Chip>
            {[
              'Local trade profiles, service areas and marketplace matching',
              'Structured quotes, messaging and managed project workspace',
              'BuildPay staged-payment workflow, trust pages and Advice Hub',
            ].map((item) => <Text key={item} style={styles.updateItem}>✓ {item}</Text>)}
          </View>
          <View style={[styles.updatePanel, styles.launchPanel]}>
            <Chip icon="sparkles-outline">Recently added</Chip>
            {[
              'Outside-customer quotes and managed projects',
              'Customer book, working calendar and richer project records',
              'Project+ planning and room-concept tools',
            ].map((item) => <Text key={item} style={styles.updateItem}>• {item}</Text>)}
          </View>
          <View style={[styles.updatePanel, styles.comingPanel]}>
            <Chip icon="clock-outline">Coming next</Chip>
            {[
              'Smarter quote, invoice and aftercare reminders',
              'Calendar sync and richer document packs',
              'Additional team, design and communication tools',
            ].map((item) => <Text key={item} style={styles.updateItem}>• {item}</Text>)}
          </View>
        </View>
        <Link href="/(public)/updates" asChild><Button mode="outlined" icon="update" style={styles.buttonBase} contentStyle={styles.buttonContent}>See product updates</Button></Link>
      </View>
    </View>

    <View style={styles.finalCtaBand}>
      <View style={styles.finalCta}>
        <Text style={styles.darkEyebrow}>BUILDPAIR</Text>
        <Text variant="headlineMedium" style={styles.finalTitle}>A better way to get the job done.</Text>
        <Text style={styles.finalBody}>Find the right local trade, compare the work clearly and keep the project connected. Tradespeople get a fairer way to find work and practical tools to manage it.</Text>
        <View style={styles.finalActions}>
          <Button mode="contained" icon="magnify" buttonColor={colors.primary} style={styles.buttonBase} contentStyle={styles.buttonContent} onPress={() => goSearch('')}>Find a trade</Button>
          <Link href="/auth/sign-up?mode=trader" asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.buttonBase} contentStyle={styles.buttonContent}>Create trade profile</Button></Link>
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
  heroSearch: { gap: 10, width: '100%', maxWidth: 760, alignSelf: 'center' },
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
  heroActions: { width: '100%', maxWidth: 760, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' },
  heroActionsMobile: { width: '100%', gap: 8, alignItems: 'stretch' },
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
  homeownerCard: { borderTopWidth: 4, borderTopColor: colors.primary, flexGrow: 0.9 },
  tradeAudienceCard: { borderTopWidth: 4, borderTopColor: colors.navy, backgroundColor: '#FAFCFE', flexGrow: 1.25 },
  audienceEyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  tradeAudienceEyebrow: { color: colors.navy },
  audienceActions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 6 },
  journeyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  journeyCard: { flexGrow: 1, flexShrink: 1, flexBasis: 390, minWidth: 0, borderRadius: 22, padding: 20, gap: 9, borderWidth: 1 },
  tradeJourneyCard: { backgroundColor: '#F4F8FB', borderColor: '#CAD6E0' },
  homeJourneyCard: { backgroundColor: '#FFF8F2', borderColor: '#F0C9AA' },
  microCopyRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  microCopyPill: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  microCopyText: { color: colors.charcoalSoft, fontSize: 12, fontWeight: '800' },
  cardTitle: { minWidth: 0, maxWidth: '100%', color: colors.charcoal, fontWeight: '900' },
  cardText: { minWidth: 0, maxWidth: '100%', color: colors.muted, lineHeight: 22 },
  tradeBand: { backgroundColor: colors.surfaceSoft },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tradeCard: { flexGrow: 1, flexShrink: 1, flexBasis: 230, minWidth: 0, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeName: { flexShrink: 1, minWidth: 0, color: colors.charcoal, fontWeight: '800' },
  tradeArrow: { flexShrink: 0, color: colors.primary, fontWeight: '900' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  featureCard: { flexGrow: 1, flexShrink: 1, flexBasis: 250, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: 18, padding: 17, gap: 7, borderWidth: 1, borderColor: colors.border },
  localBand: { backgroundColor: '#F2F7F5' },
  localGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  localCard: { flexGrow: 1, flexShrink: 1, flexBasis: 260, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, gap: 7, borderWidth: 1, borderColor: '#CDE2DE' },
  localIcon: { color: colors.accent, fontSize: 25, fontWeight: '900' },
  compareBand: { backgroundColor: colors.charcoal },
  darkHeading: { width: '100%', maxWidth: 820, alignSelf: 'center', alignItems: 'center', gap: 8 },
  darkEyebrow: { color: colors.secondary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  darkTitle: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  darkBody: { color: '#D7DEE3', lineHeight: 23, textAlign: 'center', maxWidth: 720 },
  comparisonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  comparisonCard: { flexGrow: 1, flexShrink: 1, flexBasis: 360, minWidth: 0, borderRadius: 22, padding: 20, gap: 9, borderWidth: 1 },
  traditionalCard: { backgroundColor: '#30373E', borderColor: '#4B555E' },
  buildPairCard: { backgroundColor: '#FFF9F4', borderColor: '#E8B98F' },
  comparisonLabel: { color: '#BFC8CE', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  comparisonLabelAccent: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  comparisonItemMuted: { color: '#E4E9EC', lineHeight: 22 },
  comparisonItem: { color: colors.charcoalSoft, lineHeight: 22, fontWeight: '700' },
  darkCta: { alignSelf: 'center', borderRadius: radii.md },
  paymentBand: { backgroundColor: '#FFF4EA' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  paymentCard: { flexGrow: 1, flexShrink: 1, flexBasis: 250, minWidth: 0, borderRadius: 20, padding: 18, gap: 8, borderWidth: 1, borderColor: '#E8D7C7', backgroundColor: '#FFFFFF' },
  paymentStepNumber: { color: colors.primary, fontWeight: '900', letterSpacing: 1.1 },
  directPaymentNote: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E8D7C7', padding: 18, gap: 7 },
  trustBand: { backgroundColor: '#F6FBFA' },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  trustCard: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, gap: 7, borderWidth: 1, borderColor: '#CDE2DE' },
  founderBand: { backgroundColor: '#FBF8F5' },
  founderCard: { width: '100%', backgroundColor: colors.navy, borderRadius: 26, padding: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18 },
  founderCopy: { flex: 1, minWidth: 240, maxWidth: 760, gap: 7 },
  founderTitle: { color: '#FFFFFF', fontWeight: '900' },
  founderBody: { color: '#D8E2E9', lineHeight: 22 },
  adviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  adviceCard: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, backgroundColor: colors.surfaceRaised, borderRadius: 20, padding: 18, gap: 7, borderWidth: 1, borderColor: colors.border },
  adviceKicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  adviceArrow: { color: colors.primaryDark, fontSize: 12, fontWeight: '900', marginTop: 3 },
  pricingBand: { backgroundColor: '#FBF8F5' },
  updatesBand: { backgroundColor: '#F6FBFA' },
  updateColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  updatePanel: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, padding: 18, gap: 9, borderRadius: 18, borderWidth: 1, borderColor: '#CDE2DE', backgroundColor: colors.surfaceRaised },
  launchPanel: { backgroundColor: '#FFF8F2', borderColor: '#F0C9AA' },
  comingPanel: { backgroundColor: '#FAFCFE', borderColor: '#CAD6E0' },
  updateItem: { color: colors.charcoalSoft, lineHeight: 22 },
  faqBand: { backgroundColor: colors.surfaceSoft },
  faqList: { gap: 9, maxWidth: 900, width: '100%', minWidth: 0, alignSelf: 'center' },
  faqCard: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, gap: 8 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqToggle: { flexShrink: 0, color: colors.primary, fontSize: 24, fontWeight: '900' },
  finalCtaBand: { backgroundColor: colors.charcoal, paddingHorizontal: 18, paddingVertical: 54 },
  finalCta: { width: '100%', maxWidth: 900, alignSelf: 'center', alignItems: 'center', gap: 12 },
  finalTitle: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  finalBody: { color: '#D7DEE3', lineHeight: 23, textAlign: 'center', maxWidth: 700 },
  finalActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 4 },
});
