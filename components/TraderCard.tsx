import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import type { TraderProfile } from '@/types';

export function TraderCard({
  trader,
  compareSelected = false,
  compareDisabled = false,
  onToggleCompare,
}: {
  trader: TraderProfile;
  compareSelected?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: (trader: TraderProfile) => void;
}) {
  const router = useRouter();
  const rating = Number(trader.averageRating || 0);
  const isPro = trader.subscriptionTier === 'featured';
  const membership = trader.isSubscriptionActive ? (isPro ? 'BuildPair Pro' : trader.subscriptionTier === 'basic' ? 'BuildPair Plus' : trader.subscriptionTier === 'core' ? 'BuildPair Core' : null) : null;
  const responseLabel = trader.averageResponseHours && trader.averageResponseHours > 0 ? `Replies in ~${trader.averageResponseHours < 1 ? '<1' : Math.round(trader.averageResponseHours)}h` : trader.responseRate && trader.responseRate > 0 ? `${Math.round(trader.responseRate)}% response rate` : null;
  const metaLine = [
    trader.reviewCount ? `${rating.toFixed(1)} ★ · ${trader.reviewCount} review${trader.reviewCount === 1 ? '' : 's'}` : 'New to BuildPair',
    `${trader.radiusMiles} mile radius`,
    trader.availabilitySummary ? `Available ${trader.availabilitySummary}` : null,
    trader.completedJobs ? `${trader.completedJobs} completed BuildPair job${trader.completedJobs === 1 ? '' : 's'}` : null,
    responseLabel,
  ].filter(Boolean).join(' · ');
  const visibleServices = trader.subSkills.slice(0, 4);

  return <AppCard style={styles.card}>
    <View style={styles.media}>
      {trader.photos[0]
        ? <Image source={{ uri: trader.photos[0] }} style={styles.image} accessibilityLabel={`${trader.businessName} work example`} />
        : <View style={styles.placeholder}><View style={styles.placeholderMark}><Text style={styles.placeholderLetter}>{trader.businessName.slice(0, 1).toUpperCase()}</Text></View><Text style={styles.placeholderText}>Work gallery coming soon</Text></View>}
      {membership ? <View style={[styles.membershipBadge, isPro && styles.proBadge]}><Text style={[styles.membershipText, isPro && styles.proMembershipText]}>{membership}</Text></View> : null}
    </View>
    <View style={styles.content}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>{trader.businessName}</Text>
          <Text style={styles.muted}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text>
        </View>
        <View style={styles.badges}>
          {trader.foundingTrade ? <View style={styles.softBadge}><Text style={styles.softBadgeText}>Founding trade</Text></View> : null}
          {trader.isPreview ? <View style={styles.softBadge}><Text style={styles.softBadgeText}>Example profile</Text></View> : null}
        </View>
      </View>
      <Text style={styles.metaLine}>{metaLine}</Text>
      <Text numberOfLines={3} style={styles.bio}>{trader.bio}</Text>
      {visibleServices.length ? <Text style={styles.servicesText}><Text style={styles.servicesLabel}>Services: </Text>{visibleServices.join(' · ')}{trader.subSkills.length > visibleServices.length ? ` · +${trader.subSkills.length - visibleServices.length} more` : ''}</Text> : null}
      <View style={styles.actions}>
        <Button mode="contained" contentStyle={styles.button} onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)}>View profile</Button>
        {onToggleCompare ? <Button
          mode={compareSelected ? 'contained-tonal' : 'outlined'}
          disabled={compareDisabled}
          onPress={() => onToggleCompare(trader)}
        >{compareSelected ? 'Added ✓' : 'Compare'}</Button> : null}
      </View>
    </View>
  </AppCard>;
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden', flexGrow: 1, flexBasis: 310, minWidth: 0, flexShrink: 1, maxWidth: 540 },
  media: { position: 'relative', minHeight: 200, backgroundColor: colors.navySoft },
  image: { width: '100%', height: 205, backgroundColor: colors.border },
  placeholder: { height: 205, backgroundColor: colors.navySoft, justifyContent: 'center', alignItems: 'center', gap: 9 },
  placeholderMark: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D6E0E8' },
  placeholderLetter: { color: colors.navy, fontSize: 30, fontWeight: '900' },
  placeholderText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  membershipBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  proBadge: { backgroundColor: 'rgba(24,53,78,0.96)' },
  membershipText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  proMembershipText: { color: '#FFFFFF' },
  content: { padding: 18, gap: 11 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0, flexBasis: 180, flexShrink: 1, maxWidth: '100%', gap: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-end' },
  softBadge: { borderRadius: 999, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 5 },
  softBadgeText: { color: colors.primaryDark, fontSize: 10, fontWeight: '800' },
  title: { fontWeight: '900', color: colors.text, letterSpacing: -0.35 },
  muted: { color: colors.muted, lineHeight: 21 },
  bio: { color: colors.charcoalSoft, lineHeight: 22 },
  metaLine: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  servicesText: { color: colors.charcoalSoft, fontSize: 13, lineHeight: 19 },
  servicesLabel: { color: colors.charcoal, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 48 },
});
