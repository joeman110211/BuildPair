import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { LAUNCH_DATE_LABEL, REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';

const plans = [
  {
    name: 'Starter',
    price: '£0',
    suffix: '/ month',
    eyebrow: 'Build your presence',
    summary: 'Set up a proper BuildPair profile, show your work and browse the marketplace before deciding whether you want paid lead access.',
    compactFeatures: [
      'Complete trade profile and gallery',
      'Up to 2 main trade categories',
      'Browse marketplace jobs',
    ],
    features: [
      'Up to 2 main trade categories',
      'Complete business profile and work gallery',
      'Choose services within your categories',
      'Browse public marketplace jobs',
      'Share your BuildPair profile externally',
      'No marketplace offers or direct homeowner enquiries',
    ],
    cta: 'Create Starter profile',
    tone: 'starter' as const,
  },
  {
    name: 'BuildPair Core',
    price: '£9.99',
    suffix: '/ month',
    eyebrow: 'Occasional extra work',
    summary: 'For tradespeople who want a searchable profile and a small, controlled stream of BuildPair opportunities without jumping straight to Plus.',
    compactFeatures: [
      'Searchable marketplace profile',
      '5 marketplace opportunities per month',
      'Messaging + basic business stats',
    ],
    features: [
      'Everything in Starter',
      'Up to 2 main trade categories',
      'Public searchable BuildPair profile',
      '5 marketplace opportunities per calendar month',
      'Direct homeowner requests use the same 5-opportunity allowance',
      'BuildPair messaging',
      '1 saved job search',
      'Basic profile, enquiry and quote statistics',
    ],
    cta: 'Choose Core',
    tone: 'core' as const,
  },
  {
    name: 'BuildPair Plus',
    price: '£19.99',
    suffix: '/ month',
    eyebrow: 'Most popular',
    summary: 'The everyday marketplace plan: substantially more quoting capacity, unlimited direct requests and the reputation and AI tools most active trades will use.',
    compactFeatures: [
      '15 open-marketplace offers per month',
      'Unlimited direct homeowner requests',
      'Google reviews + fuller analytics',
      'Full AI reply assistance',
    ],
    features: [
      'Everything in Core',
      'Up to 4 main trade categories',
      '15 open-marketplace offers per calendar month',
      'Direct homeowner quote requests do not use your allowance',
      'Connect an approved Google business listing and show Google reviews separately',
      'Full BuildPair AI reply assistance',
      'Up to 5 saved job searches',
      'Full quote, enquiry and conversion analytics',
    ],
    cta: 'Choose Plus',
    tone: 'plus' as const,
  },
  {
    name: 'BuildPair Pro',
    price: '£29.99',
    suffix: '/ month',
    eyebrow: 'Growth membership',
    summary: 'For established trades and growing businesses that want more marketplace capacity, priority tools and deeper business insight.',
    compactFeatures: [
      'Everything included in Plus',
      '35 open-marketplace offers per month',
      'Advanced analytics + priority alerts',
      'Availability and reusable business tools',
    ],
    features: [
      'Everything included in Plus',
      'Up to 6 main trade categories',
      '35 open-marketplace offers per calendar month',
      'Modest relevance-aware search boost',
      'Advanced business analytics and performance trends',
      'Priority new-job alerts',
      'Unlimited saved job searches',
      'Availability calendar',
      'Reusable quote and customer-message templates',
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
        const starter = plan.tone === 'starter';
        const features = compact ? plan.compactFeatures : plan.features;
        const href = REGISTRATION_OPEN ? '/auth/account' : waitlistHref('trader', `pricing-${plan.tone}`);
        const cta = REGISTRATION_OPEN ? plan.cta : 'Create launch-ready profile';
        return <View key={plan.name} style={[styles.card, compact && styles.cardCompact, featured && styles.cardFeatured, pro && styles.cardPro]}>
          <Text style={[styles.eyebrow, featured && styles.eyebrowFeatured, pro && styles.eyebrowPro]}>{plan.eyebrow}</Text>
          <Text variant="titleLarge" style={styles.name}>{plan.name}</Text>
          <View style={styles.priceRow}><Text style={styles.price}>{plan.price}</Text><Text style={styles.suffix}>{plan.suffix}</Text></View>
          <Text style={[styles.summary, compact && styles.summaryCompact]}>{plan.summary}</Text>
          <View style={styles.divider} />
          <View style={styles.features}>
            {features.map((feature) => <View key={feature} style={styles.featureRow}>
              <View style={[styles.tick, featured && styles.tickFeatured, pro && styles.tickPro]}><Text style={styles.tickText}>✓</Text></View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>)}
            {starter && !compact ? <View style={styles.limitRow}>
              <View style={styles.limitMark}><Text style={styles.limitMarkText}>−</Text></View>
              <Text style={styles.limitText}>Open-marketplace offers are not included on Starter.</Text>
            </View> : null}
          </View>
          <Link href={href} asChild>
            <Button mode={featured || pro ? 'contained' : 'outlined'} contentStyle={styles.buttonContent}>{cta}</Button>
          </Link>
        </View>;
      })}
    </View>
    {!REGISTRATION_OPEN ? <Text style={styles.launchNote}>Trade profile setup is open now. Marketplace activity and paid subscriptions unlock at launch on {LAUNCH_DATE_LABEL}; founding Pro time starts from launch day.</Text> : null}
    <Text style={styles.note}>Category limits count broad trade categories, not every service inside them. Core direct homeowner requests use the same five-opportunity monthly allowance. On Plus and Pro, direct homeowner requests do not use the open-marketplace allowance. Google reviews remain clearly labelled as Google reviews and only appear after the business listing connection is approved.</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'stretch' },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0, maxWidth: '100%', backgroundColor: colors.surfaceRaised, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: colors.charcoal, shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  cardCompact: { flexBasis: 280, padding: spacing.lg, gap: spacing.sm },
  cardFeatured: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#FFFCF9' },
  cardPro: { borderColor: '#CAD6E0', backgroundColor: '#FAFCFE' },
  eyebrow: { color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  eyebrowFeatured: { color: colors.primary },
  eyebrowPro: { color: colors.navy },
  name: { color: colors.charcoal, fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, flexWrap: 'wrap' },
  price: { color: colors.charcoal, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1 },
  suffix: { color: colors.muted, paddingBottom: spacing.xs },
  summary: { color: colors.muted, lineHeight: 22, minHeight: 66 },
  summaryCompact: { minHeight: 0 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xxs },
  features: { gap: spacing.sm, flexGrow: 1 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tickFeatured: { backgroundColor: colors.primarySoft },
  tickPro: { backgroundColor: colors.blueSoft },
  tickText: { color: colors.charcoal, fontWeight: '900', fontSize: 11 },
  featureText: { color: colors.charcoalSoft, lineHeight: 21, flex: 1, minWidth: 0 },
  limitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xxs },
  limitMark: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  limitMarkText: { color: colors.muted, fontWeight: '900', fontSize: 13 },
  limitText: { color: colors.muted, lineHeight: 21, flex: 1, minWidth: 0 },
  buttonContent: { minHeight: controlHeights.standard },
  launchNote: { color: colors.primaryDark, fontSize: 13, lineHeight: 20, textAlign: 'center', fontWeight: '800', maxWidth: 820, alignSelf: 'center' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 820, alignSelf: 'center' },
});
