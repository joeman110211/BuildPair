import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/constants/theme';
import { apiFetch } from '@/lib/api';

type FeaturedTrader = {
  id: string;
  businessName: string;
  tradeCategory: string;
  locationLabel: string | null;
  photos: string[];
  subscriptionTier: 'basic' | 'featured';
  averageRating: number;
  reviewCount: number;
  completedJobs: number;
  galleryCount: number;
};

type FeaturedTraderResponse = {
  trader: FeaturedTrader | null;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1625577816360-32388b70471c?auto=format&fit=crop&w=1600&q=84';

export function FeaturedTraderHero({ wide }: { wide: boolean }) {
  const router = useRouter();
  const [trader, setTrader] = useState<FeaturedTrader | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<FeaturedTraderResponse>('/api/featured-trader')
      .then((response) => {
        if (active) setTrader(response.trader);
      })
      .catch(() => {
        if (active) setTrader(null);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, []);

  if (!loaded || !trader || !trader.photos[0]) {
    return <ImageBackground
      source={{ uri: FALLBACK_IMAGE }}
      style={[styles.panel, wide && styles.panelWide]}
      imageStyle={styles.image}
      accessibilityLabel="Home renovation project"
      testID="home-hero-visual"
    >
      <View style={styles.fullShade} />
      <View style={styles.fallbackTop}><Text style={styles.fallbackEyebrow}>AI WHERE IT REMOVES FRICTION</Text><Text style={styles.fallbackText}>Human decisions where judgement matters.</Text></View>
      <View style={styles.fallbackBottom}><Text style={styles.fallbackEyebrow}>ONE CONNECTED PROJECT RECORD</Text><Text style={styles.fallbackTitle}>Request → Visit or quote → Agree → Fund → Build → Approve → Complete</Text></View>
    </ImageBackground>;
  }

  const rating = Number(trader.averageRating || 0);
  const reputation = trader.reviewCount > 0
    ? `${rating.toFixed(1)} ★ · ${trader.reviewCount} verified review${trader.reviewCount === 1 ? '' : 's'}`
    : 'New to BuildPair';
  const activity = trader.completedJobs > 0
    ? `${trader.completedJobs} completed BuildPair job${trader.completedJobs === 1 ? '' : 's'}`
    : `${trader.galleryCount} work photo${trader.galleryCount === 1 ? '' : 's'}`;
  const membership = trader.subscriptionTier === 'featured' ? 'BuildPair Pro' : 'BuildPair Plus';
  const thumbnails = trader.photos.slice(1, 4);

  return <ImageBackground
    source={{ uri: trader.photos[0] }}
    style={[styles.panel, wide && styles.panelWide]}
    imageStyle={styles.image}
    accessibilityLabel={`${trader.businessName} featured work`}
    testID="home-featured-trader"
  >
    <View style={styles.fullShade} />

    <View style={styles.topRow}>
      <View style={styles.featureBadge}><Text style={styles.featureBadgeText}>LIVE BUILDPAIR PROFILE</Text></View>
      <View style={styles.membershipBadge}><Text style={styles.membershipText}>{membership}</Text></View>
    </View>

    <View style={styles.bottomCard}>
      <Text style={styles.featuredLabel}>FEATURED TRADESPERSON THIS WEEK</Text>
      <Text style={styles.businessName}>{trader.businessName}</Text>
      <Text style={styles.tradeLine}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text>
      <Text style={styles.metaLine}>{reputation} · {activity}</Text>

      {thumbnails.length ? <View style={styles.thumbRow}>
        {thumbnails.map((photo, index) => <Image key={photo} source={{ uri: photo }} style={styles.thumb} accessibilityLabel={`${trader.businessName} work example ${index + 2}`} />)}
      </View> : null}

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>View featured profile →</Text>
      </Pressable>
      <Text style={styles.rotationNote}>Featured weekly from current eligible BuildPair profiles. Review and completed-job counts appear only when that activity is recorded in BuildPair.</Text>
    </View>
  </ImageBackground>;
}

const styles = StyleSheet.create({
  panel: { width: '100%', flexShrink: 0, minHeight: 420, justifyContent: 'space-between', padding: 20, overflow: 'hidden', borderRadius: 30, backgroundColor: colors.navySoft },
  panelWide: { flex: 0.9, width: 'auto', flexShrink: 1, minHeight: 500 },
  image: { borderRadius: 30 },
  fullShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(10,24,36,0.34)', borderRadius: 30 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  featureBadge: { borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8 },
  featureBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  membershipBadge: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.96)', paddingHorizontal: 11, paddingVertical: 8 },
  membershipText: { color: colors.navy, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  bottomCard: { alignSelf: 'stretch', gap: 7, padding: 16, borderRadius: 20, backgroundColor: 'rgba(14,30,43,0.9)' },
  featuredLabel: { color: '#FFD7BA', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  businessName: { color: '#FFFFFF', fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.6 },
  tradeLine: { color: '#FFFFFF', fontWeight: '800', lineHeight: 20 },
  metaLine: { color: '#DCE7EE', fontSize: 12, lineHeight: 18 },
  thumbRow: { flexDirection: 'row', gap: 7, marginTop: 3 },
  thumb: { width: 58, height: 48, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  cta: { alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 10 },
  ctaPressed: { opacity: 0.78 },
  ctaText: { color: colors.navy, fontWeight: '900' },
  rotationNote: { color: '#AFC0CB', fontSize: 10, lineHeight: 15 },
  fallbackTop: { alignSelf: 'flex-start', maxWidth: 330, gap: 2, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(14,30,43,0.76)' },
  fallbackBottom: { gap: 5, maxWidth: 520 },
  fallbackEyebrow: { color: '#FFD7BA', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  fallbackText: { color: '#FFFFFF', fontWeight: '800', lineHeight: 18 },
  fallbackTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 29, fontWeight: '900' },
});
