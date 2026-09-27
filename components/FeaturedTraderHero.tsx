import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LatestJobsShowcase } from '@/components/LatestJobsShowcase';
import { colors } from '@/constants/theme';
import { apiFetch } from '@/lib/api';

type FeaturedTrader = {
  id: string;
  businessName: string;
  tradeCategory: string;
  locationLabel: string | null;
  photos: string[];
  subscriptionTier: 'free' | 'core' | 'basic' | 'featured';
  averageRating: number;
  reviewCount: number;
  completedJobs: number;
  galleryCount: number;
  verifiedCredentialCount: number;
  foundingTrade?: boolean;
  prelaunchProfile?: boolean;
};

type FeaturedTraderResponse = {
  trader: FeaturedTrader | null;
  traders?: FeaturedTrader[];
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1625577816360-32388b70471c?auto=format&fit=crop&w=1200&q=84';

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function FeaturedCard({ trader }: { trader: FeaturedTrader }) {
  const router = useRouter();
  const rating = Number(trader.averageRating || 0);
  const membership = trader.subscriptionTier === 'featured' ? 'PRO' : trader.subscriptionTier === 'basic' ? 'PLUS' : trader.subscriptionTier === 'core' ? 'CORE' : 'STARTER';
  const reputation = trader.reviewCount > 0
    ? `${rating.toFixed(1)} ★ · ${trader.reviewCount} review${trader.reviewCount === 1 ? '' : 's'}`
    : 'New to BuildPair';

  return <Pressable
    style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
    onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)}
    accessibilityRole="button"
    accessibilityLabel={`View ${trader.businessName} profile`}
  >
    <ImageBackground
      source={{ uri: trader.photos[0] || FALLBACK_IMAGE }}
      style={styles.cardImage}
      imageStyle={styles.cardImageRadius}
      accessibilityLabel={`${trader.businessName} featured work`}
    >
      <View style={styles.cardShade} />
      <View style={styles.cardTopRow}>
        <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>{trader.foundingTrade ? 'FOUNDING TRADE' : 'BUILDPAIR TRADE'}</Text></View>
        <View style={styles.planBadge}><Text style={styles.planBadgeText}>{membership}</Text></View>
      </View>
      <View style={styles.cardInfo}>
        <Text numberOfLines={2} style={styles.businessName}>{trader.businessName}</Text>
        <Text numberOfLines={2} style={styles.tradeLine}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text>
        <Text numberOfLines={1} style={styles.metaLine}>{reputation}{trader.prelaunchProfile ? ' · Profile live before launch' : ''}</Text>
        <View style={styles.cardFoot}>
          <Text style={styles.activityText}>{trader.completedJobs > 0 ? `${trader.completedJobs} completed` : `${trader.galleryCount} work photos`}</Text>
          <Text style={styles.viewText}>View →</Text>
        </View>
      </View>
    </ImageBackground>
  </Pressable>;
}

