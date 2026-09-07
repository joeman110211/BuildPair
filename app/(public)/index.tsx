import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, ImageBackground, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Icon, Text, TextInput } from 'react-native-paper';
import { PricingCards } from '@/components/PricingCards';
import { PublicFooter } from '@/components/PublicFooter';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import type { Job, TraderProfile } from '@/types';

const POPULAR_TRADES = [
  ['Tiling', 'grid'],
  ['Plumbing', 'water-pump'],
  ['Electrical', 'lightning-bolt-outline'],
  ['Building & Extensions', 'home-city-outline'],
  ['Roofing & Roofline', 'home-roof'],
  ['Painting & Decorating', 'format-paint'],
  ['Kitchens', 'countertop-outline'],
  ['Bathrooms', 'shower'],
] as const;

const FEATURE_CARDS = [
  { icon: 'magnify', title: 'Problem-first search', text: 'Describe the symptom or project in ordinary language and search across related categories, services and trade terms.', background: colors.primarySoft },
  { icon: 'account-hard-hat-outline', title: 'Profiles with context', text: 'Compare services, working area, experience, galleries, project stories, availability, credentials and reviews.', background: colors.accentSoft },
  { icon: 'file-document-edit-outline', title: 'Structured quotes', text: 'Keep scope, exclusions, start date, duration, deposit, stages and warranty information easier to understand.', background: colors.blueSoft },
  { icon: 'timeline-clock-outline', title: 'Project history', text: 'Messages, agreed variations, timeline events and payment milestones can remain attached to the same job.', background: colors.violetSoft },
  { icon: 'shield-check-outline', title: 'Trust & moderation', text: 'Credential status, marketplace review history, reporting, AI safety signals and human moderation are kept visible.', background: colors.sageSoft },
  { icon: 'chart-line', title: 'Trade business tools', text: 'Profiles, job pipeline, saved searches, alerts, invoices and analytics make BuildPair useful after a lead is won.', background: colors.goldSoft },
] as const;

const PROJECT_TILES = [
  {
    title: 'Renovation & improvement',
    text: 'Find the right combination of trades for larger home projects.',
    search: 'home renovation',
    image: 'https://images.unsplash.com/photo-1625577816360-32388b70471c?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Bathrooms & tiling',
    text: 'Search the project, the service or simply explain the problem.',
    search: 'bathroom renovation tiling',
    image: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Building & extensions',
    text: 'Compare profiles and keep quotes, changes and progress connected.',
    search: 'extension building work',
    image: 'https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?auto=format&fit=crop&w=1200&q=82',
  },
] as const;

