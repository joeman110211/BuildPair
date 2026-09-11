import { useAuth } from '@clerk/expo';
import { useStripe } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';
import { useState } from 'react';
import { Button } from 'react-native-paper';
import { apiFetch, errorMessage } from '@/lib/api';

type Props = { milestoneId?: string; milestoneIds?: string[]; label?: string; onPaid: () => void };

function StripePaymentButton({ milestoneId, milestoneIds, label = 'Pay with BuildPay', onPaid }: Props) {
  const { getToken } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [busy, setBusy] = useState(false);
  async function pay() {
    try {
      setBusy(true);
      const body = milestoneIds?.length ? { milestoneIds, platform: 'native' } : { milestoneId, platform: 'native' };
      const { clientSecret } = await apiFetch<{ clientSecret: string }>('/api/stripe/payment-intent', { method: 'POST', body: JSON.stringify(body) }, getToken);
      const initialized = await initPaymentSheet({ merchantDisplayName: 'BuildPair · BuildPay', paymentIntentClientSecret: clientSecret, returnURL: 'buildpair://status?type=payment&state=complete', allowsDelayedPaymentMethods: false, googlePay: { merchantCountryCode: 'GB', testEnv: __DEV__ }, applePay: { merchantCountryCode: 'GB' }, style: 'alwaysLight' });
      if (initialized.error) throw new Error(initialized.error.message);
      const presented = await presentPaymentSheet();
      if (presented.error) throw new Error(presented.error.message);
      onPaid();
    } catch (e) {
      Alert.alert('Payment failed', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return <Button mode="contained" icon="credit-card" loading={busy} disabled={busy || (!milestoneId && !milestoneIds?.length)} onPress={pay}>{label}</Button>;
}

export function PayMilestoneButton(props: Props) {
  const stripeEnabled = Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
  return stripeEnabled ? <StripePaymentButton {...props} /> : <Button mode="contained" icon="credit-card-off-outline" disabled>BuildPay temporarily unavailable</Button>;
}
