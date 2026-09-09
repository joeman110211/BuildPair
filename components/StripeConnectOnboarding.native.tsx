import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  loadConnectAndInitialize,
} from '@stripe/stripe-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Text } from 'react-native-paper';
import { apiFetch, errorMessage } from '@/lib/api';

type Props = {
  getToken: () => Promise<string | null>;
  onExit?: () => void;
};

export function StripeConnectOnboarding({ getToken, onExit }: Props) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const [error, setError] = useState('');

  const fetchClientSecret = useCallback(async () => {
    const response = await apiFetch<{ clientSecret: string }>(
      '/api/stripe/connect-session',
      { method: 'POST', body: JSON.stringify({}) },
      getToken,
    );

    if (!response.clientSecret) throw new Error('Stripe did not return an onboarding session.');
    return response.clientSecret;
  }, [getToken]);

  const connectInstance = useMemo(() => {
    if (!publishableKey) return null;
    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret,
      appearance: {
        variables: {
          colorPrimary: '#D35400',
        },
      },
    });
  }, [fetchClientSecret, publishableKey]);

  if (!publishableKey || !connectInstance) {
    return <Text>Stripe payout setup is not configured on this BuildPair deployment.</Text>;
  }

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <ConnectAccountOnboarding
        onExit={() => {
          setError('');
          onExit?.();
        }}
        onLoadError={({ error: loadError }) => {
          setError(errorMessage(loadError));
        }}
      />
      {error ? <Text>{error}</Text> : null}
    </ConnectComponentsProvider>
  );
}
