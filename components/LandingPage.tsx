import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { PricingCards } from '@/components/PricingCards';
import { PublicFooter } from '@/components/PublicFooter';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';

const POPULAR_TRADES = ['Tiling', 'Plumbing', 'Electrical', 'Building & Extensions', 'Roofing & Roofline', 'Painting & Decorating', 'Kitchens', 'Bathrooms'] as const;

const FAQS = [
  ['What happens if a tradesperson cannot quote from photos?', 'They can arrange a site visit through the BuildPair job before quoting. After the visit, the formal quote and proposed payment stages are sent back through BuildPair so the project can continue in one place.'],
  ['Can I change the payment stages in a quote?', 'You can propose a different split or timing for the payment stages without changing the tradesperson’s total quote. If you edit the stages, the tradesperson must agree the revised plan before you can accept the quote.'],
  ['How do BuildPair staged payments work?', 'After a quote is accepted, you can choose BuildPair staged payments. Materials payments are released for the agreed materials. Other agreed stages are funded through Stripe first, then released after the tradesperson reaches the agreed trigger and the homeowner approves release.'],
  ['Can we just arrange payment ourselves?', 'Yes. Both sides can choose a private payment arrangement. BuildPair will keep the quote, messages and project record, but its payment-stage controls and Stripe payment evidence do not apply to money exchanged privately.'],
  ['Does BuildPair hold money in legal escrow?', 'No. BuildPair does not describe its payment service as legal escrow. Payments are processed through Stripe and BuildPair controls the project workflow and transfer instructions for eligible stages. The platform does not guarantee workmanship.'],
  ['What memberships are available to tradespeople?', 'Starter is £0/month, BuildPair Plus is £19.99/month and BuildPair Pro is £29.99/month. Paid plans add marketplace selling capacity and business tools. Project transaction fees are separate and shown in the applicable payment information.'],
] as const;

