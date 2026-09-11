import { useAuth } from '@clerk/expo';
import { useStripe } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';
import { useState } from 'react';
import { Button, HelperText } from 'react-native-paper';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type Props = {
  releaseMilestoneId: string;
  releaseAmount: number;
  nextMilestoneId?: string;
  nextAmount?: number;
  onDone: () => void;
};

export function ReleaseAndFundButton({ releaseMilestoneId, releaseAmount, nextMilestoneId, nextAmount, onDone }: Props) {
  const { getToken } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [released, setReleased] = useState(false);
  const label = nextMilestoneId && nextAmount != null
    ? `Approve ${formatMoney(releaseAmount)} & fund next ${formatMoney(nextAmount)}`
    : `Approve & release ${formatMoney(releaseAmount)}`;

  async function run() {
    try {
      setBusy(true);
      setError('');
      if (!released) {
        await apiFetch('/api/payments/release', {
          method: 'POST',
          body: JSON.stringify({ milestoneId: releaseMilestoneId, action: 'release', acknowledgedReleaseResponsibility: true }),
        }, getToken);
        setReleased(true);
      }

      if (!nextMilestoneId) {
        onDone();
        return;
      }

      try {
        const { clientSecret } = await apiFetch<{ clientSecret: string }>('/api/stripe/payment-intent', {
          method: 'POST',
          body: JSON.stringify({ milestoneId: nextMilestoneId, platform: 'native' }),
        }, getToken);
        const initialized = await initPaymentSheet({
          merchantDisplayName: 'BuildPair',
          paymentIntentClientSecret: clientSecret,
          returnURL: 'buildpair://status?type=payment&state=complete',
          allowsDelayedPaymentMethods: false,
          googlePay: { merchantCountryCode: 'GB', testEnv: __DEV__ },
          applePay: { merchantCountryCode: 'GB' },
          style: 'alwaysLight',
        });
        if (initialized.error) throw new Error(initialized.error.message);
        const presented = await presentPaymentSheet();
        if (presented.error) throw new Error(presented.error.message);
        onDone();
      } catch (fundingError) {
        const message = `The completed stage was released, but the next payment could not be started: ${errorMessage(fundingError)}. Reopen the job and fund the next stage.`;
        setError(message);
        Alert.alert('Stage released, next payment not funded', message);
        onDone();
      }
    } catch (e) {
      const message = errorMessage(e);
      setError(message);
      Alert.alert('Unable to release payment', message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button mode="contained" icon="check-circle-outline" loading={busy} disabled={busy} onPress={run}>{label}</Button>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
  </>;
}
