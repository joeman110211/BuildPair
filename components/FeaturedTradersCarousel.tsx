import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/constants/theme';
import { apiFetch } from '@/lib/api';

type Trader = {
  id: string;
  businessName: string;
  tradeCategory: string;
  locationLabel: string | null;
  photos: string[];
  averageRating: number;
  reviewCount: number;
  completedJobs: number;
};

export function FeaturedTradersCarousel() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [traders, setTraders] = useState<Trader[]>([]);

  useEffect(() => {
    let active = true;
    apiFetch<{ traders: Trader[] }>('/api/featured-traders')
      .then((response) => { if (active) setTraders(response.traders ?? []); })
      .catch(() => { if (active) setTraders([]); });
    return () => { active = false; };
  }, []);

  if (!traders.length) return null;

  const mobile = width < 700;
  const cardWidth = mobile ? Math.max(148, Math.min(190, (width - 58) / 2)) : 230;

  return <View style={styles.wrap}>
    <View style={styles.headingRow}>
      <View style={styles.headingCopy}>
        <Text style={styles.eyebrow}>FEATURED TRADESPEOPLE</Text>
        <Text variant="headlineSmall" style={styles.title}>Local trades worth a closer look.</Text>
        <Text style={styles.body}>Swipe through featured BuildPair profiles and open the ones relevant to your job.</Text>
      </View>
      <Text style={styles.swipeHint}>{mobile ? 'Swipe →' : 'Browse →'}</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} decelerationRate="fast">
      {traders.map((trader) => {
        const rating = Number(trader.averageRating || 0);
        const reputation = trader.reviewCount > 0 ? `${rating.toFixed(1)} ★ · ${trader.reviewCount} review${trader.reviewCount === 1 ? '' : 's'}` : 'New to BuildPair';
        return <Pressable key={trader.id} onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)} style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}>
          <ImageBackground source={{ uri: trader.photos[0] }} style={styles.image} imageStyle={styles.imageRadius}>
            <View style={styles.shade} />
            <View style={styles.badge}><Text style={styles.badgeText}>FEATURED</Text></View>
            <View style={styles.cardCopy}>
              <Text numberOfLines={2} style={styles.business}>{trader.businessName}</Text>
              <Text numberOfLines={1} style={styles.trade}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text>
              <Text style={styles.meta}>{reputation}</Text>
              <Text style={styles.link}>View profile →</Text>
            </View>
          </ImageBackground>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 34, gap: 16 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 },
  headingCopy: { flex: 1, gap: 4 },
  eyebrow: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 20, maxWidth: 620 },
  swipeHint: { color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
  row: { gap: 12, paddingRight: 24 },
  card: { aspectRatio: 0.94, minHeight: 205, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.navySoft },
  pressed: { opacity: 0.86 },
  image: { flex: 1, justifyContent: 'space-between', padding: 12 },
  imageRadius: { borderRadius: 20 },
  shade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,22,33,0.34)' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 9, paddingVertical: 6 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  cardCopy: { gap: 3, padding: 10, borderRadius: 14, backgroundColor: 'rgba(10,27,40,0.88)' },
  business: { color: '#fff', fontSize: 17, lineHeight: 20, fontWeight: '900' },
  trade: { color: '#F2F6F8', fontSize: 11, fontWeight: '700' },
  meta: { color: '#D6E1E7', fontSize: 10 },
  link: { color: '#FFD7BA', fontSize: 11, fontWeight: '900', marginTop: 2 },
});
