import type { Href } from 'expo-router';
import { Link, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { useCurrentUser } from '@/hooks/useCurrentUser';

type ResultCopy = { title: string; body: string; action: string };

const results: Record<string, ResultCopy> = {
  'subscription:complete': {
    title: 'Subscription confirmed',
    body: 'Stripe has accepted your subscription. BuildPair will update your plan as soon as the verified webhook arrives.',
    action: 'Return to plans',
  },
  'subscription:cancelled': {
    title: 'Subscription not changed',
    body: 'Checkout was cancelled and you have not been charged for a new plan.',
    action: 'Return to plans',
  },
  'connect:complete': {
    title: 'Payout details submitted',
    body: 'Stripe is checking your payout account. BuildPair will enable customer payments when Stripe confirms that charges are active.',
    action: 'Return to plans',
  },
  'connect:retry': {
    title: 'Payout setup needs another step',
    body: 'The Stripe setup link expired or more information is needed. Start it again to continue.',
    action: 'Restart payout setup',
  },
  'payment:complete': {
    title: 'Payment submitted',
    body: 'Stripe is confirming the payment. The job milestone will update after BuildPair receives the verified payment event.',
    action: 'Open dashboard',
  },
  'payment:cancelled': {
    title: 'Payment cancelled',
    body: 'The checkout was closed before payment completed. No BuildPair milestone has been marked as paid.',
    action: 'Open dashboard',
  },
};

export default function ProviderStatusScreen() {
  const params = useLocalSearchParams<{ type?: string; state?: string }>();
  const { user } = useCurrentUser();
  const key = `${params.type ?? ''}:${params.state ?? ''}`;
  const copy = results[key] ?? {
    title: 'Back to BuildPair',
    body: 'The external service returned you to BuildPair. Open your dashboard to see the latest verified status.',
    action: 'Continue',
  };
  const isTraderFlow = params.type === 'subscription' || params.type === 'connect';
  const href = (isTraderFlow
    ? '/trader/subscription'
    : user?.role === 'customer'
      ? '/customer/dashboard'
      : user?.role === 'trader'
        ? '/trader/dashboard'
        : '/(public)/directory') as Href;

  return <Screen title={copy.title} subtitle={copy.body}>
    <AppCard>
      <Text>Provider updates are verified server-side. Refresh the relevant screen if the new status takes a few seconds to appear.</Text>
      <Link href={href} asChild><Button mode="contained">{copy.action}</Button></Link>
    </AppCard>
  </Screen>;
}
