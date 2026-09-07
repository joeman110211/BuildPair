import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { colors } from '@/constants/theme';

type NationCard = {
  nation: string;
  subtitle: string;
  body: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
};

const NATIONS: NationCard[] = [
  {
    nation: 'England',
    subtitle: 'Building Regulations 2010 + Approved Documents',
    body: 'GOV.UK publishes the Approved Documents that give practical guidance on ways to meet the Building Regulations in England. The collection includes Parts A, B, C, D, E, F, G, H, J, K, L, M, O, P, Q, R, S, T and Regulation 7 guidance where applicable. Use the edition and transitional provisions that apply to your work.',
    primaryLabel: 'Official Approved Documents',
    primaryUrl: 'https://www.gov.uk/government/collections/approved-documents',
    secondaryLabel: 'Check when approval is needed',
    secondaryUrl: 'https://www.gov.uk/building-regulations-approval',
  },
  {
    nation: 'Wales',
    subtitle: 'Welsh Building Regulations + Approved Documents',
    body: 'Welsh Government publishes its own Approved Documents and amendment information. Do not assume the English edition or commencement date applies in Wales. Some 2026 publications have later effective dates and transitional arrangements, so check the official page before relying on a document.',
    primaryLabel: 'Welsh Approved Documents',
    primaryUrl: 'https://www.gov.wales/building-regulations-approved-documents',
    secondaryLabel: 'Welsh regulations circulars',
    secondaryUrl: 'https://www.gov.wales/building-regulations-circulars',
  },
  {
    nation: 'Scotland',
    subtitle: 'Building (Scotland) Regulations 2004 + Technical Handbooks',
    body: 'Scotland uses building standards technical handbooks rather than the England/Wales Approved Document system. The April 2026 domestic and non-domestic handbooks apply to relevant warrant applications submitted on or after 6 April 2026 and to qualifying work started from that date.',
    primaryLabel: 'Scottish building standards collection',
    primaryUrl: 'https://www.gov.scot/collections/building-standards/',
    secondaryLabel: 'April 2026 domestic handbook',
    secondaryUrl: 'https://www.gov.scot/publications/building-standards-technical-handbook-domestic-april-2026-pdf/',
  },
  {
    nation: 'Northern Ireland',
    subtitle: 'Building Regulations (Northern Ireland) + Technical Booklets',
    body: 'Northern Ireland has its own Building Regulations and Technical Booklets. The Department of Finance publishes the current technical guidance and amendment booklets, while district councils administer building control.',
    primaryLabel: 'Official NI Technical Booklets',
    primaryUrl: 'https://www.finance-ni.gov.uk/articles/building-regulations-technical-booklets',
    secondaryLabel: 'NI Building Regulations topic',
    secondaryUrl: 'https://www.finance-ni.gov.uk/topics/building-regulations',
  },
];

const COMMON_CHECKS = [
  ['Structure', 'Loads, foundations, alterations and structural stability.'],
  ['Fire safety', 'Escape, compartmentation, alarms, materials and fire spread.'],
  ['Ventilation', 'Extract rates, whole-building ventilation and indoor air quality.'],
  ['Drainage & sanitation', 'Waste, foul and surface-water drainage, hot-water safety and sanitary provision.'],
  ['Energy', 'Insulation, glazing, heating, controls, airtightness and energy performance requirements.'],
  ['Electrical safety', 'Domestic electrical work, notification and competent-person routes where applicable.'],
  ['Access & safety', 'Stairs, guarding, accessibility, glazing, collision and fall protection.'],
  ['Materials & workmanship', 'Suitability, durability and workmanship expectations.'],
] as const;

