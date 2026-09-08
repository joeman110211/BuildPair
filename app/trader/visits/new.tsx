import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';

type SiteVisit = { id: string; proposedAt: string; status: string };

const defaultVisitDate = new Date();
defaultVisitDate.setUTCDate(defaultVisitDate.getUTCDate() + 1);
const DEFAULT_VISIT_DATE = defaultVisitDate.toISOString().slice(0, 10);

export default function NewSiteVisitScreen() {
  const { jobId, conversationId, title } = useLocalSearchParams<{ jobId: string; conversationId?: string; title?: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(DEFAULT_VISIT_DATE);
  const [time, setTime] = useState('10:00');
  const [note, setNote] = useState('I need to inspect the job on site before I can give you an accurate fixed quote.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!jobId) return;
    const proposed = new Date(`${date.trim()}T${time.trim()}:00`);
    if (Number.isNaN(proposed.getTime())) {
      setError('Enter the visit date as YYYY-MM-DD and the time as HH:MM.');
      return;
    }
    if (proposed.getTime() <= Date.now()) {
      setError('Choose a future date and time.');
      return;
    }

    try {
      setBusy(true); setError('');
      await apiFetch<SiteVisit>('/api/site-visits', {
        method: 'POST',
        body: JSON.stringify({ jobId, proposedAt: proposed.toISOString(), note: note.trim() }),
      }, getToken);
      if (conversationId) router.replace(`/trader/messages/${conversationId}` as Href);
      else router.replace('/trader/job-board');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  const footer = <Button mode="contained" icon="calendar-check" loading={busy} disabled={busy || !jobId || !date.trim() || !time.trim()} onPress={() => void submit()}>Propose site visit</Button>;

  return <Screen title="Visit before quoting" subtitle={title ?? 'BuildPair job'} footer={footer}>
    <AppCard>
      <Text variant="titleLarge">A proper quote sometimes needs eyes on the job</Text>
      <Text>Use this when photos and a description are not enough to price the work responsibly. The homeowner can confirm or decline the proposed visit inside BuildPair.</Text>
      <Text>After the visit, come back to the same job and create the structured quote. The quote, acceptance, deposit, payment stages, changes and review can all stay attached to this job.</Text>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge">Propose a time</Text>
      <TextInput mode="outlined" label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} autoCapitalize="none" />
      <TextInput mode="outlined" label="Time (HH:MM)" value={time} onChangeText={setTime} autoCapitalize="none" />
      <TextInput mode="outlined" label="Message to homeowner" value={note} onChangeText={setNote} multiline numberOfLines={5} maxLength={1000} />
      <HelperText type="info">This is a quote visit, not an acceptance of the job. No price is agreed until you send a BuildPair quote and the homeowner accepts it.</HelperText>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </AppCard>
  </Screen>;
}
