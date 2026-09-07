import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type PresenceRow = {
  id: string;
  email: string | null;
  role: 'customer' | 'trader' | null;
  customerEnabled: boolean;
  traderEnabled: boolean;
  isSuspended: boolean;
  businessName: string | null;
  lastSeenAt: string;
  lastPath: string | null;
  platform: string | null;
  onlineNow: boolean;
};

function fmt(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function PresenceScreen() {
  const { getToken } = useAuth();
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [search, setSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setRows(await apiFetch<PresenceRow[]>('/api/admin/presence', {}, getToken));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    const interval = setInterval(() => void load(), 30_000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => (!onlineOnly || row.onlineNow) && (!q || [row.email, row.businessName, row.id, row.lastPath].some((value) => value?.toLowerCase().includes(q))));
  }, [onlineOnly, rows, search]);

  if (loading) return <LoadingScreen label="Loading live users…" />;
  const onlineCount = rows.filter((row) => row.onlineNow).length;

  return <Screen title="Live users" subtitle="A user is shown online when BuildPair has received a signed-in heartbeat within the last two minutes. Route tracking records the current BuildPair screen, not keystrokes or device contents.">
    <AppCard>
      <View style={styles.toolbar}>
        <TextInput style={styles.search} mode="outlined" label="Search user, business or route" value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
        <Chip selected={onlineOnly} onPress={() => setOnlineOnly((value) => !value)}>{onlineCount} online now</Chip>
        <Button icon="refresh" onPress={() => void load()}>Refresh</Button>
      </View>
      <Text style={styles.muted}>{visible.length} shown · {rows.length} users have sent presence data</Text>
    </AppCard>

    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {visible.map((row) => <AppCard key={row.id}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleMedium" style={styles.title}>{row.businessName || row.email || row.id}</Text>
          <Text style={styles.muted}>{row.email ?? row.id}</Text>
          <Text>Last seen: {fmt(row.lastSeenAt)}</Text>
          <Text>Current/last route: {row.lastPath || 'Not recorded'}</Text>
          <Text>Platform: {row.platform || 'unknown'}</Text>
        </View>
        <View style={styles.chips}>
          <Chip icon={row.onlineNow ? 'access-point' : 'clock-outline'}>{row.onlineNow ? 'Online' : 'Offline'}</Chip>
          {row.customerEnabled ? <Chip>Homeowner</Chip> : null}
          {row.traderEnabled ? <Chip>Trade</Chip> : null}
          {row.isSuspended ? <Chip>Suspended</Chip> : null}
        </View>
      </View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  search: { flex: 1, minWidth: 240 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  flex: { flex: 1, minWidth: 230, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted },
});