export default function BuildingRegulationsHub() {
  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <View style={styles.hero}>
      <View style={styles.heroInner}>
        <Chip style={styles.chip} textStyle={styles.chipText}>Free public reference</Chip>
        <Text variant="displaySmall" style={styles.heroTitle}>UK building rules, without the scavenger hunt.</Text>
        <Text variant="bodyLarge" style={styles.heroBody}>BuildPair keeps the official starting points for England, Wales, Scotland and Northern Ireland in one place. We link to the source rather than copying technical rules that can change underneath everybody’s feet.</Text>
      </View>
    </View>

    <View style={styles.content}>
      <View style={styles.warning}>
        <Text variant="titleMedium" style={styles.title}>Use the right nation, edition and date</Text>
        <Text style={styles.body}>Building standards are not one identical UK rulebook. The applicable guidance can depend on where the property is, the type of work, when an application or notice was made and transitional provisions. Approved Documents and Technical Handbooks are guidance on ways to comply; building control or a suitably competent professional should be used where the position is unclear.</Text>
      </View>

      <View style={styles.grid}>
        {NATIONS.map((item) => <View key={item.nation} style={styles.card}>
          <View style={styles.cardTop}><Text variant="headlineSmall" style={styles.title}>{item.nation}</Text><Chip compact>{item.subtitle}</Chip></View>
          <Text style={styles.body}>{item.body}</Text>
          <View style={styles.actions}>
            <Button mode="contained" icon="open-in-new" onPress={() => Linking.openURL(item.primaryUrl)}>{item.primaryLabel}</Button>
            {item.secondaryUrl ? <Button mode="outlined" icon="open-in-new" onPress={() => Linking.openURL(item.secondaryUrl!)}>{item.secondaryLabel}</Button> : null}
          </View>
        </View>)}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>Quick orientation</Text>
        <Text variant="headlineMedium" style={styles.sectionTitle}>The bits people most commonly need to check.</Text>
        <Text style={styles.body}>These labels are only a navigation aid. The official national sources above are the authority for the current guidance.</Text>
      </View>
      <View style={styles.checkGrid}>{COMMON_CHECKS.map(([title, body]) => <View key={title} style={styles.checkCard}><Text variant="titleMedium" style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text></View>)}</View>

      <View style={styles.actionStrip}>
        <View style={styles.flex}>
          <Text variant="headlineSmall" style={styles.lightTitle}>Competent-person schemes in England & Wales</Text>
          <Text style={styles.lightBody}>For certain types of work, registered installers can self-certify compliance instead of the homeowner making a separate building-regulations application. GOV.UK lists the current schemes and explains the route.</Text>
        </View>
        <Button mode="contained" buttonColor={colors.secondary} textColor={colors.charcoal} icon="open-in-new" onPress={() => Linking.openURL('https://www.gov.uk/building-regulations-approval/use-a-competent-person-scheme')}>Official scheme guidance</Button>
      </View>

      <Text variant="bodySmall" style={styles.disclaimer}>BuildPair does not provide building-control approval, structural design, legal advice or a guarantee that a particular detail complies. Links are provided for convenience and should be checked at the time of the project because official guidance and transitional rules can change.</Text>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.charcoal, paddingHorizontal: 20, paddingVertical: 62 },
  heroInner: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 13 },
  chip: { alignSelf: 'flex-start', backgroundColor: '#3A4148' },
  chipText: { color: '#FFFFFF', fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', maxWidth: 850, letterSpacing: -1 },
  heroBody: { color: '#DDE1E3', maxWidth: 840, lineHeight: 27 },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 20, gap: 24 },
  warning: { backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: '#E5C98F', borderRadius: 24, padding: 20, gap: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  card: { flexGrow: 1, flexBasis: 460, backgroundColor: colors.surfaceRaised, borderRadius: 26, padding: 22, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardTop: { gap: 8, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 23 },
  sectionHeader: { gap: 6, marginTop: 10 },
  eyebrow: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900' },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  checkCard: { flexGrow: 1, flexBasis: 240, backgroundColor: colors.surfaceSoft, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 5 },
  actionStrip: { backgroundColor: colors.charcoal, borderRadius: 26, padding: 22, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  flex: { flex: 1, minWidth: 260, gap: 6 },
  lightTitle: { color: '#FFFFFF', fontWeight: '900' },
  lightBody: { color: '#DDE1E3', lineHeight: 23 },
  disclaimer: { color: colors.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
});
