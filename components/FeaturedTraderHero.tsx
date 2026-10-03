import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Text } from 'react-native-paper';
import { SkeletonBlock } from '@/components/Skeleton';
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


function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function FeaturedCard({ trader, compact }: { trader: FeaturedTrader; compact: boolean }) {
  const router = useRouter();
  const initials = trader.businessName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const reputation = trader.reviewCount > 0
    ? `${trader.reviewCount} review${trader.reviewCount === 1 ? '' : 's'} · See sources in profile`
    : 'Explore this business';

  return <Pressable
    style={({ pressed }) => [styles.cardPressable, compact && styles.cardCompact, pressed && styles.cardPressed]}
    onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)}
    accessibilityRole="button"
    accessibilityLabel={`View ${trader.businessName} profile`}
  >
    <View style={styles.photoArea}>
      {trader.photos[0] ? <Image source={{ uri: trader.photos[0] }} style={styles.workPhoto} accessibilityLabel={`${trader.businessName} work photo`} resizeMode="cover" /> : <View style={styles.placeholder}><Text style={styles.initials}>{initials}</Text><Text style={styles.placeholderTrade}>{trader.tradeCategory}</Text></View>}
      {trader.foundingTrade ? <View style={styles.foundingBadge}><Text style={styles.featuredBadgeText}>FOUNDING TRADE</Text></View> : null}
    </View>
    <View style={[styles.cardInfo, compact && styles.cardInfoCompact]}>
      <Text numberOfLines={2} style={[styles.businessName, compact && styles.businessNameCompact]}>{trader.businessName}</Text>
      <Text numberOfLines={2} style={styles.tradeLine}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text>
      <Text numberOfLines={2} style={styles.metaLine}>{reputation}</Text>
      <View style={styles.cardFoot}><Text style={styles.activityText}>{trader.galleryCount > 0 ? `${trader.galleryCount} work photos` : 'Business profile'}</Text><Text style={styles.viewText}>View →</Text></View>
    </View>
  </Pressable>;
}

export function FeaturedTraderHero({ wide, onAvailabilityChange }: { wide: boolean; onAvailabilityChange?: (available: boolean) => void }) {
  const { width } = useWindowDimensions();
  const carousel = useRef<ScrollView>(null);
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

  useEffect(() => {
    if (loaded) onAvailabilityChange?.(traders.length > 0);
  }, [loaded, onAvailabilityChange, traders.length]);

  const pages = chunk(traders, pageSize);
  const visibleActivePage = Math.min(activePage, Math.max(0, pages.length - 1));

  if (!loaded) {
    return <View style={[styles.wrapper, wide && styles.wrapperWide]}>
      <View style={[styles.preloadCard, wide && styles.wrapperWide]}>
        <SkeletonBlock style={styles.preloadTitleSkeleton} />
        <View style={styles.preloadRow}><SkeletonBlock style={styles.preloadProfile} /><SkeletonBlock style={styles.preloadProfile} /></View>
      </View>
    </View>;
  }

  if (!traders.length) return null;

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
      ref={carousel}
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
        {page.map((trader) => <FeaturedCard key={trader.id} trader={trader} compact={pageWidth < 600} />)}
        {page.length < pageSize ? Array.from({ length: pageSize - page.length }).map((_, index) => <View key={`spacer-${index}`} style={styles.cardSpacer} />) : null}
      </View>)}
    </ScrollView>

    <View style={styles.carouselFooter}>
      <Text style={styles.swipeHint}>{wide ? 'Swipe or scroll to explore profiles' : 'Swipe to see more tradespeople'}</Text>
      {pages.length > 1 ? <View style={styles.dots}>
        {pages.map((_, index) => <Pressable key={`dot-${index}`} accessibilityRole="button" accessibilityLabel={`Show profile group ${index + 1} of ${pages.length}`} accessibilityState={{ selected: index === visibleActivePage }} onPress={() => { setActivePage(index); carousel.current?.scrollTo({ x: index * pageWidth, animated: true }); }} style={styles.dotControl}><View style={[styles.dot, index === visibleActivePage && styles.dotActive]} /></Pressable>)}
      </View> : null}
    </View>

  </View>;
}

const styles = StyleSheet.create({
  photoArea: { height: 150, width: '100%', backgroundColor: colors.navySoft },
  workPhoto: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12, backgroundColor: colors.navy },
  initials: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', letterSpacing: 1 },
  placeholderTrade: { color: '#D3E1EC', fontSize: 11, textAlign: 'center' },
  foundingBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  dotControl: { minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  wrapper: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', gap: 14, overflow: 'hidden' },
  wrapperWide: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center' },
  carousel: { width: '100%', maxWidth: 1140, minWidth: 0 },
  carouselContent: { alignItems: 'stretch' },
  page: { flexDirection: 'row', gap: 10, paddingHorizontal: 1 },
  cardPressable: { flex: 1, minWidth: 0, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  cardCompact: { borderRadius: 18 },
  cardImageCompact: { padding: 8 },
  cardInfoCompact: { padding: 9 },
  businessNameCompact: { fontSize: 16, lineHeight: 20 },
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
  cardInfo: { flex: 1, gap: 7, padding: 16, backgroundColor: colors.surfaceRaised },
  businessName: { color: colors.charcoal, fontSize: 18, lineHeight: 21, fontWeight: '900', letterSpacing: -0.3 },
  tradeLine: { color: colors.charcoalSoft, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  metaLine: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 },
  activityText: { flexShrink: 1, color: colors.muted, fontSize: 10, fontWeight: '700' },
  viewText: { flexShrink: 0, color: colors.primaryDark, fontSize: 11, fontWeight: '900' },
  carouselFooter: { minHeight: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 2, marginTop: 2 },
  swipeHint: { flexShrink: 1, color: colors.muted, fontSize: 11, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#CBD4D9' },
  dotActive: { width: 20, backgroundColor: colors.primary },
  preloadCard: { width: '100%', maxWidth: 1140, minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 24, borderRadius: 24, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  preloadTitle: { color: colors.charcoal, fontSize: 22, lineHeight: 27, fontWeight: '900', textAlign: 'center' },
  preloadTitleSkeleton: { width: '42%', minWidth: 180, height: 24 },
  preloadRow: { width: '100%', flexDirection: 'row', gap: 12 },
  preloadProfile: { flex: 1, minWidth: 0, height: 170, borderRadius: 18 },
  preloadText: { color: colors.muted, lineHeight: 20, maxWidth: 620, textAlign: 'center' },
  emptyState: { width: '100%', maxWidth: 1140, minHeight: 300, justifyContent: 'flex-end', padding: 18, overflow: 'hidden', borderRadius: 24 },
  emptyImage: { borderRadius: 24 },
  emptyShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,21,31,0.46)', borderRadius: 24 },
  emptyCopy: { maxWidth: 560, gap: 6, padding: 16, borderRadius: 18, backgroundColor: 'rgba(10,24,36,0.86)' },
  emptyEyebrow: { color: colors.primary, fontSize: 11.2, lineHeight: 15, fontWeight: '900', letterSpacing: 1 },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, lineHeight: 25, fontWeight: '900' },
  emptyText: { color: '#DCE7EE', lineHeight: 20 },
});