function SectionHeading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <View style={styles.sectionHeading}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text variant="headlineMedium" style={styles.sectionTitle}>{title}</Text>
    {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
  </View>;
}

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };
  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <View style={[styles.hero, wide && styles.heroWide]}>
      <View style={styles.heroCopy}>
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>Built for UK homeowners and tradespeople</Text></View>
        <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Find the right trade. Compare properly. Keep the whole job together.</Text>
        <Text variant="titleMedium" style={styles.heroSubtitle}>BuildPair takes a project from “who do I need?” through messages, site visits, structured quotes, agreed payment stages, variations, completion and review without making the introduction the end of the app.</Text>
        <View style={styles.heroSearch}>
          <TextInput mode="outlined" value={search} onChangeText={setSearch} onSubmitEditing={() => goSearch(search)} placeholder="What do you need done? e.g. bathroom tiling" outlineStyle={styles.inputOutline} />
          <Button mode="contained" contentStyle={styles.searchButton} onPress={() => goSearch(search)}>Find a trade</Button>
        </View>
        <View style={styles.heroActions}>
          <Link href="/auth/account" asChild><Button mode="contained-tonal">Post a job</Button></Link>
          <Link href="/(public)/for-tradespeople" asChild><Button mode="outlined">I’m a tradesperson</Button></Link>
          <Link href="/(public)/how-it-works" asChild><Button mode="text">How it works</Button></Link>
        </View>
      </View>
      <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1625577816360-32388b70471c?auto=format&fit=crop&w=1600&q=84' }} style={styles.heroVisual} imageStyle={styles.heroImage} accessibilityLabel="Home renovation project">
        <View style={styles.heroShade} />
        <View style={styles.heroCaption}><Text style={styles.heroCaptionSmall}>ONE PROJECT RECORD</Text><Text style={styles.heroCaptionBig}>Request → Visit or quote → Agree → Fund → Build → Approve → Complete</Text></View>
      </ImageBackground>
    </View>

    <View style={styles.credibilityBand}>
      <View style={styles.credibilityInner}>
        <View style={styles.credibilityItem}><Text style={styles.credibilityValue}>{TRADE_CATEGORIES.length}</Text><Text style={styles.credibilityLabel}>broad trade categories</Text></View>
        <View style={styles.credibilityItem}><Text style={styles.credibilityValue}>1</Text><Text style={styles.credibilityLabel}>connected project record</Text></View>
        <View style={styles.credibilityItem}><Text style={styles.credibilityValue}>2</Text><Text style={styles.credibilityLabel}>payment routes after hiring</Text></View>
        <View style={styles.credibilityItem}><Text style={styles.credibilityValue}>0</Text><Text style={styles.credibilityLabel}>need to know the trade first</Text></View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Start where you are" title="Post a job without pretending every quote can be done from a photograph." body="Some jobs can be priced remotely. Plenty cannot. BuildPair supports both routes rather than forcing the real world into a neat little internet form." />
      <View style={styles.routeGrid}>
        <View style={styles.routeCard}><Text style={styles.routeNumber}>01</Text><Text variant="titleLarge" style={styles.cardTitle}>Post or request a quote</Text><Text style={styles.cardText}>Describe the job, add photos if useful and contact a suitable tradesperson directly or publish it to the marketplace.</Text></View>
        <View style={styles.routeCard}><Text style={styles.routeNumber}>02</Text><Text variant="titleLarge" style={styles.cardTitle}>Quote now or arrange a visit</Text><Text style={styles.cardText}>The tradesperson can ask questions, quote from the information available, or arrange a site visit in BuildPair before pricing.</Text></View>
        <View style={styles.routeCard}><Text style={styles.routeNumber}>03</Text><Text variant="titleLarge" style={styles.cardTitle}>Agree the quote and stages</Text><Text style={styles.cardText}>The quote shows scope, exclusions, timing and proposed payment stages. The homeowner can propose stage changes without changing the quote total.</Text></View>
        <View style={styles.routeCard}><Text style={styles.routeNumber}>04</Text><Text variant="titleLarge" style={styles.cardTitle}>Keep working from the job</Text><Text style={styles.cardText}>Once accepted, the job stays on both dashboards with the next action, messages, payment stages, variations, timeline and completion record.</Text></View>
      </View>
    </View>

    <View style={styles.paymentBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="BuildPair staged payments" title="Agree the money before the work gets awkward." body="An accepted quote can become a staged project instead of a handshake followed by six weeks of trying to remember what somebody said in a kitchen." />
        <View style={styles.paymentGrid}>
          <View style={[styles.paymentCard, styles.protectedCard]}>
            <Chip icon="shield-check-outline" style={styles.cardChip}>BuildPair staged payments</Chip>
            <Text variant="headlineSmall" style={styles.cardTitle}>Keep the payment stages inside the project.</Text>
            <Text style={styles.cardText}>Materials can be paid and released for the agreed materials. Deposits, progress stages and the final stage can be funded through Stripe, then released after the agreed trigger is reached and the homeowner approves it.</Text>
            <View style={styles.checkList}>
              {['One agreed payment schedule attached to the quote', 'One stage unlocked at a time', 'Homeowner approval before controlled stage release', 'Unreleased stage can be paused if an issue is raised', 'Variations and payment history stay attached to the job'].map((item) => <View key={item} style={styles.checkRow}><Text style={styles.check}>✓</Text><Text style={styles.checkText}>{item}</Text></View>)}
            </View>
            <Text style={styles.smallPrint}>Payments are processed by Stripe. BuildPair does not store raw card or bank details, does not describe the service as legal escrow and does not guarantee the quality of building work.</Text>
          </View>
          <View style={[styles.paymentCard, styles.privateCard]}>
            <Chip icon="account-arrow-right-outline" style={styles.cardChip}>Private payment arrangement</Chip>
            <Text variant="headlineSmall" style={styles.cardTitle}>You can still deal directly.</Text>
            <Text style={styles.cardText}>BuildPair does not trap users inside the platform. You can arrange payment privately after hiring, while keeping the quote, messages and project record in BuildPair.</Text>
            <View style={styles.warningBox}><Text style={styles.warningTitle}>What changes if you pay privately</Text><Text style={styles.warningText}>BuildPair cannot process, control, release, refund or recover money exchanged outside its payment flow. BuildPair payment-stage controls and Stripe payment evidence do not apply to those transactions.</Text></View>
            <Link href="/(public)/terms" asChild><Button mode="outlined">Read payment terms</Button></Link>
          </View>
        </View>
        <View style={styles.paymentFlow}>
          {[
            ['1', 'Stage funded', 'The homeowner pays the next agreed stage through Stripe.'],
            ['2', 'Work reaches trigger', 'The tradesperson marks the agreed completion point reached.'],
            ['3', 'Homeowner checks', 'Approve release or raise an issue before an unreleased controlled stage moves.'],
            ['4', 'Stripe transfer', 'BuildPair instructs the approved payout to the connected tradesperson account.'],
          ].map(([number, title, copy]) => <View key={number} style={styles.paymentStep}><Text style={styles.paymentStepNumber}>{number}</Text><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Find a starting point" title="Search by the work, not the vocabulary." body="Pick a trade if you know it. If you do not, describe the problem and let BuildPair narrow the starting point." />
      <View style={styles.tradeGrid}>
        {POPULAR_TRADES.map((trade) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button"><Text style={styles.tradeName}>{trade}</Text><Text style={styles.tradeArrow}>→</Text></Pressable>)}
      </View>
      <Link href="/(public)/directory" asChild><Button mode="text">Browse all {TRADE_CATEGORIES.length} trade categories →</Button></Link>
    </View>

    <View style={styles.featureBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Useful after the match" title="The boring machinery is the point." body="Matching is useful. Keeping the agreement, conversation and money tied to the same job is what stops BuildPair becoming another lead list." />
        <View style={styles.featureGrid}>
          {[
            ['AI-assisted job planning', 'Turn an ordinary-language problem into a clearer job brief without pretending AI replaces a qualified trade or inspection.'],
            ['Structured quotes', 'Labour, materials, VAT, scope, exclusions, timing, warranty and payment stages can be compared rather than buried in messages.'],
            ['Job-linked messages', 'The conversation stays attached to the job, with notifications and clear next actions instead of becoming the endpoint.'],
            ['Variations before extras', 'Price and scope changes can be proposed and approved before additional work becomes another argument after the fact.'],
            ['Project timeline', 'Quote acceptance, stage funding, release, variations and completion events remain easier to follow later.'],
            ['Verified project reputation', 'Completed BuildPair activity can contribute useful review context rather than leaving reputation detached from the work.'],
          ].map(([title, copy]) => <View key={title} style={styles.featureCard}><Text variant="titleMedium" style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{copy}</Text></View>)}
        </View>
      </View>
    </View>

    <View style={styles.pricingBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Tradesperson membership" title="Start free. Upgrade when BuildPair is helping you win work." body="Starter establishes the profile. Plus and Pro add marketplace capacity and deeper business tools. Payment transaction fees are separate from membership and disclosed in the applicable payment information." />
        <PricingCards compact />
        <Link href="/(public)/pricing" asChild><Button mode="text">See full membership details →</Button></Link>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Practical guidance" title="Useful even before you hire anyone." body="Project planning, building-rules links and trust information remain public." />
      <View style={styles.adviceGrid}>
        <Link href="/(public)/advice" asChild><Pressable style={styles.adviceCard}><Text variant="titleLarge" style={styles.cardTitle}>Advice Hub</Text><Text style={styles.cardText}>Planning, quoting, communication and project guidance.</Text><Text style={styles.tradeArrow}>Explore →</Text></Pressable></Link>
        <Link href="/(public)/building-regulations" asChild><Pressable style={styles.adviceCard}><Text variant="titleLarge" style={styles.cardTitle}>Building Rules</Text><Text style={styles.cardText}>Start from current official sources for permissions and regulated work.</Text><Text style={styles.tradeArrow}>Explore →</Text></Pressable></Link>
        <Link href="/(public)/trust-safety" asChild><Pressable style={styles.adviceCard}><Text variant="titleLarge" style={styles.cardTitle}>Trust & Safety</Text><Text style={styles.cardText}>Understand checks, reports, records and the limits of platform protection.</Text><Text style={styles.tradeArrow}>Explore →</Text></Pressable></Link>
      </View>
    </View>

    <View style={styles.faqBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Questions" title="The useful bits before you create an account." />
        <View style={styles.faqList}>
          {FAQS.map(([question, answer], index) => {
            const open = openFaq === index;
            return <Pressable key={question} style={styles.faqCard} onPress={() => setOpenFaq(open ? null : index)} accessibilityRole="button" accessibilityState={{ expanded: open }}><View style={styles.faqRow}><Text variant="titleMedium" style={styles.cardTitle}>{question}</Text><Text style={styles.faqToggle}>{open ? '−' : '+'}</Text></View>{open ? <Text style={styles.cardText}>{answer}</Text> : null}</Pressable>;
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
  pageContent: { flexGrow: 1 },
  hero: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 32, gap: 24 },
  heroWide: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 42, gap: 30 },
  heroCopy: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  heroBadge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primarySoft, borderRadius: 999, borderWidth: 1, borderColor: '#F2D7C3' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  heroBadgeText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  heroTitle: { color: colors.charcoal, fontSize: 50, lineHeight: 55, fontWeight: '900', letterSpacing: -1.8, textAlign: 'center' },
  heroTitleCompact: { fontSize: 36, lineHeight: 41 },
  heroSubtitle: { color: colors.charcoalSoft, lineHeight: 27, maxWidth: 660, textAlign: 'center' },
  heroSearch: { gap: 9, width: '100%', maxWidth: 700 },
  inputOutline: { borderRadius: 16 },
  searchButton: { minHeight: 50 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  heroVisual: { flex: 0.9, minHeight: 380, justifyContent: 'flex-end', padding: 22, overflow: 'hidden', borderRadius: 30 },
  heroImage: { borderRadius: 30 },
  heroShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(14,30,43,0.38)', borderRadius: 30 },
  heroCaption: { gap: 5, maxWidth: 520 },
  heroCaptionSmall: { color: '#FFD7BA', fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
  heroCaptionBig: { color: '#FFFFFF', fontSize: 22, lineHeight: 29, fontWeight: '900' },
  credibilityBand: { backgroundColor: colors.navy },
  credibilityInner: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  credibilityItem: { flexGrow: 1, flexBasis: 160, minWidth: 140, alignItems: 'center', gap: 2 },
  credibilityValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  credibilityLabel: { color: '#DCE7EE', fontSize: 11, textAlign: 'center' },
  section: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 42, gap: 22 },
  sectionHeading: { alignSelf: 'center', alignItems: 'center', gap: 8, maxWidth: 840 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  sectionBody: { color: colors.muted, lineHeight: 24, textAlign: 'center' },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  routeCard: { flexGrow: 1, flexBasis: 240, minWidth: 220, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3, borderTopColor: colors.primary, borderRadius: 20, padding: 18, gap: 8 },
  routeNumber: { color: colors.primary, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { color: colors.charcoal, fontWeight: '900' },
  cardText: { color: colors.muted, lineHeight: 22 },
  paymentBand: { backgroundColor: '#FFF4EA' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  paymentCard: { flexGrow: 1, flexBasis: 430, minWidth: 280, borderRadius: 24, padding: 22, gap: 12, borderWidth: 1 },
  protectedCard: { backgroundColor: '#F6FBFA', borderColor: '#CDE2DE' },
  privateCard: { backgroundColor: '#FFFFFF', borderColor: '#E8D7C7' },
  cardChip: { alignSelf: 'flex-start' },
  checkList: { gap: 8 },
  checkRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  check: { color: colors.accent, fontWeight: '900' },
  checkText: { flex: 1, color: colors.charcoalSoft, lineHeight: 21 },
  smallPrint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  warningBox: { backgroundColor: colors.goldSoft, borderRadius: 14, padding: 13, gap: 5 },
  warningTitle: { color: colors.charcoal, fontWeight: '900' },
  warningText: { color: colors.charcoalSoft, lineHeight: 21 },
  paymentFlow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentStep: { flexGrow: 1, flexBasis: 220, minWidth: 200, backgroundColor: colors.surfaceRaised, borderRadius: 16, padding: 15, gap: 6, borderWidth: 1, borderColor: colors.border },
  paymentStepNumber: { width: 26, height: 26, borderRadius: 13, textAlign: 'center', textAlignVertical: 'center', backgroundColor: colors.primary, color: '#FFFFFF', fontWeight: '900' },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tradeCard: { flexGrow: 1, flexBasis: 230, minWidth: 200, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeName: { color: colors.charcoal, fontWeight: '800' },
  tradeArrow: { color: colors.primary, fontWeight: '900' },
  featureBand: { backgroundColor: colors.surfaceSoft },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { flexGrow: 1, flexBasis: 310, minWidth: 260, backgroundColor: colors.surfaceRaised, borderRadius: 18, padding: 17, gap: 7, borderWidth: 1, borderColor: colors.border },
  pricingBand: { backgroundColor: '#FBF8F5' },
  adviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  adviceCard: { flexGrow: 1, flexBasis: 310, minWidth: 260, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, gap: 8 },
  faqBand: { backgroundColor: colors.surfaceSoft },
  faqList: { gap: 9, maxWidth: 900, width: '100%', alignSelf: 'center' },
  faqCard: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, gap: 9 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqToggle: { color: colors.primary, fontSize: 24, fontWeight: '900' },
  finalCta: { backgroundColor: colors.navy, borderRadius: 28, padding: 25, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 18 },
  finalCopy: { flex: 1, minWidth: 250, gap: 6 },
  finalEyebrow: { color: '#FFD7BA', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  finalTitle: { color: '#FFFFFF', fontWeight: '900' },
  finalText: { color: '#DCE7EE', lineHeight: 22 },
  finalButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  finalOutline: { borderColor: '#FFFFFF' },
});
