import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type ChatTurn = { role: 'user' | 'assistant'; content: string };
type AssistantResponse = { answer: string };
type AiRequestRow = {
  id: number;
  userId: string | null;
  userEmail: string | null;
  endpoint: string;
  requestText: string;
  responseText: string | null;
  status: string;
  model: string | null;
  providerCalled: boolean;
  latencyMs: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};
type AiAuditResponse = {
  requests: AiRequestRow[];
  usage24h: { requests24h: number; providerCalls24h: number; blocked24h: number; errors24h: number };
  globalDailyLimit: number;
  generatedAt: string;
};

const QUICK_PROMPTS = [
  'Explain BuildPair from a homeowner’s first visit through to a completed review.',
  'Explain the tradesperson journey from signup through quoting, getting paid and reviews.',
  'What is happening across BuildPair right now from the live data you can see?',
  'Explain every AI feature, what it sees and how usage is protected.',
] as const;

function fmt(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
}

function endpointLabel(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export default function AdminAssistant() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState<AiAuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const history = useMemo(() => turns.slice(-8), [turns]);

  const loadAudit = useCallback(async () => {
    try {
      const response = await apiFetch<AiAuditResponse>('/api/admin/ai-requests', {}, () => getTokenRef.current());
      setAudit(response);
      setAuditError('');
    } catch (e) {
      setAuditError(errorMessage(e));
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadAudit(), 0);
    return () => clearTimeout(timer);
  }, [loadAudit]);

  const send = async (value = message) => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    const nextUser: ChatTurn = { role: 'user', content: trimmed };
    setTurns((current) => [...current, nextUser]);
    setMessage('');
    setSending(true);
    setError('');

    try {
      const response = await apiFetch<AssistantResponse>('/api/admin/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed, history }),
      }, () => getTokenRef.current());
      setTurns((current) => [...current, { role: 'assistant', content: response.answer }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
      void loadAudit();
    }
  };

  return <Screen title="Admin Assistant" subtitle="Ask about the whole BuildPair product, current marketplace state, system behaviour or the admin console in plain English.">
    <AppCard style={styles.introCard}>
      <View style={styles.introHeader}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Whole-app BuildPair assistant</Text>
          <Text style={styles.body}>It knows the homeowner and tradesperson journeys, marketplace workflows, AI features, payments, subscriptions, messaging, safety controls and platform integrations. Each question also receives a current read-only snapshot of key BuildPair data.</Text>
        </View>
        <Chip>Admin-only</Chip>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Knowledge wide, permissions narrow</Text>
        <Text style={styles.noticeText}>The assistant can understand and explain the whole app and use live operational context, but it remains read-only. It cannot suspend users, move money, expose secrets or push code to production.</Text>
      </View>
      <View style={styles.shortcutRow}>
        <Link href="/admin/dashboard" asChild><Button mode="outlined">Overview</Button></Link>
        <Link href="/admin/system" asChild><Button mode="outlined">System health</Button></Link>
        <Link href="/admin/users" asChild><Button mode="outlined">Users</Button></Link>
      </View>
    </AppCard>

    <AppCard>
      <Text variant="titleMedium" style={styles.title}>Quick questions</Text>
      <View style={styles.quickGrid}>
        {QUICK_PROMPTS.map((prompt) => <Button key={prompt} mode="outlined" style={styles.quickButton} contentStyle={styles.quickButtonContent} onPress={() => void send(prompt)}>{prompt}</Button>)}
      </View>
    </AppCard>

    <AppCard style={styles.chatCard}>
      <View style={styles.chatHeader}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Conversation</Text>
          <Text style={styles.muted}>Answers use BuildPair’s product map, the recent conversation and a fresh read-only operational snapshot. If an exact record is outside that snapshot, it should tell you where to inspect it rather than inventing one.</Text>
        </View>
        {turns.length ? <Button compact mode="text" onPress={() => { setTurns([]); setError(''); }}>Clear</Button> : null}
      </View>

      <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent} nestedScrollEnabled>
        {!turns.length ? <View style={styles.emptyChat}>
          <Text style={styles.emptyTitle}>Ask it about BuildPair as a product, not merely the admin menu.</Text>
          <Text style={styles.muted}>For example: “How does a quote become a paid project?”, “What AI requests are failing?”, “How does trader onboarding work?” or “What should I improve in the homeowner journey?”</Text>
        </View> : turns.map((turn, index) => <View key={`${turn.role}-${index}`} style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          <Text style={styles.bubbleLabel}>{turn.role === 'user' ? 'You' : 'BuildPair Admin Assistant'}</Text>
          <Text selectable style={styles.bubbleText}>{turn.content}</Text>
        </View>)}
      </ScrollView>

      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      <TextInput
        mode="outlined"
        multiline
        value={message}
        onChangeText={setMessage}
        placeholder="Ask anything about BuildPair, its live state, an error or a change you want…"
        outlineStyle={styles.inputOutline}
        disabled={sending}
      />
      <View style={styles.sendRow}>
        <Text style={styles.mutedSmall}>Never paste API keys, passwords or private tokens here.</Text>
        <Button mode="contained" loading={sending} disabled={sending || !message.trim()} onPress={() => void send()}>Send</Button>
      </View>
    </AppCard>

    <AppCard style={styles.auditCard}>
      <View style={styles.auditHeader}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Latest 30 AI requests</Text>
          <Text style={styles.muted}>Admin-only audit of what people asked BuildPair AI and what BuildPair returned, including this Admin Assistant. Common secret patterns are redacted before storage.</Text>
        </View>
        <Button icon="refresh" loading={auditLoading} onPress={() => void loadAudit()}>Refresh</Button>
      </View>

      {audit ? <View style={styles.usageRow}>
        <Chip>{audit.usage24h.requests24h} AI actions / 24h</Chip>
        <Chip>{audit.usage24h.providerCalls24h} Gemini calls / 24h</Chip>
        <Chip>{audit.usage24h.blocked24h} blocked</Chip>
        <Chip>{audit.usage24h.errors24h} errors</Chip>
        <Chip>Global ceiling {audit.globalDailyLimit}</Chip>
      </View> : null}
      {auditError ? <HelperText type="error" visible>{auditError}</HelperText> : null}
      {!auditLoading && audit && !audit.requests.length ? <Text style={styles.muted}>No audited AI requests yet. New requests will appear here after this release is live.</Text> : null}

      {audit?.requests.length ? <ScrollView style={styles.auditList} contentContainerStyle={styles.auditListContent} nestedScrollEnabled>
        {audit.requests.map((item) => <View key={item.id} style={styles.auditItem}>
          <View style={styles.auditItemHeader}>
            <View style={styles.flex}>
              <Text variant="titleMedium" style={styles.title}>{endpointLabel(item.endpoint)}</Text>
              <Text style={styles.mutedSmall}>{item.userEmail ?? item.userId ?? 'Anonymous visitor'} · {fmt(item.createdAt)}</Text>
            </View>
            <View style={styles.chipRow}>
              <Chip>{item.status}</Chip>
              <Chip>{item.providerCalled ? 'Gemini used' : 'No paid call'}</Chip>
              {item.model ? <Chip>{item.model}</Chip> : null}
              {item.latencyMs != null ? <Chip>{item.latencyMs} ms</Chip> : null}
            </View>
          </View>
          <View style={styles.auditTextBox}>
            <Text style={styles.auditLabel}>REQUEST</Text>
            <Text selectable style={styles.auditText}>{item.requestText || 'No request text recorded.'}</Text>
          </View>
          <View style={styles.auditTextBox}>
            <Text style={styles.auditLabel}>ANSWER</Text>
            <Text selectable style={styles.auditText}>{item.responseText || 'No response text recorded.'}</Text>
          </View>
        </View>)}
      </ScrollView> : null}
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  introCard: { borderColor: '#D5E1EA' },
  introHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, minWidth: 220, gap: 5 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.charcoalSoft, lineHeight: 22 },
  muted: { color: colors.muted, lineHeight: 20 },
  mutedSmall: { color: colors.muted, fontSize: 11, lineHeight: 16, flex: 1, minWidth: 190 },
  notice: { padding: 13, borderRadius: 14, backgroundColor: '#FFF4EA', gap: 4 },
  noticeTitle: { color: colors.charcoal, fontWeight: '900' },
  noticeText: { color: colors.charcoalSoft, lineHeight: 20 },
  shortcutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickButton: { flexGrow: 1, flexBasis: 240, minWidth: 0, maxWidth: '100%' },
  quickButtonContent: { minHeight: 48 },
  chatCard: { gap: 12 },
  chatHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  transcript: { maxHeight: 520, minHeight: 180 },
  transcriptContent: { gap: 10, paddingVertical: 4 },
  emptyChat: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  emptyTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  bubble: { maxWidth: '94%', padding: 12, borderRadius: 16, gap: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#F2D7C3' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  bubbleLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  bubbleText: { color: colors.charcoal, lineHeight: 21 },
  inputOutline: { borderRadius: 14 },
  sendRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  auditCard: { gap: 12 },
  auditHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  usageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  auditList: { maxHeight: 1100 },
  auditListContent: { gap: 12, paddingVertical: 2 },
  auditItem: { gap: 9, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surfaceSoft },
  auditItemHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  auditTextBox: { gap: 4, padding: 10, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  auditLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  auditText: { color: colors.charcoal, fontSize: 12, lineHeight: 18 },
});
