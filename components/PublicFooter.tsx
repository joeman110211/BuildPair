import { Link } from 'expo-router';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Text } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { colors, layout, radii, spacing } from '@/constants/theme';

const linkGroups = [
  {
    title: 'Discover',
    links: [
      ['Find a trade', '/(public)/directory'],
      ['Browse jobs', '/(public)/jobs'],
      ['How it works', '/(public)/how-it-works'],
      ['For homeowners', '/(public)/for-homeowners'],
      ['For tradespeople', '/(public)/for-tradespeople'],
    ],
  },
  {
    title: 'Help & advice',
    links: [
      ['Advice Hub', '/(public)/advice'],
      ['UK building rules', '/(public)/building-regulations'],
      ['Report a user', '/(public)/report'],
      ['Trust & Safety', '/(public)/trust-safety'],
      ['Contact us', '/(public)/contact'],
    ],
  },
  {
    title: 'BuildPair',
    links: [
      ['Pricing', '/(public)/pricing'],
      ['BuildPair Rewards', '/(public)/rewards'],
      ['How payments work', '/(public)/payments'],
      ['About us', '/(public)/about'],
      ['Download app', '/(public)/download'],
      ['Marketplace standards', '/(public)/marketplace-standards'],
    ],
  },
  {
    title: 'Policies',
    links: [
      ['Terms & Conditions', '/(public)/terms'],
      ['Privacy Policy', '/(public)/privacy'],
      ['Delete account', '/(public)/delete-account'],
      ['Cookie & analytics choices', '/(public)/cookies'],
      ['Disclaimer', '/(public)/disclaimer'],
    ],
  },
] as const;

