import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
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
  const [alternativeDate, setAlternativeDate] = useState('');
  const [alternativeTime, setAlternativeTime] = useState('');
  const [thirdDate, setThirdDate] = useState('');
  const [thirdTime, setThirdTime] = useState('');
  const [note, setNote] = useState('I need to inspect the job on site before I can give you an accurate fixed quote.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!jobId) return;
    const entries = [
      [date.trim(), time.trim()],
      [alternativeDate.trim(), alternativeTime.trim()],
      [thirdDate.trim(), thirdTime.trim()],
    ].filter(([visitDate, visitTime]) => visitDate && visitTime);
    const proposedSlots = entries.map(([visitDate, visitTime]) => new Date(`${visitDate}T${visitTime}:00`));
    if (!proposedSlots.length || proposedSlots.some((slot) => Number.isNaN(slot.getTime()))) {
      setError('Enter each visit date as YYYY-MM-DD and the time as HH:MM.');
      return;
    }
    if (proposedSlots.some((slot) => slot.getTime() <= Date.now())) {
      setError('Choose future dates and times.');
      return;
    }

    try {
      setBusy(true); setError('');
      await apiFetch<SiteVisit>('/api/site-visits', {
        method: 'POST',
        body: JSON.stringify({ jobId, proposedAt: proposedSlots[0]!.toISOString(), proposedSlots: proposedSlots.map((slot) => slot.toISOString()), note: note.trim() }),
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
      <Text variant="labelLarge">Alternative time (optional)</Text>
      <TextInput mode="outlined" label="Alternative date (YYYY-MM-DD)" value={alternativeDate} onChangeText={setAlternativeDate} autoCapitalize="none" />
      <TextInput mode="outlined" label="Alternative time (HH:MM)" value={alternativeTime} onChangeText={setAlternativeTime} autoCapitalize="none" />
      <Text variant="labelLarge">Third option (optional)</Text>
      <TextInput mode="outlined" label="Third date (YYYY-MM-DD)" value={thirdDate} onChangeText={setThirdDate} autoCapitalize="none" />
      <TextInput mode="outlined" label="Third time (HH:MM)" value={thirdTime} onChangeText={setThirdTime} autoCapitalize="none" />
      <TextInput mode="outlined" label="Message to homeowner" value={note} onChangeText={setNote} multiline numberOfLines={5} maxLength={1000} />
      <HelperText type="info">This is a quote visit, not an acceptance of the job. No price is agreed until you send a BuildPair quote and the homeowner accepts it.</HelperText>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </AppCard>
  </Screen>;
}
