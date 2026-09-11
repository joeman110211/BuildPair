import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

type Props = {
  compact?: boolean;
  tagline?: boolean;
  style?: StyleProp<ImageStyle>;
};

const cloudinaryMainLogo = {
  uri: 'https://res.cloudinary.com/qrrcn7ma/image/upload/e_trim/v1789145309/buildpair-logo-transparent.png',
};

/** Official BuildPair artwork served directly from Cloudinary. */
export function BuildPairLogo({ compact = false, tagline = true, style }: Props) {
  const useLarge = !compact && tagline;
  return (
    <Image
      source={cloudinaryMainLogo}
      resizeMode="contain"
      accessibilityLabel="BuildPair. Pairing homeowners with the right trades."
      style={[useLarge ? styles.main : styles.standard, style]}
    />
  );
}

const styles = StyleSheet.create({
  // The Cloudinary source is trimmed, so these dimensions preserve the exact
  // visible size of the previous lock-up without its large transparent margins.
  main: { width: 255, height: 70, maxWidth: '100%', backgroundColor: 'transparent' },
  standard: { width: 158, height: 44, maxWidth: '100%', backgroundColor: 'transparent' },
});
