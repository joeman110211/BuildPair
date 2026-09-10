import { useEffect } from 'react';
import { Button, Text } from 'react-native-paper';

type Props = {
  getToken: () => Promise<string | null>;
  onExit?: () => void;
};

export function StripeConnectOnboarding({ onExit }: Props) {
  const openStripe = () => {
    window.location.assign('/api/stripe/connect');
  };

  useEffect(() => {
    const timer = setTimeout(openStripe, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Text>Opening Stripe secure payout setup…</Text>
      <Button mode="contained" onPress={openStripe}>Continue to Stripe</Button>
      <Button mode="text" onPress={onExit}>Back</Button>
    </>
  );
}
