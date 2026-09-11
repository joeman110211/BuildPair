import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

const ORANGE = '#FF7600';
const NAVY = '#172433';
const MUTED = '#34404D';

type Props = {
  compact?: boolean;
  tagline?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Canonical BuildPair identity.
 * Matches the approved orange/navy house + handshake artwork supplied 11 Sep 2026.
 * The full lock-up uses the approved strapline: “Pairing homeowners with the right trades.”
 */
export function BuildPairLogo({ compact = false, tagline = true, style }: Props) {
  const size = compact ? 46 : 62;
  const wordSize = compact ? 29 : 38;

  return (
    <View style={[styles.wrap, style]} accessibilityLabel="BuildPair. Pairing homeowners with the right trades.">
      <View style={[styles.mark, { width: size, height: size }]}>
        <View style={[styles.roofLeft, { width: size * 0.62, height: size * 0.105, left: size * 0.04, top: size * 0.17 }]} />
        <View style={[styles.roofRight, { width: size * 0.62, height: size * 0.105, right: size * 0.04, top: size * 0.17 }]} />
        <View style={[styles.orangeWall, { width: size * 0.12, height: size * 0.48, right: size * 0.08, top: size * 0.32 }]} />
        <View style={[styles.navyHand, { width: size * 0.50, height: size * 0.26, left: size * 0.08, bottom: size * 0.10 }]} />
        <View style={[styles.orangeHand, { width: size * 0.48, height: size * 0.18, right: size * 0.10, bottom: size * 0.22 }]} />
        <View style={[styles.windowGrid, { left: size * 0.43, top: size * 0.31, width: size * 0.20, height: size * 0.20 }]}>
          <View style={styles.window} /><View style={styles.window} />
          <View style={styles.window} /><View style={styles.window} />
        </View>
      </View>

      {!compact ? (
        <View style={styles.copy}>
          <Text style={[styles.wordmark, { fontSize: wordSize, lineHeight: wordSize * 1.02 }]}>
            <Text style={styles.build}>Build</Text><Text style={styles.pair}>Pair</Text>
          </Text>
          {tagline ? (
            <View style={styles.taglineRow}>
              <View style={styles.dash} />
              <Text style={styles.tagline}>Pairing homeowners with the right trades.</Text>
              <View style={styles.dash} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { position: 'relative' },
  roofLeft: { position: 'absolute', backgroundColor: ORANGE, borderRadius: 99, transform: [{ rotate: '-39deg' }] },
  roofRight: { position: 'absolute', backgroundColor: ORANGE, borderRadius: 99, transform: [{ rotate: '39deg' }] },
  orangeWall: { position: 'absolute', backgroundColor: ORANGE, borderRadius: 99 },
  navyHand: { position: 'absolute', backgroundColor: NAVY, borderRadius: 8, transform: [{ rotate: '2deg' }] },
  orangeHand: { position: 'absolute', backgroundColor: ORANGE, borderRadius: 7, transform: [{ rotate: '-38deg' }] },
  windowGrid: { position: 'absolute', flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  window: { width: '43%', height: '43%', backgroundColor: NAVY, borderRadius: 1.5 },
  copy: { justifyContent: 'center' },
  wordmark: { fontWeight: '900', letterSpacing: -1.4 },
  build: { color: NAVY },
  pair: { color: ORANGE },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  dash: { width: 18, height: 2, borderRadius: 99, backgroundColor: ORANGE },
  tagline: { color: MUTED, fontSize: 10, lineHeight: 13, fontWeight: '500', letterSpacing: 0.1 },
});
