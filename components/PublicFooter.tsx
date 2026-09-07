import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

const linkGroups = [
  {
    title: 'Discover',
    links: [
      ['Find Trades', '/(public)/directory'],
      ['Browse Jobs', '/(public)/jobs'],
      ['How It Works', '/(public)/how-it-works'],
      ['For Homeowners', '/(public)/for-homeowners'],
      ['For Tradespeople', '/(public)/for-tradespeople'],
    ],
  },
  {
    title: 'Help & Advice',
    links: [
      ['Advice Hub', '/(public)/advice'],
      ['UK Building Rules', '/(public)/building-regulations'],
      ['Report a User', '/(public)/report'],
      ['Trust & Safety', '/(public)/trust-safety'],
      ['Contact Us', '/(public)/contact'],
    ],
  },
  {
    title: 'BuildPair',
    links: [
      ['Membership', '/(public)/pricing'],
      ['About Us', '/(public)/about'],
      ['Download App', '/(public)/download'],
      ['Marketplace Standards', '/(public)/marketplace-standards'],
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
        <Text style={styles.description}>A UK marketplace and project workflow connecting homeowners with local tradespeople, then keeping search, quotes, messages, changes, payment stages and reputation in one place.</Text>
        <Text style={styles.description}>Free public advice and official building-rules links are available whether or not you have a paid membership.</Text>
        <View style={styles.contactPill}><Text style={styles.contactText}>info@buildpair.co.uk</Text></View>
      </View>
      {linkGroups.map((group) => <View key={group.title} style={styles.group}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        {group.links.map(([label, href]) => <Link key={label} href={href} asChild><Pressable style={styles.linkPress}><Text style={styles.link}>{label}</Text></Pressable></Link>)}
      </View>)}
    </View>
    <View style={styles.bottom}>
      <Text style={styles.small}>© {new Date().getFullYear()} BuildPair. All rights reserved.</Text>
      <Text style={styles.small}>BuildPair provides marketplace and project-management technology. It does not itself carry out building work, provide building-control approval or replace checks required for regulated work.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  footer: { marginTop: 32, backgroundColor: colors.charcoal, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 25 },
  accentLine: { height: 5, backgroundColor: colors.primary, marginHorizontal: -20, marginBottom: 36 },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between' },
  brandBlock: { flex: 2, minWidth: 260, maxWidth: 430, gap: 9 },
  brand: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.4 },
  tagline: { color: '#FFE6D5', lineHeight: 23, fontWeight: '800' },
  description: { color: '#C8CDD1', lineHeight: 21, fontSize: 13, maxWidth: 420 },
  contactPill: { alignSelf: 'flex-start', marginTop: 6, borderRadius: 999, backgroundColor: '#343B43', paddingHorizontal: 12, paddingVertical: 7 },
  contactText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  small: { color: '#B7BDC2', lineHeight: 20, fontSize: 12 },
  group: { minWidth: 145, gap: 8 },
  groupTitle: { color: colors.secondary, fontWeight: '900', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  linkPress: { paddingVertical: 2 },
  link: { color: '#FFFFFF', opacity: 0.93, lineHeight: 20 },
  bottom: { width: '100%', maxWidth: 1240, alignSelf: 'center', borderTopWidth: 1, borderTopColor: '#454B52', marginTop: 30, paddingTop: 18, gap: 5 },
});
