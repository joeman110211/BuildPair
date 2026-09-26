import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { PhotoUploader } from '@/components/PhotoUploader';
import { EmptyState } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney, poundsToPence } from '@/lib/money';

type EntryType = 'task' | 'note' | 'progress' | 'material' | 'expense' | 'snag' | 'document' | 'handover' | 'warranty';
type Entry = {
  id: string;
  entryType: EntryType;
  visibility: 'shared' | 'trader_only';
  title: string;
  body: string;
  amount: number | null;
  mediaUrl: string | null;
  status: 'open' | 'done' | 'shared' | 'approved' | 'archived';
  dueAt: string | null;
  createdAt: string;
};

const TRADER_TYPES: { value: EntryType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'progress', label: 'Progress' },
  { value: 'material', label: 'Material' },
  { value: 'expense', label: 'Expense' },
  { value: 'note', label: 'Note' },
  { value: 'snag', label: 'Snag' },
  { value: 'document', label: 'Document note' },
  { value: 'handover', label: 'Handover' },
  { value: 'warranty', label: 'Warranty' },
];

export function ProjectWorkspace({ jobId, role }: { jobId: string; role: 'trader' | 'customer' }) {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  const [items, setItems] = useState<Entry[]>([]);
  const [entryType, setEntryType] = useState<EntryType>(role === 'trader' ? 'task' : 'snag');
  const [visibility, setVisibility] = useState<'shared' | 'trader_only'>('shared');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setItems(await apiFetch<Entry[]>(`/api/jobs/workspace?jobId=${encodeURIComponent(jobId)}`, {}, () => tokenRef.current()));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [jobId]);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    try {
      setBusy(true); setError('');
      const dueAt = dueDate.trim() ? new Date(`${dueDate.trim()}T18:00:00`).toISOString() : null;
      await apiFetch('/api/jobs/workspace', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          entryType,
          visibility: role === 'customer' ? 'shared' : visibility,
          title: title.trim(),
          body: body.trim(),
          amount: amount.trim() ? poundsToPence(amount) : null,
          mediaUrl: media[0] || null,
          dueAt,
        }),
      }, () => tokenRef.current());
      setTitle(''); setBody(''); setAmount(''); setDueDate(''); setMedia([]);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function update(id: string, action: 'done' | 'reopen' | 'approve' | 'archive') {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/jobs/workspace', { method: 'PATCH', body: JSON.stringify({ id, action }) }, () => tokenRef.current());
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  const typeOptions = role === 'trader' ? TRADER_TYPES : [{ value: 'snag' as const, label: 'Snag / issue' }, { value: 'note' as const, label: 'Project note' }];
  const documentTypes = new Set<EntryType>(['document', 'handover', 'warranty']);
  const documentItems = items.filter((item) => documentTypes.has(item.entryType));
  const workItems = items.filter((item) => !documentTypes.has(item.entryType));

  function entryCard(item: Entry) {
    return <AppCard key={item.id} style={item.status === 'open' ? undefined : styles.doneCard}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <View style={styles.typeWrap}><Chip compact>{item.entryType.replaceAll('_',' ')}</Chip>{item.visibility === 'trader_only' ? <Chip compact icon="lock-outline">Private</Chip> : null}<Chip compact>{item.status}</Chip></View>
          <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
          {item.body ? <Text style={styles.muted}>{item.body}</Text> : null}
          {item.mediaUrl ? <Image source={{ uri: item.mediaUrl }} style={styles.evidenceImage} resizeMode="cover" /> : null}
          {item.amount != null ? <Text style={styles.amount}>{formatMoney(item.amount)}</Text> : null}
          {item.dueAt ? <Text style={styles.muted}>Due {new Date(item.dueAt).toLocaleDateString('en-GB')}</Text> : null}
        </View>
        <View style={styles.actions}>{item.status === 'open' ? <Button compact mode="outlined" disabled={busy} onPress={() => void update(item.id, role === 'customer' && item.entryType === 'snag' ? 'approve' : 'done')}>{role === 'customer' && item.entryType === 'snag' ? 'Resolved' : 'Done'}</Button> : <Button compact disabled={busy} onPress={() => void update(item.id, 'reopen')}>Reopen</Button>}</View>
      </View>
    </AppCard>;
  }

  return <View style={styles.wrap}>
    <View style={styles.headingRow}><View style={styles.flex}><Text variant="headlineSmall" style={styles.title}>Project workspace</Text><Text style={styles.muted}>Keep the practical middle of the job here: tasks, progress, materials, expenses, snagging, handover and warranty notes. Contract price changes still use Variations.</Text></View><Chip icon="clipboard-check-outline">{items.filter((item) => item.status === 'open').length} open</Chip></View>
    <AppCard>
      <Text variant="titleMedium" style={styles.title}>{role === 'trader' ? 'Add to the job record' : 'Add a note or snagging item'}</Text>
      <View style={styles.typeWrap}>{typeOptions.map((option) => <Chip key={option.value} selected={entryType === option.value} showSelectedCheck onPress={() => setEntryType(option.value)}>{option.label}</Chip>)}</View>
      {role === 'trader' ? <SegmentedButtons value={visibility} onValueChange={(value) => setVisibility(value as 'shared' | 'trader_only')} buttons={[{ value: 'shared', label: 'Share with customer' }, { value: 'trader_only', label: 'Private trade note' }]} /> : null}
      <TextInput mode="outlined" label="Title" value={title} onChangeText={setTitle} placeholder={entryType === 'snag' ? 'e.g. Silicone needs touching up' : 'e.g. Order shower screen'} />
      <TextInput mode="outlined" label="Details" value={body} onChangeText={setBody} multiline numberOfLines={3} />
      {role === 'trader' && ['material','expense'].includes(entryType) ? <TextInput mode="outlined" label="Amount (£, optional)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /> : null}
      {['task','snag','material','handover'].includes(entryType) ? <TextInput mode="outlined" label="Due date YYYY-MM-DD (optional)" value={dueDate} onChangeText={setDueDate} keyboardType="numbers-and-punctuation" /> : null}
      <View style={styles.evidence}><Text variant="labelLarge" style={styles.title}>Photo / document image (optional)</Text><Text style={styles.muted}>Attach a moderated before/during/after photo, receipt image, certificate image or handover evidence to this project entry.</Text><PhotoUploader kind={role === 'trader' ? 'trader' : 'job'} photos={media} onChange={setMedia} max={1} /></View>
      <Button mode="contained" disabled={busy || title.trim().length < 2} loading={busy} onPress={() => void create()}>Add to project</Button>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </AppCard>

    {!items.length ? <EmptyState title="Workspace is clear" body="Project tasks, progress updates, snagging and handover information will stay together here." /> : <>
      <View style={styles.libraryHeader}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Documents & handover</Text>
          <Text style={styles.muted}>Certificates, receipt images, warranty evidence and handover notes stay together instead of disappearing into the general project timeline.</Text>
        </View>
        <Chip icon="folder-text-outline">{documentItems.length}</Chip>
      </View>
      {documentItems.length ? documentItems.map(entryCard) : <AppCard elevated={false}><Text style={styles.muted}>No document, handover or warranty records have been added yet.</Text></AppCard>}

      <View style={styles.libraryHeader}>
        <View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Working record</Text><Text style={styles.muted}>Tasks, progress, materials, expenses, notes and snagging.</Text></View>
        <Chip icon="hammer-wrench">{workItems.length}</Chip>
      </View>
      {workItems.length ? workItems.map(entryCard) : <AppCard elevated={false}><Text style={styles.muted}>No working-record items yet.</Text></AppCard>}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 220, gap: 5 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amount: { color: colors.primary, fontWeight: '900' },
  evidence: { gap: 6 },
  evidenceImage: { width: '100%', maxWidth: 520, height: 260, borderRadius: 14, backgroundColor: colors.border },
  libraryHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginTop: 6 },
  doneCard: { opacity: 0.72 },
});
