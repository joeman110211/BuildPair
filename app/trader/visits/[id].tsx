import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, Chip, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';

type Visit = {
  id: string;
  jobId: string;
  jobTitle: string;
  conversationId: string | null;
  proposedAt: string;
  status: 'proposed' | 'confirmed' | 'declined' | 'completed' | 'cancelled';
  note: string;
  privateAddress: { addressLine1: string; addressLine2: string; townCity: string; postcode: string; accessNotes: string } | null;
};

export default function TraderVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [visit, setVisit] = useState<Visit>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setVisit(await apiFetch<Visit>(`/api/site-visits?id=${encodeURIComponent(id)}`, {}, getToken)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
  }, [getToken, id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function complete() {
    if (!visit) return;
    try {
      setBusy(true); setError('');
      await apiFetch('/api/site-visits', { method: 'PATCH', body: JSON.stringify({ id: visit.id, action: 'complete' }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (!visit && !error) return <LoadingScreen label="Loading site visit…" />;
  if (!visit) return <Screen><EmptyState title="Site visit unavailable" body={error || 'This visit could not be loaded.'} /></Screen>;

  const when = new Date(visit.proposedAt).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const address = visit.privateAddress;

  return <Screen title="Site visit" subtitle={visit.jobTitle}>
    <AppCard>
      <Chip icon="calendar-check">{visit.status}</Chip>
      <Text variant="headlineSmall">{when}</Text>
      {visit.note ? <Text>{visit.note}</Text> : null}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">Visit address</Text>
      {address ? <>
        <Text variant="titleMedium">{address.addressLine1}</Text>
        {address.addressLine2 ? <Text>{address.addressLine2}</Text> : null}
        <Text>{address.townCity}</Text>
        <Text>{address.postcode}</Text>
        {address.accessNotes ? <><Text variant="labelLarge">Access notes</Text><Text>{address.accessNotes}</Text></> : null}
        <HelperText type="info">This address was shared privately for this confirmed BuildPair visit. Do not republish it or use it for unrelated marketing.</HelperText>
      </> : <Text>{"The homeowner's street address is not available until the visit is confirmed."}</Text>}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">Keep the job in BuildPair after the visit</Text>
      <Text>Inspect the work, clarify the scope, then come back and send the structured BuildPair quote. That keeps the price, scope, payment route, changes and review attached to the same project.</Text>
      {visit.status === 'confirmed' ? <Button mode="contained" icon="check" loading={busy} disabled={busy} onPress={() => void complete()}>Mark visit complete</Button> : null}
      {['confirmed', 'completed'].includes(visit.status) ? <Button mode="outlined" icon="file-document-edit-outline" onPress={() => router.push({ pathname: '/trader/quotes/new', params: { jobId: visit.jobId, title: visit.jobTitle } })}>Create BuildPair quote</Button> : null}
      {visit.conversationId ? <Button mode="text" icon="message-text-outline" onPress={() => router.push(`/trader/messages/${visit.conversationId}` as Href)}>Open conversation</Button> : null}
    </AppCard>
    {error ? <HelperText type="error">{error}</HelperText> : null}
  </Screen>;
}
