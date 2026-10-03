import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { PhotoUploader } from '@/components/PhotoUploader';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { ProjectStory } from '@/types';

export default function TraderStoriesScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [items, setItems] = useState<ProjectStory[]>([]);
  const [title, setTitle] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [summary, setSummary] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try { setItems(await apiFetch<ProjectStory[]>('/api/stories', {}, () => getTokenRef.current())); setError(''); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/stories', { method: 'POST', body: JSON.stringify({ title, locationLabel: locationLabel || undefined, summary, beforePhotos, afterPhotos, durationDays: durationDays ? Number(durationDays) : undefined, completedAt: new Date().toISOString() }) }, () => getTokenRef.current());
      setTitle(''); setLocationLabel(''); setSummary(''); setDurationDays(''); setBeforePhotos([]); setAfterPhotos([]);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    try {
      await apiFetch('/api/stories', { method: 'DELETE', body: JSON.stringify({ id }) }, () => getTokenRef.current());
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (e) { setError(errorMessage(e)); }
  }

  if (loading) return <LoadingScreen label="Loading project stories…" />;
  return <Screen title="Project Stories" subtitle="Turn finished work into useful proof: what the job was, what changed and what the result looked like.">
    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Add a before & after story</Text>
      <TextInput mode="outlined" label="Project title" value={title} onChangeText={setTitle} placeholder="e.g. Full bathroom renovation" />
      <TextInput mode="outlined" label="Area (optional)" value={locationLabel} onChangeText={setLocationLabel} placeholder="e.g. Staines" />
      <TextInput mode="outlined" label="What you did" value={summary} onChangeText={setSummary} multiline numberOfLines={5} maxLength={4000} />
      <TextInput mode="outlined" label="Duration in days (optional)" value={durationDays} onChangeText={setDurationDays} keyboardType="number-pad" />
      <Text variant="titleMedium" style={styles.title}>Before photos</Text>
      <PhotoUploader kind="trader" photos={beforePhotos} onChange={setBeforePhotos} max={8} />
      <Text variant="titleMedium" style={styles.title}>After photos</Text>
      <PhotoUploader kind="trader" photos={afterPhotos} onChange={setAfterPhotos} max={8} />
      <Button mode="contained" icon="image-multiple-outline" loading={busy} disabled={busy || title.trim().length < 3 || summary.trim().length < 20 || (!beforePhotos.length && !afterPhotos.length)} onPress={() => void create()}>Publish project story</Button>
    </AppCard>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {!items.length ? <EmptyState title="No project stories yet" body="Your best completed jobs can become strong social proof here." /> : items.map((item) => <AppCard key={item.id}>
      <Text variant="titleLarge" style={styles.title}>{item.title}</Text>
      <Text style={styles.muted}>{[item.locationLabel, item.durationDays ? `${item.durationDays} days` : null].filter(Boolean).join(' · ')}</Text>
      <Text style={styles.body}>{item.summary}</Text>
      <View style={styles.photos}>{item.beforePhotos[0] ? <View style={styles.photoBlock}><Text variant="labelLarge">Before</Text><Image source={{ uri: item.beforePhotos[0] }} style={styles.photo} /></View> : null}{item.afterPhotos[0] ? <View style={styles.photoBlock}><Text variant="labelLarge">After</Text><Image source={{ uri: item.afterPhotos[0] }} style={styles.photo} /></View> : null}</View>
      <Button compact textColor={colors.danger} onPress={() => void remove(item.id)}>Remove story</Button>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  body: { color: colors.text, lineHeight: 22 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoBlock: { flexShrink: 1, maxWidth: '100%', minWidth: 0, flexGrow: 1, flexBasis: 220, gap: 5 },
  photo: { width: '100%', height: 180, borderRadius: 18, backgroundColor: colors.border },
});
