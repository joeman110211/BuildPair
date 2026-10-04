import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
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
  options?: { proposedAt: string; selected: boolean }[];
};


export default function ConfirmVisitScreen() {
  const { id, visitId } = useLocalSearchParams<{ id: string; visitId?: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [visit, setVisit] = useState<Visit>();
  const [selectedAt, setSelectedAt] = useState('');
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
      const options = nextVisit.options?.length ? nextVisit.options : [{ proposedAt: nextVisit.proposedAt, selected: false }];
      setSelectedAt(options.find((option) => option.selected)?.proposedAt ?? options[0]?.proposedAt ?? nextVisit.proposedAt);
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
      await apiFetch('/api/site-visits', { method: 'PATCH', body: JSON.stringify({ id: visitId, action: 'accept', selectedAt: selectedAt || visit?.proposedAt }) }, getToken);
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
  const canConfirm = addressLine1.trim().length >= 3 && townCity.trim().length >= 2 && Boolean(selectedAt);
  const when = selectedAt ? new Date(selectedAt).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

  return <Screen title="Confirm site visit" subtitle={visit?.jobTitle ?? 'BuildPair job'}>
    <AppCard>
      <Text variant="titleLarge">{(visit?.options?.length ?? 0) > 1 ? 'Choose a site visit time' : (when || 'Proposed site visit')}</Text>
      {(visit?.options?.length ?? 0) > 1 ? visit!.options!.map((option) => <Button key={option.proposedAt} mode={selectedAt === option.proposedAt ? 'contained' : 'outlined'} icon="calendar-clock" onPress={() => setSelectedAt(option.proposedAt)}>{new Date(option.proposedAt).toLocaleString('en-GB', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</Button>) : null}
      {(visit?.options?.length ?? 0) > 1 && when ? <Text>Selected: {when}</Text> : null}
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
