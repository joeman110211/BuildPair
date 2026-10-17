import Head from 'expo-router/head';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { PublicSeo } from '@/components/PublicSeo';
import { PublicFooter } from '@/components/PublicFooter';
import { SemanticHeading } from '@/components/SemanticHeading';
import { colors, publicResponsiveMetrics, radii } from '@/constants/theme';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { apiFetch, errorMessage } from '@/lib/api';
const partnerCategories = ['Trade insurance','Trade supplies','Property services','Interiors & design','Tools & equipment','Business services','Other'] as const;
const partnerPackages = ['local','featured','founding'] as const;

type Listing = { id: string; name: string; category: string; summary: string; logoUrl: string | null; offerText: string; package: string };
const offers = [
  { id: 'local', name: 'Local Partner', six: '£495', twelve: '£895', description: 'Business listing, category placement and an approved website link.' },
  { id: 'featured', name: 'Featured Partner', six: '£1,495', twelve: '£2,695', description: 'Local benefits, featured category positioning and a clearly labelled sponsored content opportunity.' },
  { id: 'founding', name: 'Founding Partner', six: '£2,995', twelve: '£4,995', description: 'Featured benefits plus an agreed launch campaign and performance reporting.' },
] as const;

export default function PartnersPage() {
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  const narrow = width < 720;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<(typeof partnerCategories)[number]>('Trade supplies');
  const [packageName, setPackageName] = useState<(typeof partnerPackages)[number]>('featured');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  useEffect(() => {
    let active = true;
    apiFetch<{ partners: Listing[] }>('/api/partners')
      .then((data) => { if (active) setListings(data.partners); })
      .catch((error) => { if (active) setLoadError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const submit = async () => {
    if (!businessName.trim() || !contactName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSendError('Enter your business name, contact name and a valid email address.');
      return;
    }
    setSending(true); setSendError('');
    try {
      await apiFetch('/api/partners', { method: 'POST', body: JSON.stringify({ businessName, contactName, email, category, package: packageName, message, website: '' }) });
      setSent(true);
    } catch (error) { setSendError(errorMessage(error)); }
    finally { setSending(false); }
  };
  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <PublicSeo title="BuildPair partners and commercial opportunities" description="Explore commercial partners and founding partnership opportunities supporting BuildPair's UK homeowner and tradesperson platform." />
    {/* Keep the review version out of search engines and the sitemap until approved. */}
    <Head><meta name="robots" content="noindex, nofollow" /></Head>
    <View style={[styles.hero, narrow && styles.heroMobile]}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>BUILDPAIR PARTNERS</Text>
        <SemanticHeading level={1} style={[styles.heroTitle, { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>Better connections. Stronger businesses.</SemanticHeading>
        <Text style={styles.heroDescription}>Discover useful businesses and services for homeowners and tradespeople. We are inviting a small number of organisations to help shape BuildPair's next stage of growth.</Text>
        <View style={styles.heroButtons}>
          <Link href="/(public)/contact" asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.heroOutline}>Talk to BuildPair</Button></Link>
        </View>
      </View>
    </View>
    <View style={[styles.container, styles.body, narrow && styles.bodyMobile]}>
      <View style={styles.section}>
        <Text style={styles.eyebrowDark}>EXPLORE PARTNERS</Text>
        <SemanticHeading level={2} style={styles.heading}>Services that support the whole project.</SemanticHeading>
        <Text style={styles.muted}>From business insurance and building materials to property and interior design services.</Text>
        <View style={styles.grid}>
          {partnerCategories.filter((c) => c !== 'Other').map((item) => <View key={item} style={styles.categoryCard}>
            <Text style={styles.categoryTitle}>{item}</Text>
          </View>)}
        </View>
        {loading ? <Text style={styles.muted}>Loading current partners…</Text> : null}
        {loadError ? <Text style={styles.error}>Partner listings are temporarily unavailable. Please try again shortly.</Text> : null}
        {!loading && !loadError && !listings.length ? <View style={styles.empty}><Text style={styles.headingSmall}>Founding partnerships opening</Text><Text style={styles.muted}>We're speaking with potential partners. Confirmed business listings will appear here when agreements are in place.</Text></View> : null}
        {listings.length ? <View style={styles.grid}>{listings.map((item) => <View key={item.id} style={styles.partnerCard}>
          {item.logoUrl ? <Image source={{ uri: item.logoUrl }} style={styles.logo} resizeMode="contain" /> : null}
          <Text style={styles.headingSmall}>{item.name}</Text>
          <Text style={styles.pill}>PAID COMMERCIAL PARTNER · {item.category}</Text>
          <Text style={styles.muted}>{item.summary}</Text>
          {item.offerText ? <Text style={styles.offer}>{item.offerText}</Text> : null}
          <Button mode="outlined" onPress={() => void Linking.openURL('https://www.buildpair.co.uk/api/partners/go?id=' + encodeURIComponent(item.id))}>Visit partner website</Button>
        </View>)}</View> : null}
      </View>
      <View style={styles.section}>
        <Text style={styles.eyebrowDark}>GROW WITH BUILDPAIR</Text>
        <SemanticHeading level={2} style={styles.heading}>Become a founding commercial partner.</SemanticHeading>
        <Text style={styles.muted}>BuildPair is a growing UK platform, not an established advertising network with guaranteed traffic or enquiries. Our launch partnerships combine clear advertising placements with agreed promotional activity and transparent reporting. No guaranteed leads or sales.</Text>
        <View style={styles.grid}>
          {offers.map((offer) => <View key={offer.id} style={[styles.packageCard, packageName === offer.id && styles.selectedCard]}>
            <Text style={styles.headingSmall}>{offer.name}</Text>
            <Text style={styles.price}>{offer.six} <Text style={styles.priceUnit}>/ six months</Text></Text>
            <Text style={styles.muted}>{offer.twelve} for twelve months</Text>
            <Text style={styles.muted}>{offer.description}</Text>
            <Button mode={packageName === offer.id ? 'contained' : 'outlined'} onPress={() => setPackageName(offer.id)}> {packageName === offer.id ? 'Selected' : 'Choose package'} </Button>
          </View>)}
        </View>
        <Text style={styles.fine}>Introductory guide prices, subject to a written proposal, availability, deliverables and any applicable VAT. No payment is taken by submitting an enquiry. Partner listings are paid advertising, not independent BuildPair recommendations.</Text>
        <View style={styles.partnerGuides}>
          <Text style={styles.headingSmall}>How partnerships work</Text>
          <Text style={styles.muted}>Practical advice for choosing third-party services and comparing offers, without confusing advertisements with recommendations.</Text>
          <View style={styles.chips}>
            <Link href="/(public)/advice/choosing-buildpair-partner-services" asChild><Button mode="outlined">For homeowners →</Button></Link>
            <Link href="/(public)/advice/comparing-trade-supplier-discounts" asChild><Button mode="outlined">For tradespeople →</Button></Link>
          </View>
        </View>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.eyebrowDark}>PARTNERSHIP ENQUIRY</Text>
        <SemanticHeading level={2} style={styles.heading}>Let's explore working together.</SemanticHeading>
        {sent ? <View style={styles.empty}><Text style={styles.headingSmall}>Thank you for your interest.</Text><Text style={styles.muted}>We've received your enquiry. The BuildPair team will review it and respond using the email you provided.</Text><Button mode="outlined" onPress={() => { setSent(false); setBusinessName(''); setContactName(''); setEmail(''); setMessage(''); }}>Send another enquiry</Button></View> : <>
          <View style={styles.fields}>
            <TextInput label="Business name *" mode="outlined" value={businessName} onChangeText={setBusinessName} maxLength={120} style={styles.input}/>
            <TextInput label="Contact name *" mode="outlined" value={contactName} onChangeText={setContactName} maxLength={120} style={styles.input}/>
            <TextInput label="Business email *" mode="outlined" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} maxLength={180} style={styles.input}/>
          </View>
          <Text style={styles.label}>Business category</Text>
          <View style={styles.chips}>{partnerCategories.map((item) => <Button key={item} compact mode={category === item ? 'contained' : 'outlined'} onPress={() => setCategory(item)}>{item}</Button>)}</View>
          <Text style={styles.label}>Interested in</Text>
          <View style={styles.chips}>{offers.map((item) => <Button key={item.id} compact mode={packageName === item.id ? 'contained' : 'outlined'} onPress={() => setPackageName(item.id)}>{item.name}</Button>)}</View>
          <TextInput label="Tell us about your business (optional)" mode="outlined" multiline value={message} onChangeText={setMessage} maxLength={1200} style={styles.input}/>
          <Text style={styles.fine}>We'll use your details to respond to this enquiry. No marketing consent is assumed. See our <Link href="/(public)/privacy" style={styles.privacyLink}>Privacy Policy</Link>.</Text>
          {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
          <View style={styles.submitRow}><Button mode="contained" loading={sending} disabled={sending} onPress={() => void submit()}>Send partnership enquiry</Button></View>
        </>}
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  container: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
  hero: { backgroundColor: colors.navy, paddingHorizontal: 22, paddingVertical: 64 },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 40 },
  heroTitle: { fontWeight: '900', color: '#FFFFFF', maxWidth: 870, letterSpacing: -1.2 },
  heroDescription: { color: '#E7E8EB', maxWidth: 740, fontSize: 16, lineHeight: 25, marginTop: 14 },
  eyebrow: { color: '#FFB78E', fontSize: 12, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8 },
  eyebrowDark: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  heroButtons: { flexDirection: 'row', marginTop: 24, gap: 10 },
  heroOutline: { borderColor: '#FFFFFF' },
  body: { paddingHorizontal: 22, paddingVertical: 44, gap: 44 },
  bodyMobile: { paddingHorizontal: 16, paddingVertical: 30, gap: 34 },
  section: { gap: 15 },
  heading: { color: colors.charcoal, fontWeight: '900', fontSize: 27, lineHeight: 34 },
  headingSmall: { color: colors.charcoal, fontWeight: '900', fontSize: 18, lineHeight: 25 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  categoryCard: { backgroundColor: colors.surfaceRaised, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 19, flexBasis: 235, flexGrow: 1, minWidth: 0 },
  categoryTitle: { color: colors.charcoal, fontSize: 15, fontWeight: '800' },
  empty: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 22, borderRadius: radii.lg, gap: 8 },
  partnerCard: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 22, borderRadius: 22, flexBasis: 300, flexGrow: 1, minWidth: 0, gap: 11 },
  logo: { width: 130, height: 64 },
  pill: { fontSize: 10, letterSpacing: 0.7, fontWeight: '900', color: colors.primary },
  offer: { fontSize: 14, fontWeight: '700', color: colors.charcoal },
  packageCard: { flexGrow: 1, flexBasis: 280, minWidth: 0, backgroundColor: colors.surfaceRaised, padding: 23, borderRadius: 23, borderWidth: 1, borderColor: colors.border, gap: 13 },
  selectedCard: { borderColor: colors.primary, borderWidth: 2 },
  price: { fontSize: 26, fontWeight: '900', color: colors.charcoal },
  priceUnit: { fontSize: 12, fontWeight: '500', color: colors.muted },
  fine: { fontSize: 12, color: colors.muted, lineHeight: 19 },
  partnerGuides: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 20, borderRadius: 18, gap: 10 },
  formCard: { backgroundColor: colors.surfaceRaised, borderRadius: 25, borderColor: colors.border, borderWidth: 1, padding: 22, gap: 15 },
  fields: { gap: 11 },
  input: { backgroundColor: colors.surfaceRaised },
  label: { fontSize: 13, fontWeight: '800', color: colors.charcoal },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  submitRow: { flexDirection: 'row', marginTop: 3 },
  error: { color: '#AB2929', fontWeight: '700', lineHeight: 20 },
  privacyLink: { color: colors.primary, textDecorationLine: 'underline' },
});
