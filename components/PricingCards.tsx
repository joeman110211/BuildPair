import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';

const plans = [
  {
    name: 'Starter',
    price: '£0',
    suffix: '/ month',
    eyebrow: 'Get established',
    summary: 'Build and prepare your business profile, explore the marketplace and upgrade when you are ready to be publicly visible.',
    compactFeatures: [
      'Build and preview your business profile',
      'Up to 2 main trade categories',
      'Browse public marketplace jobs',
    ],
    features: [
      'Up to 2 main trade categories',
      'Full business profile setup and private preview',
      'Choose services within your categories',
      'Browse public marketplace jobs',
      'Prepare your profile before activating public visibility',
    ],
    cta: 'Create Starter profile',
    tone: 'starter' as const,
  },
  {
    name: 'BuildPair Plus',
    price: '£19.99',
    suffix: '/ month',
    eyebrow: 'Marketplace membership',
    summary: 'For tradespeople who want to be found, bring their existing reputation with them and actively quote for local work.',
    compactFeatures: [
      'Searchable marketplace profile',
      'Bring verified Google reviews with you',
      'Direct homeowner quote requests',
      '15 open-marketplace offers per month',
    ],
    features: [
      'Up to 4 main trade categories',
      'Public searchable BuildPair profile',
      'Connect an approved Google business listing and display its reviews separately',
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
    compactFeatures: [
      'Everything included in Plus',
      '35 open-marketplace offers per month',
      'Analytics, priority alerts and a modest search boost',
    ],
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
        const starter = plan.tone === 'starter';
        const features = compact ? plan.compactFeatures : plan.features;
        const href = REGISTRATION_OPEN ? '/auth/account' : waitlistHref('trader', `pricing-${plan.tone}`);
        const cta = REGISTRATION_OPEN ? plan.cta : (pro ? 'Join Founding Trades list' : 'Join tradesperson launch list');
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
    {!REGISTRATION_OPEN ? <Text style={styles.launchNote}>Registration opens at launch. Joining the list now only needs your email.</Text> : null}
    <Text style={styles.note}>Category limits count broad trade categories, not every service inside them. Direct homeowner requests do not use the monthly open-marketplace offer allowance. Google reviews remain clearly labelled as Google reviews and only appear after the business listing connection is approved.</Text>
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
