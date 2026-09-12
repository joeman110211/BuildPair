import { createElement } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  radiusMiles: number;
  locationLabel?: string | null;
};

export function ServiceAreaMap({ latitude, longitude, radiusMiles, locationLabel }: Props) {
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const label = locationLabel || 'Local service area';

  if (!hasCoordinates) {
    const searchUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(label)}`;
    return <View style={styles.wrapper}>
      <View style={styles.fallback}>
        <View style={styles.fallbackCircle}>
          <View style={styles.fallbackPin} />
        </View>
        <Text style={styles.fallbackLabel}>{label}</Text>
        <Text style={styles.fallbackHint}>Approx. {radiusMiles} mile service radius</Text>
      </View>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(searchUrl)} style={styles.openButton}>
        <Text style={styles.openButtonText}>Open area map</Text>
      </Pressable>
    </View>;
  }

  // Round the public centre so a trader's exact home location is never exposed.
  const centreLat = Math.round((latitude as number) * 100) / 100;
  const centreLon = Math.round((longitude as number) * 100) / 100;
  const safeRadius = Math.max(radiusMiles || 1, 1);
  const paddedMiles = safeRadius * 1.45;
  const latDelta = paddedMiles / 69;
  const cosLat = Math.max(Math.cos((centreLat * Math.PI) / 180), 0.25);
  const lonDelta = paddedMiles / (69 * cosLat);
  const bbox = [centreLon - lonDelta, centreLat - latDelta, centreLon + lonDelta, centreLat + latDelta]
    .map((value) => value.toFixed(6))
    .join('%2C');
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${centreLat.toFixed(6)}%2C${centreLon.toFixed(6)}`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${centreLat.toFixed(5)}&mlon=${centreLon.toFixed(5)}#map=11/${centreLat.toFixed(5)}/${centreLon.toFixed(5)}`;

  const iframe = Platform.OS === 'web'
    ? createElement('iframe', {
        src: embedUrl,
        title: `${label} service area map`,
        loading: 'lazy',
        referrerPolicy: 'no-referrer-when-downgrade',
        style: { width: '100%', height: '100%', border: 0, display: 'block' },
      } as any)
    : null;

  return <View style={styles.wrapper}>
    <View style={styles.mapFrame}>
      {Platform.OS === 'web'
        ? iframe
        : <Pressable style={styles.nativeMapFallback} onPress={() => void Linking.openURL(fullMapUrl)}>
            <Text style={styles.nativeMapTitle}>{label}</Text>
            <Text style={styles.nativeMapHint}>Tap to open the service area map</Text>
          </Pressable>}

      <View pointerEvents="none" style={styles.radiusOverlay}>
        <View style={styles.radiusCircle}>
          <View style={styles.centrePin} />
        </View>
      </View>
      <View pointerEvents="none" style={styles.mapBadge}>
        <Text style={styles.mapBadgeText}>Approx. {safeRadius} mile service area</Text>
      </View>
    </View>

    <View style={styles.footerRow}>
      <View style={styles.footerCopy}>
        <Text style={styles.locationText}>{label}</Text>
        <Text style={styles.privacyText}>Approximate centre shown for trader privacy.</Text>
      </View>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(fullMapUrl)} style={styles.openButtonCompact}>
        <Text style={styles.openButtonText}>View map</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', gap: 10 },
  mapFrame: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E7ECEF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  radiusOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusCircle: {
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(234,107,31,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centrePin: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  mapBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(10,24,36,0.86)',
  },
  mapBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  footerCopy: { flex: 1, minWidth: 0, gap: 2 },
  locationText: { color: colors.charcoal, fontWeight: '900' },
  privacyText: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  openButtonCompact: {
    flexShrink: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  openButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  openButtonText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  nativeMapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EEF1EC' },
  nativeMapTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 18 },
  nativeMapHint: { color: colors.muted, fontSize: 12 },
  fallback: {
    minHeight: 190,
    borderRadius: 16,
    backgroundColor: '#EEF1EC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(234,107,31,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackPin: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary },
  fallbackLabel: { color: colors.charcoal, fontWeight: '900' },
  fallbackHint: { color: colors.muted, fontSize: 12 },
});
