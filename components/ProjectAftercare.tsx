import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Aftercare = {
  id: string;
  title: string;
  note: string;
  dueAt: string;
  status: 'pending' | 'sent' | 'done' | 'dismissed';
  lastSentAt: string | null;
  sendCount: number;
};

function inputDate(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function ProjectAftercare({ jobId, role }: { jobId: string; role: 'trader' | 'customer' }) {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  const [items, setItems] = useState<Aftercare[]>([]);
  const [title, setTitle] = useState('30-day workmanship check-in');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState(() => inputDate(30));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setItems(await apiFetch<Aftercare[]>(`/api/aftercare?jobId=${encodeURIComponent(jobId)}`, {}, () => tokenRef.current()));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  function preset(days: number, nextTitle: string) {
    setDueDate(inputDate(days));
    setTitle(nextTitle);
  }

  async function create() {
    try {
      setBusy(true); setError('');
      const dueAt = new Date(`${dueDate}T09:00:00`).toISOString();
      await apiFetch('/api/aftercare', {
        method: 'POST',
        body: JSON.stringify({ jobId, title: title.trim(), note: note.trim(), dueAt }),
      }, () => tokenRef.current());
      setTitle('30-day workmanship check-in');
      setNote('');
      setDueDate(inputDate(30));
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function action(id: string, next: 'done' | 'dismiss' | 'reopen') {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/aftercare', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: next }),
      }, () => tokenRef.current());
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const active = items.filter((item) => item.status === 'pending' || item.status === 'sent');

  return <View style={styles.wrap}>
    <View style={styles.heading}>
      <View style={styles.flex}>
        <Text variant="headlineSmall" style={styles.title}>Aftercare</Text>
        <Text style={styles.muted}>Keep service, warranty and follow-up dates attached to the job so neither side has to remember them months later.</Text>
      </View>
      <Chip icon="calendar-heart">{active.length} upcoming</Chip>
    </View>

    {role === 'trader' ? <AppCard>
      <Text variant="titleMedium" style={styles.title}>Schedule a follow-up</Text>
      <View style={styles.actions}>
        <Button compact mode="outlined" onPress={() => preset(30, '30-day workmanship check-in')}>30 days</Button>
        <Button compact mode="outlined" onPress={() => preset(180, '6-month service / maintenance check')}>6 months</Button>
        <Button compact mode="outlined" onPress={() => preset(365, '12-month warranty check-in')}>12 months</Button>
      </View>
      <TextInput mode="outlined" label="Follow-up" value={title} onChangeText={setTitle} />
      <TextInput mode="outlined" label="Date YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} keyboardType="numbers-and-punctuation" />
      <TextInput mode="outlined" label="Note (optional)" value={note} onChangeText={setNote} multiline numberOfLines={3} placeholder="e.g. Check silicone, movement joints and any customer concerns." />
      <Button mode="contained" icon="calendar-plus" loading={busy} disabled={busy || title.trim().length < 2 || dueDate.length < 10} onPress={() => void create()}>Add aftercare reminder</Button>
    </AppCard> : null}

    {!items.length ? <EmptyState title="No aftercare scheduled" body={role === 'trader' ? 'Add a useful follow-up date when the job needs one.' : 'Any warranty, service or follow-up dates the tradesperson schedules will appear here.'} /> : items.map((item) => <AppCard key={item.id} style={item.status === 'done' || item.status === 'dismissed' ? styles.complete : undefined}>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
          <Text style={styles.muted}>{new Date(item.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          {item.note ? <Text style={styles.muted}>{item.note}</Text> : null}
          {item.sendCount > 0 ? <Text variant="bodySmall" style={styles.muted}>BuildPair reminder sent {item.sendCount} time{item.sendCount === 1 ? '' : 's'}.</Text> : null}
        </View>
        <Chip>{item.status}</Chip>
      </View>
      <View style={styles.actions}>
        {(item.status === 'pending' || item.status === 'sent') ? <Button compact mode="outlined" disabled={busy} onPress={() => void action(item.id, 'done')}>Mark dealt with</Button> : <Button compact mode="text" disabled={busy} onPress={() => void action(item.id, 'reopen')}>Reopen</Button>}
        {(item.status === 'pending' || item.status === 'sent') ? <Button compact mode="text" disabled={busy} onPress={() => void action(item.id, 'dismiss')}>Dismiss</Button> : null}
      </View>
    </AppCard>)}
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1, minWidth: 220, gap: 4 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  complete: { opacity: 0.7 },
});
