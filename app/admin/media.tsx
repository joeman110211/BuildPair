import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type MediaRow = { kind: string; sourceId: string; label: string | null; ownerId: string; ownerEmail: string | null; url: string; createdAt: string };

function fmt(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminMediaScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setRows(await apiFetch<MediaRow[]>('/api/admin/media?limit=1000', {}, () => getTokenRef.current()));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => !q || [row.kind, row.label, row.ownerEmail, row.ownerId, row.url].some((value) => value?.toLowerCase().includes(q)));
  }, [rows, search]);

  if (loading) return <LoadingScreen label="Loading media inventory…" />;

  return <Screen title="Photos & media" subtitle="Visual inventory of photos referenced by jobs, trade profiles, showcase branding and project stories. Use this to spot inappropriate or broken uploads during testing.">
    <AppCard>
      <TextInput mode="outlined" label="Search owner, source or media type" value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
      <Text style={styles.muted}>{visible.length} shown · {rows.length} media references recorded</Text>
      <Button icon="refresh" onPress={() => void load()}>Refresh</Button>
    </AppCard>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}

    <View style={styles.grid}>
      {visible.map((item, index) => <AppCard key={`${item.kind}-${item.sourceId}-${item.url}-${index}`} style={styles.card}>
        <Image source={{ uri: item.url }} style={styles.image} resizeMode="cover" />
        <View style={styles.chips}><Chip>{item.kind.replaceAll('_', ' ')}</Chip></View>
        <Text variant="labelLarge" style={styles.title}>{item.label || 'Untitled media'}</Text>
        <Text style={styles.muted}>{item.ownerEmail ?? item.ownerId}</Text>
        <Text style={styles.muted}>{fmt(item.createdAt)}</Text>
        <Button compact mode="outlined" icon="open-in-new" onPress={() => void Linking.openURL(item.url)}>Open original</Button>
      </AppCard>)}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  card: { flexShrink: 1, minWidth: 0, width: 280, maxWidth: '100%', flexGrow: 1, flexBasis: 260 },
  image: { width: '100%', height: 180, borderRadius: 16, backgroundColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted },
});