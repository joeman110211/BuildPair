import Head from 'expo-router/head';
import { type Href, Link } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { PublicFooter } from '@/components/PublicFooter';
import { PublicSeo } from '@/components/PublicSeo';
import { SemanticHeading } from '@/components/SemanticHeading';
import { colors, radii } from '@/constants/theme';
import { adviceAudienceLabel, adviceGuideBySlug } from '@/lib/advice-library';

export function AdviceGuidePage({ slug }: { slug: string }) {
  const guide = adviceGuideBySlug(slug);

  if (!guide) {
    return <ScrollView style={styles.page} contentContainerStyle={styles.shell}>
      <SemanticHeading level={1} style={styles.heroTitle}>Advice guide not found</SemanticHeading>
      <Text style={styles.body}>This guide is not available.</Text>
      <Link href="/(public)/advice" asChild><Button mode="contained">Back to Advice Hub</Button></Link>
    </ScrollView>;
  }

  const related = (guide.relatedSlugs ?? [])
    .map((relatedSlug) => adviceGuideBySlug(relatedSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const canonical = 'https://www.buildpair.co.uk/advice/' + guide.slug;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    dateModified: guide.reviewedAt,
    datePublished: guide.reviewedAt,
    mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: 'BuildPair', url: 'https://www.buildpair.co.uk/' },
    publisher: { '@type': 'Organization', name: 'BuildPair', url: 'https://www.buildpair.co.uk/' },
    inLanguage: 'en-GB',
  };

  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <PublicSeo title={guide.title} description={guide.description} />
    <Head><script type="application/ld+json">{JSON.stringify(structuredData)}</script></Head>

    <View style={styles.hero}>
      <View style={styles.heroInner}>
        <Text style={styles.eyebrow}>{adviceAudienceLabel(guide.audience)} · {guide.category}</Text>
        <SemanticHeading level={1} style={styles.heroTitle}>{guide.title}</SemanticHeading>
        <Text style={styles.heroBody}>{guide.summary}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Applies to: {guide.appliesTo}</Text>
          <Text style={styles.meta}>Last checked: {new Date(guide.reviewedAt + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>
      </View>
    </View>

    <View style={styles.shell}>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Key points</Text>
        {guide.keyPoints.map((point) => <Text key={point} style={styles.bullet}>• {point}</Text>)}
      </View>

      {guide.sections.map((section) => <View key={section.heading} style={styles.section}>
        <SemanticHeading level={2} style={styles.sectionTitle}>{section.heading}</SemanticHeading>
        {(section.paragraphs ?? []).map((paragraph) => <Text key={paragraph} style={styles.body}>{paragraph}</Text>)}
        {(section.bullets ?? []).map((bullet) => <Text key={bullet} style={styles.bullet}>• {bullet}</Text>)}
      </View>)}

      <View style={styles.sourceBox}>
        <SemanticHeading level={2} style={styles.sectionTitle}>Official and authoritative sources</SemanticHeading>
        <Text style={styles.body}>Use these sources for the current detail that applies to your job or contract.</Text>
        <View style={styles.sourceList}>
          {guide.sources.map((source) => <Button
            key={source.url}
            mode="outlined"
            icon="open-in-new"
            onPress={() => Linking.openURL(source.url)}
          >{source.publisher}: {source.title}</Button>)}
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>BuildPair provides general information and signposting, not legal, structural, electrical, gas or building-control approval. Requirements can change and the right answer depends on the work, contract, location and facts.</Text>
      </View>

      {related.length ? <View style={styles.section}>
        <SemanticHeading level={2} style={styles.sectionTitle}>Related BuildPair guides</SemanticHeading>
        <View style={styles.relatedGrid}>{related.map((item) => <Link key={item.slug} href={('/(public)/advice/' + item.slug) as Href} asChild>
          <Button mode="outlined">{item.title}</Button>
        </Link>)}</View>
      </View> : null}

      <View style={styles.actions}>
        <Link href="/(public)/advice" asChild><Button mode="outlined">Back to Advice Hub</Button></Link>
        <Link href="/(public)/directory" asChild><Button mode="contained">Find a trade</Button></Link>
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { paddingHorizontal: 16, paddingVertical: 48, backgroundColor: colors.background },
  heroInner: { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 14 },
  eyebrow: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  heroTitle: { color: colors.charcoal, fontSize: 42, lineHeight: 49, fontWeight: '900', letterSpacing: -1.1 },
  heroBody: { color: colors.charcoalSoft, fontSize: 18, lineHeight: 28, maxWidth: 780 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  shell: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 48, gap: 24 },
  notice: { backgroundColor: colors.primarySoft, borderRadius: radii.xl, borderWidth: 1, borderColor: '#F0C9AE', padding: 22, gap: 8 },
  noticeTitle: { color: colors.charcoal, fontSize: 20, fontWeight: '900' },
  section: { gap: 10 },
  sectionTitle: { color: colors.charcoal, fontSize: 26, lineHeight: 32, fontWeight: '900' },
  body: { color: colors.charcoalSoft, fontSize: 16, lineHeight: 25 },
  bullet: { color: colors.charcoalSoft, fontSize: 16, lineHeight: 24 },
  sourceBox: { backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 12 },
  sourceList: { gap: 10, alignItems: 'flex-start' },
  disclaimer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  disclaimerText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 6 },
});
