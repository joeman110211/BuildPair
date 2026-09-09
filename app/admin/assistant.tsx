import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type ChatTurn = { role: 'user' | 'assistant'; content: string };
type AssistantResponse = { answer: string };

const QUICK_PROMPTS = [
  'Explain the admin area and where I should start.',
  'What should I check if System Health says Needs attention?',
  'Where do I manage a user account or subscription?',
  'Turn my next product idea into a safe implementation brief.',
] as const;

export default function AdminAssistant() {
  const { getToken } = useAuth();
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const history = useMemo(() => turns.slice(-8), [turns]);

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
      }, getToken);
      setTurns((current) => [...current, { role: 'assistant', content: response.answer }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return <Screen title="Admin Assistant" subtitle="Ask BuildPair admin questions in plain English instead of memorising where every switch, report and status page lives.">
    <AppCard style={styles.introCard}>
      <View style={styles.introHeader}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>What this assistant can do</Text>
          <Text style={styles.body}>Explain the admin console, help interpret errors, point you to the right page and turn a product idea into a clear implementation brief.</Text>
        </View>
        <Chip>Admin-only</Chip>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Changes are deliberately gated</Text>
        <Text style={styles.noticeText}>The assistant is read-only. It will not silently suspend users, move money, expose secrets or push code straight to production. Code changes should go through a GitHub branch, automated checks and a reviewed deployment. That is mildly less exciting than a giant red “break everything” button, but considerably better for the business.</Text>
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
          <Text style={styles.muted}>It only knows what is in the admin guide plus what you tell it in this chat. It does not invent live account or payment data.</Text>
        </View>
        {turns.length ? <Button compact mode="text" onPress={() => { setTurns([]); setError(''); }}>Clear</Button> : null}
      </View>

      <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent} nestedScrollEnabled>
        {!turns.length ? <View style={styles.emptyChat}>
          <Text style={styles.emptyTitle}>Try asking it like you would ask me.</Text>
          <Text style={styles.muted}>For example: “Why is Resend showing 401?”, “Where do I see flagged messages?” or “I want to add a new homepage feature. What needs changing?”</Text>
        </View> : turns.map((turn, index) => <View key={`${turn.role}-${index}`} style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          <Text style={styles.bubbleLabel}>{turn.role === 'user' ? 'You' : 'BuildPair Admin Assistant'}</Text>
          <Text style={styles.bubbleText}>{turn.content}</Text>
        </View>)}
      </ScrollView>

      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      <TextInput
        mode="outlined"
        multiline
        value={message}
        onChangeText={setMessage}
        placeholder="Ask about the admin area, an error, or a change you want to make…"
        outlineStyle={styles.inputOutline}
        disabled={sending}
      />
      <View style={styles.sendRow}>
        <Text style={styles.mutedSmall}>Never paste API keys, passwords or private tokens here.</Text>
        <Button mode="contained" loading={sending} disabled={sending || !message.trim()} onPress={() => void send()}>Send</Button>
      </View>
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
});
