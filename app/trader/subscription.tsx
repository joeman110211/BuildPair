import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Button, Chip, ProgressBar, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
// Metro resolves the platform-specific implementation so browser-only Stripe Connect code is not bundled natively.
// eslint-disable-next-line import/no-unresolved
import { StripeConnectOnboarding } from '@/components/StripeConnectOnboarding';
import { SUBSCRIPTION_TIERS } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { PayoutStatus } from '@/lib/payout-status';
import type { SubscriptionTier, TraderProfile } from '@/types';

const PLAN_COPY = {
  free: {
    ...SUBSCRIPTION_TIERS.free,
    detail: [
      'Complete trade profile, work gallery and project stories',
      'Choose up to 2 main categories, then the genuine services inside each',
      'Browse matching BuildPair job posts',
      'Share your profile externally',
      'No marketplace offers or direct homeowner enquiries',
    ],
  },
  core: {
    ...SUBSCRIPTION_TIERS.core,
    detail: [
      'Everything in Starter',
      'Public searchable marketplace profile',
      'Up to 2 main trade categories',
      '5 marketplace opportunities per calendar month',
      'Direct homeowner requests use the same allowance',
      'BuildPair messaging',
      'Quote and invoice customers you found outside BuildPair',
      '1 saved job search and basic business stats',
      'Publish a simple next-available window',
    ],
  },
  basic: {
    ...SUBSCRIPTION_TIERS.basic,
    detail: [
      'Everything in Core',
      'Up to 4 main trade categories',
      '15 open-marketplace offers per calendar month',
      'Direct homeowner requests do not use your allowance',
      'Full Quote Builder with revisions and outside-customer managed projects',
      'Staged BuildPay can follow an accepted outside quote once the customer claims the project',
      'Google review connection and full AI assistance',
      '5 saved searches and full conversion analytics',
      'Working calendar and availability up to roughly 12 weeks',
    ],
  },
  featured: {
    ...SUBSCRIPTION_TIERS.featured,
    detail: [
      'Everything in Plus',
      'Up to 6 main trade categories',
      '35 open-marketplace offers per calendar month',
      'Modest relevance-aware search boost',
      'Advanced analytics and priority alerts',
      'Unlimited saved searches',
      'Availability up to six months and reusable quote/message templates',
      'Advanced project workspace for tasks, progress, materials, expenses, snagging, handover and warranty',
      'BuildPair Project+ planning and room-concept tools included',
    ],
  },
} as const;

