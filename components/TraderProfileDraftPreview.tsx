import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';

type Props = {
  businessName: string;
  tradeCategory?: string;
  tradeCategories: string[];
  serviceSelections: Record<string, string[] | undefined>;
  locationLabel?: string;
  radiusMiles: number;
  coverPhotoUrl?: string;
  profileImageUrl?: string;
  logoUrl?: string;
  bio: string;
  yearsExperience?: number;
  yearEstablished?: number | null;
  photos: string[];
  serviceAreas: string[];
  qualifications: string[];
  beforeAfterCount: number;
};

export function TraderProfileDraftPreview({
  businessName,
  tradeCategory,
  tradeCategories,
  serviceSelections,
  locationLabel,
  radiusMiles,
  coverPhotoUrl,
  profileImageUrl,
  logoUrl,
  bio,
  yearsExperience,
  yearEstablished,
  photos,
  serviceAreas,
  qualifications,
  beforeAfterCount,
}: Props) {
  const primaryTrade = tradeCategory || tradeCategories[0] || 'Your trade';
  const serviceList = tradeCategories.flatMap((category) => serviceSelections[category] ?? []);
  const displayName = businessName.trim() || 'Your business';
  const avatarUrl = logoUrl || profileImageUrl;
  const baseLabel = locationLabel || 'Your service area';

  return <View style={styles.wrap}>
    <View style={styles.previewLabelRow}>
      <Text style={styles.previewEyebrow}>LIVE PUBLIC PROFILE PREVIEW</Text>
      <Text style={styles.previewHint}>This mirrors the profile homeowners will see.</Text>
    </View>

    <View style={styles.profileShell}>
      <View style={styles.coverWrap}>
        {coverPhotoUrl
          ? <Image source={{ uri: coverPhotoUrl }} style={styles.cover} />
          : <View style={styles.coverFallback}><Text style={styles.coverFallbackBrand}>BuildPair</Text><Text style={styles.coverFallbackText}>{primaryTrade}</Text></View>}
        <View style={styles.coverShade} />
        <View style={styles.coverCopy}>
          <Text style={styles.coverEyebrow}>{primaryTrade}</Text>
          <Text style={styles.coverTitle}>Professional local work, presented properly.</Text>
        </View>
      </View>

      <View style={styles.identityStrip}>
        <View style={styles.identityLeft}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{displayName.slice(0, 1).toUpperCase()}</Text></View>}
          <View style={styles.identityCopy}>
            <Text variant="headlineSmall" style={styles.businessName}>{displayName}</Text>
            <Text style={styles.locationLine}>{baseLabel}{tradeCategories.length ? ` · ${tradeCategories.join(' · ')}` : ''}</Text>
            <View style={styles.ratingLine}>
              <Text style={styles.stars}>★★★★★</Text>
              <Text style={styles.ratingText}>0.0 (0 reviews)</Text>
            </View>
            <View style={styles.trustRow}>
              <Chip compact icon="map-marker-radius">{radiusMiles} mile radius</Chip>
              <Chip compact icon="check-decagram">Profile preview</Chip>
            </View>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {['Overview', 'Services', 'Gallery', 'Reviews', 'Credentials'].map((label, index) => <View key={label} style={[styles.tab, index === 0 && styles.tabActive]}>
          <Text numberOfLines={1} style={[styles.tabText, index === 0 && styles.tabTextActive]}>{label}</Text>
        </View>)}
      </ScrollView>
    </View>

    <AppCard style={styles.panel}>
      <Text variant="titleLarge" style={styles.panelTitle}>About {displayName}</Text>
      <Text style={styles.bio}>{bio.trim() || 'Your business introduction will appear here.'}</Text>
      <View style={styles.detailList}>
        <Text style={styles.detailText}>◉ {yearsExperience || 0}+ years of experience</Text>
        {yearEstablished ? <Text style={styles.detailText}>◉ Established {yearEstablished}</Text> : null}
        <Text style={styles.detailText}>◉ Covers {serviceAreas.length ? serviceAreas.join(', ') : baseLabel}</Text>
      </View>
    </AppCard>

    {photos.length ? <AppCard style={styles.panel}>
      <View style={styles.panelHeader}><Text variant="titleLarge" style={styles.panelTitle}>Gallery</Text><Text style={styles.linkText}>{photos.length} photos</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
        {photos.slice(0, 6).map((uri, index) => <Image key={`${uri}-${index}`} source={{ uri }} style={styles.galleryImage} />)}
      </ScrollView>
      <Text style={styles.muted}>{beforeAfterCount} before/after project{beforeAfterCount === 1 ? '' : 's'} added</Text>
    </AppCard> : null}

    <AppCard style={styles.panel}>
      <Text variant="titleLarge" style={styles.panelTitle}>Services</Text>
      <View style={styles.serviceTags}>
        {(serviceList.length ? serviceList : tradeCategories).slice(0, 12).map((service) => <Chip key={service} icon="check-circle-outline" style={styles.serviceChip}>{service}</Chip>)}
      </View>
    </AppCard>

    <AppCard style={styles.panel}>
      <Text variant="titleLarge" style={styles.panelTitle}>Service area</Text>
      <View style={styles.mapPreview}>
        <View style={styles.mapRing}><View style={styles.mapPin} /></View>
        <Text style={styles.mapLabel}>{baseLabel}</Text>
        <Text style={styles.mapSubLabel}>Approx. {radiusMiles} mile service area</Text>
      </View>
      <Text style={styles.muted}>The published profile will show an interactive approximate-area map without exposing the exact address.</Text>
    </AppCard>

    <AppCard style={styles.panel}>
      <Text variant="titleLarge" style={styles.panelTitle}>Credentials & Insurance</Text>
      {qualifications.length
        ? qualifications.slice(0, 6).map((item) => <View key={item} style={styles.credentialRow}><View style={styles.credentialDot}><Text style={styles.credentialDotText}>•</Text></View><View style={styles.flex}><Text style={styles.credentialName}>{item}</Text><Text style={styles.muted}>Trader-declared until verified by BuildPair</Text></View></View>)
        : <Text style={styles.muted}>Add qualifications now, then submit evidence after publishing if you want BuildPair verification.</Text>}
    </AppCard>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  previewLabelRow: { gap: 3 },
  previewEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  previewHint: { color: colors.muted, fontSize: 12 },
  profileShell: { width: '100%', borderRadius: 22, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  coverWrap: { height: 210, position: 'relative', overflow: 'hidden', backgroundColor: colors.navy },
  cover: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#233542', gap: 5 },
  coverFallbackBrand: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  coverFallbackText: { color: '#FFD0AE', fontSize: 15, fontWeight: '800' },
  coverShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,21,31,0.28)' },
  coverCopy: { position: 'absolute', left: 10, bottom: 10, maxWidth: 180, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: 'rgba(10,24,36,0.82)' },
  coverEyebrow: { color: '#FFD0AE', fontSize: 7, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  coverTitle: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '900', marginTop: 2 },
  identityStrip: { padding: 16, gap: 12, backgroundColor: '#FFFFFF' },
  identityLeft: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  identityCopy: { flex: 1, minWidth: 0, gap: 4 },
  avatar: { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: colors.surfaceSoft },
  avatarFallback: { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 29, fontWeight: '900' },
  businessName: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.4 },
  locationLine: { color: colors.charcoalSoft, fontWeight: '700', fontSize: 12 },
  ratingLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  stars: { color: '#F4A000', fontWeight: '900', letterSpacing: 1 },
  ratingText: { color: colors.charcoalSoft, fontWeight: '700', fontSize: 12 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tabs: { width: '100%', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#FFFFFF' },
  tabsContent: { flexGrow: 1, width: '100%', paddingHorizontal: 4 },
  tab: { flex: 1, minWidth: 0, paddingHorizontal: 2, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: '800', fontSize: 11.5, textAlign: 'center' },
  tabTextActive: { color: colors.primary },
  panel: { gap: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  panelTitle: { color: colors.charcoal, fontWeight: '900' },
  bio: { color: colors.charcoalSoft, lineHeight: 23 },
  detailList: { gap: 7 },
  detailText: { color: colors.charcoalSoft, lineHeight: 20 },
  galleryRow: { gap: 9, paddingRight: 2 },
  galleryImage: { width: 210, height: 150, borderRadius: 14, resizeMode: 'cover', backgroundColor: colors.surfaceSoft },
  linkText: { color: colors.primary, fontWeight: '800' },
  muted: { color: colors.muted, lineHeight: 19, fontSize: 12 },
  serviceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  serviceChip: { backgroundColor: '#FFFFFF' },
  mapPreview: { minHeight: 180, borderRadius: 16, backgroundColor: '#EEF1EC', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: colors.border },
  mapRing: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: colors.primary, backgroundColor: 'rgba(234,107,31,0.13)', alignItems: 'center', justifyContent: 'center' },
  mapPin: { width: 15, height: 15, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 3, borderColor: '#FFFFFF' },
  mapLabel: { color: colors.charcoal, fontWeight: '900' },
  mapSubLabel: { color: colors.muted, fontSize: 12 },
  credentialRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border },
  credentialDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  credentialDotText: { color: colors.muted, fontWeight: '900' },
  credentialName: { color: colors.charcoal, fontWeight: '800' },
  flex: { flex: 1, minWidth: 0 },
});
