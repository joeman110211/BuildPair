import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type AdminActionProposal = {
  action: Record<string, unknown>;
  title: string;
  summary: string;
  impact: string[];
  risk: 'medium' | 'high';
  confirmLabel: string;
};
type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
  actionProposal?: AdminActionProposal | null;
  actionStatus?: 'pending' | 'completed' | 'cancelled' | 'failed';
  actionMessage?: string;
};
type AssistantResponse = { answer: string; actionProposal: AdminActionProposal | null };
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
  'What is happening across BuildPair right now from the live data you can see?',
  'Explain what admin actions you can prepare and which ones need confirmation.',
  'Explain every AI feature, what it sees and how usage is protected.',
  'What should I investigate first if users are reporting account problems?',
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
  const [executingIndex, setExecutingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState<AiAuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const history = useMemo(() => turns.slice(-8).map(({ role, content }) => ({ role, content })), [turns]);

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
      setTurns((current) => [...current, {
        role: 'assistant',
        content: response.answer,
        actionProposal: response.actionProposal,
        actionStatus: response.actionProposal ? 'pending' : undefined,
      }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
      void loadAudit();
    }
  };

  const cancelAction = (index: number) => {
    setTurns((current) => current.map((turn, turnIndex) => turnIndex === index
      ? { ...turn, actionStatus: 'cancelled', actionMessage: 'Cancelled. No change was made.' }
      : turn));
  };

  const executeAction = async (index: number, proposal: AdminActionProposal) => {
    if (executingIndex != null) return;
    setExecutingIndex(index);
    setTurns((current) => current.map((turn, turnIndex) => turnIndex === index
      ? { ...turn, actionMessage: '' }
      : turn));

    try {
      await apiFetch('/api/admin/assistant-action', {
        method: 'POST',
        body: JSON.stringify({ confirmed: true, action: proposal.action }),
      }, () => getTokenRef.current());
      setTurns((current) => current.map((turn, turnIndex) => turnIndex === index
        ? { ...turn, actionStatus: 'completed', actionMessage: 'Confirmed action completed successfully.' }
        : turn));
      void loadAudit();
    } catch (e) {
      const messageText = errorMessage(e);
      setTurns((current) => current.map((turn, turnIndex) => turnIndex === index
        ? { ...turn, actionStatus: 'failed', actionMessage: messageText }
        : turn));
    } finally {
      setExecutingIndex(null);
    }
  };

  return <Screen title="Admin Assistant" subtitle="Private BuildPair control assistant for the protected admin area only. It can investigate freely and prepare supported admin changes for your explicit approval.">
    <AppCard style={styles.introCard}>
      <View style={styles.introHeader}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Admin-only BuildPair control assistant</Text>
          <Text style={styles.body}>It understands the homeowner and tradesperson journeys, marketplace workflows, AI features, payments, subscriptions, messaging, moderation, system integrations and live operational context.</Text>
        </View>
        <Chip>Admin-only</Chip>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Reads freely. Writes only after you confirm.</Text>
        <Text style={styles.noticeText}>The assistant can investigate and prepare supported admin actions, but the chat request itself cannot execute them. Any state-changing action appears below as a separate confirmation card explaining what will happen before the protected admin backend is called. These elevated permissions exist only in the Admin Assistant and still require administrator authentication.</Text>
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
          <Text style={styles.muted}>Ask it to investigate BuildPair or prepare an admin change. Supported write actions currently include account suspension/restoration, complimentary membership changes and moderation/account/conversation actions. Anything state-changing still stops for confirmation first.</Text>
        </View>
        {turns.length ? <Button compact mode="text" onPress={() => { setTurns([]); setError(''); }}>Clear</Button> : null}
      </View>

      <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent} nestedScrollEnabled>
        {!turns.length ? <View style={styles.emptyChat}>
          <Text style={styles.emptyTitle}>Ask it to investigate, explain or prepare an admin action.</Text>
          <Text style={styles.muted}>For example: “What AI requests are failing?”, “Explain this account’s problem” or “Suspend this account for spam.” It must explain the proposed change and wait for your confirmation before anything is altered.</Text>
        </View> : turns.map((turn, index) => <View key={`${turn.role}-${index}`} style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          <Text style={styles.bubbleLabel}>{turn.role === 'user' ? 'You' : 'BuildPair Admin Assistant'}</Text>
          <Text selectable style={styles.bubbleText}>{turn.content}</Text>

          {turn.role === 'assistant' && turn.actionProposal ? <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={styles.flex}>
                <Text style={styles.actionTitle}>{turn.actionProposal.title}</Text>
                <Text style={styles.actionSummary}>{turn.actionProposal.summary}</Text>
              </View>
              <Chip>{turn.actionProposal.risk === 'high' ? 'High impact' : 'Confirmation required'}</Chip>
            </View>
            <View style={styles.actionImpact}>
              {turn.actionProposal.impact.map((item) => <Text key={item} style={styles.actionImpactText}>• {item}</Text>)}
            </View>
            {turn.actionStatus === 'pending' ? <View style={styles.actionButtons}>
              <Button mode="outlined" disabled={executingIndex === index} onPress={() => cancelAction(index)}>Cancel</Button>
              <Button mode="contained" loading={executingIndex === index} disabled={executingIndex != null && executingIndex !== index} onPress={() => void executeAction(index, turn.actionProposal!)}>{turn.actionProposal.confirmLabel}</Button>
            </View> : null}
            {turn.actionMessage ? <Text style={turn.actionStatus === 'failed' ? styles.actionError : styles.actionResult}>{turn.actionMessage}</Text> : null}
          </View> : null}
        </View>)}
      </ScrollView>

      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      <TextInput
        mode="outlined"
        multiline
        value={message}
        onChangeText={setMessage}
        placeholder="Ask about BuildPair or tell the Admin Assistant what you want changed…"
        outlineStyle={styles.inputOutline}
        disabled={sending}
      />
      <View style={styles.sendRow}>
        <Text style={styles.mutedSmall}>Raw API keys, passwords and private tokens remain deliberately hidden even from the assistant UI.</Text>
        <Button mode="contained" loading={sending} disabled={sending || !message.trim()} onPress={() => void send()}>Send</Button>
      </View>
    </AppCard>

    <AppCard style={styles.auditCard}>
      <View style={styles.auditHeader}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Latest 30 AI requests</Text>
          <Text style={styles.muted}>Admin-only audit of what people asked BuildPair AI and what BuildPair returned. Confirmed Admin Assistant actions are also recorded here as separate admin-assistant-action entries.</Text>
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
  transcript: { maxHeight: 620, minHeight: 180 },
  transcriptContent: { gap: 10, paddingVertical: 4 },
  emptyChat: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  emptyTitle: { color: colors.charcoal, fontWeight: '900', textAlign: 'center' },
  bubble: { maxWidth: '94%', padding: 12, borderRadius: 16, gap: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#F2D7C3' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  bubbleLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  bubbleText: { color: colors.charcoal, lineHeight: 21 },
  actionCard: { gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E6B98D', backgroundColor: '#FFF9F3' },
  actionHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' },
  actionTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 16 },
  actionSummary: { color: colors.charcoalSoft, lineHeight: 20 },
  actionImpact: { gap: 4 },
  actionImpactText: { color: colors.charcoalSoft, lineHeight: 19 },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  actionResult: { color: colors.charcoal, fontWeight: '800' },
  actionError: { color: colors.danger, fontWeight: '800' },
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
