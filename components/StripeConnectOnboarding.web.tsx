import { useCallback, useEffect, useState } from 'react';
import { Button, Text } from 'react-native-paper';
import { apiFetch, errorMessage } from '@/lib/api';

type Props = {
  getToken: () => Promise<string | null>;
  onExit?: () => void;
};

export function StripeConnectOnboarding({ getToken, onExit }: Props) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const startHostedOnboarding = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const response = await apiFetch<{ url: string }>(
        '/api/stripe/connect',
        { method: 'POST', body: JSON.stringify({}) },
        getToken,
      );

      if (!response.url) throw new Error('Stripe did not return an onboarding URL.');
      window.location.assign(response.url);
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void startHostedOnboarding();
  }, [startHostedOnboarding]);

  if (error) {
    return (
      <>
        <Text>{error}</Text>
        <Button mode="contained" onPress={() => void startHostedOnboarding()}>
          Try Stripe payout setup again
        </Button>
        <Button mode="text" onPress={onExit}>Back</Button>
      </>
    );
  }

  return <Text>{loading ? 'Opening Stripe secure payout setup…' : 'Opening Stripe…'}</Text>;
}