export function PublicFooter() {
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return <View style={[styles.footer, compact && styles.footerCompact]}>
    <View style={[styles.accentLine, compact && styles.accentLineCompact]} />
    <View style={[styles.inner, compact && styles.innerCompact]}>
      <View style={[styles.brandBlock, compact && styles.brandBlockCompact]}>
        <View style={[styles.logoCard, compact && styles.logoCardCompact]}>
          <Link href="/" asChild>
            <Pressable style={styles.logoPressable} accessibilityLabel="BuildPair home">
              <BuildPairLogo style={compact ? styles.logoCompact : undefined} />
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.tagline, compact && styles.taglineCompact]}>One project. Both sides connected.</Text>
        <Text style={[styles.description, compact && styles.descriptionCompact]}>A fairer UK marketplace and project platform for homeowners and tradespeople, from first search to finished job.</Text>
        <View style={[styles.contactPill, compact && styles.contactPillCompact]}><Text style={styles.contactText}>info@buildpair.co.uk</Text></View>
        <View style={styles.socialBlock}>
          <Text style={styles.socialLabel}>FOLLOW BUILDPAIR</Text>
          <View style={styles.socialRow}>
            <Pressable accessibilityRole="link" accessibilityLabel="BuildPair on Facebook" style={({ pressed }) => [styles.socialIconButton, pressed && styles.socialLinkPressed]} onPress={() => void Linking.openURL('https://www.facebook.com/share/1cWVAbDGvm/')}>
              <Image source={require('../assets/social/facebook.png')} style={styles.socialIcon} />
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="BuildPair on TikTok" style={({ pressed }) => [styles.socialIconButton, pressed && styles.socialLinkPressed]} onPress={() => void Linking.openURL('https://www.tiktok.com/@buildpair')}>
              <Image source={require('../assets/social/tiktok.png')} style={styles.socialIcon} />
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="BuildPair on Instagram" style={({ pressed }) => [styles.socialIconButton, pressed && styles.socialLinkPressed]} onPress={() => void Linking.openURL('https://www.instagram.com/buildpair_/')}>
              <Image source={require('../assets/social/instagram.png')} style={styles.socialIcon} />
            </Pressable>
          </View>
        </View>
      </View>
      {linkGroups.map((group) => <View key={group.title} style={[styles.group, compact && styles.groupCompact]}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        {group.links.map(([label, href]) => <Link key={label} href={href} asChild><Pressable style={({ pressed }) => [styles.linkPress, compact && styles.linkPressCompact, pressed && styles.linkPressed]}><Text style={[styles.link, compact && styles.linkCompact]}>{label}</Text></Pressable></Link>)}
      </View>)}
    </View>
    <View style={[styles.bottom, compact && styles.bottomCompact]}>
      <Text style={[styles.small, compact && styles.smallCompact]}>© {new Date().getFullYear()} BuildPair. All rights reserved.</Text>
      <Text style={[styles.small, compact && styles.smallCompact]}>BuildPair is a marketplace and project platform, not a building contractor or building-control body. BuildPay is coming soon; direct job payments are outside BuildPair. See Payments, Terms and Disclaimer for details.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  footer: { marginTop: spacing.xxxl, backgroundColor: colors.charcoal, paddingHorizontal: spacing.xl, paddingTop: 0, paddingBottom: spacing.xxl },
  footerCompact: { marginTop: spacing.xxl, paddingHorizontal: 18, paddingBottom: spacing.xl },
  accentLine: { height: 4, backgroundColor: colors.primary, marginHorizontal: -spacing.xl, marginBottom: spacing.xxl },
  accentLineCompact: { marginHorizontal: -18, marginBottom: spacing.xl },
  inner: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxxl, justifyContent: 'space-between' },
  innerCompact: { gap: 24, justifyContent: 'flex-start' },
  brandBlock: { flex: 2, minWidth: 0, flexBasis: 260, flexShrink: 1, maxWidth: 430, gap: spacing.sm },
  brandBlockCompact: { flexBasis: '100%', minWidth: 0, maxWidth: '100%', gap: 8 },
  logoCard: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, overflow: 'hidden' },
  logoCardCompact: { borderRadius: radii.md, paddingHorizontal: 6, paddingVertical: 4 },
  logoPressable: { alignItems: 'center', justifyContent: 'center' },
  logoCompact: { width: 188, height: 52 },
  tagline: { color: '#FFE6D5', lineHeight: 23, fontWeight: '800' },
  taglineCompact: { lineHeight: 20, fontSize: 13 },
  description: { color: '#C8CDD1', lineHeight: 21, fontSize: 13, maxWidth: 400 },
  descriptionCompact: { lineHeight: 19, fontSize: 12.5, maxWidth: 560 },
  contactPill: { alignSelf: 'flex-start', marginTop: spacing.xs, borderRadius: radii.pill, backgroundColor: '#343B43', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contactPillCompact: { marginTop: 2, paddingHorizontal: 11, paddingVertical: 7 },
  contactText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  socialBlock: { gap: spacing.xs, marginTop: spacing.xs },
  socialLabel: { color: colors.secondary, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  socialIconButton: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  socialIcon: { width: 48, height: 48, borderRadius: 13, resizeMode: 'contain' },
  socialLinkPressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  small: { color: '#B7BDC2', lineHeight: 20, fontSize: 12 },
  smallCompact: { lineHeight: 18, fontSize: 11.5 },
  group: { minWidth: 145, gap: spacing.sm },
  groupCompact: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 145, minWidth: 0, gap: 5 },
  groupTitle: { color: colors.secondary, fontWeight: '900', marginBottom: spacing.xxs, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  linkPress: { paddingVertical: spacing.xxs, borderRadius: radii.sm },
  linkPressCompact: { paddingVertical: 3 },
  linkPressed: { opacity: 0.65 },
  link: { color: '#FFFFFF', opacity: 0.93, lineHeight: 20 },
  linkCompact: { lineHeight: 19, fontSize: 13.5 },
  bottom: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center', borderTopWidth: 1, borderTopColor: '#454B52', marginTop: spacing.xxxl, paddingTop: spacing.lg, gap: spacing.xs },
  bottomCompact: { marginTop: 24, paddingTop: 14 },
});
