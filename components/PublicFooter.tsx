import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, layout, radii, spacing } from '@/constants/theme';

const linkGroups = [
  {
    title: 'Discover',
    links: [
      ['Find trades', '/(public)/directory'],
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
      ['Admin sign in', '/auth/sign-in?admin=1'],
    ],
  },
  {
    title: 'BuildPair',
    links: [
      ['Membership', '/(public)/pricing'],
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
      ['Cookie Policy', '/(public)/cookies'],
      ['Disclaimer', '/(public)/disclaimer'],
    ],
  },
] as const;

export function PublicFooter() {
  return <View style={styles.footer}>
    <View style={styles.accentLine} />
    <View style={styles.inner}>
      <View style={styles.brandBlock}>
        <Text variant="headlineSmall" style={styles.brand}>BuildPair</Text>
        <Text style={styles.tagline}>From “who do I need?” to “job complete”.</Text>
        <Text style={styles.description}>A UK marketplace and project workflow connecting homeowners with local tradespeople, keeping search, quotes, messages, approved changes, payment stages and reputation in one place.</Text>
        <Text style={styles.description}>Supported BuildPair payments are processed through Stripe. Users can also arrange payment privately, in which case BuildPair cannot process or manage that payment.</Text>
        <View style={styles.contactPill}><Text style={styles.contactText}>info@buildpair.co.uk</Text></View>
      </View>
      {linkGroups.map((group) => <View key={group.title} style={styles.group}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        {group.links.map(([label, href]) => <Link key={label} href={href} asChild><Pressable style={({ pressed }) => [styles.linkPress, pressed && styles.linkPressed]}><Text style={styles.link}>{label}</Text></Pressable></Link>)}
      </View>)}
    </View>
    <View style={styles.bottom}>
      <Text style={styles.small}>© {new Date().getFullYear()} BuildPair. All rights reserved.</Text>
      <Text style={styles.small}>BuildPair provides marketplace, project-management and payment-workflow technology. It does not carry out building work, provide building-control approval, inspect or guarantee workmanship, or describe its payment service as escrow.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  footer: { marginTop: spacing.xxxl, backgroundColor: colors.charcoal, paddingHorizontal: spacing.xl, paddingTop: 0, paddingBottom: spacing.xxl },
  accentLine: { height: 4, backgroundColor: colors.primary, marginHorizontal: -spacing.xl, marginBottom: spacing.xxxl },
  inner: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxxl, justifyContent: 'space-between' },
  brandBlock: { flex: 2, minWidth: 260, maxWidth: 430, gap: spacing.sm },
  brand: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.4 },
  tagline: { color: '#FFE6D5', lineHeight: 23, fontWeight: '800' },
  description: { color: '#C8CDD1', lineHeight: 21, fontSize: 13, maxWidth: 420 },
  contactPill: { alignSelf: 'flex-start', marginTop: spacing.xs, borderRadius: radii.pill, backgroundColor: '#343B43', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contactText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  small: { color: '#B7BDC2', lineHeight: 20, fontSize: 12 },
  group: { minWidth: 145, gap: spacing.sm },
  groupTitle: { color: colors.secondary, fontWeight: '900', marginBottom: spacing.xxs, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  linkPress: { paddingVertical: spacing.xxs, borderRadius: radii.sm },
  linkPressed: { opacity: 0.65 },
  link: { color: '#FFFFFF', opacity: 0.93, lineHeight: 20 },
  bottom: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center', borderTopWidth: 1, borderTopColor: '#454B52', marginTop: spacing.xxxl, paddingTop: spacing.lg, gap: spacing.xs },
});
