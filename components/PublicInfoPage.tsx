import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { colors } from '@/constants/theme';

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
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text variant="displaySmall" style={styles.title}>{title}</Text>
        <Text variant="bodyLarge" style={styles.intro}>{intro}</Text>
        {updated ? <View style={styles.updatedPill}><Text style={styles.updated}>Last updated {updated}</Text></View> : null}
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
  body: { color: colors.muted, lineHeight: 24 },
  list: { gap: 9 },
  item: { color: colors.muted, lineHeight: 23 },
  strong: { color: colors.charcoal, fontWeight: '800' },
  callout: { backgroundColor: colors.primarySoft, borderRadius: 20, padding: 17, gap: 6, borderWidth: 1, borderColor: '#F5D9C4' },
  calloutText: { color: colors.primaryDark, lineHeight: 22 },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.navy, paddingHorizontal: 20, paddingVertical: 64, overflow: 'hidden' },
  heroGlowOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(211,84,0,0.22)', top: -120, right: -70 },
  heroGlowTwo: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(35,118,109,0.18)', bottom: -130, left: 30 },
  heroInner: { width: '100%', maxWidth: 1040, alignSelf: 'center', gap: 14 },
  back: { alignSelf: 'flex-start', marginLeft: -8, marginBottom: 3 },
  eyebrow: { color: '#FFD7BA', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.3, fontSize: 12 },
  title: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -1.15, maxWidth: 920 },
  intro: { color: '#E6EDF2', maxWidth: 820, lineHeight: 27 },
  updatedPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, marginTop: 3 },
  updated: { color: '#D4DEE5', fontSize: 12 },
  content: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 36, gap: 14 },
  card: { backgroundColor: colors.surfaceRaised, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border, gap: 13, shadowColor: colors.charcoal, shadowOpacity: 0.035, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionMarker: { minWidth: 36, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionMarkerText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900', flex: 1, letterSpacing: -0.25 },
  body: { color: colors.muted, lineHeight: 24 },
});
