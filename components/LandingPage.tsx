import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { PricingCards } from '@/components/PricingCards';
import { PublicFooter } from '@/components/PublicFooter';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import type { Job } from '@/types';

const POPULAR_TRADES = [
  'Tiling',
  'Plumbing',
  'Electrical',
  'Building & Extensions',
  'Roofing & Roofline',
  'Painting & Decorating',
  'Kitchens',
  'Bathrooms',
] as const;

const SYSTEM_CARDS = [
  {
    eyebrow: 'AI TRADE TRIAGE',
    title: 'Describe the problem, not the trade.',
    text: 'BuildPair can use Google Gemini to interpret a plain-English homeowner problem, choose the closest BuildPair trade category, suggest alternatives and ask useful follow-up questions. If the AI service is unavailable, rule-based matching provides a fallback rather than leaving the journey dead.',
    background: colors.primarySoft,
    accent: colors.primary,
  },
  {
    eyebrow: 'AI JOB SPEC',
    title: 'Turn rough answers into a useful brief.',
    text: 'The job-spec assistant turns homeowner answers into a concise UK domestic work specification with scope, current condition, access and timing, materials responsibility and points the tradesperson still needs to confirm. It is explicitly instructed not to invent dimensions, prices, certifications or safety claims.',
    background: colors.accentSoft,
    accent: colors.accent,
  },
  {
    eyebrow: 'AI QUOTE ASSISTANT',
    title: 'Better commercial wording without invented numbers.',
    text: 'Tradespeople can get help drafting scope, exclusions, payment wording, duration, warranty and notes. The important bit: BuildPair calculates supplied labour, materials and VAT figures deterministically. The AI is used for wording, not trusted to make up financial totals.',
    background: colors.blueSoft,
    accent: colors.blue,
  },
  {
    eyebrow: 'AI MESSAGE ASSISTANT',
    title: 'Replies that understand the actual job.',
    text: 'The message assistant can use the job context and recent conversation to offer three calm, practical reply options. It is instructed not to invent prices, dates, measurements, qualifications or promises, not to escalate arguments and not to encourage users to bypass BuildPair safeguards.',
    background: colors.violetSoft,
    accent: colors.violet,
  },
] as const;

const OPERATING_LAYER = [
  ['Matching that understands area', 'Trade categories, specific services, related search terms, postcodes and service radius work together so discovery is more useful than a name-and-number directory.'],
  ['One connected project record', 'Job details, messages, quotes, approved variations, timeline events and payment milestones can stay attached to the same piece of work.'],
  ['Trust with context', 'Credentials, work examples, availability, completed-project reviews, reporting and human moderation provide signals without pretending one badge can guarantee a job.'],
  ['Tools after the lead is won', 'Tradespeople can use saved searches, alerts, invoices, profile tools and analytics so BuildPair remains useful beyond the first introduction.'],
] as const;

const ADVICE_LINKS: { title: string; text: string; href: Href }[] = [
  { title: 'Advice Hub', text: 'Practical homeowner and tradesperson guidance for planning, quoting, communication and project decisions.', href: '/(public)/advice' as Href },
  { title: 'Building Rules', text: 'Start from current official UK sources when a project may involve building regulations, permissions or specialist requirements.', href: '/(public)/building-regulations' as Href },
  { title: 'Trust & Safety', text: 'Understand the checks, reporting tools, marketplace standards and limits of what a platform can verify.', href: '/(public)/trust-safety' as Href },
] as const;

const FAQS = [
  ['Is BuildPair just another trades directory?', 'No. Discovery is only the first layer. BuildPair is designed to keep the job, quote, conversation, approved changes, project timeline, payment stages and eventual reputation connected after the introduction.'],
  ['What does the AI actually do?', 'Current AI-assisted features cover trade triage, job-spec drafting, quote wording and job-aware message suggestions. They are assistive tools with constrained prompts and fallbacks where appropriate. They do not replace a qualified trade, inspection, professional advice or the user’s responsibility for what they agree and send.'],
  ['Do I need to know which trade I need?', 'No. You can search a trade directly or describe the symptom or project in ordinary language. BuildPair can match that description against related trade categories and services.'],
  ['What memberships are available to tradespeople?', 'Starter is £0/month, BuildPair Plus is £19.99/month and BuildPair Pro is £29.99/month. The plans differ by marketplace visibility, category allowance, monthly open-marketplace offers and business tools.'],
  ['Can one account be both a homeowner and a tradesperson?', 'Yes. One BuildPair identity can enable both account modes, so a trade business owner does not need another login when they need work done at home.'],
  ['Does BuildPair guarantee a tradesperson or their work?', 'No. BuildPair provides marketplace information, records and trust signals, but customers still need to make checks appropriate to the job, particularly for regulated or specialist work.'],
] as const;