export default function SubscriptionScreen() {
  const { getToken } = useAuth();
  const isWeb = Platform.OS === 'web';
  const [profile, setProfile] = useState<TraderProfile>();
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>();
  const [checkingPayouts, setCheckingPayouts] = useState(false);
  const [error, setError] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [showPayoutOnboarding, setShowPayoutOnboarding] = useState(false);

  const refreshPayoutStatus = useCallback(async () => {
    try {
      setCheckingPayouts(true);
      setPayoutError('');
      setPayoutStatus(await apiFetch<PayoutStatus>('/api/stripe/connect-status', {}, getToken));
    } catch (e) {
      setPayoutError(`We could not confirm the latest Stripe payout status. ${errorMessage(e)}`);
    } finally {
      setCheckingPayouts(false);
    }
  }, [getToken]);

  const load = useCallback(async () => {
    try {
      setProfile(await apiFetch<TraderProfile>('/api/me/profile', {}, getToken));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
    await refreshPayoutStatus();
  }, [getToken, refreshPayoutStatus]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function openEndpoint(path: string, body = {}) {
    try {
      setError('');
      const { url } = await apiFetch<{ url: string }>(path, { method: 'POST', body: JSON.stringify(body) }, getToken);
      if (!url) throw new Error('Payment provider did not return a checkout URL');

      // Browser popup blockers can reject Linking.openURL after the async API call.
      // Use same-tab navigation on web so Stripe Checkout reliably opens for real users and browser agents.
      if (isWeb && typeof window !== 'undefined') {
        window.location.assign(url);
        return;
      }

      await Linking.openURL(url);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const activeTier: SubscriptionTier = profile?.subscriptionTier ?? 'free';
  const used = profile?.monthlyQuotesUsed ?? 0;
  const limit = profile?.monthlyQuoteLimit ?? PLAN_COPY[activeTier].monthlyMarketplaceQuotes;
  const payoutsReady = payoutStatus?.ready ?? Boolean(profile?.stripePayoutsEnabled);
  const resetLabel = profile?.monthlyQuoteResetAt
    ? new Date(profile.monthlyQuoteResetAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : 'next month';
  const usageProgress = limit > 0 ? Math.min(1, used / limit) : 0;
  const screenSubtitle = isWeb
    ? 'Membership controls marketplace access. Stripe payout readiness is a separate account status.'
    : 'See your current BuildPair plan, entitlements and payout readiness.';
  const payoutLabel = checkingPayouts && !payoutStatus ? 'Checking…' : payoutStatus?.label ?? (payoutsReady ? 'Ready' : 'Not confirmed');

  return <Screen title="BuildPair plans" subtitle={screenSubtitle}>
    <AppCard>
      <View style={styles.currentRow}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Membership: {PLAN_COPY[activeTier].name}</Text>
          <Text style={styles.muted}>Membership controls search visibility, marketplace offers and paid-plan features. It does not mean your Stripe payout account is ready.</Text>
        </View>
        <Chip icon={activeTier === 'free' ? 'account-outline' : activeTier === 'core' ? 'briefcase-outline' : activeTier === 'basic' ? 'check-decagram-outline' : 'star-circle-outline'}>{isWeb ? PLAN_COPY[activeTier].price : PLAN_COPY[activeTier].shortName}</Chip>
      </View>
      {limit > 0 ? <View style={styles.usage}>
        <View style={styles.currentRow}><Text variant="labelLarge">Marketplace offers</Text><Text variant="labelLarge">{used} / {limit}</Text></View>
        <ProgressBar progress={usageProgress} color={colors.primary} style={styles.progress} />
        <Text style={styles.muted}>Allowance resets {resetLabel}. An open-marketplace opportunity is counted when you first engage with a job by opening a conversation or sending an offer. Merely viewing a job does not use the allowance. Core direct homeowner requests use the same allowance; Plus and Pro direct requests do not.</Text>
      </View> : <Text style={styles.muted}>Starter tradespeople can browse jobs without consuming anything, but submitting an open-marketplace offer requires an active paid plan.</Text>}
    </AppCard>

    {!isWeb ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Mobile plan access</Text>
      <Text style={styles.muted}>Plan purchases and plan changes are not offered inside this mobile app. If your BuildPair account already has Core, Plus or Pro, the same entitlement and allowance are available here automatically.</Text>
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
            disabled={isCurrent}
            onPress={() => openEndpoint('/api/stripe/subscription', { tier: key })}
          >{isCurrent ? 'Current plan' : `Choose ${tier.shortName}`}</Button> : null}
        </AppCard>
      </View>;
    })}</View>

    {isWeb ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Why each £10 step has to earn its place</Text>
      <Text style={styles.muted}>Core adds a real business-tool layer as well as occasional marketplace access. Plus triples Core’s open-market capacity, removes direct-request usage from the allowance and adds the full outside-customer/project workflow. Pro then raises capacity to 35 and adds the longest availability horizon, advanced project tools, deeper analytics, templates and Project+. Paying more never creates a trust badge: reviews, credentials, relevance and profile quality remain separate.</Text>
    </AppCard> : null}

    <AppCard style={payoutsReady ? styles.payoutReady : undefined}>
      <View style={styles.currentRow}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Stripe payouts</Text>
          <Text style={styles.muted}>This status is checked against Stripe and is separate from your BuildPair membership.</Text>
        </View>
        <Chip icon={payoutsReady ? 'check-circle' : payoutStatus?.key === 'pending_verification' ? 'clock-outline' : 'alert-circle-outline'}>{payoutLabel}</Chip>
      </View>

      {payoutStatus ? <>
        <Text>{payoutStatus.detail}</Text>
        <Text style={styles.nextAction}><Text style={styles.nextActionStrong}>Next action: </Text>{payoutStatus.nextAction}</Text>
        {payoutStatus.requirements.length ? <View style={styles.requirements}>
          <Text variant="labelLarge" style={styles.title}>Stripe still needs</Text>
          {payoutStatus.requirements.map((requirement) => <Text key={requirement} style={styles.muted}>• {requirement}</Text>)}
        </View> : null}
        {payoutStatus.lastCheckedAt ? <Text variant="bodySmall" style={styles.muted}>Stripe status checked {new Date(payoutStatus.lastCheckedAt).toLocaleString('en-GB')}.</Text> : null}
      </> : <Text>{payoutsReady ? 'BuildPair has a stored payout-ready status. Refresh to confirm the latest status with Stripe.' : 'Checking whether Stripe needs information, is reviewing the account, or has enabled payouts.'}</Text>}

      {payoutError ? <Text style={styles.error}>{payoutError}</Text> : null}
      <Text style={styles.muted}>BuildPair receives the connected-account status and payment references needed to operate protected payments. Stripe collects the identity, business and bank information used for payout onboarding.</Text>
      <Text style={styles.muted}>You can create your profile and send eligible quotes before setup is complete. Homeowners cannot select BuildPair protected payments for your jobs until Stripe confirms that payouts are ready.</Text>

      {showPayoutOnboarding ? (
        <View style={styles.connectPanel}>
          <StripeConnectOnboarding
            getToken={getToken}
            onExit={() => {
              setShowPayoutOnboarding(false);
              void load();
            }}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button mode="contained" icon="bank" onPress={() => setShowPayoutOnboarding(true)}>
            {payoutsReady ? 'Review payout details' : payoutStatus?.key === 'not_started' ? 'Set up payouts with Stripe' : 'Continue in Stripe'}
          </Button>
          <Button mode="outlined" icon="refresh" loading={checkingPayouts} disabled={checkingPayouts} onPress={() => void refreshPayoutStatus()}>Refresh Stripe status</Button>
        </View>
      )}
    </AppCard>
    {isWeb ? <Button mode="outlined" onPress={() => openEndpoint('/api/stripe/billing-portal')}>Manage or cancel subscription</Button> : null}
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
  nextAction: { color: colors.text, lineHeight: 22 },
  nextActionStrong: { color: colors.charcoal, fontWeight: '900' },
  requirements: { gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payoutReady: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  usage: { gap: 8, marginTop: 8 },
  progress: { height: 9, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  connectPanel: { minHeight: 420, marginTop: 8 },
  error: { color: colors.danger },
});
