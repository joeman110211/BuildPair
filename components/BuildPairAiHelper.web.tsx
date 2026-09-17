import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Portal, Text, TextInput } from 'react-native-paper';
import { usePathname } from 'expo-router';
import { colors } from '@/constants/theme';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type Audience = 'homeowner' | 'tradesperson' | 'public';

function audienceFromPath(pathname: string): Audience {
  if (pathname.startsWith('/trader')) return 'tradesperson';
  if (pathname.startsWith('/customer')) return 'homeowner';
  return 'public';
}

function promptsFor(pathname: string, audience: Audience) {
  const path = pathname.toLowerCase();

  if (path.includes('/customer/new-job')) {
    return ['Help me write this job', 'What trade do I need?', 'What photos should I add?'];
  }
  if (path.includes('/customer/compare')) {
    return ['Help me compare these quotes', 'What should I check?', 'Explain staged payments'];
  }
  if (path.includes('/customer/messages')) {
    return ['Help me write a message', 'What should I ask the tradesperson?', 'How should I confirm changes?'];
  }
  if (path.includes('/customer/jobs')) {
    return ['What happens next with this job?', 'Help me understand my quotes', 'Explain BuildPay'];
  }
  if (path.includes('/directory')) {
    return ['What trade do I need?', 'What should I check before hiring?', 'How does BuildPair work?'];
  }
  if (path.includes('/for-homeowners')) {
    return ['How do I post a job?', 'How do I compare quotes?', 'How does BuildPay work?'];
  }
  if (path.includes('/for-tradespeople')) {
    return ['How do jobs work?', 'What tools do trades get?', 'How do quotes and invoices work?'];
  }

  if (path.includes('/trader/job-board')) {
    return ['Help me understand this job', 'What should I ask the customer?', 'Help me prepare a quote'];
  }
  if (path.includes('/trader/quotes')) {
    return ['Help me improve my quote', 'What should my quote include?', 'Explain payment stages'];
  }
  if (path.includes('/trader/invoices')) {
    return ['What should my invoice include?', 'Help me improve the wording', 'How does this fit the job flow?'];
  }
  if (path.includes('/trader/messages')) {
    return ['Help me reply to the customer', 'What should I clarify?', 'Help me keep this professional'];
  }
  if (path.includes('/trader/profile')) {
    return ['Help improve my profile', 'What should customers see?', 'How can I build trust?'];
  }
  if (path.includes('/trader/analytics')) {
    return ['Explain these metrics', 'What should I improve?', 'How can I get more from BuildPair?'];
  }
  if (path.includes('/trader/google-reviews')) {
    return ['How do Google Reviews work here?', 'Why connect my reviews?', 'Help improve my profile'];
  }
  if (path.includes('/trader/saved-searches')) {
    return ['How do saved searches work?', 'Help refine my job search', 'How do I find better-fit jobs?'];
  }
  if (path.includes('/trader/my-jobs') || path.includes('/trader/jobs')) {
    return ['What happens next with this job?', 'Help me message the customer', 'Explain the payment stages'];
  }

  if (path.includes('payment') || path.includes('buildpay')) {
    return ['Explain staged payments', 'Who pays the fees?', 'What happens next?'];
  }
  if (path.includes('quote')) {
    return audience === 'tradesperson'
      ? ['Help me improve my quote', 'What should my quote include?', 'Explain staged payments']
      : ['Help me understand this quote', 'What should I compare?', 'Explain staged payments'];
  }
  if (path.includes('job')) {
    return audience === 'tradesperson'
      ? ['Help me understand this job', 'What should I ask the customer?', 'Help me write a quote']
      : ['What trade do I need?', 'Help me describe my job', 'What photos should I add?'];
  }
  if (audience === 'tradesperson') {
    return ['How does BuildPair work for trades?', 'Help improve my profile', 'How do I find jobs?'];
  }
  if (audience === 'homeowner') {
    return ['How does BuildPair work for homeowners?', 'What trade do I need?', 'How do protected payments work?'];
  }
  return ['How does BuildPair work?', 'What trade do I need?', 'What can BuildPair help me with?'];
}

function openingMessage(audience: Audience) {
  if (audience === 'tradesperson') {
    return 'Hi, I’m BuildPair AI. I can help with jobs, quotes, invoices, profiles, messages, reviews, analytics and payments. What are you working on?';
  }
  if (audience === 'homeowner') {
    return 'Hi, I’m BuildPair AI. I can help you choose the right trade, post a clearer job, compare quotes, message tradespeople and understand BuildPair payments.';
  }
  return 'Hi, I’m BuildPair AI. I know the main BuildPair journeys and can help you find the right trade, understand the site or work out what to do next.';
}

