import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
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
    ],
  },
  {
    title: 'BuildPair',
    links: [
      ['Membership', '/(public)/pricing'],
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
  return <View style={styles.footer}>
    <View style={styles.accentLine} />
    <View style={styles.flowStrip}>
      <View style={styles.flowCopy}>
        <Text style={styles.flowEyebrow}>A FLEXIBLE JOB FLOW</Text>
        <Text style={styles.flowTitle}>Visit first if needed. Compare clear quotes. Choose how you pay.</Text>
        <Text style={styles.flowText}>A tradesperson can visit before quoting. Homeowners can compare structured quotes and pause new responses when they have enough. After a quote is accepted, use BuildPay for supported staged payments or mutually agree to pay privately while keeping the project record.</Text>
      </View>
      <View style={styles.flowLinks}>
        <Link href="/(public)/how-it-works" asChild><Pressable style={styles.flowButton}><Text style={styles.flowButtonText}>How it works</Text></Pressable></Link>
        <Link href="/(public)/updates" asChild><Pressable style={styles.flowButtonAlt}><Text style={styles.flowButtonAltText}>What&apos;s new</Text></Pressable></Link>
      </View>
    </View>
    <View style={styles.inner}>
      <View style={styles.brandBlock}>
        <Link href="/" asChild>
          <Pressable style={styles.logoCard} accessibilityLabel="BuildPair home">
            <BuildPairLogo />
          </Pressable>
        </Link>
        <Text style={styles.tagline}>Find the trade. Manage the job. Keep the record.</Text>
        <Text style={styles.description}>A UK marketplace and project platform connecting homeowners with local tradespeople. Search, quotes, messages, agreed changes, payments and project history stay together.</Text>
        <Text style={styles.description}>BuildPay payments are processed through Stripe. Payments arranged privately sit outside BuildPair’s in-platform payment protection and recovery process.</Text>
        <View style={styles.contactPill}><Text style={styles.contactText}>info@buildpair.co.uk</Text></View>
      </View>
      {linkGroups.map((group) => <View key={group.title} style={styles.group}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        {group.links.map(([label, href]) => <Link key={label} href={href} asChild><Pressable style={({ pressed }) => [styles.linkPress, pressed && styles.linkPressed]}><Text style={styles.link}>{label}</Text></Pressable></Link>)}
      </View>)}
    </View>
    <View style={styles.bottom}>
      <Text style={styles.small}>© {new Date().getFullYear()} BuildPair. All rights reserved.</Text>
      <Text style={styles.small}>BuildPair is a marketplace and project platform, not a building contractor or building-control body. See Payments, Terms and Disclaimer for full details.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  footer: { marginTop: spacing.xxxl, backgroundColor: colors.charcoal, paddingHorizontal: spacing.xl, paddingTop: 0, paddingBottom: spacing.xxl },
  accentLine: { height: 4, backgroundColor: colors.primary, marginHorizontal: -spacing.xl, marginBottom: spacing.xxl },
  flowStrip: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center', backgroundColor: '#27313A', borderWidth: 1, borderColor: '#49535C', borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.xxxl, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg },
  flowCopy: { flex: 1, minWidth: 240, maxWidth: 760, gap: spacing.xs },
  flowEyebrow: { color: colors.secondary, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  flowTitle: { color: '#FFFFFF', fontSize: 20, lineHeight: 26, fontWeight: '900' },
  flowText: { color: '#D4D9DD', lineHeight: 21, fontSize: 13 },
  flowLinks: { minWidth: 190, gap: spacing.sm, alignItems: 'stretch' },
  flowButton: { minHeight: 44, borderRadius: radii.pill, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  flowButtonText: { color: '#FFFFFF', fontWeight: '900' },
  flowButtonAlt: { minHeight: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: '#FFFFFF', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  flowButtonAltText: { color: '#FFFFFF', fontWeight: '900' },
  inner: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxxl, justifyContent: 'space-between' },
  brandBlock: { flex: 2, minWidth: 260, maxWidth: 430, gap: spacing.sm },
  logoCard: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, overflow: 'hidden' },
  tagline: { color: '#FFE6D5', lineHeight: 23, fontWeight: '800' },
  description: { color: '#C8CDD1', lineHeight: 21, fontSize: 13, maxWidth: 400 },
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
