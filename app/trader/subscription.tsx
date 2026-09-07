import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Button, Chip, ProgressBar, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { SUBSCRIPTION_TIERS } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { SubscriptionTier, TraderProfile } from '@/types';

const PLAN_COPY = {
  free: {
    ...SUBSCRIPTION_TIERS.free,
    detail: [
      'Create a complete trade profile and work gallery',
      'Choose up to 2 main trade categories',
      'Browse matching BuildPair job posts',
      'Share your profile externally',
      'Hidden from BuildPair search and recommendations',
      'No BuildPair quote or messaging access',
      'Reviews and contact links hidden on the shared Starter page',
    ],
  },
  basic: {
    ...SUBSCRIPTION_TIERS.basic,
    detail: [
      'Everything in Starter',
      'Public searchable profile with reviews',
      'Choose up to 4 main trade categories',
      '15 open-marketplace offers per calendar month',
      'Direct homeowner quote requests do not use your allowance',
      'BuildPair messaging with AI reply assistance and safety moderation',
    ],
  },
  featured: {
    ...SUBSCRIPTION_TIERS.featured,
    detail: [
      'Everything in Plus',
      'Choose up to 6 main trade categories',
      '35 open-marketplace offers per calendar month',
      'Moderate priority boost in relevant search results',
      'Advanced trader analytics',
      'Priority new-job alert advantages',
    ],
  },
} as const;

export default function SubscriptionScreen() {
  const { getToken } = useAuth();
  const isWeb = Platform.OS === 'web';
  const paymentsEnabled = Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
  const [profile, setProfile] = useState<TraderProfile>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setProfile(await apiFetch<TraderProfile>('/api/me/profile', {}, getToken));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function openEndpoint(path: string, body = {}) {
    try {
      const { url } = await apiFetch<{ url: string }>(path, { method: 'POST', body: JSON.stringify(body) }, getToken);
      await Linking.openURL(url);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const activeTier: SubscriptionTier = profile?.subscriptionTier ?? 'free';
  const used = profile?.monthlyQuotesUsed ?? 0;
  const limit = profile?.monthlyQuoteLimit ?? PLAN_COPY[activeTier].monthlyMarketplaceQuotes;
  const resetLabel = profile?.monthlyQuoteResetAt
    ? new Date(profile.monthlyQuoteResetAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : 'next month';
  const usageProgress = limit > 0 ? Math.min(1, used / limit) : 0;
  const screenSubtitle = isWeb
    ? 'Start free, upgrade when you want BuildPair to bring your profile into search and let you actively pursue work.'
    : 'See your current BuildPair plan and the features included with each tier.';

  return <Screen title="BuildPair plans" subtitle={screenSubtitle}>
    <AppCard>
      <View style={styles.currentRow}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Current plan: {PLAN_COPY[activeTier].name}</Text>
          <Text style={styles.muted}>BuildPair currently has no free trial. Starter, Plus and Pro entitlements remain separate and persist across your BuildPair devices.</Text>
        </View>
        <Chip icon={activeTier === 'free' ? 'account-outline' : activeTier === 'basic' ? 'check-decagram-outline' : 'star-circle-outline'}>{isWeb ? PLAN_COPY[activeTier].price : PLAN_COPY[activeTier].shortName}</Chip>
      </View>
      {limit > 0 ? <View style={styles.usage}>
        <View style={styles.currentRow}><Text variant="labelLarge">Marketplace offers</Text><Text variant="labelLarge">{used} / {limit}</Text></View>
        <ProgressBar progress={usageProgress} color={colors.primary} style={styles.progress} />
        <Text style={styles.muted}>Allowance resets {resetLabel}. Direct homeowner requests do not count toward this total.</Text>
      </View> : <Text style={styles.muted}>Starter traders can browse jobs without consuming anything, but offering on an open marketplace job requires an active paid plan.</Text>}
    </AppCard>

    {!isWeb ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Mobile plan access</Text>
      <Text style={styles.muted}>Plan purchases and plan changes are not offered inside this mobile app. If your BuildPair account already has Plus or Pro, the same entitlement and allowance are available here automatically.</Text>
    </AppCard> : null}

    <View style={styles.grid}>{(Object.entries(PLAN_COPY) as [SubscriptionTier, (typeof PLAN_COPY)[SubscriptionTier]][]).map(([key, tier]) => {
      const isCurrent = key === activeTier;
      return <View key={key} style={styles.plan}>
        <AppCard style={isCurrent ? styles.currentPlan : undefined}>
          <View style={styles.planHeader}>
            <View>
              <Text variant="headlineSmall" style={styles.title}>{tier.name}</Text>
              {isWeb ? <Text variant="headlineMedium" style={styles.price}>{tier.price}</Text> : null}
            </View>
            {isCurrent ? <Chip icon="check">Current</Chip> : null}
          </View>
          <Text style={styles.categoryLine}>Up to {tier.categoryLimit} main trade categories</Text>
          {tier.detail.map((feature) => <Text key={feature} style={styles.feature}>✓ {feature}</Text>)}
          {isWeb && key !== 'free' ? <Button
            mode={isCurrent ? 'outlined' : 'contained'}
            disabled={!paymentsEnabled || isCurrent}
            onPress={() => openEndpoint('/api/stripe/subscription', { tier: key })}
          >{!paymentsEnabled ? 'Stripe setup in progress' : isCurrent ? 'Current plan' : `Choose ${tier.shortName}`}</Button> : null}
        </AppCard>
      </View>;
    })}</View>

    {isWeb ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Why Pro costs £10 more</Text>
      <Text style={styles.muted}>Pro is not simply “20 more clicks”. It raises the monthly open-job allowance to 35, supports 6 main categories, adds advanced analytics and gets a measured discovery and alert advantage. Relevance, reviews, verified credentials and profile quality still matter more than simply paying for Pro.</Text>
    </AppCard> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Receive job payments</Text>
      <Text style={styles.muted}>Complete Stripe Express onboarding so customer deposits and balances for real-world building work can be routed to your bank. BuildPair never handles raw card numbers.</Text>
      <Button mode="contained" icon="bank" disabled={!paymentsEnabled} onPress={() => openEndpoint('/api/stripe/connect')}>{paymentsEnabled ? 'Set up Stripe payouts' : 'Stripe setup in progress'}</Button>
    </AppCard>
    {isWeb ? <Button mode="outlined" disabled={!paymentsEnabled} onPress={() => openEndpoint('/api/stripe/billing-portal')}>Manage or cancel subscription</Button> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  plan: { flex: 1, minWidth: 260 },
  currentPlan: { borderColor: colors.primary, borderWidth: 2 },
  currentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220 },
  title: { color: colors.charcoal, fontWeight: '900' },
  price: { color: colors.primary, fontWeight: '900' },
  categoryLine: { color: colors.charcoal, fontWeight: '800' },
  feature: { color: colors.text, lineHeight: 22 },
  muted: { color: colors.muted, lineHeight: 22 },
  usage: { gap: 8, marginTop: 8 },
  progress: { height: 9, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  error: { color: colors.danger },
});