export function BuildPairAiHelper() {
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const audience = audienceFromPath(pathname);
  const suggestedPrompts = useMemo(() => promptsFor(pathname, audience), [pathname, audience]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: openingMessage(audience) }]);
  const scrollRef = useRef<ScrollView>(null);
  const conversationIdRef = useRef<string | null>(null);

  const hidden = pathname.startsWith('/admin') || pathname.startsWith('/api');
  const panelWidth = Math.min(390, Math.max(300, width - 24));
  const panelHeight = Math.min(610, Math.max(390, height - 100));

  useEffect(() => {
    if (open) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, open, sending]);

  if (hidden) return null;

  function openHelper() {
    setOpen(true);
  }

  function closeHelper() {
    Keyboard.dismiss();
    setOpen(false);
  }

  function conversationId() {
    if (!conversationIdRef.current) {
      conversationIdRef.current = `bp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return conversationIdRef.current;
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;

    Keyboard.dismiss();
    setDraft('');
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: clean }].slice(-11);
    setMessages(nextMessages);
    setSending(true);

    try {
      const response = await fetch('/api/ai/site-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversationId(), pathname, audience, messages: nextMessages }),
      });

      if (!response.ok) throw new Error(`Helper request failed (${response.status})`);
      const data = await response.json() as { reply?: unknown };
      const reply = typeof data.reply === 'string' && data.reply.trim()
        ? data.reply.trim()
        : 'I couldn’t get a useful answer just then. Try asking that another way.';
      setMessages((current) => [...current, { role: 'assistant', content: reply }].slice(-12));
    } catch {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: 'I’m having trouble connecting right now. Try again in a moment.' },
      ].slice(-12));
    } finally {
      setSending(false);
    }
  }

  return (
    <Portal>
      {open ? (
        <View style={[styles.panel, { width: panelWidth, height: panelHeight }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>✦</Text></View>
            <View style={styles.headerCopy}>
              <Text variant="titleMedium" style={styles.headerTitle}>BuildPair AI</Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>Your BuildPair helper</Text>
            </View>
            <Pressable
              style={styles.closeButton}
              hitSlop={10}
              onPress={closeHelper}
              accessibilityRole="button"
              accessibilityLabel="Close BuildPair AI"
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} keyboardShouldPersistTaps="handled">
            {messages.map((message, index) => (
              <View key={`${message.role}-${index}`} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={message.role === 'user' ? styles.userText : styles.assistantText}>{message.content}</Text>
              </View>
            ))}
            {sending ? (
              <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                <ActivityIndicator size={16} />
                <Text variant="bodySmall" style={styles.thinkingText}>Thinking…</Text>
              </View>
            ) : null}
          </ScrollView>

          {messages.length <= 2 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRow} keyboardShouldPersistTaps="handled">
              {suggestedPrompts.map((prompt) => (
                <Pressable key={prompt} style={styles.promptChip} onPress={() => void sendMessage(prompt)}>
                  <Text variant="labelMedium" style={styles.promptText}>{prompt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.composer}>
            <TextInput
              mode="outlined"
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask BuildPair AI…"
              multiline
              maxLength={2000}
              style={styles.input}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              onSubmitEditing={() => void sendMessage(draft)}
              right={<TextInput.Icon icon="send" disabled={!draft.trim() || sending} onPress={() => void sendMessage(draft)} />}
            />
            <Text variant="labelSmall" style={styles.disclaimer}>AI can make mistakes. Check important job and payment details.</Text>
          </View>
        </View>
      ) : (
        <Pressable style={styles.launcher} onPress={openHelper} accessibilityRole="button" accessibilityLabel="Open BuildPair AI helper">
          <View style={styles.launcherIcon}><Text style={styles.launcherSpark}>✦</Text></View>
          <Text variant="labelLarge" style={styles.launcherText}>BuildPair AI</Text>
        </Pressable>
      )}
    </Portal>
  );
}

const styles = StyleSheet.create({
  launcher: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    height: 58,
    paddingHorizontal: 14,
    borderRadius: 29,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 9,
  },
  launcherIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launcherSpark: { color: '#fff', fontSize: 17, fontWeight: '900' },
  launcherText: { color: '#fff', fontWeight: '900', letterSpacing: 0.2, paddingRight: 3 },
  panel: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E5E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 12,
  },
  header: {
    minHeight: 70,
    paddingLeft: 15,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF1',
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: '#fff', fontSize: 19, fontWeight: '900' },
  headerCopy: { flex: 1, marginLeft: 10, minWidth: 0 },
  headerTitle: { color: '#15171A', fontWeight: '800' },
  headerSubtitle: { color: '#747981', marginTop: 1 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },
  closeButtonText: { color: '#34383D', fontSize: 28, lineHeight: 30, fontWeight: '500', marginTop: -2 },
  messages: { flex: 1, backgroundColor: '#F7F8FA' },
  messagesContent: { padding: 14, gap: 10 },
  bubble: { maxWidth: '86%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7E9ED', borderBottomLeftRadius: 5 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  assistantText: { color: '#23262A', lineHeight: 20 },
  userText: { color: '#fff', lineHeight: 20 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { color: '#777B82' },
  promptRow: { paddingHorizontal: 12, paddingVertical: 9, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEF0F2' },
  promptChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 17, backgroundColor: '#F3F5F7', borderWidth: 1, borderColor: '#E4E7EA' },
  promptText: { color: '#383C42', fontWeight: '700' },
  composer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 9, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ECEEF1' },
  input: { backgroundColor: '#fff', maxHeight: 104 },
  inputContent: { minHeight: 46, paddingTop: 9, paddingBottom: 9 },
  inputOutline: { borderRadius: 14 },
  disclaimer: { color: '#858991', textAlign: 'center', marginTop: 6 },
});
