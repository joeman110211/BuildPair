import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

type Props = {
  compact?: boolean;
  tagline?: boolean;
  style?: StyleProp<ImageStyle>;
};

const mainLogo = require('@/assets/brand/buildpair-logo-main.svg');
const standardLogo = require('@/assets/brand/buildpair-logo-standard.svg');

/** Official BuildPair artwork. Do not recreate the mark from UI primitives. */
export function BuildPairLogo({ compact = false, tagline = true, style }: Props) {
  const useMain = !compact && tagline;
  return (
    <Image
      source={useMain ? mainLogo : standardLogo}
      resizeMode="contain"
      accessibilityLabel="BuildPair. Pairing homeowners with the right trades."
      style={[useMain ? styles.main : styles.standard, style]}
    />
  );
}

const styles = StyleSheet.create({
  main: { width: 340, height: 92, maxWidth: '100%' },
  standard: { width: 210, height: 66, maxWidth: '100%' },
});
