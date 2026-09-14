import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { colors, layout, radii, spacing } from '@/constants/theme';

export type InfoSection = {
  title: string;
  body: ReactNode;
};

export function PublicInfoPage({ eyebrow, title, intro, sections, updated }: { eyebrow?: string; title: string; intro: string; sections: InfoSection[]; updated?: string }) {
  const router = useRouter();
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');

  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <View style={styles.hero}>
      <View style={styles.heroGlowOne} />
      <View style={styles.heroGlowTwo} />
      <View style={styles.heroInner}>
        <Button mode="text" textColor="#FFFFFF" compact style={styles.back} onPress={goBack}>← Back</Button>
        <View style={styles.heroCopy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text variant="displaySmall" style={styles.title}>{title}</Text>
          <Text variant="bodyLarge" style={styles.intro}>{intro}</Text>
          {updated ? <View style={styles.updatedPill}><Text style={styles.updated}>Last updated {updated}</Text></View> : null}
        </View>
      </View>
    </View>
    <View style={styles.content}>
      {sections.map((section, index) => <View key={section.title} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.sectionMarker}><Text style={styles.sectionMarkerText}>{String(index + 1).padStart(2, '0')}</Text></View>
          <Text variant="headlineSmall" style={styles.sectionTitle}>{section.title}</Text>
        </View>
        {typeof section.body === 'string' ? <Text style={styles.body}>{section.body}</Text> : section.body}
      </View>)}
    </View>
    <PublicFooter />
  </ScrollView>;
}

export const infoStyles = StyleSheet.create({
  body: { minWidth: 0, maxWidth: '100%', color: colors.muted, lineHeight: 24 },
  list: { minWidth: 0, maxWidth: '100%', gap: spacing.sm },
  item: { minWidth: 0, maxWidth: '100%', color: colors.muted, lineHeight: 23 },
  strong: { color: colors.charcoal, fontWeight: '800' },
  callout: { minWidth: 0, maxWidth: '100%', backgroundColor: colors.primarySoft, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, borderWidth: 1, borderColor: '#F5D9C4' },
  calloutText: { minWidth: 0, maxWidth: '100%', color: colors.primaryDark, lineHeight: 22 },
});

const styles = StyleSheet.create({
  page: { flex: 1, minWidth: 0, backgroundColor: colors.background },
  scroll: { flexGrow: 1, minWidth: 0 },
  hero: { minWidth: 0, backgroundColor: colors.navy, paddingHorizontal: spacing.xl, paddingVertical: 56, overflow: 'hidden' },
  heroGlowOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(211,84,0,0.22)', top: -120, right: -70 },
  heroGlowTwo: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(35,118,109,0.18)', bottom: -130, left: 30 },
  heroInner: { width: '100%', maxWidth: layout.pageMaxWidth, minWidth: 0, alignSelf: 'center', gap: spacing.md },
  heroCopy: { width: '100%', maxWidth: layout.readingMaxWidth, minWidth: 0, alignSelf: 'center', alignItems: 'center', gap: spacing.md },
  back: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
  eyebrow: { maxWidth: '100%', color: '#FFD7BA', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.3, fontSize: 12, textAlign: 'center' },
  title: { maxWidth: '100%', color: '#FFFFFF', fontWeight: '900', letterSpacing: -1.15, textAlign: 'center' },
  intro: { maxWidth: '100%', color: '#E6EDF2', lineHeight: 27, textAlign: 'center' },
  updatedPill: { maxWidth: '100%', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.xxs },
  updated: { color: '#D4DEE5', fontSize: 12 },
  content: { width: '100%', maxWidth: 1040, minWidth: 0, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xxxl, gap: spacing.md },
  card: { width: '100%', minWidth: 0, maxWidth: '100%', backgroundColor: colors.surfaceRaised, borderRadius: radii.lg, padding: spacing.xxl, borderWidth: 1, borderColor: colors.border, gap: spacing.md, shadowColor: colors.charcoal, shadowOpacity: 0.025, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  cardHeader: { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionMarker: { minWidth: 36, height: 30, borderRadius: radii.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionMarkerText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  sectionTitle: { minWidth: 0, maxWidth: '100%', color: colors.charcoal, fontWeight: '900', flex: 1, letterSpacing: -0.25 },
  body: { minWidth: 0, maxWidth: '100%', color: colors.muted, lineHeight: 24 },
});
