import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';
import { apiFetch } from '@/lib/api';

type FeaturedTrader = {
  id: string;
  userId: string;
  businessName: string;
  tradeCategory: string;
  tradeCategories: string[];
  bio: string;
  locationLabel: string | null;
  photos: string[];
  qualifications: string[];
  subscriptionTier: 'basic' | 'featured';
  averageRating: number;
  reviewCount: number;
  completedJobs: number;
  verifiedCredentialCount: number;
  galleryCount: number;
  isOverride: boolean;
};

type FeaturedTraderResponse = {
  trader: FeaturedTrader | null;
  weekStart: string;
  nextRefreshAt: string;
};

export function FeaturedTraderSpotlight() {
  const router = useRouter();
  const [data, setData] = useState<FeaturedTraderResponse | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<FeaturedTraderResponse>('/api/featured-trader')
      .then((response) => { if (active) setData(response); })
      .catch(() => { if (active) setData(null); });
    return () => { active = false; };
  }, []);

  const trader = data?.trader;
  if (!trader) return null;

  const rating = Number(trader.averageRating || 0);
  const membership = trader.subscriptionTier === 'featured' ? 'BuildPair Pro' : 'BuildPair Plus';
  const primaryStat = trader.reviewCount > 0
    ? `${rating.toFixed(1)} ★ · ${trader.reviewCount} verified review${trader.reviewCount === 1 ? '' : 's'}`
    : 'New to BuildPair';
  const activityStat = trader.completedJobs > 0
    ? `${trader.completedJobs} completed BuildPair job${trader.completedJobs === 1 ? '' : 's'}`
    : `${trader.galleryCount} work photo${trader.galleryCount === 1 ? '' : 's'} in gallery`;

  return <View style={styles.band} testID="featured-trader-spotlight">
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{"THIS WEEK'S FEATURED TRADESPERSON"}</Text>
        <Text variant="headlineMedium" style={styles.headingTitle}>A closer look at one BuildPair trade.</Text>
        <Text style={styles.headingBody}>The spotlight changes every Monday, giving active tradespeople a regular chance to be discovered without turning the homepage into a permanent popularity contest.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.media}>
          {trader.photos[0]
            ? <Image source={{ uri: trader.photos[0] }} style={styles.image} accessibilityLabel={`${trader.businessName} work example`} />
            : <View style={styles.placeholder}><Text style={styles.placeholderLetter}>{trader.businessName.slice(0, 1).toUpperCase()}</Text></View>}
          <View style={styles.featureBadge}><Text style={styles.featureBadgeText}>FEATURED THIS WEEK</Text></View>
        </View>

        <View style={styles.copy}>
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text variant="headlineSmall" style={styles.businessName}>{trader.businessName}</Text>
              <Text style={styles.tradeLine}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text>
            </View>
            <Chip compact>{membership}</Chip>
          </View>

          <Text style={styles.bio}>{trader.bio}</Text>

          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statStrong}>{primaryStat}</Text><Text style={styles.statLabel}>reputation</Text></View>
            <View style={styles.stat}><Text style={styles.statStrong}>{activityStat}</Text><Text style={styles.statLabel}>profile activity</Text></View>
            {trader.verifiedCredentialCount > 0
              ? <View style={styles.stat}><Text style={styles.statStrong}>{trader.verifiedCredentialCount} verified</Text><Text style={styles.statLabel}>credential{trader.verifiedCredentialCount === 1 ? '' : 's'}</Text></View>
              : null}
          </View>

          <View style={styles.actions}>
            <Button mode="contained" onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)}>View featured profile</Button>
            <Button mode="text" onPress={() => router.push('/(public)/directory' as Href)}>Browse all trades</Button>
          </View>

          <Text style={styles.note}>Featured profiles rotate weekly among eligible active marketplace tradespeople. Review and completed-job figures shown here use verified BuildPair activity.</Text>
        </View>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  band: { backgroundColor: '#F4F8FB' },
  section: { width: '100%', maxWidth: 1140, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 42, gap: 22 },
  heading: { alignSelf: 'center', alignItems: 'center', gap: 8, maxWidth: 840 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textAlign: 'center' },
  headingTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  headingBody: { color: colors.muted, lineHeight: 24, textAlign: 'center' },
  card: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: '#D6E0E8', borderRadius: 26 },
  media: { position: 'relative', flexGrow: 1, flexBasis: 430, minWidth: 280, minHeight: 330, backgroundColor: colors.navySoft },
  image: { width: '100%', height: '100%', minHeight: 330, backgroundColor: colors.border },
  placeholder: { minHeight: 330, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navySoft },
  placeholderLetter: { fontSize: 72, color: colors.navy, fontWeight: '900' },
  featureBadge: { position: 'absolute', top: 16, left: 16, borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8 },
  featureBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  copy: { flexGrow: 1, flexBasis: 430, minWidth: 280, padding: 24, gap: 16, justifyContent: 'center' },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  titleBlock: { flex: 1, minWidth: 220, gap: 4 },
  businessName: { color: colors.charcoal, fontWeight: '900' },
  tradeLine: { color: colors.primary, fontWeight: '800' },
  bio: { color: colors.charcoalSoft, lineHeight: 23, fontSize: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  stat: { flexGrow: 1, flexBasis: 150, minWidth: 140, borderRadius: 16, backgroundColor: colors.surfaceSoft, paddingHorizontal: 13, paddingVertical: 11, gap: 2 },
  statStrong: { color: colors.charcoal, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  note: { color: colors.muted, fontSize: 11, lineHeight: 17 },
});
