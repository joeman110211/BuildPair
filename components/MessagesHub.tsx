import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Icon, Text } from 'react-native-paper';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Conversation = {
  id: string;
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string;
  otherUserId: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

export function MessagesHub({ basePath }: { basePath: '/customer' | '/trader' }) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try { setRows(await apiFetch<Conversation[]>('/api/conversations', {}, () => getTokenRef.current())); setError(''); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); const refresh = setInterval(() => void load(), 10000); return () => clearInterval(refresh); }, [load]);

  if (loading) return <LoadingScreen label="Loading messages…" />;
  return <Screen title="Messages" subtitle="Keep every conversation attached to the job it belongs to.">
    {error ? <EmptyState title="Couldn’t load messages" body={error} action={<Button mode="outlined" onPress={load}>Try again</Button>} /> : null}
    {!error && !rows.length ? <EmptyState title="No conversations yet" body="A conversation opens after a quote or direct job request, keeping job discussions in the right place." /> : rows.map((row) => <Pressable
      key={row.id}
      accessibilityRole="button"
      accessibilityLabel={`${row.jobTitle}${row.unreadCount ? `, ${row.unreadCount} unread message${row.unreadCount === 1 ? '' : 's'}` : ''}`}
      onPress={() => router.push(`${basePath}/messages/${row.id}` as Href)}
      style={({ pressed }) => [styles.conversation, row.unreadCount > 0 && styles.unread, pressed && styles.pressed]}
    >
      <View style={styles.avatar}><Icon source="briefcase-outline" size={24} color={colors.primary} /></View>
      <View style={styles.flex}>
        <View style={styles.row}>
          <View style={styles.titleRow}><Text variant="titleMedium" style={styles.title}>{row.jobTitle}</Text>{row.unreadCount > 0 ? <Badge size={20}>{row.unreadCount > 99 ? '99+' : row.unreadCount}</Badge> : null}</View>
          <Text style={styles.time}>{formatConversationTime(row.lastMessageAt)}</Text>
        </View>
        <Text style={[styles.muted, row.unreadCount > 0 && styles.unreadText]} numberOfLines={2}>{row.lastMessage ?? 'Conversation ready. Send the first message.'}</Text>
      </View>
      <Icon source="chevron-right" size={24} color={colors.muted} />
    </Pressable>)}
  </Screen>;
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  conversation: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, ...shadows.subtle },
  unread: { borderWidth: 1.5, borderColor: '#F0C9AA', backgroundColor: '#FFFCF9' },
  pressed: { backgroundColor: colors.surfaceSoft, transform: [{ scale: 0.995 }] },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: spacing.xxs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'center' },
  titleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontWeight: '900', color: colors.text, flexShrink: 1 },
  time: { color: colors.muted, fontSize: 12 },
  muted: { color: colors.muted, lineHeight: 20 },
  unreadText: { color: colors.text, fontWeight: '700' },
});
