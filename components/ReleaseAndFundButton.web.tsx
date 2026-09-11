import { useAuth } from '@clerk/expo';
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
        const { url } = await apiFetch<{ url: string }>('/api/stripe/payment-intent', {
          method: 'POST',
          body: JSON.stringify({ milestoneId: nextMilestoneId, platform: 'web' }),
        }, getToken);
        window.location.assign(url);
      } catch (fundingError) {
        setError(`The completed stage was released, but the next payment could not be started: ${errorMessage(fundingError)}. Refresh the job and fund the next stage from its payment button.`);
        onDone();
        setBusy(false);
      }
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return <>
    <Button mode="contained" icon="check-circle-outline" loading={busy} disabled={busy} onPress={run}>{label}</Button>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
  </>;
}
