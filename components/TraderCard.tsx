import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import type { TraderProfile } from '@/types';

export function TraderCard({ trader }: { trader: TraderProfile }) {
  const router = useRouter();
  const rating = Number(trader.averageRating || 0);
  const isPro = trader.subscriptionTier === 'featured';
  const membership = isPro ? 'BuildPair Pro' : trader.subscriptionTier === 'basic' ? 'BuildPair Plus' : null;

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
        {trader.isPreview ? <Chip compact>Example profile</Chip> : null}
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaPill}><Text style={styles.metaStrong}>{trader.reviewCount ? `${rating.toFixed(1)} ★` : 'New'}</Text><Text style={styles.metaText}>{trader.reviewCount ? `${trader.reviewCount} review${trader.reviewCount === 1 ? '' : 's'}` : 'No reviews yet'}</Text></View>
        <View style={styles.metaPill}><Text style={styles.metaStrong}>{trader.radiusMiles} miles</Text><Text style={styles.metaText}>working radius</Text></View>
      </View>
      <Text numberOfLines={3} style={styles.bio}>{trader.bio}</Text>
      <View style={styles.skills}>{trader.subSkills.slice(0, 4).map((skill) => <Chip key={skill} compact>{skill}</Chip>)}</View>
      <Button mode="contained" contentStyle={styles.button} onPress={() => router.push(`/(public)/traders/${trader.id}` as Href)}>View profile</Button>
    </View>
  </AppCard>;
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden', flexGrow: 1, flexBasis: 310, minWidth: 280, maxWidth: 540 },
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
  flex: { flex: 1, minWidth: 180, gap: 3 },
  title: { fontWeight: '900', color: colors.text, letterSpacing: -0.35 },
  muted: { color: colors.muted, lineHeight: 21 },
  bio: { color: colors.charcoalSoft, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: { flexGrow: 1, minWidth: 120, borderRadius: 16, backgroundColor: colors.surfaceSoft, paddingHorizontal: 12, paddingVertical: 9, gap: 1 },
  metaStrong: { color: colors.charcoal, fontWeight: '900' },
  metaText: { color: colors.muted, fontSize: 10 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { minHeight: 48 },
});
