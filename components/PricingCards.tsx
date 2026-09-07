import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

const plans = [
  {
    name: 'Starter',
    price: '£0',
    suffix: '/ month',
    eyebrow: 'Get established',
    summary: 'Build your business profile and explore the marketplace before moving onto a selling plan.',
    features: [
      'Up to 2 main trade categories',
      'Full business profile setup',
      'Choose services within your categories',
      'Browse public marketplace jobs',
      'Share your profile externally',
      '0 open-marketplace offers per month',
    ],
    cta: 'Create Starter profile',
    tone: 'starter' as const,
  },
  {
    name: 'BuildPair Plus',
    price: '£19.99',
    suffix: '/ month',
    eyebrow: 'Marketplace membership',
    summary: 'For tradespeople who want to be found, receive direct opportunities and actively quote for local work.',
    features: [
      'Up to 4 main trade categories',
      'Public searchable BuildPair profile',
      '15 open-marketplace offers per month',
      'Direct homeowner quote requests',
      'BuildPair messaging',
      'AI reply assistance and safety tools',
    ],
    cta: 'Choose Plus',
    tone: 'plus' as const,
  },
  {
    name: 'BuildPair Pro',
    price: '£29.99',
    suffix: '/ month',
    eyebrow: 'Growth membership',
    summary: 'For established trades and growing businesses that want more marketplace capacity and deeper insight.',
    features: [
      'Everything included in Plus',
      'Up to 6 main trade categories',
      '35 open-marketplace offers per month',
      'Modest priority search boost',
      'Advanced business analytics',
      'Priority and new-job alerts',
    ],
    cta: 'Choose Pro',
    tone: 'pro' as const,
  },
];

export function PricingCards({ compact = false }: { compact?: boolean }) {
  return <View style={styles.wrap}>
    <View style={styles.grid}>
      {plans.map((plan) => {
        const featured = plan.tone === 'plus';
        const pro = plan.tone === 'pro';
        return <View key={plan.name} style={[styles.card, compact && styles.cardCompact, featured && styles.cardFeatured, pro && styles.cardPro]}>
          <View style={styles.topRow}>
            <Text style={[styles.eyebrow, featured && styles.eyebrowFeatured, pro && styles.eyebrowPro]}>{plan.eyebrow}</Text>
            {featured ? <View style={styles.badge}><Text style={styles.badgeText}>Most popular</Text></View> : null}
          </View>
          <Text variant="titleLarge" style={styles.name}>{plan.name}</Text>
          <View style={styles.priceRow}><Text style={styles.price}>{plan.price}</Text><Text style={styles.suffix}>{plan.suffix}</Text></View>
          <Text style={styles.summary}>{plan.summary}</Text>
          <View style={styles.divider} />
          <View style={styles.features}>
            {plan.features.map((feature) => <View key={feature} style={styles.featureRow}>
              <View style={[styles.tick, featured && styles.tickFeatured, pro && styles.tickPro]}><Text style={styles.tickText}>✓</Text></View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>)}
          </View>
          <Link href="/auth/account" asChild>
            <Button mode={featured || pro ? 'contained' : 'outlined'} buttonColor={pro ? colors.navy : undefined} contentStyle={styles.buttonContent}>{plan.cta}</Button>
          </Link>
        </View>;
      })}
    </View>
    <Text style={styles.note}>Category limits count broad trade categories, not every service you offer inside them. Direct homeowner requests do not use the monthly open-marketplace offer allowance.</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  card: { flexGrow: 1, flexBasis: 300, minWidth: 270, backgroundColor: colors.surfaceRaised, borderRadius: 28, padding: 22, gap: 12, borderWidth: 1, borderColor: colors.border, shadowColor: colors.charcoal, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  cardCompact: { flexBasis: 280 },
  cardFeatured: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#FFFCF9' },
  cardPro: { borderColor: '#CAD6E0', backgroundColor: '#FAFCFE' },
  topRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  eyebrowFeatured: { color: colors.primary },
  eyebrowPro: { color: colors.navy },
  badge: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { color: colors.charcoal, fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  price: { color: colors.charcoal, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1 },
  suffix: { color: colors.muted, paddingBottom: 5 },
  summary: { color: colors.muted, lineHeight: 22, minHeight: 66 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  features: { gap: 10, flexGrow: 1 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tickFeatured: { backgroundColor: colors.primarySoft },
  tickPro: { backgroundColor: colors.blueSoft },
  tickText: { color: colors.charcoal, fontWeight: '900', fontSize: 11 },
  featureText: { color: colors.charcoalSoft, lineHeight: 21, flex: 1 },
  buttonContent: { minHeight: 47 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 820, alignSelf: 'center' },
});