export function FeaturedTraderHero({ wide }: { wide: boolean }) {
  const { width } = useWindowDimensions();
  const [traders, setTraders] = useState<FeaturedTrader[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const fallbackWidth = Math.max(280, Math.min(width - 36, 1140));
  const pageWidth = Math.max(1, Math.min(containerWidth || fallbackWidth, 1140));
  const pageSize = pageWidth >= 760 ? 3 : 2;

  useEffect(() => {
    let active = true;
    apiFetch<FeaturedTraderResponse>('/api/featured-trader')
      .then((response) => {
        if (!active) return;
        const next = response.traders?.length ? response.traders : response.trader ? [response.trader] : [];
        setTraders(next.slice(0, 6));
      })
      .catch(() => {
        if (active) setTraders([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, []);

  const pages = chunk(traders, pageSize);
  const visibleActivePage = Math.min(activePage, Math.max(0, pages.length - 1));

  if (!loaded) {
    return <View style={[styles.wrapper, wide && styles.wrapperWide]}>
      <View style={[styles.preloadCard, wide && styles.wrapperWide]}>
        <Text style={styles.emptyEyebrow}>BUILDPAIR TRADES</Text>
        <Text style={styles.preloadTitle}>Featured BuildPair profiles.</Text>
        <Text style={styles.preloadText}>Live local trade profiles appear here as they become available. BuildPair loads current directory profiles rather than using placeholder listings.</Text>
      </View>
      <LatestJobsShowcase wide={wide} />
    </View>;
  }

  if (!traders.length) {
    return <View style={[styles.wrapper, wide && styles.wrapperWide]}>
      <ImageBackground source={{ uri: FALLBACK_IMAGE }} style={[styles.emptyState, wide && styles.wrapperWide]} imageStyle={styles.emptyImage}>
        <View style={styles.emptyShade} />
        <View style={styles.emptyCopy}>
          <Text style={styles.emptyEyebrow}>BUILDPAIR TRADES</Text>
          <Text style={styles.emptyTitle}>Your business could be featured here.</Text>
          <Text style={styles.emptyText}>Create your BuildPair trade profile, show homeowners the work you do and you could appear here as the marketplace grows.</Text>
        </View>
      </ImageBackground>
      <LatestJobsShowcase wide={wide} />
    </View>;
  }

  const updatePage = (offsetX: number) => {
    const next = Math.max(0, Math.min(pages.length - 1, Math.round(offsetX / pageWidth)));
    setActivePage(next);
  };

  return <View
    style={[styles.wrapper, wide && styles.wrapperWide]}
    testID="home-featured-trader"
    onLayout={(event) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      if (nextWidth > 0 && nextWidth !== containerWidth) setContainerWidth(nextWidth);
    }}
  >
    <ScrollView
      horizontal
      pagingEnabled
      snapToInterval={pageWidth}
      disableIntervalMomentum
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      style={styles.carousel}
      contentContainerStyle={styles.carouselContent}
      onMomentumScrollEnd={(event) => updatePage(event.nativeEvent.contentOffset.x)}
      onScrollEndDrag={(event) => updatePage(event.nativeEvent.contentOffset.x)}
    >
      {pages.map((page, pageIndex) => <View key={`featured-page-${pageIndex}`} style={[styles.page, { width: pageWidth }]}>
        {page.map((trader) => <FeaturedCard key={trader.id} trader={trader} />)}
        {page.length < pageSize ? Array.from({ length: pageSize - page.length }).map((_, index) => <View key={`spacer-${index}`} style={styles.cardSpacer} />) : null}
      </View>)}
    </ScrollView>

    <View style={styles.carouselFooter}>
      <Text style={styles.swipeHint}>{wide ? 'Swipe or scroll to explore profiles' : 'Swipe to see more tradespeople'}</Text>
      <View style={styles.dots}>
        {pages.map((_, index) => <View key={`dot-${index}`} style={[styles.dot, index === visibleActivePage && styles.dotActive]} />)}
      </View>
    </View>

    <LatestJobsShowcase wide={wide} />
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', gap: 14, overflow: 'hidden' },
  wrapperWide: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center' },
  carousel: { width: '100%', maxWidth: 1140, minWidth: 0 },
  carouselContent: { alignItems: 'stretch' },
  page: { flexDirection: 'row', gap: 10, paddingHorizontal: 1 },
  cardPressable: { flex: 1, minWidth: 0, height: 320, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.navySoft },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardSpacer: { flex: 1, minWidth: 0 },
  cardImage: { flex: 1, justifyContent: 'space-between', padding: 12 },
  cardImageRadius: { borderRadius: 24 },
  cardShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,21,31,0.36)', borderRadius: 24 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 5 },
  featuredBadge: { borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 9, paddingVertical: 6 },
  featuredBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  planBadge: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 8, paddingVertical: 6 },
  planBadgeText: { color: colors.navy, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  cardInfo: { gap: 5, padding: 12, borderRadius: 17, backgroundColor: 'rgba(10,24,36,0.9)' },
  businessName: { color: '#FFFFFF', fontSize: 18, lineHeight: 21, fontWeight: '900', letterSpacing: -0.3 },
  tradeLine: { color: '#F3F7F9', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  metaLine: { color: '#D6E1E8', fontSize: 11, lineHeight: 15 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 },
  activityText: { flexShrink: 1, color: '#B7C8D2', fontSize: 10, fontWeight: '700' },
  viewText: { flexShrink: 0, color: '#FFD0AE', fontSize: 11, fontWeight: '900' },
  carouselFooter: { minHeight: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 2, marginTop: 2 },
  swipeHint: { flexShrink: 1, color: colors.muted, fontSize: 11, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#CBD4D9' },
  dotActive: { width: 20, backgroundColor: colors.primary },
  preloadCard: { width: '100%', maxWidth: 1140, minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 24, borderRadius: 24, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  preloadTitle: { color: colors.charcoal, fontSize: 22, lineHeight: 27, fontWeight: '900', textAlign: 'center' },
  preloadText: { color: colors.muted, lineHeight: 20, maxWidth: 620, textAlign: 'center' },
  emptyState: { width: '100%', maxWidth: 1140, minHeight: 300, justifyContent: 'flex-end', padding: 18, overflow: 'hidden', borderRadius: 24 },
  emptyImage: { borderRadius: 24 },
  emptyShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,21,31,0.46)', borderRadius: 24 },
  emptyCopy: { maxWidth: 560, gap: 6, padding: 16, borderRadius: 18, backgroundColor: 'rgba(10,24,36,0.86)' },
  emptyEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  emptyTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 27, fontWeight: '900' },
  emptyText: { color: '#DCE7EE', lineHeight: 20 },
});
