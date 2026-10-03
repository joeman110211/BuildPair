import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { HelperText, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';

export default function ClaimExternalQuoteScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  async function claim() {
    if (!token) return;
    try {
      setBusy(true); setError('');
      const result = await apiFetch<{ jobId: string }>('/api/external-projects/claim', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }, () => getTokenRef.current());
      router.replace(`/customer/jobs/${result.jobId}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <Screen title="Project link unavailable"><Text>This quote link is missing its secure project token.</Text></Screen>;
  if (busy) return <LoadingScreen label="Turning your accepted quote into a BuildPair project…" />;

  return <Screen title="Bring this job into BuildPair" subtitle="Your tradesperson can bring work they found anywhere into the same BuildPair project system.">
    <AppCard>
      <Text variant="headlineSmall" style={{ fontWeight: '900' }}>One agreed quote. One project record.</Text>
      <Text>Claiming the accepted quote creates your BuildPair project with the agreed scope, price and payment stages already attached. You can then use the normal project timeline, variations, BuildPay where selected, completion and review tools.</Text>
      <Text>This only works when your signed-in BuildPair email matches the customer email on the quote.</Text>
      <Button mode="contained" icon="briefcase-check-outline" onPress={() => void claim()}>Add accepted quote to my projects</Button>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </AppCard>
  </Screen>;
}
