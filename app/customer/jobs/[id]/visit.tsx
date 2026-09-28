import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';
import type { JobPrivateAddress, JobPrivateDetails } from '@/types/job-private-details';

type Visit = {
  id: string;
  jobId: string;
  jobTitle: string;
  proposedAt: string;
  status: 'proposed' | 'confirmed' | 'declined' | 'completed' | 'cancelled';
  note: string;
  privateAddress: JobPrivateAddress | null;
};


export default function ConfirmVisitScreen() {
  const { id, visitId } = useLocalSearchParams<{ id: string; visitId?: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [visit, setVisit] = useState<Visit>();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [townCity, setTownCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id || !visitId) return;
    try {
      const [nextVisit, details] = await Promise.all([
        apiFetch<Visit>(`/api/site-visits?id=${encodeURIComponent(visitId)}`, {}, getToken),
        apiFetch<JobPrivateDetails>(`/api/job-private-details?jobId=${encodeURIComponent(id)}`, {}, getToken),
      ]);
      setVisit(nextVisit);
      setAddressLine1(details.addressLine1);
      setAddressLine2(details.addressLine2);
      setTownCity(details.townCity);
      setPostcode(details.postcode);
      setAccessNotes(details.accessNotes);
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken, id, visitId]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function confirm() {
    if (!visitId || !id) return;
    try {
      setBusy(true); setError('');
      await apiFetch('/api/job-private-details', {
        method: 'PUT',
        body: JSON.stringify({ jobId: id, addressLine1, addressLine2, townCity, accessNotes }),
      }, getToken);
      await apiFetch('/api/site-visits', { method: 'PATCH', body: JSON.stringify({ id: visitId, action: 'accept' }) }, getToken);
      router.replace(`/customer/jobs/${id}` as Href);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function decline() {
    if (!visitId || !id) return;
    try {
      setBusy(true); setError('');
      await apiFetch('/api/site-visits', { method: 'PATCH', body: JSON.stringify({ id: visitId, action: 'decline' }) }, getToken);
      router.replace(`/customer/jobs/${id}` as Href);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (!visit && !error) return <LoadingScreen label="Loading visit…" />;
  const canConfirm = addressLine1.trim().length >= 3 && townCity.trim().length >= 2;
  const when = visit?.proposedAt ? new Date(visit.proposedAt).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

  return <Screen title="Confirm site visit" subtitle={visit?.jobTitle ?? 'BuildPair job'}>
    <AppCard>
      <Text variant="titleLarge">{when || 'Proposed site visit'}</Text>
      {visit?.note ? <Text>{visit.note}</Text> : null}
      <Text>Only confirm a visit you are happy for this tradesperson to attend.</Text>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">Private visit address</Text>
      <Text>Your street address is not shown on the public job listing. BuildPair releases it only to this tradesperson after you confirm their visit, or to the tradesperson you later award the job to.</Text>
      <TextInput mode="outlined" label="House number/name and street" value={addressLine1} onChangeText={setAddressLine1} autoComplete="street-address" />
      <TextInput mode="outlined" label="Address line 2 (optional)" value={addressLine2} onChangeText={setAddressLine2} />
      <TextInput mode="outlined" label="Town / city" value={townCity} onChangeText={setTownCity} />
      <TextInput mode="outlined" label="Postcode" value={postcode} disabled />
      <TextInput mode="outlined" label="Access / parking notes (optional)" value={accessNotes} onChangeText={setAccessNotes} multiline maxLength={1000} />
      <HelperText type="info">The visit is for inspection and quoting only. It does not award the job or agree a price.</HelperText>
    </AppCard>

    {error ? <HelperText type="error">{error}</HelperText> : null}
    <AppCard>
      <Button mode="contained" icon="calendar-check" loading={busy} disabled={busy || !canConfirm || visit?.status !== 'proposed'} onPress={() => void confirm()}>Save address & confirm visit</Button>
      <Button mode="outlined" disabled={busy || visit?.status !== 'proposed'} onPress={() => void decline()}>Decline visit</Button>
    </AppCard>
  </Screen>;
}
