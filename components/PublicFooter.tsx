import { Link } from 'expo-router';
import { Image, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { colors, layout, radii, spacing } from '@/constants/theme';

const svgDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const SOCIAL_ICONS = {
  facebook: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.55 21v-8h2.67l.4-3.12h-3.07V7.9c0-.9.25-1.52 1.56-1.52h1.66V3.6c-.29-.04-1.27-.12-2.42-.12-2.4 0-4.05 1.47-4.05 4.16v2.32H7.58V13h2.72v8h3.25Z"/></svg>`),
  tiktok: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="#000"/><path fill="#25F4EE" transform="translate(-.65 .45)" d="M16.7 5.1c.7 3.2 2.6 5.1 5.8 5.3v3.3c-1.9 0-3.6-.6-5.3-1.6v6.5c0 4.1-2.7 6.4-6.2 6.4-3.2 0-6-2.5-6-5.9 0-3.7 3-6.1 6.9-5.8v3.5c-.5-.2-.9-.2-1.3-.2-1.3 0-2.4 1-2.4 2.4 0 1.3 1 2.4 2.4 2.4 1.6 0 2.6-1 2.6-3V5.1h3.5Z"/><path fill="#FE2C55" transform="translate(.65 -.35)" d="M16.7 5.1c.7 3.2 2.6 5.1 5.8 5.3v3.3c-1.9 0-3.6-.6-5.3-1.6v6.5c0 4.1-2.7 6.4-6.2 6.4-3.2 0-6-2.5-6-5.9 0-3.7 3-6.1 6.9-5.8v3.5c-.5-.2-.9-.2-1.3-.2-1.3 0-2.4 1-2.4 2.4 0 1.3 1 2.4 2.4 2.4 1.6 0 2.6-1 2.6-3V5.1h3.5Z"/><path fill="#fff" d="M16.7 5.1c.7 3.2 2.6 5.1 5.8 5.3v3.3c-1.9 0-3.6-.6-5.3-1.6v6.5c0 4.1-2.7 6.4-6.2 6.4-3.2 0-6-2.5-6-5.9 0-3.7 3-6.1 6.9-5.8v3.5c-.5-.2-.9-.2-1.3-.2-1.3 0-2.4 1-2.4 2.4 0 1.3 1 2.4 2.4 2.4 1.6 0 2.6-1 2.6-3V5.1h3.5Z"/></svg>`),
  instagram: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse"><stop stop-color="#FEDA75"/><stop offset=".28" stop-color="#FA7E1E"/><stop offset=".52" stop-color="#D62976"/><stop offset=".76" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><rect x="1" y="1" width="22" height="22" rx="6" fill="url(#g)"/><rect x="5.1" y="5.1" width="13.8" height="13.8" rx="4.1" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="3.35" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="17.2" cy="6.9" r="1.1" fill="#fff"/></svg>`),
} as const;

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
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="BuildPair on Facebook"
              style={({ pressed }) => [styles.socialIconButton, pressed && styles.socialLinkPressed]}
              onPress={() => void Linking.openURL('https://www.facebook.com/share/1cWVAbDGvm/')}
            >
              <Image source={{ uri: SOCIAL_ICONS.facebook }} style={styles.socialIcon} />
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="BuildPair on TikTok"
              style={({ pressed }) => [styles.socialIconButton, pressed && styles.socialLinkPressed]}
              onPress={() => void Linking.openURL('https://www.tiktok.com/@buildpair')}
            >
              <Image source={{ uri: SOCIAL_ICONS.tiktok }} style={styles.socialIcon} />
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="BuildPair on Instagram"
              style={({ pressed }) => [styles.socialIconButton, pressed && styles.socialLinkPressed]}
              onPress={() => void Linking.openURL('https://www.instagram.com/buildpair_/')}
            >
              <Image source={{ uri: SOCIAL_ICONS.instagram }} style={styles.socialIcon} />
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
      <Text style={[styles.small, compact && styles.smallCompact]}>BuildPair is a marketplace and project platform, not a building contractor or building-control body. See Payments, Terms and Disclaimer for full details.</Text>
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
  brandBlock: { flex: 2, minWidth: 260, maxWidth: 430, gap: spacing.sm },
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
  socialIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#343B43', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4B535B' },
  socialIcon: { width: 26, height: 26, resizeMode: 'contain' },
  socialLinkPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  small: { color: '#B7BDC2', lineHeight: 20, fontSize: 12 },
  smallCompact: { lineHeight: 18, fontSize: 11.5 },
  group: { minWidth: 145, gap: spacing.sm },
  groupCompact: { flexGrow: 1, flexBasis: 145, minWidth: 0, gap: 5 },
  groupTitle: { color: colors.secondary, fontWeight: '900', marginBottom: spacing.xxs, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  linkPress: { paddingVertical: spacing.xxs, borderRadius: radii.sm },
  linkPressCompact: { paddingVertical: 3 },
  linkPressed: { opacity: 0.65 },
  link: { color: '#FFFFFF', opacity: 0.93, lineHeight: 20 },
  linkCompact: { lineHeight: 19, fontSize: 13.5 },
  bottom: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center', borderTopWidth: 1, borderTopColor: '#454B52', marginTop: spacing.xxxl, paddingTop: spacing.lg, gap: spacing.xs },
  bottomCompact: { marginTop: 24, paddingTop: 14 },
});
