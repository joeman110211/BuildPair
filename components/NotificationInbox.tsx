import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { BuildPairNotification } from '@/types';

export function NotificationInbox() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [items, setItems] = useState<BuildPairNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      setItems(await apiFetch<BuildPairNotification[]>('/api/notifications', {}, () => getTokenRef.current()));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function markRead(item: BuildPairNotification) {
    if (!item.readAt) {
      await apiFetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id: item.id, action: 'read' }) }, () => getTokenRef.current());
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value));
    }
    if (item.href) router.push(item.href as Href);
  }

  async function markAllRead() {
    try {
      await apiFetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ action: 'read_all' }) }, () => getTokenRef.current());
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    } catch (e) { setError(errorMessage(e)); }
  }

  if (loading) return <LoadingScreen label="Loading notifications…" />;
  const unread = items.filter((item) => !item.readAt).length;
  return <Screen title="Notifications" subtitle="Quotes, messages, job changes, verification reminders and job matches in one place.">
    <View style={styles.top}><Chip icon="bell-outline">{unread} unread</Chip>{unread ? <Button onPress={() => void markAllRead()}>Mark all read</Button> : null}</View>
    {error ? <EmptyState title="Notifications unavailable" body={error} action={<Button onPress={() => void load()}>Try again</Button>} /> : null}
    {!error && !items.length ? <EmptyState title="Nothing new" body="Important BuildPair activity will appear here." /> : items.map((item) => <AppCard key={item.id} style={!item.readAt ? styles.unread : undefined}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text><Text variant="bodySmall" style={styles.muted}>{new Date(item.createdAt).toLocaleString('en-GB')}</Text></View>{!item.readAt ? <Chip compact>New</Chip> : null}</View>
      {item.href ? <Button mode="text" icon="arrow-right" onPress={() => void markRead(item)}>Open</Button> : !item.readAt ? <Button mode="text" onPress={() => void markRead(item)}>Mark read</Button> : null}
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1, gap: 5 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted },
  unread: { borderWidth: 2, borderColor: colors.primarySoft, backgroundColor: colors.surfaceRaised },
});
