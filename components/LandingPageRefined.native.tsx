import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { TRADE_CATEGORIES } from '@/constants/options';
import { FAIR_FOR_BOTH } from '@/constants/site-language';
import { colors, radii, spacing } from '@/constants/theme';

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

const STEPS = [
  ['1', 'Tell us what needs doing', 'Search by trade or describe the job in ordinary language.'],
  ['2', 'Compare properly', 'Review suitable tradespeople and clearer, structured quotes.'],
  ['3', 'Keep the job together', 'Messages, changes, payments and progress stay linked to the project.'],
] as const;

export default function LandingPageRefined() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const goSearch = (value = search) => {
    const q = value.trim();
    router.push((q ? `/(public)/directory?q=${encodeURIComponent(q)}` : '/(public)/directory') as Href);
  };

  const goTrade = (trade: string) => router.push(`/(public)/directory?trade=${encodeURIComponent(trade)}` as Href);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>{FAIR_FOR_BOTH.eyebrow.toUpperCase()}</Text>
        <Text style={styles.title}>What do you need done?</Text>
        <Text style={styles.subtitle}>A fairer way for homeowners and tradespeople to find each other, agree the job and keep it organised.</Text>

        <View style={styles.searchCard}>
          <TextInput
            mode="outlined"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => goSearch()}
            placeholder="e.g. bathroom tiling, leaking tap..."
            returnKeyType="search"
            outlineStyle={styles.searchOutline}
            style={styles.searchInput}
          />
          <Button mode="contained" contentStyle={styles.primaryButtonContent} onPress={() => goSearch()}>
            Find a trade
          </Button>
        </View>

        <View style={styles.quickRow}>
          <Link href="/auth/account" asChild>
            <Pressable style={[styles.quickCard, styles.quickPrimary]} accessibilityRole="button">
              <Text style={styles.quickGlyph}>＋</Text>
              <View style={styles.quickCopy}>
                <Text style={styles.quickTitle}>Post a job</Text>
                <Text style={styles.quickText}>Get suitable trades to respond</Text>
              </View>
            </Pressable>
          </Link>
          <Link href="/(public)/for-tradespeople" asChild>
            <Pressable style={styles.quickCard} accessibilityRole="button">
              <Text style={styles.quickGlyphDark}>▣</Text>
              <View style={styles.quickCopy}>
                <Text style={styles.quickTitle}>Find work</Text>
                <Text style={styles.quickText}>Tradesperson area</Text>
              </View>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular trades</Text>
          <Button compact mode="text" onPress={() => goSearch('')}>See all</Button>
        </View>
        <View style={styles.tradeGrid}>
          {POPULAR_TRADES.map((trade) => (
            <Pressable key={trade} style={styles.tradeCard} onPress={() => goTrade(trade)} accessibilityRole="button">
              <Text numberOfLines={2} style={styles.tradeName}>{trade}</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.fairCard}>
          <View style={styles.fairSide}><Text style={styles.fairLabel}>HOMEOWNER</Text><Text style={styles.fairTitle}>{FAIR_FOR_BOTH.homeownerTitle}</Text><Text style={styles.fairText}>{FAIR_FOR_BOTH.homeownerBody}</Text></View>
          <View style={styles.fairDivider} />
          <View style={styles.fairSide}><Text style={styles.fairLabel}>TRADESPERSON</Text><Text style={styles.fairTitle}>{FAIR_FOR_BOTH.tradeTitle}</Text><Text style={styles.fairText}>{FAIR_FOR_BOTH.tradeBody}</Text></View>
          <Text style={styles.fairBridge}>{FAIR_FOR_BOTH.bridge}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How BuildPair works</Text>
        <View style={styles.stepsCard}>
          {STEPS.map(([number, title, copy], index) => (
            <View key={number} style={[styles.stepRow, index !== STEPS.length - 1 && styles.stepDivider]}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepText}>{copy}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.projectCard}>
          <Text style={styles.projectEyebrow}>ONE CONNECTED PROJECT</Text>
          <Text style={styles.projectTitle}>Less chasing. Less guessing. Fewer scattered messages.</Text>
          <Text style={styles.projectText}>Keep quotes, decisions, agreed changes and payment stages attached to the job instead of rebuilding the story from texts and screenshots later.</Text>
          <Link href="/(public)/how-it-works" asChild>
            <Button mode="outlined" style={styles.projectButton}>See how it works</Button>
          </Link>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.adviceRow}>
          <View style={styles.adviceCopy}>
            <Text style={styles.sectionTitle}>Advice & safety</Text>
            <Text style={styles.adviceText}>Quick UK-focused guidance for planning work, checking the right things and avoiding common problems.</Text>
          </View>
          <Link href="/(public)/advice" asChild>
            <Button mode="text">Open</Button>
          </Link>
        </View>
      </View>

      <Text style={styles.categoryCount}>{TRADE_CATEGORIES.length} UK trade categories available</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.charcoal, fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.charcoalSoft, fontSize: 16, lineHeight: 23 },
  searchCard: { gap: spacing.sm, marginTop: spacing.xs },
  searchInput: { backgroundColor: colors.surfaceRaised },
  searchOutline: { borderRadius: radii.lg, borderColor: colors.border },
  primaryButtonContent: { minHeight: 52 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  quickCard: { flex: 1, minHeight: 100, borderRadius: radii.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: spacing.md, justifyContent: 'space-between' },
  quickPrimary: { backgroundColor: colors.primarySoft, borderColor: '#F0CDB6' },
  quickGlyph: { color: colors.primaryDark, fontSize: 25, lineHeight: 28, fontWeight: '700' },
  quickGlyphDark: { color: colors.navy, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  quickCopy: { gap: 1 },
  quickTitle: { color: colors.charcoal, fontSize: 16, fontWeight: '900' },
  quickText: { color: colors.muted, fontSize: 11.5, lineHeight: 15 },
  section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle: { color: colors.charcoal, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  fairCard: { borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  fairSide: { gap: spacing.xs },
  fairDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  fairLabel: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  fairTitle: { color: colors.charcoal, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  fairText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  fairBridge: { color: colors.navy, fontSize: 14, lineHeight: 19, fontWeight: '900', textAlign: 'center', paddingTop: spacing.xs },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tradeCard: { width: '48.7%', minHeight: 70, borderRadius: radii.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  tradeName: { flex: 1, color: colors.charcoalSoft, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  arrow: { color: colors.primary, fontSize: 26, lineHeight: 28, fontWeight: '600' },
  stepsCard: { marginTop: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, alignItems: 'flex-start' },
  stepDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  stepNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: colors.primaryDark, fontWeight: '900' },
  stepCopy: { flex: 1, gap: 2 },
  stepTitle: { color: colors.charcoal, fontSize: 15, fontWeight: '900' },
  stepText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  projectCard: { borderRadius: radii.xl, backgroundColor: colors.navy, padding: spacing.xl, gap: spacing.sm },
  projectEyebrow: { color: '#F6C59F', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  projectTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '900' },
  projectText: { color: '#E8EEF2', fontSize: 14, lineHeight: 21 },
  projectButton: { alignSelf: 'flex-start', borderColor: '#FFFFFF', marginTop: spacing.xs },
  adviceRow: { borderRadius: radii.lg, backgroundColor: colors.accentSoft, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  adviceCopy: { flex: 1, gap: spacing.xs },
  adviceText: { color: colors.charcoalSoft, fontSize: 13, lineHeight: 18 },
  categoryCount: { color: colors.muted, textAlign: 'center', fontSize: 11.5, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
