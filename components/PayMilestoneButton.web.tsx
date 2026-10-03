import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { Button } from '@/components/BrandButton';
import { apiFetch, errorMessage } from '@/lib/api';

type Props = {
  milestoneId?: string;
  milestoneIds?: string[];
  label?: string;
  onPaid: () => void;
};

export function PayMilestoneButton({ milestoneId, milestoneIds, label = 'Pay with BuildPay', onPaid: _onPaid }: Props) {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const stripeEnabled = Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());

  async function payWithStripe() {
    try {
      setBusy(true);
      const body = milestoneIds?.length ? { milestoneIds, platform: 'web' } : { milestoneId, platform: 'web' };
      const { url } = await apiFetch<{ url: string }>('/api/stripe/payment-intent', { method: 'POST', body: JSON.stringify(body) }, getToken);
      window.location.assign(url);
    } catch (e) {
      window.alert(errorMessage(e));
      setBusy(false);
    }
  }

  if (!stripeEnabled) return <Button mode="contained" icon="credit-card-off-outline" disabled>BuildPay temporarily unavailable</Button>;
  return <Button mode="contained" icon="credit-card" loading={busy} disabled={busy || (!milestoneId && !milestoneIds?.length)} onPress={payWithStripe}>{label}</Button>;
}
