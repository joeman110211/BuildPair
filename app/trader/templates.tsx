import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, ApiError, errorMessage } from '@/lib/api';

type Template = { id: string; kind: 'quote' | 'message'; title: string; content: string; createdAt: string; updatedAt: string };

export default function TraderTemplatesScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [items, setItems] = useState<Template[]>([]);
  const [kind, setKind] = useState<'quote' | 'message'>('quote');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setItems(await apiFetch<Template[]>('/api/trader-templates', {}, () => getTokenRef.current()));
      setLocked(false); setError('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) setLocked(true);
      else setError(errorMessage(e));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/trader-templates', {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), kind, title, content }),
      }, () => getTokenRef.current());
      setEditingId(null); setTitle(''); setContent('');
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    try {
      await apiFetch('/api/trader-templates', { method: 'DELETE', body: JSON.stringify({ id }) }, () => getTokenRef.current());
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (e) { setError(errorMessage(e)); }
  }

  if (loading) return <LoadingScreen label="Loading business templates…" />;
  if (locked) return <Screen title="Quote & message templates" subtitle="Reusable business templates are included with BuildPair Pro.">
    <AppCard><Chip icon="star-circle-outline">BuildPair Pro</Chip><Text variant="headlineSmall" style={styles.title}>Stop retyping the same sensible stuff</Text><Text style={styles.muted}>Save common quote scope, exclusions, terms, follow-ups and customer messages so they can be reused without turning every job into copy-and-paste archaeology.</Text></AppCard>
  </Screen>;

  return <Screen title="Quote & message templates" subtitle="Save reusable wording for work you price regularly and messages you send repeatedly. Always check a template against the actual job before using it.">
    <AppCard>
      <SegmentedButtons value={kind} onValueChange={(value) => setKind(value as 'quote' | 'message')} buttons={[{ value: 'quote', label: 'Quote template' }, { value: 'message', label: 'Message template' }]} />
      <TextInput mode="outlined" label="Template name" value={title} onChangeText={setTitle} placeholder={kind === 'quote' ? 'Bathroom tiling scope' : 'Quote follow-up'} />
      <TextInput mode="outlined" label={kind === 'quote' ? 'Reusable scope / terms' : 'Reusable message'} value={content} onChangeText={setContent} multiline numberOfLines={7} maxLength={5000} />
      <View style={styles.actions}><Button mode="contained" loading={busy} disabled={busy || title.trim().length < 2 || content.trim().length < 5} onPress={() => void save()}>{editingId ? 'Update template' : 'Save template'}</Button>{editingId ? <Button mode="text" onPress={() => { setEditingId(null); setTitle(''); setContent(''); }}>Cancel</Button> : null}</View>
    </AppCard>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {!items.length ? <EmptyState title="No templates yet" body="Create a quote or customer-message template above." /> : items.map((item) => <AppCard key={item.id}>
      <View style={styles.row}><View style={styles.flex}><View style={styles.chips}><Chip compact icon={item.kind === 'quote' ? 'file-document-edit-outline' : 'message-text-outline'}>{item.kind === 'quote' ? 'Quote' : 'Message'}</Chip></View><Text variant="titleMedium" style={styles.title}>{item.title}</Text><Text numberOfLines={4} style={styles.muted}>{item.content}</Text></View><View style={styles.actions}><Button compact onPress={() => { setEditingId(item.id); setKind(item.kind); setTitle(item.title); setContent(item.content); }}>Edit</Button><Button compact textColor={colors.danger} onPress={() => void remove(item.id)}>Delete</Button></View></View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
