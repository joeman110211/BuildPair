import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type ActivityRow = { id: string; kind: string; title: string; detail: string; actorEmail: string | null; status: string | null; amount: number | null; createdAt: string };

function fmt(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
}
function money(value: number | null) {
  return value == null ? null : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value / 100);
}

export default function AdminActivityScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setRows(await apiFetch<ActivityRow[]>('/api/admin/activity?limit=1000', {}, () => getTokenRef.current()));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const kinds = useMemo(() => ['all', ...Array.from(new Set(rows.map((row) => row.kind))).sort()], [rows]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => (kind === 'all' || row.kind === kind) && (!q || [row.title, row.detail, row.actorEmail, row.status, row.kind].some((value) => value?.toLowerCase().includes(q))));
  }, [kind, rows, search]);

  if (loading) return <LoadingScreen label="Loading marketplace activity…" />;

  return <Screen title="Marketplace activity" subtitle="Recent quotes, reviews, invoices, payments, variations, job events, notifications, saved searches, saved trades and administrator actions.">
    <AppCard>
      <TextInput mode="outlined" label="Search activity" value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
      <View style={styles.filters}>{kinds.map((value) => <Chip key={value} selected={kind === value} onPress={() => setKind(value)}>{value.replaceAll('_', ' ')}</Chip>)}</View>
      <Text style={styles.muted}>{visible.length} shown · {rows.length} recent records loaded</Text>
      <Button icon="refresh" onPress={() => void load()}>Refresh</Button>
    </AppCard>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}

    {visible.map((item, index) => <AppCard key={`${item.kind}-${item.id}-${index}`}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
          <Text style={styles.muted}>{item.actorEmail ?? 'System / unknown user'} · {fmt(item.createdAt)}</Text>
        </View>
        <View style={styles.chips}><Chip>{item.kind.replaceAll('_', ' ')}</Chip>{item.status ? <Chip>{item.status.replaceAll('_', ' ')}</Chip> : null}{money(item.amount) ? <Chip>{money(item.amount)}</Chip> : null}</View>
      </View>
      {item.detail ? <Text>{item.detail}</Text> : null}
      <Text selectable style={styles.id}>{item.id}</Text>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 },
  flex: { flex: 1, minWidth: 0, flexBasis: 230, flexShrink: 1, maxWidth: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  id: { color: colors.muted, fontFamily: 'monospace', fontSize: 11 },
});