const FAQS = [
  ['Do I need to know exactly which trade I need?', 'No. Search by a trade, service or plain-English problem. BuildPair is designed to surface related trades rather than requiring one perfect industry term.'],
  ['What memberships are available to tradespeople?', 'Starter is £0/month, BuildPair Plus is £19.99/month and BuildPair Pro is £29.99/month. The plans differ by marketplace visibility, main-category allowance, monthly open-marketplace offers and business tools.'],
  ['Does BuildPair guarantee a tradesperson or their work?', 'No. BuildPair provides marketplace information, workflow and trust signals, but users still need to make checks appropriate to the job, especially for regulated or specialist work.'],
  ['Can the same account be a homeowner and a tradesperson?', 'Yes. One BuildPair identity can enable both modes so somebody who runs a trade business does not need a second login when they need work done at home.'],
  ['Will BuildPair have Android and iOS apps?', 'Yes. The same cross-platform product is being prepared for the web, Android and iOS, with store releases following the final production and device-testing gates.'],
] as const;

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text variant="headlineMedium" style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function SectionHeading({ eyebrow, title, body, centred = false }: { eyebrow?: string; title: string; body?: string; centred?: boolean }) {
  return <View style={[styles.sectionHeading, centred && styles.sectionHeadingCentred]}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text variant="headlineMedium" style={[styles.sectionTitle, centred && styles.textCentred]}>{title}</Text>
    {body ? <Text style={[styles.sectionBody, centred && styles.textCentred]}>{body}</Text> : null}
  </View>;
}

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const [search, setSearch] = useState('');
  const [problem, setProblem] = useState('');
  const [traderCount, setTraderCount] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [floatAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -8, duration: 1800, useNativeDriver: false }),
      Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [floatAnim]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch<TraderProfile[]>('/api/traders'),
      apiFetch<Job[]>('/api/public/jobs'),
    ]).then((results) => {
      if (!active) return;
      if (results[0].status === 'fulfilled') setTraderCount(results[0].value.length);
      if (results[1].status === 'fulfilled') setJobs(results[1].value);
    });
    return () => { active = false; };
  }, []);

  const goSearch = (value: string) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };

  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);

  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <View style={[styles.hero, isWide && styles.heroWide]}>
      <View style={[styles.heroCopy, isWide && styles.heroCopyWide]}>
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>Built for UK homeowners and tradespeople</Text></View>
        <Text style={[styles.heroTitle, !isWide && styles.heroTitleCompact]}>Find the right trade. Compare properly. Keep the whole job together.</Text>
        <Text variant="titleMedium" style={styles.heroSubtitle}>BuildPair connects local trade discovery with jobs, quotes, messaging, project changes, payment stages and reputation in one professional marketplace.</Text>

        <View style={styles.heroSearch}>
          <TextInput
            mode="outlined"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => goSearch(search)}
            placeholder="What do you need done? e.g. bathroom tiling"
            left={<TextInput.Icon icon="magnify" />}
            style={styles.heroSearchInput}
            outlineStyle={styles.inputOutline}
          />
          <Button mode="contained" contentStyle={styles.searchButtonContent} onPress={() => goSearch(search)}>Find local trades</Button>
        </View>

        <View style={styles.heroActions}>
          <Link href="/auth/account" asChild><Button mode="contained-tonal">Post a job</Button></Link>
          <Link href="/(public)/pricing" asChild><Button mode="outlined">Trade memberships</Button></Link>
          <Link href="/(public)/how-it-works" asChild><Button mode="text">See how BuildPair works</Button></Link>
        </View>
        <View style={styles.microTrust}>
          <Text style={styles.microTrustText}>✓ Search by problem or trade</Text>
          <Text style={styles.microTrustText}>✓ One login, two account modes</Text>
          <Text style={styles.microTrustText}>✓ UK-focused marketplace</Text>
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
          <View style={styles.imageCaption}><Text style={styles.imageCaptionSmall}>One connected project record</Text><Text style={styles.imageCaptionBig}>Search · Quote · Hire · Message · Track · Pay · Review</Text></View>
          <Animated.View style={[styles.floatingCard, { transform: [{ translateY: floatAnim }] }]}>
            <View style={styles.floatingIcon}><Icon source="shield-check-outline" size={23} color={colors.accent} /></View>
            <View style={styles.floatingCardCopy}><Text style={styles.floatingTitle}>Compare with useful context</Text><Text style={styles.floatingText}>Services, work, availability, credentials and reviews</Text></View>
          </Animated.View>
          <View style={styles.floatingCardSecondary}>
            <Text style={styles.floatingMetric}>From problem → project</Text>
            <Text style={styles.floatingMetricText}>BuildPair stays useful after the first match.</Text>
          </View>
        </ImageBackground>
      </View>
    </View>

    <View style={styles.statsWrap}>
      <View style={styles.statsInner}>
        <Stat value={traderCount === null ? '—' : traderCount.toLocaleString()} label="tradespeople currently listed" />
        <Stat value={jobs.length ? jobs.length.toLocaleString() : '—'} label="open marketplace jobs" />
        <Stat value={TRADE_CATEGORIES.length.toString()} label="broad trade categories" />
        <Stat value="2" label="account modes, one login" />
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Find the right starting point" title="Search the work you need, not the vocabulary you happen to know." body="Browse a trade directly or describe the project in normal language. BuildPair connects broad categories with specific services and related homeowner search terms." />
      <View style={styles.tradeGrid}>
        {POPULAR_TRADES.map(([trade, icon]) => <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button">
          <View style={styles.tradeIcon}><Icon source={icon} size={26} color={colors.primary} /></View>
          <Text style={styles.tradeName}>{trade}</Text>
          <Text style={styles.cardArrow}>→</Text>
        </Pressable>)}
      </View>
      <Button mode="text" onPress={() => router.push('/(public)/directory')}>Browse all {TRADE_CATEGORIES.length} trade categories →</Button>
    </View>

    <View style={[styles.section, styles.problemSection, isWide && styles.problemSectionWide]}>
      <View style={[styles.problemCopy, isWide && styles.problemCopyWide]}>
        <SectionHeading eyebrow="Not sure who you need?" title="Start with the problem." body="A homeowner should not need a construction vocabulary lesson before they can ask for help." />
        <View style={styles.problemExamples}>
          <Chip onPress={() => setProblem('Water is coming through the kitchen ceiling when the shower is used')}>Ceiling leak after shower</Chip>
          <Chip onPress={() => setProblem('I want my bathroom stripped out and completely refitted')}>Full bathroom refit</Chip>
          <Chip onPress={() => setProblem('Cracked tiles and failing grout around the bath')}>Cracked bathroom tiles</Chip>
        </View>
      </View>
      <View style={[styles.problemBox, isWide && styles.problemBoxWide]}>
        <TextInput mode="outlined" multiline numberOfLines={4} value={problem} onChangeText={setProblem} placeholder="Example: Water comes through my kitchen ceiling when somebody showers upstairs…" outlineStyle={styles.inputOutline} />
        <Button mode="contained" disabled={!problem.trim()} onPress={() => goSearch(problem)}>Find likely trades</Button>
        <Text style={styles.problemHint}>BuildPair searches related trade categories, services and terms, then ranks the closest matches.</Text>
      </View>
    </View>

    <View style={styles.photoBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Built around real projects" title="From one-off repairs to larger renovations." body="Use project-led search to move quickly into the relevant part of the marketplace." />
        <View style={styles.photoGrid}>
          {PROJECT_TILES.map((tile) => <Pressable key={tile.title} style={styles.photoCard} onPress={() => goSearch(tile.search)}>
            <ImageBackground source={{ uri: tile.image }} style={styles.photoImage} imageStyle={styles.photoImageRadius} resizeMode="cover">
              <View style={styles.photoShade} />
              <View style={styles.photoCopy}><Text variant="titleLarge" style={styles.photoTitle}>{tile.title}</Text><Text style={styles.photoText}>{tile.text}</Text><Text style={styles.photoLink}>Explore related trades →</Text></View>
            </ImageBackground>
          </Pressable>)}
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="The complete BuildPair idea" title="More than a directory." body="Discovery matters, but the frustrating parts of a job usually happen after the introduction. BuildPair is designed to connect the whole workflow." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swipeRow} decelerationRate="fast">
        {FEATURE_CARDS.map((card) => <View key={card.title} style={[styles.swipeCard, { backgroundColor: card.background }]}>
          <View style={styles.swipeIcon}><Icon source={card.icon} size={28} color={colors.charcoal} /></View>
          <Text variant="titleLarge" style={styles.swipeTitle}>{card.title}</Text>
          <Text style={styles.swipeText}>{card.text}</Text>
        </View>)}
      </ScrollView>
      <Text style={styles.swipeHint}>Swipe sideways to explore the workflow</Text>
    </View>

    <View style={styles.howWrap}>
      <View style={styles.section}>
        <SectionHeading eyebrow="How it works" title="A clearer route from first search to completed work." />
        <View style={styles.steps}>
          {[
            ['01', 'Explain the job', 'Search the problem or post structured details, photos, location, timing and budget information.'],
            ['02', 'Compare the right people', 'Review services, work, availability, credentials, reviews and structured quotes rather than one headline number.'],
            ['03', 'Keep agreements visible', 'Use job messaging, quotes, variations, timeline events and payment stages to preserve the shared project record.'],
            ['04', 'Finish with useful reputation', 'Completed work can contribute to genuine review history and better long-term marketplace reputation.'],
          ].map(([number, title, text]) => <View key={number} style={styles.stepCard}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><Text variant="titleMedium" style={styles.stepTitle}>{title}</Text><Text style={styles.stepText}>{text}</Text></View>)}
        </View>
        <Link href="/(public)/how-it-works" asChild><Button mode="outlined">See the full project journey</Button></Link>
      </View>
    </View>

    <View style={[styles.section, styles.audienceGrid]}>
      <View style={[styles.audienceCard, styles.homeownerCard]}>
        <View style={styles.audienceLabel}><Text style={styles.audienceLabelText}>HOMEOWNERS</Text></View>
        <Text variant="headlineSmall" style={styles.audienceTitle}>Make a better decision, then keep control of the job.</Text>
        {['Problem-first local trade search', 'Structured job posts with photos and detail', 'Profile and quote comparison', 'Saved trades and direct quote requests', 'Messages, variations and project history'].map((item) => <Text key={item} style={styles.benefit}>✓ {item}</Text>)}
        <View style={styles.audienceButtons}><Link href="/auth/account" asChild><Button mode="contained">Create homeowner account</Button></Link><Link href="/(public)/for-homeowners" asChild><Button mode="text">Homeowner features</Button></Link></View>
      </View>
      <View style={[styles.audienceCard, styles.traderCard]}>
        <View style={[styles.audienceLabel, styles.audienceLabelTrade]}><Text style={styles.audienceLabelText}>TRADESPEOPLE</Text></View>
        <Text variant="headlineSmall" style={styles.audienceTitle}>Present the business properly and manage more of the work in one place.</Text>
        {['Professional searchable profile on paid plans', 'Local jobs, direct requests and availability', 'Structured quotes and customer messaging', 'Invoices, saved searches and alerts', 'Project stories, reputation and analytics'].map((item) => <Text key={item} style={styles.benefit}>✓ {item}</Text>)}
        <View style={styles.audienceButtons}><Link href="/auth/account" asChild><Button mode="contained" buttonColor={colors.accent}>Create trade account</Button></Link><Link href="/(public)/for-tradespeople" asChild><Button mode="text" textColor={colors.accent}>Trade features</Button></Link></View>
      </View>
    </View>

    <View style={styles.pricingBand}>
      <View style={styles.section}>
        <SectionHeading eyebrow="Tradesperson membership" title="Clear monthly plans from free to Pro." body="Start with a business profile, then choose the marketplace capacity and business tools that fit how you work." />
        <PricingCards compact />
        <Link href="/(public)/pricing" asChild><Button mode="text">See full membership details →</Button></Link>
      </View>
    </View>

    <View style={styles.section}>
      <View style={[styles.trustPanel, isWide && styles.trustPanelWide]}>
        <View style={styles.trustCopy}>
          <SectionHeading eyebrow="Trust & safety" title="Useful signals, sensible privacy and clear responsibilities." body="BuildPair is not interested in pretending that one badge makes every project safe. The aim is to give both sides better information and a better record." />
          <View style={styles.trustList}>
            {['Credential submission and review status', 'Marketplace reviews connected to real project activity', 'Outward postcode shown publicly instead of exact matching coordinates', 'Reporting, AI safety signals and human moderation', 'Clear reminders that regulated work still needs appropriate checks'].map((item) => <View key={item} style={styles.trustRow}><View style={styles.trustTick}><Text style={styles.trustTickText}>✓</Text></View><Text style={styles.trustText}>{item}</Text></View>)}
          </View>
          <Link href="/(public)/trust-safety" asChild><Button mode="outlined">Read about trust & safety</Button></Link>
        </View>
        <View style={styles.trustVisual}>
          <View style={[styles.trustMiniCard, { backgroundColor: colors.primarySoft }]}><Text style={styles.trustMiniEyebrow}>PROFILE</Text><Text style={styles.trustMiniTitle}>Service area + work examples</Text><Text style={styles.trustMiniText}>Useful context before a homeowner sends a request.</Text></View>
          <View style={[styles.trustMiniCard, { backgroundColor: colors.accentSoft }]}><Text style={styles.trustMiniEyebrow}>PROJECT</Text><Text style={styles.trustMiniTitle}>Quote + variations + timeline</Text><Text style={styles.trustMiniText}>A clearer shared history after the introduction.</Text></View>
          <View style={[styles.trustMiniCard, { backgroundColor: colors.blueSoft }]}><Text style={styles.trustMiniEyebrow}>REPUTATION</Text><Text style={styles.trustMiniTitle}>Completed-work review history</Text><Text style={styles.trustMiniText}>More useful than a star score with no project context.</Text></View>
        </View>
      </View>
    </View>

    {jobs.length ? <View style={styles.section}>
      <SectionHeading eyebrow="Live marketplace" title="Recent jobs on BuildPair" body="A snapshot of work currently visible in the public marketplace." />
      <View style={styles.jobGrid}>
        {jobs.slice(0, 3).map((job) => <Link key={job.id} href={`/(public)/jobs/${job.id}` as Href} asChild><Pressable style={styles.jobCard}>
          <View style={styles.jobTop}><Chip compact>{job.category}</Chip><Text style={styles.jobLocation}>{job.locationLabel || job.postcode || 'UK'}</Text></View>
          <Text variant="titleMedium" style={styles.jobTitle}>{job.title}</Text>
          <Text numberOfLines={3} style={styles.jobDescription}>{job.description}</Text>
          <Text style={styles.jobLink}>View job →</Text>
        </Pressable></Link>)}
      </View>
      <Link href="/(public)/jobs" asChild><Button mode="outlined">See all public jobs</Button></Link>
    </View> : null}

    <View style={styles.downloadBand}>
      <View style={[styles.downloadInner, isWide && styles.downloadInnerWide]}>
        <View style={styles.downloadCopy}>
          <Text style={styles.downloadEyebrow}>Web · Android · iOS</Text>
          <Text variant="headlineMedium" style={styles.downloadTitle}>BuildPair wherever the project happens.</Text>
          <Text style={styles.downloadText}>The web app is a first-class BuildPair product. Android and iOS releases are being prepared from the same cross-platform codebase so the core marketplace experience stays consistent.</Text>
          <View style={styles.storeButtons}>
            <Button mode="contained-tonal" disabled>Google Play · Coming soon</Button>
            <Button mode="contained-tonal" disabled>App Store · Coming soon</Button>
          </View>
          <Link href="/(public)/download" asChild><Button mode="text" textColor="#FFFFFF">App launch information →</Button></Link>
        </View>
        <View style={styles.phoneMock}>
          <View style={styles.phoneNotch} />
          <Text style={styles.phoneLogo}>BuildPair</Text>
          <View style={styles.phoneSearch}><Text style={styles.phoneSearchText}>Search a job or problem</Text></View>
          <View style={styles.phoneMiniCard}><Text style={styles.phoneMiniEyebrow}>MATCH</Text><Text style={styles.phoneMiniTitle}>Bathroom renovation</Text><Text style={styles.phoneMiniText}>Related local trades and services</Text></View>
          <View style={[styles.phoneMiniCard, { backgroundColor: colors.accentSoft }]}><Text style={styles.phoneMiniEyebrow}>PROJECT</Text><Text style={styles.phoneMiniTitle}>Variation approved</Text><Text style={styles.phoneMiniText}>Project history updated</Text></View>
          <View style={[styles.phoneMiniCard, { backgroundColor: colors.blueSoft }]}><Text style={styles.phoneMiniEyebrow}>TRADE</Text><Text style={styles.phoneMiniTitle}>New job alert</Text><Text style={styles.phoneMiniText}>Relevant work in your area</Text></View>
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <SectionHeading eyebrow="Questions" title="Useful information before you create an account." />
      <View style={styles.faqGrid}>{FAQS.map(([question, answer]) => <View key={question} style={styles.faqCard}><Text variant="titleMedium" style={styles.faqQuestion}>{question}</Text><Text style={styles.faqAnswer}>{answer}</Text></View>)}</View>
      <View style={styles.finalCta}>
        <View style={styles.finalCopy}><Text style={styles.finalEyebrow}>BUILDPAIR UK</Text><Text variant="headlineSmall" style={styles.finalTitle}>Start with the job you need done, or the work you want to win.</Text></View>
        <View style={styles.finalButtons}>
          <Button mode="contained" onPress={() => router.push('/(public)/directory')}>Find trades</Button>
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
  hero: { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 38, paddingBottom: 34, gap: 27 },
  heroWide: { flexDirection: 'row', alignItems: 'stretch', paddingTop: 58, paddingBottom: 52 },
  heroCopy: { gap: 18 },
  heroCopyWide: { flex: 1.08, justifyContent: 'center', paddingRight: 16 },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: colors.secondarySoft, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  heroBadgeText: { color: colors.charcoalSoft, fontWeight: '900', fontSize: 11, letterSpacing: 0.15 },
  heroTitle: { color: colors.charcoal, fontSize: 52, lineHeight: 56, fontWeight: '900', letterSpacing: -2.1, maxWidth: 720 },
  heroTitleCompact: { fontSize: 38, lineHeight: 42, letterSpacing: -1.35 },
  heroSubtitle: { color: colors.muted, lineHeight: 28, maxWidth: 700 },
  heroSearch: { backgroundColor: colors.surfaceRaised, padding: 9, borderRadius: 22, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', shadowColor: colors.charcoal, shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  heroSearchInput: { flex: 1, minWidth: 230, backgroundColor: colors.surfaceRaised },
  inputOutline: { borderRadius: 14 },
  searchButtonContent: { minHeight: 50, paddingHorizontal: 8 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  microTrust: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  microTrustText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  heroVisualWrap: { minHeight: 420 },
  heroVisualWide: { flex: 0.92, minHeight: 590 },
  heroImage: { flex: 1, minHeight: 420, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 34, backgroundColor: colors.navySoft },
  heroImageRadius: { borderRadius: 34 },
  heroImageShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(17,31,42,0.27)' },
  imageCaption: { margin: 24, marginBottom: 29, gap: 4, maxWidth: 470 },
  imageCaptionSmall: { color: '#FFFFFF', fontWeight: '800', opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  imageCaptionBig: { color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '900' },
  floatingCard: { position: 'absolute', top: 24, right: 20, left: 20, maxWidth: 345, alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20, padding: 14, flexDirection: 'row', gap: 11, alignItems: 'center', shadowColor: colors.charcoal, shadowOpacity: 0.09, shadowRadius: 17, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  floatingIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  floatingCardCopy: { flex: 1 },
  floatingTitle: { color: colors.charcoal, fontWeight: '900' },
  floatingText: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  floatingCardSecondary: { position: 'absolute', left: 20, bottom: 105, backgroundColor: 'rgba(24,53,78,0.92)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, maxWidth: 235 },
  floatingMetric: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  floatingMetricText: { color: '#DDE7EE', fontSize: 11, lineHeight: 16, marginTop: 2 },
  statsWrap: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingVertical: 25 },
  statsInner: { width: '100%', maxWidth: 1180, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 14 },
  stat: { minWidth: 150, alignItems: 'center', padding: 8 },
  statValue: { color: colors.secondary, fontWeight: '900' },
  statLabel: { color: '#DCE5EB', marginTop: 2, textAlign: 'center' },
  section: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 46, gap: 24 },
  sectionHeading: { gap: 8, maxWidth: 790 },
  sectionHeadingCentred: { alignSelf: 'center', alignItems: 'center' },
  eyebrow: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.15, fontSize: 11 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.75 },
  sectionBody: { color: colors.muted, lineHeight: 24, maxWidth: 750 },
  textCentred: { textAlign: 'center' },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tradeCard: { flexGrow: 1, flexBasis: 250, minWidth: 230, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: colors.charcoal, shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  tradeIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tradeName: { flex: 1, color: colors.charcoal, fontWeight: '800' },
  cardArrow: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  problemSection: { backgroundColor: colors.surfaceRaised, maxWidth: 1180, borderRadius: 30, marginVertical: 16, borderWidth: 1, borderColor: colors.border },
  problemSectionWide: { flexDirection: 'row', alignItems: 'center' },
  problemCopy: { gap: 16 },
  problemCopyWide: { flex: 1.05 },
  problemBox: { backgroundColor: colors.surfaceSoft, borderRadius: 22, padding: 17, gap: 12 },
  problemBoxWide: { flex: 0.95 },
  problemExamples: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  problemHint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  photoBand: { backgroundColor: '#EFEAE4' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  photoCard: { flexGrow: 1, flexBasis: 310, minWidth: 280, minHeight: 330, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.navySoft },
  photoImage: { flex: 1, minHeight: 330, justifyContent: 'flex-end' },
  photoImageRadius: { borderRadius: 26 },
  photoShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(20,31,38,0.34)' } as never,
  photoCopy: { padding: 21, gap: 6 },
  photoTitle: { color: '#FFFFFF', fontWeight: '900' },
  photoText: { color: '#EDF2F5', lineHeight: 21, maxWidth: 300 },
  photoLink: { color: '#FFFFFF', fontWeight: '900', marginTop: 4 },
  swipeRow: { gap: 14, paddingRight: 18 },
  swipeCard: { width: 305, minHeight: 238, borderRadius: 26, padding: 22, gap: 12, borderWidth: 1, borderColor: 'rgba(35,41,48,0.05)' },
  swipeIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.74)', alignItems: 'center', justifyContent: 'center' },
  swipeTitle: { color: colors.charcoal, fontWeight: '900' },
  swipeText: { color: colors.charcoalSoft, lineHeight: 23 },
  swipeHint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  howWrap: { backgroundColor: colors.surfaceSoft },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stepCard: { flexGrow: 1, flexBasis: 245, backgroundColor: colors.surfaceRaised, borderRadius: 24, padding: 21, borderWidth: 1, borderColor: colors.border, gap: 10 },
  stepNumber: { width: 42, height: 36, borderRadius: 12, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: colors.secondary, fontWeight: '900', fontSize: 11, letterSpacing: 0.8 },
  stepTitle: { color: colors.charcoal, fontWeight: '900' },
  stepText: { color: colors.muted, lineHeight: 22 },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  audienceCard: { flexGrow: 1, flexBasis: 380, borderRadius: 28, padding: 27, gap: 11, borderWidth: 1 },
  homeownerCard: { backgroundColor: colors.primarySoft, borderColor: '#F2D7C3' },
  traderCard: { backgroundColor: colors.accentSoft, borderColor: '#CDE2DE' },
  audienceLabel: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  audienceLabelTrade: { backgroundColor: '#F8FFFD' },
  audienceLabelText: { color: colors.charcoalSoft, fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  audienceTitle: { color: colors.charcoal, fontWeight: '900', marginBottom: 3 },
  benefit: { color: colors.charcoalSoft, lineHeight: 21 },
  audienceButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  pricingBand: { backgroundColor: '#F1ECE6' },
  trustPanel: { backgroundColor: colors.surfaceRaised, borderRadius: 30, borderWidth: 1, borderColor: colors.border, padding: 25, gap: 24 },
  trustPanelWide: { flexDirection: 'row', alignItems: 'stretch' },
  trustCopy: { flex: 1.15, gap: 18 },
  trustList: { gap: 10 },
  trustRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  trustTick: { width: 23, height: 23, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  trustTickText: { color: colors.accent, fontWeight: '900', fontSize: 11 },
  trustText: { color: colors.charcoalSoft, lineHeight: 22, flex: 1 },
  trustVisual: { flex: 0.85, gap: 12, justifyContent: 'center' },
  trustMiniCard: { borderRadius: 22, padding: 18, gap: 6 },
  trustMiniEyebrow: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  trustMiniTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 17 },
  trustMiniText: { color: colors.charcoalSoft, lineHeight: 20, fontSize: 13 },
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  jobCard: { flexGrow: 1, flexBasis: 300, backgroundColor: colors.surfaceRaised, borderRadius: 23, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 11 },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  jobLocation: { color: colors.muted, fontSize: 12 },
  jobTitle: { color: colors.charcoal, fontWeight: '900' },
  jobDescription: { color: colors.muted, lineHeight: 21 },
  jobLink: { color: colors.primary, fontWeight: '800' },
  downloadBand: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 50 },
  downloadInner: { width: '100%', maxWidth: 1100, alignSelf: 'center', gap: 30, alignItems: 'center' },
  downloadInnerWide: { flexDirection: 'row', justifyContent: 'space-between' },
  downloadCopy: { flex: 1, maxWidth: 650, gap: 12 },
  downloadEyebrow: { color: '#FFD7BA', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  downloadTitle: { color: '#FFFFFF', fontWeight: '900' },
  downloadText: { color: '#FFF1E7', lineHeight: 24 },
  storeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phoneMock: { width: 240, minHeight: 405, backgroundColor: '#FFFFFF', borderRadius: 34, borderWidth: 7, borderColor: colors.navy, padding: 18, gap: 13 },
  phoneNotch: { width: 70, height: 7, borderRadius: 99, backgroundColor: colors.navy, alignSelf: 'center' },
  phoneLogo: { color: colors.primary, fontWeight: '900', fontSize: 20, textAlign: 'center' },
  phoneSearch: { padding: 11, borderRadius: 14, backgroundColor: colors.surfaceSoft },
  phoneSearchText: { color: colors.muted, fontSize: 11 },
  phoneMiniCard: { backgroundColor: colors.primarySoft, borderRadius: 16, padding: 13, gap: 4 },
  phoneMiniEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  phoneMiniTitle: { color: colors.charcoal, fontWeight: '900' },
  phoneMiniText: { color: colors.muted, fontSize: 11 },
  faqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  faqCard: { flexGrow: 1, flexBasis: 350, borderRadius: 22, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 19, gap: 8 },
  faqQuestion: { color: colors.charcoal, fontWeight: '900' },
  faqAnswer: { color: colors.muted, lineHeight: 22 },
  finalCta: { marginTop: 10, backgroundColor: colors.navy, borderRadius: 28, padding: 29, gap: 18, alignItems: 'center' },
  finalCopy: { alignItems: 'center', gap: 6 },
  finalEyebrow: { color: colors.secondary, fontWeight: '900', fontSize: 10, letterSpacing: 1.2 },
  finalTitle: { color: '#FFFFFF', textAlign: 'center', fontWeight: '900', maxWidth: 720 },
  finalButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center' },
  finalOutline: { borderColor: '#FFFFFF' },
});
