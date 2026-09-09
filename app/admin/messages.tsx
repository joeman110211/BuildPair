import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type MessageRow = {
  id: string; conversationId: string; senderId: string; body: string; readAt: string | null; createdAt: string;
  riskLevel: string; moderationReason: string | null; senderEmail: string | null; customerId: string; customerEmail: string | null;
  traderId: string; traderEmail: string | null; conversationStatus: string; conversationReason: string | null; jobId: string | null; jobTitle: string | null;
};

const risks = ['all', 'none', 'low', 'medium', 'high', 'severe'] as const;

function fmt(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function AdminMessagesScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState<(typeof risks)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ q: search.trim(), risk, limit: '500' });
      setRows(await apiFetch<MessageRow[]>(`/api/admin/messages?${params.toString()}`, {}, () => getTokenRef.current()));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [risk, search]);

  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  const flagged = useMemo(() => rows.filter((row) => ['medium', 'high', 'severe'].includes(row.riskLevel)).length, [rows]);
  if (loading) return <LoadingScreen label="Loading messages…" />;

  return <Screen title="Messages" subtitle="Admin-only conversation monitoring for abuse, safety and testing. This view shows message content, participants, job context and AI moderation flags.">
    <AppCard>
      <TextInput mode="outlined" label="Search message text, participant or job" value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
      <View style={styles.filters}>{risks.map((value) => <Chip key={value} selected={risk === value} onPress={() => setRisk(value)}>{value}</Chip>)}</View>
      <Text style={styles.muted}>{rows.length} messages shown · {flagged} medium-or-higher flags in this view</Text>
      <Button icon="refresh" onPress={() => void load()}>Refresh</Button>
    </AppCard>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}

    {rows.map((message) => {
      const flaggedMessage = ['medium', 'high', 'severe'].includes(message.riskLevel);
      return <AppCard key={message.id} style={flaggedMessage ? styles.flaggedCard : undefined}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="labelLarge" style={styles.title}>{message.senderEmail ?? message.senderId}</Text>
            <Text style={styles.muted}>Homeowner: {message.customerEmail ?? message.customerId}</Text>
            <Text style={styles.muted}>Trade: {message.traderEmail ?? message.traderId}</Text>
          </View>
          <View style={styles.chips}><Chip>{message.riskLevel}</Chip><Chip>Chat: {message.conversationStatus}</Chip>{message.readAt ? <Chip>Read</Chip> : <Chip>Unread</Chip>}</View>
        </View>
        <Text style={styles.body}>{message.body}</Text>
        {message.moderationReason ? <Text style={styles.risk}>AI moderation: {message.moderationReason}</Text> : null}
        {message.conversationReason ? <Text style={styles.risk}>Conversation moderation: {message.conversationReason}</Text> : null}
        <Text style={styles.muted}>{message.jobTitle ?? 'Conversation without job title'} · {fmt(message.createdAt)}</Text>
        <Text selectable style={styles.id}>message {message.id} · conversation {message.conversationId}</Text>
      </AppCard>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 },
  flex: { flex: 1, minWidth: 230 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22, fontSize: 16 },
  muted: { color: colors.muted, lineHeight: 20 },
  risk: { color: colors.warning, fontWeight: '800' },
  flaggedCard: { borderColor: '#E6B35F', backgroundColor: '#FFF9EC' },
  id: { color: colors.muted, fontFamily: 'monospace', fontSize: 11 },
});