import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

type Props = {
  compact?: boolean;
  tagline?: boolean;
  style?: StyleProp<ImageStyle>;
};

const cloudinaryMainLogo = {
  uri: 'https://res.cloudinary.com/qrrcn7ma/image/upload/v1789145309/buildpair-logo-transparent.png',
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
  main: { width: 340, height: 92, maxWidth: '100%', backgroundColor: 'transparent' },
  standard: { width: 210, height: 66, maxWidth: '100%', backgroundColor: 'transparent' },
});