function SectionHeading({ eyebrow, title, body, centred = true }: { eyebrow?: string; title: string; body?: string; centred?: boolean }) {
  return <View style={[styles.sectionHeading, centred && styles.sectionHeadingCentred]}>
    {eyebrow ? <Text style={[styles.eyebrow, centred && styles.textCentred]}>{eyebrow}</Text> : null}
    <Text variant="headlineMedium" style={[styles.sectionTitle, centred && styles.textCentred]}>{title}</Text>
    {body ? <Text style={[styles.sectionBody, centred && styles.textCentred]}>{body}</Text> : null}
  </View>;
}

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const isPhone = width < 600;
  const [search, setSearch] = useState('');
  const [problem, setProblem] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let active = true;
    apiFetch<Job[]>('/api/public/jobs').then((result) => {
      if (active) setJobs(result);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };

  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);
  const visibleTrades = isWide ? POPULAR_TRADES : POPULAR_TRADES.slice(0, 4);

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <View style={[styles.hero, isWide && styles.heroWide]}>
      <View style={[styles.heroCopy, isWide && styles.heroCopyWide]}>
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>Built specifically for UK homeowners and tradespeople</Text></View>
        <Text style={[styles.heroTitle, !isWide && styles.heroTitleCompact]}>Find the right trade. Compare properly. Keep the whole job together.</Text>
        <Text variant="titleMedium" style={styles.heroSubtitle}>BuildPair is more than a directory. It combines local trade discovery with AI-assisted job planning, structured quotes, job-linked messaging, changes, payment stages, reputation and trade business tools in one connected platform.</Text>

        <View style={styles.heroSearch}>
          <TextInput
            mode="outlined"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => goSearch(search)}
            placeholder="What do you need done? e.g. bathroom tiling"
            style={styles.heroSearchInput}
            outlineStyle={styles.inputOutline}
          />
          <Button mode="contained" contentStyle={styles.searchButtonContent} onPress={() => goSearch(search)}>Find a trade</Button>
        </View>

        <View style={styles.heroActions}>
          <Link href="/auth/account" asChild><Button mode="contained-tonal">Post a job</Button></Link>
          <Link href="/(public)/for-tradespeople" asChild><Button mode="outlined">I’m a tradesperson</Button></Link>
          <Link href="/(public)/how-it-works" asChild><Button mode="text">How it works</Button></Link>
        </View>
      </View>

      <View style={[styles.heroVisualWrap, isWide && styles.heroVisualWide]}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1625577816360-32388b70471c?auto=format&fit=crop&w=1600&q=84' }}
          style={styles.heroImage}
          imageStyle={styles.heroImageRadius}
          resizeMode="cover"
          accessibilityLabel="Home renovation project"
        >
          <View style={styles.heroImageShade} />
          <View style={styles.imageCaption}>
            <Text style={styles.imageCaptionSmall}>ONE CONNECTED PROJECT</Text>
            <Text style={styles.imageCaptionBig}>Search → Match → Quote → Hire → Message → Track → Pay → Review</Text>
          </View>
          <View style={styles.heroFloatCard}>
            <Text style={styles.heroFloatTitle}>AI where it removes friction</Text>
            <Text style={styles.heroFloatText}>Human decisions where judgement matters.</Text>
          </View>
        </ImageBackground>
      </View>
    </View>

    <View style={styles.credibilityBand}>
      <View style={styles.credibilityInner}>
        {[
          [`${TRADE_CATEGORIES.length}`, 'broad UK trade categories'],
          ['2', 'account modes, one login'],
          ['4', 'purpose-built AI assistants'],
          ['1', 'connected project record'],
        ].map(([value, label]) => <View key={label} style={styles.credibilityItem}><Text style={styles.credibilityValue}>{value}</Text><Text style={styles.credibilityLabel}>{label}</Text></View>)}
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Choose your route" title="What are you here to do?" body="BuildPair serves both sides of the same project, but you should not have to read a novel written for the other one before finding your next step." />
      <View style={styles.audienceGrid}>
        <View style={[styles.audienceCard, styles.homeownerCard]}>
          <Text style={styles.audienceEyebrow}>HOMEOWNER</Text>
          <Text variant="headlineSmall" style={styles.audienceTitle}>I need work done.</Text>
          <Text style={styles.audienceText}>Find the likely trade, post a detailed job, compare people and quotes, keep changes recorded and manage the project in one place.</Text>
          <View style={styles.audienceButtons}>
            <Button mode="contained" onPress={() => goSearch('')}>Find local trades</Button>
            <Link href="/auth/account" asChild><Button mode="outlined">Post a job</Button></Link>
          </View>
        </View>
        <View style={[styles.audienceCard, styles.tradeCardAudience]}>
          <Text style={[styles.audienceEyebrow, styles.audienceEyebrowTrade]}>TRADESPERSON</Text>
          <Text variant="headlineSmall" style={styles.audienceTitle}>I want to win and manage work.</Text>
          <Text style={styles.audienceText}>Build a proper business profile, find relevant jobs, send structured quotes, message customers and use the same platform for invoices, alerts and insight.</Text>
          <View style={styles.audienceButtons}>
            <Link href="/auth/account" asChild><Button mode="contained" buttonColor={colors.accent}>Create trade profile</Button></Link>
            <Link href="/(public)/pricing" asChild><Button mode="outlined" textColor={colors.accent}>Memberships</Button></Link>
          </View>
        </View>
      </View>
    </View>

    <View style={styles.howBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="How it works" title="A clearer route from first problem to finished project." body="The important difference is that the useful information does not vanish after the introduction." />
        <View style={styles.stepsGrid}>
          {[
            ['01', 'Explain the job', 'Search a trade or describe the problem. BuildPair can help turn rough information into a clearer starting point.'],
            ['02', 'Compare properly', 'Review relevant profiles and structured quotes with scope, exclusions, timing and project context.'],
            ['03', 'Keep agreements visible', 'Messages, approved variations, timeline events and payment stages can stay connected to the same job.'],
            ['04', 'Finish with useful history', 'Completion can feed genuine project reputation, portfolio stories and a better record for both sides.'],
          ].map(([number, title, text]) => <View key={number} style={styles.stepCard}>
            <Text style={styles.stepNumber}>{number}</Text><Text variant="titleMedium" style={styles.stepTitle}>{title}</Text><Text style={styles.stepText}>{text}</Text>
          </View>)}
        </View>
        <Link href="/(public)/how-it-works" asChild><Button mode="outlined" style={styles.inlineCta}>See the full journey and what happens behind the scenes</Button></Link>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Find the right starting point" title="Search the work you need, not the construction vocabulary you happen to know." body="Pick a trade if you know it. If you do not, describe what is happening and let BuildPair narrow the starting point." />
      <View style={styles.findGrid}>
        <View style={styles.findTradesPanel}>
          <View style={styles.tradeGrid}>
            {visibleTrades.map((trade) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button">
              <Text style={styles.tradeName}>{trade}</Text>
              <Text style={styles.cardArrow}>→</Text>
            </Pressable>)}
          </View>
          <Button mode="text" onPress={() => router.push('/(public)/directory')}>Browse all {TRADE_CATEGORIES.length} trade categories →</Button>
        </View>
        <View style={styles.problemBox}>
          <Text style={styles.problemEyebrow}>NOT SURE WHO YOU NEED?</Text>
          <Text variant="titleLarge" style={styles.problemTitle}>Start with the problem.</Text>
          <Text style={styles.problemText}>Describe the symptom or project in ordinary language. BuildPair can identify the closest trade category and useful alternatives.</Text>
          <View style={styles.problemExamples}>
            <Chip compact onPress={() => setProblem('Water is coming through the kitchen ceiling when the shower is used')}>Ceiling leak after shower</Chip>
            <Chip compact onPress={() => setProblem('I want my bathroom stripped out and completely refitted')}>Full bathroom refit</Chip>
          </View>
          <TextInput mode="outlined" multiline numberOfLines={4} value={problem} onChangeText={setProblem} placeholder="Example: Water comes through my kitchen ceiling when somebody showers upstairs…" outlineStyle={styles.inputOutline} />
          <Button mode="contained" disabled={!problem.trim()} onPress={() => goSearch(problem)}>Find likely trades</Button>
        </View>
      </View>
    </View>

    <View style={styles.intelligenceBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="What is actually behind BuildPair" title="Useful automation, not an AI sticker slapped on a directory." body="BuildPair’s current architecture uses purpose-built assistance at specific moments where it can reduce ambiguity or admin. It does not hand important project decisions to a chatbot." />
        <View style={styles.systemGrid}>
          {SYSTEM_CARDS.map((card) => <View key={card.title} style={[styles.systemCard, { backgroundColor: card.background, borderTopColor: card.accent }]}>
            <Text style={styles.systemEyebrow}>{card.eyebrow}</Text>
            <Text variant="titleLarge" style={styles.systemTitle}>{card.title}</Text>
            <Text style={styles.systemText}>{card.text}</Text>
          </View>)}
        </View>
        <View style={styles.aiPrinciple}>
          <View style={styles.aiPrincipleCopy}><Text variant="titleMedium" style={styles.aiPrincipleTitle}>AI assists. People remain responsible.</Text><Text style={styles.aiPrincipleText}>A generated specification or suggested reply is a starting point, not a professional diagnosis, quotation guarantee, legal opinion or safety certification. Users review what they send and qualified people still make the decisions that require real-world judgement.</Text></View>
        </View>
        <Link href="/(public)/about" asChild><Button mode="text" style={styles.inlineCta}>Read more about the platform and its design →</Button></Link>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Beyond the AI" title="The boring machinery is what makes the clever bits useful." body="A marketplace only becomes genuinely helpful when the workflow around the match is connected too." />
      <View style={styles.operatingGrid}>
        {OPERATING_LAYER.map(([title, text]) => <View key={title} style={styles.operatingCard}>
          <Text variant="titleMedium" style={styles.operatingTitle}>{title}</Text>
          <Text style={styles.operatingText}>{text}</Text>
        </View>)}
      </View>
    </View>

    <View style={styles.trustBand}>
      <View style={[styles.section, styles.trustInner, isWide && styles.trustInnerWide]}>
        <View style={styles.trustCopy}>
          <View style={[styles.sectionHeading, styles.sectionHeadingCentred]}>
            <Text style={[styles.trustEyebrow, styles.textCentred]}>TRUST & SAFETY</Text>
            <Text variant="headlineMedium" style={[styles.trustHeading, styles.textCentred]}>Better signals, clearer records and human moderation.</Text>
            <Text style={[styles.trustBody, styles.textCentred]}>BuildPair is deliberately not built around the fantasy that a logo badge can make every home-improvement project safe.</Text>
          </View>
          {[
            'Credentials and review status can add useful context to a trade profile.',
            'Reviews can be tied back to genuine marketplace project activity.',
            'Reporting covers scams, harassment, unsafe behaviour, poor workmanship, misleading credentials, payment disputes and more.',
            'Moderation is evidence-led, with human actions such as warnings, restrictions, suspensions, restoration and recorded reasons.',
            'Regulated and specialist work still requires the appropriate real-world checks.',
          ].map((item) => <View key={item} style={styles.trustRow}><View style={styles.trustTick}><Text style={styles.trustTickText}>✓</Text></View><Text style={styles.trustText}>{item}</Text></View>)}
          <Link href="/(public)/trust-safety" asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.inlineCta}>How BuildPair handles trust & safety</Button></Link>
        </View>
        <View style={styles.trustVisual}>
          <View style={styles.recordCard}><Text style={styles.recordEyebrow}>PROJECT RECORD</Text><Text variant="headlineSmall" style={styles.recordTitle}>What was agreed stays easier to find.</Text><Text style={styles.recordText}>Original job → quote → messages → variation → milestone → completion → review</Text></View>
        </View>
      </View>
    </View>

    {jobs.length ? <View style={styles.section}>
      <SectionHeading eyebrow="Live marketplace" title="Real work currently visible on BuildPair." body="No invented activity counters. When public jobs exist, this section shows genuine marketplace work." />
      <View style={styles.jobGrid}>
        {jobs.slice(0, 3).map((job) => <Link key={job.id} href={`/(public)/jobs/${job.id}` as Href} asChild><Pressable style={styles.jobCard}>
          <View style={styles.jobTop}><Chip compact>{job.category}</Chip><Text style={styles.jobLocation}>{job.locationLabel || job.postcode || 'UK'}</Text></View>
          <Text variant="titleMedium" style={styles.jobTitle}>{job.title}</Text>
          <Text numberOfLines={3} style={styles.jobDescription}>{job.description}</Text>
          <Text style={styles.jobLink}>View job →</Text>
        </Pressable></Link>)}
      </View>
      <Link href="/(public)/jobs" asChild><Button mode="outlined" style={styles.inlineCta}>Browse public jobs</Button></Link>
    </View> : null}

    <View style={styles.pricingBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Tradesperson membership" title="Start free, then pay for the marketplace capacity you actually need." body="BuildPair Starter lets a trade establish a profile before choosing Plus or Pro for selling capacity and deeper business tools." />
        <PricingCards compact />
        <Link href="/(public)/pricing" asChild><Button mode="text" style={styles.inlineCta}>See full membership details →</Button></Link>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Free practical guidance" title="Get the job right before anyone picks up a tool." body="BuildPair should still be useful when somebody is researching, planning or trying to understand what good project practice looks like." />
      <View style={styles.adviceGrid}>
        {ADVICE_LINKS.map((item) => <Link key={item.title} href={item.href} asChild><Pressable style={styles.adviceCard}>
          <Text variant="titleLarge" style={styles.adviceTitle}>{item.title}</Text>
          <Text style={styles.adviceText}>{item.text}</Text>
          <Text style={styles.adviceLink}>Explore →</Text>
        </Pressable></Link>)}
      </View>
    </View>

    <View style={styles.faqBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Questions" title="The useful answers before you create an account." />
        <View style={styles.faqList}>
          {FAQS.map(([question, answer], index) => {
            const open = openFaq === index;
            return <Pressable key={question} style={styles.faqCard} onPress={() => setOpenFaq(open ? null : index)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
              <View style={styles.faqQuestionRow}><Text variant="titleMedium" style={styles.faqQuestion}>{question}</Text><Text style={styles.faqToggle}>{open ? '−' : '+'}</Text></View>
              {open ? <Text style={styles.faqAnswer}>{answer}</Text> : null}
            </Pressable>;
          })}
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <View style={[styles.finalCta, isPhone && styles.finalCtaPhone]}>
        <View style={styles.finalCopy}><Text style={styles.finalEyebrow}>BUILDPAIR UK</Text><Text variant="headlineSmall" style={styles.finalTitle}>Start with the job you need done, or the work you want to win.</Text><Text style={styles.finalText}>One platform from first question to finished project record.</Text></View>
        <View style={styles.finalButtons}>
          <Button mode="contained" buttonColor="#FFFFFF" textColor={colors.navy} onPress={() => router.push('/(public)/directory')}>Find a trade</Button>
          <Link href="/auth/account" asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.finalOutline}>Join BuildPair</Button></Link>
        </View>
      </View>
    </View>

    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1 },
  hero: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 28, paddingBottom: 30, gap: 22 },
  heroWide: { flexDirection: 'row', alignItems: 'stretch', paddingTop: 38, paddingBottom: 40, gap: 30 },
  heroCopy: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  heroCopyWide: { flexBasis: 560 },
  heroBadge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primarySoft, borderRadius: 999, borderWidth: 1, borderColor: '#F2D7C3' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  heroBadgeText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  heroTitle: { color: colors.charcoal, fontSize: 50, lineHeight: 54, fontWeight: '900', letterSpacing: -1.8, textAlign: 'center' },
  heroTitleCompact: { fontSize: 36, lineHeight: 40, letterSpacing: -1.1 },
  heroSubtitle: { color: colors.charcoalSoft, lineHeight: 27, maxWidth: 650, textAlign: 'center' },
  heroSearch: { gap: 9, width: '100%', maxWidth: 720, alignSelf: 'center' },
  heroSearchInput: { backgroundColor: colors.surfaceRaised },
  inputOutline: { borderRadius: 16 },
  searchButtonContent: { minHeight: 50 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center', justifyContent: 'center' },
  heroVisualWrap: { minHeight: 330 },
  heroVisualWide: { flex: 0.9, minHeight: 520, flexBasis: 490 },
  heroImage: { flex: 1, minHeight: 330, justifyContent: 'flex-end', padding: 20, overflow: 'hidden' },
  heroImageRadius: { borderRadius: 30 },
  heroImageShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(14,30,43,0.32)', borderRadius: 30 },
  imageCaption: { gap: 5, maxWidth: 500 },
  imageCaptionSmall: { color: '#FFD7BA', fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
  imageCaptionBig: { color: '#FFFFFF', fontSize: 21, lineHeight: 28, fontWeight: '900' },
  heroFloatCard: { position: 'absolute', right: 17, top: 18, maxWidth: 250, borderRadius: 18, padding: 14, backgroundColor: 'rgba(255,255,255,0.95)', gap: 3, alignItems: 'center', borderTopWidth: 3, borderTopColor: colors.primary },
  heroFloatTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  heroFloatText: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  credibilityBand: { backgroundColor: colors.navy },
  credibilityInner: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 17, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  credibilityItem: { flexGrow: 1, flexBasis: 150, minWidth: 135, alignItems: 'center', gap: 2 },
  credibilityValue: { color: '#FFFFFF', fontSize: 24, lineHeight: 29, fontWeight: '900' },
  credibilityLabel: { color: '#DCE7EE', fontSize: 11, textAlign: 'center' },
  section: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 30, gap: 20 },
  sectionHeading: { gap: 8, maxWidth: 820 },
  sectionHeadingCentred: { alignSelf: 'center', alignItems: 'center' },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.5 },
  sectionBody: { color: colors.muted, lineHeight: 24 },
  textCentred: { textAlign: 'center' },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  audienceCard: { flexGrow: 1, flexBasis: 390, minWidth: 280, borderRadius: 26, padding: 23, gap: 10, borderWidth: 1, borderTopWidth: 4, alignItems: 'center' },
  homeownerCard: { backgroundColor: '#FFFBF7', borderColor: '#F0D8C7', borderTopColor: colors.primary },
  tradeCardAudience: { backgroundColor: '#F7FCFB', borderColor: '#CFE5E1', borderTopColor: colors.accent },
  audienceEyebrow: { color: colors.primaryDark, fontWeight: '900', fontSize: 11, letterSpacing: 1.1, textAlign: 'center' },
  audienceEyebrowTrade: { color: colors.accent },
  audienceTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  audienceText: { color: colors.muted, lineHeight: 23, flexGrow: 1, textAlign: 'center', maxWidth: 540 },
  audienceButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4, justifyContent: 'center' },
  howBand: { backgroundColor: '#FFF4EA' },
  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stepCard: { flexGrow: 1, flexBasis: 225, minWidth: 220, backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 19, gap: 8, borderWidth: 1, borderTopWidth: 3, borderColor: '#ECDCCD', borderTopColor: colors.primary, alignItems: 'center' },
  stepNumber: { color: colors.primary, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  stepTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  stepText: { color: colors.muted, lineHeight: 22, textAlign: 'center' },
  inlineCta: { alignSelf: 'center' },
  findGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'stretch' },
  findTradesPanel: { flex: 1.1, flexBasis: 480, minWidth: 280, gap: 10, alignItems: 'center' },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  tradeCard: { flexGrow: 1, flexBasis: 200, minWidth: 150, backgroundColor: colors.surfaceRaised, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tradeName: { flex: 1, color: colors.charcoal, fontWeight: '800', lineHeight: 20, textAlign: 'center' },
  cardArrow: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  problemBox: { flex: 0.9, flexBasis: 360, minWidth: 280, backgroundColor: colors.navy, borderRadius: 26, padding: 22, gap: 11, alignItems: 'center' },
  problemEyebrow: { color: '#FFD7BA', fontWeight: '900', fontSize: 11, letterSpacing: 1.1, textAlign: 'center' },
  problemTitle: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center' },
  problemText: { color: '#DCE7EE', lineHeight: 22, textAlign: 'center' },
  problemExamples: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  intelligenceBand: { backgroundColor: colors.accentSoft },
  systemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  systemCard: { flexGrow: 1, flexBasis: 420, minWidth: 280, borderRadius: 25, padding: 21, gap: 10, borderWidth: 1, borderTopWidth: 4, borderColor: 'rgba(35,41,48,0.08)', alignItems: 'center' },
  systemEyebrow: { color: colors.charcoalSoft, fontWeight: '900', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  systemTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  systemText: { color: colors.charcoalSoft, lineHeight: 23, textAlign: 'center' },
  aiPrinciple: { backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 19, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  aiPrincipleCopy: { gap: 4, maxWidth: 820 },
  aiPrincipleTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  aiPrincipleText: { color: colors.muted, lineHeight: 22, textAlign: 'center' },
  operatingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  operatingCard: { flexGrow: 1, flexBasis: 230, minWidth: 220, backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 19, gap: 9, borderWidth: 1, borderTopWidth: 3, borderColor: colors.border, borderTopColor: colors.blue, alignItems: 'center' },
  operatingTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  operatingText: { color: colors.muted, lineHeight: 22, textAlign: 'center' },
  trustBand: { backgroundColor: colors.navy },
  trustInner: { maxWidth: 1140 },
  trustInnerWide: { flexDirection: 'row', gap: 30, alignItems: 'center' },
  trustCopy: { flex: 1, gap: 10 },
  trustEyebrow: { color: '#FFD7BA', fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
  trustHeading: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.5 },
  trustBody: { color: '#DCE7EE', lineHeight: 24 },
  trustRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  trustTick: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  trustTickText: { color: '#FFD7BA', fontWeight: '900', fontSize: 11 },
  trustText: { color: '#DCE7EE', lineHeight: 22, flex: 1 },
  trustVisual: { flex: 0.7, minWidth: 280 },
  recordCard: { backgroundColor: '#FFFFFF', borderRadius: 26, padding: 24, gap: 10, borderTopWidth: 4, borderTopColor: colors.primary, alignItems: 'center' },
  recordEyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.1, textAlign: 'center' },
  recordTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  recordText: { color: colors.muted, lineHeight: 24, textAlign: 'center' },
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  jobCard: { flexGrow: 1, flexBasis: 290, minWidth: 270, backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 18, gap: 9, borderWidth: 1, borderTopWidth: 3, borderColor: colors.border, borderTopColor: colors.accent, alignItems: 'center' },
  jobTop: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  jobLocation: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  jobTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  jobDescription: { color: colors.muted, lineHeight: 21, textAlign: 'center' },
  jobLink: { color: colors.primary, fontWeight: '900' },
  pricingBand: { backgroundColor: colors.violetSoft },
  adviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  adviceCard: { flexGrow: 1, flexBasis: 290, minWidth: 270, backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 20, gap: 9, borderWidth: 1, borderTopWidth: 3, borderColor: colors.border, borderTopColor: colors.primary, alignItems: 'center' },
  adviceTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  adviceText: { color: colors.muted, lineHeight: 22, flexGrow: 1, textAlign: 'center' },
  adviceLink: { color: colors.primary, fontWeight: '900' },
  faqBand: { backgroundColor: colors.blueSoft },
  faqList: { gap: 9 },
  faqCard: { backgroundColor: colors.surfaceRaised, borderRadius: 18, padding: 17, gap: 9, borderWidth: 1, borderColor: colors.border },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faqQuestion: { color: colors.charcoal, fontWeight: '900', flex: 1 },
  faqToggle: { color: colors.primary, fontSize: 25, fontWeight: '700' },
  faqAnswer: { color: colors.muted, lineHeight: 22, paddingRight: 24 },
  finalCta: { backgroundColor: colors.navy, borderRadius: 28, padding: 25, flexDirection: 'row', gap: 20, justifyContent: 'space-between', alignItems: 'center' },
  finalCtaPhone: { flexDirection: 'column', alignItems: 'center' },
  finalCopy: { flex: 1, gap: 5, alignItems: 'center' },
  finalEyebrow: { color: '#FFD7BA', fontWeight: '900', fontSize: 11, letterSpacing: 1.1, textAlign: 'center' },
  finalTitle: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center' },
  finalText: { color: '#DCE7EE', textAlign: 'center' },
  finalButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' },
  finalOutline: { borderColor: 'rgba(255,255,255,0.65)' },
});
