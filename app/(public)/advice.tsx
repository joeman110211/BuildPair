import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Chip, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { PublicFooter } from '@/components/PublicFooter';
import { PublicSeo } from '@/components/PublicSeo';
import { SemanticHeading } from '@/components/SemanticHeading';
import { colors, publicResponsiveMetrics, radii } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { scrollToResults } from '@/lib/scroll-to-results';
import { ADVICE_GUIDES, adviceAudienceLabel, adviceGuideBySlug, searchAdviceGuides, type AdviceAudience, type AdviceSource } from '@/lib/advice-library';
import { SEO_ADVICE_BATCH } from '@/components/SeoAdviceBatchPage';
import { SEO_ADVICE_BATCH_THREE } from '@/components/SeoAdviceBatchThreePage';

type AudienceFilter = AdviceAudience | 'all';

type AdviceAiResponse = {
  answer: string;
  guideSlugs: string[];
  sources: AdviceSource[];
  source: 'ai' | 'library';
};

export default function AdviceHub() {
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const [category, setCategory] = useState('all');
  const [asking, setAsking] = useState(false);
  const [aiResult, setAiResult] = useState<AdviceAiResponse | null>(null);
  const [aiError, setAiError] = useState('');

  const categories = useMemo(() => {
    const pool = audience === 'all' ? ADVICE_GUIDES : ADVICE_GUIDES.filter((guide) => guide.audience === audience);
    return Array.from(new Set(pool.map((guide) => guide.category))).sort();
  }, [audience]);

  const guides = useMemo(() => {
    const matches = searchAdviceGuides(query, audience);
    return category === 'all' ? matches : matches.filter((guide) => guide.category === category);
  }, [query, audience, category]);

  const showGuideResults = () => {
    setAiResult(null);
    setAiError('');
    scrollToResults('advice-guide-results');
  };

  const askAdviceAi = async () => {
    const question = query.trim();
    if (question.length < 3) {
      setAiError('Type a question first.');
      return;
    }

    setAsking(true);
    setAiError('');
    try {
      const result = await apiFetch<AdviceAiResponse>('/api/ai/advice', {
        method: 'POST',
        body: JSON.stringify({ question, audience }),
      });
      setAiResult(result);
      scrollToResults('advice-ai-result');
    } catch (error) {
      setAiError(errorMessage(error));
    } finally {
      setAsking(false);
    }
  };

  const changeAudience = (value: AudienceFilter) => {
    setAudience(value);
    setCategory('all');
    setAiResult(null);
  };

  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <PublicSeo
      title="Home improvement advice, rules and practical guidance"
      description="Search BuildPair advice for homeowners and tradespeople: quotes, payments, consumer rights, building rules, safety and practical project guidance."
    />

    <View style={[styles.hero, metrics.phone && styles.heroMobile]}>
      <View style={styles.heroInner}>
        <Chip style={styles.heroChip} textStyle={styles.heroChipText}>Free BuildPair Advice Hub</Chip>
        <SemanticHeading level={1} style={[styles.heroTitle, { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>
          Advice for the job you are actually dealing with.
        </SemanticHeading>
        <Text variant="bodyLarge" style={styles.heroBody}>Search practical guidance, consumer rights, building rules, safety and business basics. Or ask BuildPair AI and get an answer grounded in checked BuildPair guides and their official sources.</Text>

        <View style={styles.searchBox}>
          <TextInput
            mode="outlined"
            value={query}
            onChangeText={(value) => { setQuery(value); setAiResult(null); setAiError(''); }}
            onSubmitEditing={showGuideResults}
            placeholder="e.g. How much deposit should I pay a builder?"
            accessibilityLabel="Search BuildPair advice"
            outlineStyle={styles.inputOutline}
            style={styles.searchInput}
          />
          <View style={styles.searchButtons}>
            <Button mode="outlined" icon="magnify" style={[styles.searchAction, metrics.phone && styles.searchActionMobile]} onPress={showGuideResults}>Search guides</Button>
            <Button mode="contained" icon="creation-outline" style={[styles.searchAction, metrics.phone && styles.searchActionMobile]} onPress={askAdviceAi} loading={asking} disabled={asking}>Ask BuildPair AI</Button>
          </View>
        </View>
        <Text style={styles.aiNote}>Advice AI is constrained to BuildPair’s checked guidance. For regulated, legal or safety-critical questions, use the linked official source for the current detail.</Text>
      </View>
    </View>

    <View style={[styles.content, metrics.phone && styles.contentMobile]}>
      <View style={styles.filterBlock}>
        <SemanticHeading level={2} style={[styles.sectionTitle, { fontSize: metrics.sectionTitleFontSize, lineHeight: metrics.sectionTitleLineHeight }]}>Browse the Advice Hub</SemanticHeading>
        <View style={styles.filterRow}>
          <Button compact mode={audience === 'all' ? 'contained' : 'outlined'} onPress={() => changeAudience('all')}>All advice</Button>
          <Button compact mode={audience === 'homeowner' ? 'contained' : 'outlined'} onPress={() => changeAudience('homeowner')}>For homeowners</Button>
          <Button compact mode={audience === 'tradesperson' ? 'contained' : 'outlined'} onPress={() => changeAudience('tradesperson')}>For tradespeople</Button>
        </View>
        <View style={styles.filterRow}>
          <Button compact mode={category === 'all' ? 'contained-tonal' : 'text'} onPress={() => setCategory('all')}>All topics</Button>
          {categories.map((item) => <Button key={item} compact mode={category === item ? 'contained-tonal' : 'text'} onPress={() => setCategory(item)}>{item}</Button>)}
        </View>
      </View>

      {aiError ? <View style={styles.errorBox}><Text style={styles.errorText}>{aiError}</Text></View> : null}

      {aiResult ? <View nativeID="advice-ai-result" style={styles.aiCard}>
        <Text style={styles.eyebrow}>BuildPair AI answer</Text>
        <Text style={styles.aiAnswer}>{aiResult.answer}</Text>
        {aiResult.guideSlugs.length ? <View style={styles.aiLinks}>
          <Text style={styles.cardLabel}>Relevant BuildPair guides</Text>
          {aiResult.guideSlugs.map((slug) => {
            const guide = adviceGuideBySlug(slug);
            if (!guide) return null;
            return <Link key={slug} href={('/(public)/advice/' + slug) as Href} asChild><Button mode="outlined">{guide.title}</Button></Link>;
          })}
        </View> : null}
        {aiResult.sources.length ? <View style={styles.aiLinks}>
          <Text style={styles.cardLabel}>Official sources</Text>
          {aiResult.sources.map((source) => <Button key={source.url} mode="text" icon="open-in-new" onPress={() => Linking.openURL(source.url)}>{source.publisher}: {source.title}</Button>)}
        </View> : null}
      </View> : null}

      <View nativeID="advice-guide-results" style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{guides.length} {guides.length === 1 ? 'guide' : 'guides'}</Text>
        {query.trim() ? <Text style={styles.resultsFor}>matching “{query.trim()}”</Text> : null}
      </View>

      <View style={styles.grid}>
        {guides.map((guide) => <View key={guide.slug} style={styles.card}>
          <Text style={styles.cardMeta}>{adviceAudienceLabel(guide.audience)} · {guide.category}</Text>
          <SemanticHeading level={2} style={styles.cardTitle}>{guide.title}</SemanticHeading>
          <Text style={styles.cardBody}>{guide.summary}</Text>
          <Text style={styles.checked}>Checked {new Date(guide.reviewedAt + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          <Link href={('/(public)/advice/' + guide.slug) as Href} asChild><Button mode="outlined">Read guide</Button></Link>
        </View>)}
      </View>

      {!query.trim() && category === 'all' ? <View style={styles.filterBlock}>
        <SemanticHeading level={2} style={[styles.sectionTitle, { fontSize: metrics.sectionTitleFontSize, lineHeight: metrics.sectionTitleLineHeight }]}>More cost & project guides</SemanticHeading>
        <Text style={styles.body}>Current UK budgeting, compliance and project-planning guides, checked against the cited market and official sources.</Text>
        <View style={styles.grid}>
          {[...SEO_ADVICE_BATCH, ...SEO_ADVICE_BATCH_THREE].map((guide) => <View key={guide.slug} style={styles.card}>
            <Text style={styles.cardMeta}>Homeowner · {guide.category}</Text>
            <SemanticHeading level={2} style={styles.cardTitle}>{guide.title}</SemanticHeading>
            <Text style={styles.cardBody}>{guide.summary}</Text>
            <Link href={('/(public)/advice/' + guide.slug) as Href} asChild><Button mode="outlined">Read guide</Button></Link>
          </View>)}
        </View>
      </View> : null}

      {!guides.length ? <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No checked guide matches that yet.</Text>
        <Text style={styles.body}>Try a broader search. Questions people ask here will help us decide which guidance BuildPair should add next.</Text>
      </View> : null}

      <View style={styles.quickLinks}>
        <View style={styles.quickCopy}>
          <SemanticHeading level={2} style={styles.quickTitle}>Need the official rules rather than a general guide?</SemanticHeading>
          <Text style={styles.body}>Use BuildPair’s UK building-rules page for official starting points by nation, or report a marketplace concern through the normal moderation route.</Text>
        </View>
        <View style={styles.filterRow}>
          <Link href="/(public)/building-regulations" asChild><Button mode="contained" icon="book-open-page-variant-outline">UK building rules</Button></Link>
          <Link href="/(public)/report" asChild><Button mode="outlined" icon="alert-outline">Report a BuildPair user</Button></Link>
        </View>
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { paddingHorizontal: 20, paddingVertical: 58, backgroundColor: colors.background },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 38 },
  heroInner: { width: '100%', maxWidth: 980, alignSelf: 'center', gap: 14, alignItems: 'center' },
  heroChip: { alignSelf: 'center', backgroundColor: colors.primarySoft },
  heroChipText: { color: colors.primaryDark, fontWeight: '800' },
  heroTitle: { color: colors.charcoal, fontWeight: '900', maxWidth: 880, letterSpacing: -1, textAlign: 'center' },
  heroBody: { color: colors.muted, maxWidth: 850, lineHeight: 27, textAlign: 'center' },
  searchBox: { width: '100%', maxWidth: 780, gap: 10, marginTop: 8 },
  searchInput: { backgroundColor: colors.surfaceRaised },
  searchButtons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  searchAction: { flexGrow: 1, flexBasis: 220 },
  searchActionMobile: { flexBasis: '100%' },
  inputOutline: { borderRadius: radii.lg },
  aiNote: { color: colors.muted, fontSize: 12, lineHeight: 18, maxWidth: 760, textAlign: 'center' },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 20, paddingBottom: 48, gap: 22 },
  contentMobile: { paddingHorizontal: 16, gap: 18 },
  filterBlock: { gap: 10 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  resultsHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'baseline' },
  resultsCount: { color: colors.charcoal, fontWeight: '900', fontSize: 18 },
  resultsFor: { color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 320, minWidth: 0, maxWidth: '100%', backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 9 },
  cardMeta: { color: colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: .7 },
  cardTitle: { color: colors.charcoal, fontSize: 22, lineHeight: 28, fontWeight: '900' },
  cardBody: { color: colors.muted, lineHeight: 22, flexGrow: 1 },
  checked: { color: colors.muted, fontSize: 12 },
  aiCard: { backgroundColor: colors.primarySoft, borderRadius: radii.xl, borderWidth: 1, borderColor: '#F0C9AE', padding: 22, gap: 12 },
  eyebrow: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  aiAnswer: { color: colors.charcoal, fontSize: 16, lineHeight: 25 },
  aiLinks: { gap: 7, alignItems: 'flex-start' },
  cardLabel: { color: colors.charcoal, fontWeight: '900' },
  errorBox: { backgroundColor: '#FFF1F0', borderRadius: radii.lg, padding: 14 },
  errorText: { color: '#9B1C1C' },
  empty: { backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 6 },
  emptyTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 18 },
  body: { color: colors.muted, lineHeight: 23 },
  quickLinks: { backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 14 },
  quickCopy: { gap: 6 },
  quickTitle: { color: colors.charcoal, fontSize: 22, lineHeight: 28, fontWeight: '900' },
});
