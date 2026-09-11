import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { Button } from 'react-native-paper';
import { apiFetch, errorMessage } from '@/lib/api';

export function PayMilestoneButton({ milestoneId, onPaid }: { milestoneId: string; onPaid: () => void }) {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const stripeEnabled = Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());

  async function payWithStripe() {
    try {
      setBusy(true);
      const { url } = await apiFetch<{ url: string }>('/api/stripe/payment-intent', { method: 'POST', body: JSON.stringify({ milestoneId, platform: 'web' }) }, getToken);
      window.location.assign(url);
    } catch (e) {
      window.alert(errorMessage(e));
      setBusy(false);
    }
  }

  if (!stripeEnabled) return <Button mode="contained" icon="credit-card-off-outline" disabled>BuildPay temporarily unavailable</Button>;
  return <Button mode="contained" icon="credit-card" loading={busy} disabled={busy} onPress={payWithStripe}>Pay with BuildPay</Button>;
}
