import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { FormSelect } from '@/components/FormSelect';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { SavedJobSearch, TraderProfile } from '@/types';

export default function SavedSearchesScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [items, setItems] = useState<SavedJobSearch[]>([]);
  const [profile, setProfile] = useState<TraderProfile>();
  const [name, setName] = useState('My local jobs');
  const [category, setCategory] = useState<(typeof TRADE_CATEGORIES)[number] | undefined>();
  const [keywords, setKeywords] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radiusMiles, setRadiusMiles] = useState('15');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      const token = () => getTokenRef.current();
      const [searches, ownProfile] = await Promise.all([
        apiFetch<SavedJobSearch[]>('/api/saved-searches', {}, token),
        apiFetch<TraderProfile>('/api/me/profile', {}, token),
      ]);
      setItems(searches); setProfile(ownProfile); setError('');
    }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/saved-searches', { method: 'POST', body: JSON.stringify({ name, category, keywords: keywords || undefined, postcode: postcode || undefined, radiusMiles: Number(radiusMiles) || 15, emergencyOnly }) }, () => getTokenRef.current());
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function toggle(item: SavedJobSearch) {
    try {
      await apiFetch('/api/saved-searches', { method: 'PATCH', body: JSON.stringify({ id: item.id, enabled: !item.enabled }) }, () => getTokenRef.current());
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, enabled: !value.enabled } : value));
    } catch (e) { setError(errorMessage(e)); }
  }

  async function remove(id: string) {
    try {
      await apiFetch('/api/saved-searches', { method: 'DELETE', body: JSON.stringify({ id }) }, () => getTokenRef.current());
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (e) { setError(errorMessage(e)); }
  }

  if (loading) return <LoadingScreen label="Loading saved searches…" />;
  const limit = profile?.subscriptionTier === 'featured' ? null : profile?.subscriptionTier === 'basic' ? 5 : profile?.subscriptionTier === 'core' ? 1 : 0;
  const canCreate = limit === null || items.length < limit;
  return <Screen title="Saved Job Searches" subtitle="Save the work you want and BuildPair can surface matching opportunities instead of making you repeatedly hunt through the board.">
    <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Create an alert</Text><Text style={styles.muted}>{limit === null ? 'Pro includes unlimited saved job searches.' : limit ? `Your plan includes ${limit} saved job search${limit === 1 ? '' : 'es'}.` : 'Saved job searches start with BuildPair Core.'}</Text></View><Chip>{profile?.subscriptionTier === 'featured' ? 'Pro' : profile?.subscriptionTier === 'basic' ? 'Plus' : profile?.subscriptionTier === 'core' ? 'Core' : 'Starter'}</Chip></View>
      <TextInput mode="outlined" label="Search name" value={name} onChangeText={setName} />
      <FormSelect label="Trade category" value={category} options={TRADE_CATEGORIES} onChange={setCategory} />
      <TextInput mode="outlined" label="Keyword (optional)" value={keywords} onChangeText={setKeywords} placeholder="e.g. bathroom" />
      <TextInput mode="outlined" label="Postcode / area (optional)" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" />
      <TextInput mode="outlined" label="Radius miles" value={radiusMiles} onChangeText={setRadiusMiles} keyboardType="number-pad" />
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Emergency jobs only</Text><Text style={styles.muted}>Use this for a dedicated urgent-work alert.</Text></View><Switch value={emergencyOnly} onValueChange={setEmergencyOnly} /></View>
      <Button mode="contained" icon="bell-plus-outline" loading={busy} disabled={busy || !canCreate || name.trim().length < 2 || !category} onPress={() => void create()}>Save job search</Button>
    </AppCard>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {!items.length ? <EmptyState title="No saved searches" body="Create one above and matching jobs will start appearing as alerts." /> : items.map((item) => <AppCard key={item.id}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{item.name}</Text><Text style={styles.muted}>{item.category || 'Any trade'} · {item.radiusMiles} miles{item.keywords ? ` · “${item.keywords}”` : ''}</Text><View style={styles.chips}>{item.emergencyOnly ? <Chip compact icon="alert">Emergency only</Chip> : null}<Chip compact>{item.enabled ? 'Alerts on' : 'Paused'}</Chip></View></View><Switch value={item.enabled} onValueChange={() => void toggle(item)} /></View>
      <Button compact textColor={colors.danger} onPress={() => void remove(item.id)}>Delete search</Button>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
