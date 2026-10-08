import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { PLAN_POSITIONING, SITE_LANGUAGE } from '@/constants/site-language';
import { colors, controlHeights, radii, shadows, spacing } from '@/constants/theme';
import { REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';

const plans = [
  {
    name: 'Starter',
    price: '£0',
    suffix: '/ month',
    eyebrow: PLAN_POSITIONING.Starter,
    summary: 'Build a credible profile, show your work and get established on BuildPair with no monthly fee.',
    compactFeatures: [
      '2 trade categories + the services you actually offer',
      'Full business profile, work gallery and portfolio',
      'Browse local marketplace jobs',
    ],
    features: [
      'Up to 2 main trade categories',
      'Choose 1 to all genuine services/subcategories inside each selected category',
      'Complete business profile, work gallery and project stories',
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
    eyebrow: PLAN_POSITIONING['BuildPair Core'],
    summary: 'Start winning suitable local work while keeping quotes, messages and existing customers organised.',
    compactFeatures: [
      '5 marketplace opportunities each month',
      'Quotes and invoices for your own customers',
      'Messaging, basic insights and availability',
    ],
    features: [
      'Everything in Starter',
      'Up to 2 main trade categories',
      'Public searchable BuildPair profile',
      '5 marketplace opportunities per calendar month',
      'Direct homeowner requests use the same 5-opportunity allowance',
      'BuildPair messaging',
      'Quote and invoice your own outside customers',
      '1 saved job search and basic business analytics',
      'Publish a simple next-available window',
    ],
    cta: 'Choose Core',
    tone: 'core' as const,
  },
  {
    name: 'BuildPair Plus',
    price: '£19.99',
    suffix: '/ month',
    eyebrow: PLAN_POSITIONING['BuildPair Plus'],
    summary: 'Run more jobs with stronger quoting, more marketplace access and one place for BuildPair and existing customers.',
    compactFeatures: [
      '15 marketplace offers + unlimited direct homeowner requests',
      'Full Quote Builder + managed outside-customer projects',
      'AI tools, Google reviews and up to 12 weeks’ availability',
    ],
    features: [
      'Everything in Core',
      'Up to 4 main trade categories',
      '15 open-marketplace offers per calendar month',
      'Direct homeowner quote requests do not use your allowance',
      'Full Quote Builder with itemised pricing, VAT, stages, terms and revisions',
      'Bring accepted outside-customer quotes into managed BuildPair projects',
      'Manage accepted outside-customer projects with direct payment records',
      'Connect an approved Google business listing and show Google reviews separately',
      'Full AI reply and quote-writing assistance',
      'Up to 5 saved job searches',
      'Full quote, enquiry and conversion analytics',
      'Publish availability up to roughly 12 weeks ahead',
    ],
    cta: 'Choose Plus',
    tone: 'plus' as const,
  },
  {
    name: 'BuildPair Pro',
    price: '£29.99',
    suffix: '/ month',
    eyebrow: PLAN_POSITIONING['BuildPair Pro'],
    summary: 'Run the business with the highest marketplace capacity, deeper project controls and BuildPair’s most advanced tools.',
    compactFeatures: [
      '35 marketplace offers + advanced business analytics',
      'Up to 6 months’ availability + reusable templates',
      'Advanced project workspace + Project+ planning tools',
    ],
    features: [
      'Everything in Plus',
      'Up to 6 main trade categories',
      '35 open-marketplace offers per calendar month',
      'Modest relevance-aware search boost',
      'Advanced business analytics and priority new-job alerts',
      'Unlimited saved job searches',
      'Publish availability up to six months ahead',
      'Reusable quote and customer-message templates',
      'Advanced project workspace for tasks, progress, materials, expenses, snagging, handover and warranty records',
      'BuildPair Project+ AI planning and room-concept tools included',
    ],
    cta: 'Choose Pro',
    tone: 'pro' as const,
  },
];

export function PricingCards({ compact = false }: { compact?: boolean }) {
  if (compact) return <View style={styles.summaryGrid}>
    {plans.map((plan) => <View key={plan.name} style={[styles.summaryCard, plan.tone === 'plus' && styles.cardFeatured]}>
      <Text style={styles.eyebrow}>{plan.eyebrow}</Text>
      <Text style={styles.name}>{plan.name.replace('BuildPair ', '')}</Text>
      <View style={styles.priceRow}><Text style={styles.price}>{plan.price}</Text><Text style={styles.suffix}>/ month</Text></View>
      <Text style={styles.note}>{plan.tone === 'starter' ? 'Profile and portfolio' : plan.compactFeatures[0]}</Text>
    </View>)}
  </View>;
  return <View style={styles.wrap}>
    <View style={styles.grid}>
      {plans.map((plan) => {
        const featured = plan.tone === 'plus';
        const pro = plan.tone === 'pro';
        const starter = plan.tone === 'starter';
        const features = compact ? plan.compactFeatures : plan.features;
        const href = REGISTRATION_OPEN ? '/auth/sign-up?mode=trader' : waitlistHref('trader', `pricing-${plan.tone}`);
        const cta = REGISTRATION_OPEN ? 'Get 3 months Pro free' : SITE_LANGUAGE.createProfile;
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
            <Button mode={featured || pro ? 'contained' : 'outlined'} style={styles.button} contentStyle={styles.buttonContent}>{cta}</Button>
          </Link>
        </View>;
      })}
    </View>
    <Text style={styles.launchNote}>Prices shown are for paid plans when billing becomes available. Every new trade profile starts with three months of Pro free, no card or automatic charge.</Text>
    <Text style={styles.note}>Category limits count broad trade categories, not every service inside them. Core direct homeowner requests use the same five-opportunity monthly allowance. On Plus and Pro, direct homeowner requests do not use the open-marketplace allowance. Google reviews remain clearly labelled as Google reviews and only appear after the business listing connection is approved.</Text>
  </View>;
}

const styles = StyleSheet.create({
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 150, minWidth: 0, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: 16, gap: 10, backgroundColor: colors.surfaceRaised },
  wrap: { gap: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'stretch' },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0, maxWidth: '100%', backgroundColor: colors.surfaceRaised, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.subtle },
  cardCompact: { flexBasis: 280, padding: spacing.lg, gap: spacing.sm },
  cardFeatured: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#FFFCF9' },
  cardPro: { borderColor: '#CAD6E0', backgroundColor: '#FAFCFE' },
  eyebrow: { color: colors.muted, fontSize: 12.3, lineHeight: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  eyebrowFeatured: { color: colors.primary },
  eyebrowPro: { color: colors.navy },
  name: { color: colors.charcoal, fontWeight: '900', fontSize: 20, lineHeight: 26 },
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
  button: { borderRadius: radii.md },
  buttonContent: { minHeight: controlHeights.prominent, paddingHorizontal: 10 },
  launchNote: { color: colors.primaryDark, fontSize: 13, lineHeight: 20, textAlign: 'center', fontWeight: '800', maxWidth: 820, alignSelf: 'center' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 780, alignSelf: 'center' },
});
