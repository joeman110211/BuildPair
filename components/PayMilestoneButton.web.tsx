import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { Button, HelperText } from 'react-native-paper';
import { apiFetch, errorMessage } from '@/lib/api';

type Props = {
  milestoneId?: string;
  milestoneIds?: string[];
  label?: string;
  onPaid: () => void;
  onError?: (message: string) => void;
};

export function PayMilestoneButton({ milestoneId, milestoneIds, label = 'Pay through BuildPair', onError }: Props) {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stripeEnabled = Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());

  async function payWithStripe() {
    try {
      setBusy(true);
      setError('');
      const body = milestoneIds?.length ? { milestoneIds, platform: 'web' as const } : { milestoneId, platform: 'web' as const };
      const { url } = await apiFetch<{ url: string }>('/api/stripe/payment-intent', { method: 'POST', body: JSON.stringify(body) }, getToken);
      window.location.assign(url);
    } catch (e) {
      const message = errorMessage(e);
      setError(message);
      onError?.(message);
      setBusy(false);
    }
  }

  if (!stripeEnabled) return <Button mode="contained" icon="credit-card-off-outline" disabled>BuildPair payments temporarily unavailable</Button>;
  return <>
    <Button mode="contained" icon="credit-card" loading={busy} disabled={busy || (!milestoneId && !milestoneIds?.length)} onPress={payWithStripe}>{label}</Button>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
  </>;
}
