import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '@/constants/theme';

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.82, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.block, style, { opacity }]} />;
}

export function PageSkeleton() {
  return <View style={styles.page}>
    <SkeletonBlock style={styles.title} />
    <SkeletonBlock style={styles.subtitle} />
    <View style={styles.row}>
      <SkeletonBlock style={styles.card} />
      <SkeletonBlock style={styles.card} />
    </View>
    <SkeletonBlock style={styles.wide} />
  </View>;
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceStrong, borderRadius: radii.md },
  page: { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 14 },
  title: { width: '48%', minWidth: 180, height: 30, alignSelf: 'center' },
  subtitle: { width: '72%', minWidth: 0, maxWidth: '100%', height: 16, alignSelf: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  card: { flexShrink: 1, maxWidth: '100%', minWidth: 0, flexGrow: 1, flexBasis: 280, height: 150 },
  wide: { width: '100%', height: 110 },
});
