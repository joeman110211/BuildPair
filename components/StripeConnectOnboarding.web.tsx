import { useEffect, useState } from 'react';
import { Button, Text } from 'react-native-paper';

type Props = {
  getToken: () => Promise<string | null>;
  onExit?: () => void;
};

export function StripeConnectOnboarding({ onExit }: Props) {
  const [takingLonger, setTakingLonger] = useState(false);

  const openStripe = () => {
    setTakingLonger(false);
    window.location.assign('/api/stripe/connect');
  };

  useEffect(() => {
    const openTimer = setTimeout(openStripe, 0);
    const slowTimer = setTimeout(() => setTakingLonger(true), 6000);
    return () => {
      clearTimeout(openTimer);
      clearTimeout(slowTimer);
    };
  }, []);

  return (
    <>
      <Text variant="titleMedium">Opening Stripe payout onboarding…</Text>
      <Text>Keep this window open. Stripe will return you to BuildPair after it saves your information.</Text>
      {takingLonger ? <Text>Stripe is taking longer than expected. Your payout account has not been marked ready just because onboarding was opened. Retry once or return to BuildPair.</Text> : null}
      <Button mode="contained" onPress={openStripe}>{takingLonger ? 'Retry Stripe onboarding' : 'Continue to Stripe'}</Button>
      <Button mode="text" onPress={onExit}>Back to BuildPair</Button>
    </>
  );
}
