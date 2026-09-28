import { useAuth } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Chip, IconButton, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { MessageRiskLevel } from '@/lib/message-safety';
import type { ConversationStatus } from '@/types/conversations';

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  aiRiskLevel?: MessageRiskLevel;
  aiModerationReason?: string | null;
};

type SendResult = Message & { conversationStatus?: ConversationStatus['moderationStatus']; warning?: string | null };
type AssistantResult = { summary: string; suggestions: string[]; source: 'ai' | 'rules' };
type TraderTemplate = { id: string; kind: 'quote' | 'message'; title: string; content: string };

export function MessageThread({ conversationId }: { conversationId: string }) {
  const { getToken, userId } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<ConversationStatus>();
  const [body, setBody] = useState('');
  const [assistant, setAssistant] = useState<AssistantResult>();
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [error, setError] = useState('');
  const [messageTemplates, setMessageTemplates] = useState<TraderTemplate[]>([]);

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      const [nextMessages, nextConversation] = await Promise.all([
        apiFetch<Message[]>(`/api/conversations/${conversationId}/messages`, {}, () => getTokenRef.current()),
        apiFetch<ConversationStatus>(`/api/conversations/${conversationId}`, {}, () => getTokenRef.current()),
      ]);
      setMessages(nextMessages);
      setConversation(nextConversation);
      if (userId === nextConversation.traderId) {
        const templates = await apiFetch<TraderTemplate[]>('/api/trader-templates', {}, () => getTokenRef.current()).catch(() => []);
        setMessageTemplates(templates.filter((item) => item.kind === 'message'));
      } else {
        setMessageTemplates([]);
      }
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [conversationId, userId]);
  useEffect(() => { void load(); const refresh = setInterval(() => void load(), 5000); return () => clearInterval(refresh); }, [load]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending || conversation?.moderationStatus === 'restricted' || conversation?.moderationStatus === 'closed') return;
    setSending(true);
    try {
      const created = await apiFetch<SendResult>(`/api/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) }, () => getTokenRef.current());
      setMessages((current) => current.some((message) => message.id === created.id) ? current : [...current, created]);
      setBody('');
      setAssistant(undefined);
      setWarning(created.warning ?? '');
      if (created.conversationStatus) {
        setConversation((current) => current ? { ...current, moderationStatus: created.conversationStatus! } : current);
      }
      setError('');
      if (created.conversationStatus === 'restricted') await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setSending(false); }
  };

  const getReplyIdeas = async () => {
    if (assistantLoading) return;
    setAssistantLoading(true);
    try {
      const result = await apiFetch<AssistantResult>('/api/ai/message-assistant', {
        method: 'POST',
        body: JSON.stringify({ conversationId, draft: body.trim() || undefined }),
      }, () => getTokenRef.current());
      setAssistant(result);
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setAssistantLoading(false); }
  };

  const report = async (messageId: string) => {
    try {
      await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ messageId, reason: 'abuse_or_harassment', details: 'Reported from a BuildPair job conversation.' }) }, () => getTokenRef.current());
      Alert.alert('Report received', 'The message has been added to the moderation queue.');
    } catch (e) { Alert.alert('Could not report message', errorMessage(e)); }
  };

  const visitAction = async (action: 'accept' | 'decline' | 'cancel' | 'complete') => {
    if (!conversation?.siteVisitId || actionBusy) return;
    try {
      setActionBusy(true); setError('');
      await apiFetch('/api/site-visits', { method: 'PATCH', body: JSON.stringify({ id: conversation.siteVisitId, action }) }, () => getTokenRef.current());
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setActionBusy(false); }
  };

  if (loading) return <LoadingScreen label="Loading conversation…" />;
  const moderationStatus = conversation?.moderationStatus ?? 'open';
  const locked = moderationStatus === 'restricted' || moderationStatus === 'closed';
  const moderationText = moderationStatus === 'closed'
    ? 'This conversation has been closed by BuildPair moderation. You can still read the history, but new messages are disabled.'
    : moderationStatus === 'restricted'
      ? 'Messaging is temporarily restricted while BuildPair reviews this conversation.'
      : moderationStatus === 'warned'
        ? 'BuildPair has detected language or behaviour that may breach the chat rules. Keep messages factual and respectful.'
        : '';
  const isTrader = Boolean(conversation && userId === conversation.traderId);

  const quoteNow = () => {
    if (!conversation) return;
    router.push({ pathname: '/trader/quotes/new', params: { jobId: conversation.jobId, title: conversation.jobTitle } });
  };
  const arrangeVisit = () => {
    if (!conversation) return;
    router.push({ pathname: '/trader/visits/new', params: { jobId: conversation.jobId, conversationId: conversation.id, title: conversation.jobTitle } });
  };
  const confirmVisitDetails = () => {
    if (!conversation?.siteVisitId) return;
    router.push({ pathname: '/customer/jobs/[id]/visit', params: { id: conversation.jobId, visitId: conversation.siteVisitId } });
  };
  const openVisit = () => {
    if (!conversation?.siteVisitId) return;
    router.push(`/trader/visits/${conversation.siteVisitId}` as Href);
  };
  const openJob = () => {
    if (!conversation) return;
    router.push((isTrader ? `/trader/jobs/${conversation.jobId}` : `/customer/jobs/${conversation.jobId}`) as Href);
  };
  const compareQuote = () => {
    if (conversation) router.push(`/customer/compare/${conversation.jobId}` as Href);
  };

  return <Screen title={conversation?.jobTitle ?? 'Job Conversation'} subtitle="Message, arrange a visit, quote and keep the job moving without losing the project record.">
    {conversation ? <NextStepCard
      conversation={conversation}
      isTrader={isTrader}
      busy={actionBusy}
      onQuoteNow={quoteNow}
      onArrangeVisit={arrangeVisit}
      onConfirmVisitDetails={confirmVisitDetails}
      onOpenVisit={openVisit}
      onVisitAction={visitAction}
      onOpenJob={openJob}
      onCompareQuote={compareQuote}
    /> : null}

    <AppCard style={styles.aiNotice} elevated={false}>
      <View style={styles.noticeHeader}><Chip icon="creation">BuildPair AI</Chip><Text variant="labelMedium" style={styles.noticeTitle}>Reply help and safety moderation</Text></View>
      <Text style={styles.muted}>BuildPair AI may analyse messages in this conversation to suggest replies, identify possible scams or abuse, and help keep the marketplace safe. AI can make mistakes, so serious moderation decisions can be reviewed by a person.</Text>
    </AppCard>

    {moderationText ? <AppCard style={moderationStatus === 'warned' ? styles.warningCard : styles.restrictedCard} elevated={false}>
      <Text variant="titleMedium" style={styles.warningTitle}>{moderationStatus === 'warned' ? 'Chat warning' : moderationStatus === 'closed' ? 'Conversation closed' : 'Messaging restricted'}</Text>
      <Text style={styles.warningText}>{moderationText}</Text>
      {conversation?.moderationReason ? <Text variant="bodySmall" style={styles.muted}>Reason recorded: {conversation.moderationReason}</Text> : null}
    </AppCard> : null}
    {warning ? <AppCard style={styles.warningCard} elevated={false}><Text style={styles.warningText}>{warning}</Text></AppCard> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}

    <View style={styles.thread}>
      {!messages.length ? <EmptyState title="No messages yet" body="Send the first message below." /> : messages.map((message) => {
        const mine = message.senderId === userId;
        const flagged = mine && message.aiRiskLevel && ['medium', 'high', 'severe'].includes(message.aiRiskLevel);
        return <View key={message.id} style={[styles.messageRow, mine && styles.messageRowMine]}>
          <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            <Text style={[styles.messageText, mine && styles.mineText]}>{message.body}</Text>
            {flagged ? <Text variant="bodySmall" style={styles.flaggedText}>BuildPair safety check: {message.aiModerationReason || 'This message may breach chat rules.'}</Text> : null}
            <View style={styles.meta}><Text style={[styles.time, mine && styles.mineTime]}>{new Date(message.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>{!mine ? <Button compact textColor={colors.muted} onPress={() => void report(message.id)}>Report</Button> : null}</View>
          </View>
        </View>;
      })}
    </View>

    {isTrader && messageTemplates.length ? <AppCard style={styles.assistantCard} elevated={false}>
      <View style={styles.assistantTitleBlock}><Text variant="titleMedium" style={styles.title}>Saved Pro messages</Text><Text style={styles.muted}>Reuse your own customer wording, then edit it for this job before sending.</Text></View>
      <View style={styles.suggestions}>{messageTemplates.slice(0, 8).map((template) => <Button key={template.id} compact mode="outlined" icon="message-text-outline" onPress={() => setBody(template.content)}>{template.title}</Button>)}</View>
    </AppCard> : null}

    <AppCard style={styles.assistantCard} elevated={false}>
      <View style={styles.assistantHeader}>
        <View style={styles.assistantTitleBlock}><Text variant="titleMedium" style={styles.title}>Need help wording a reply?</Text><Text style={styles.muted}>AI suggestions are drafts. Check facts, prices and promises before sending.</Text></View>
        <Button mode="outlined" icon="creation" loading={assistantLoading} disabled={assistantLoading || locked} onPress={() => void getReplyIdeas()}>AI reply ideas</Button>
      </View>
      {assistant ? <>
        <Text variant="bodySmall" style={styles.summary}>{assistant.summary}</Text>
        <View style={styles.suggestions}>{assistant.suggestions.map((suggestion, index) => <Button key={`${index}-${suggestion.slice(0, 24)}`} mode="text" style={styles.suggestionButton} contentStyle={styles.suggestionContent} onPress={() => setBody(suggestion)}>{suggestion}</Button>)}</View>
      </> : null}
    </AppCard>

    <View style={styles.composer}>
      <TextInput style={styles.input} mode="outlined" placeholder={locked ? 'Messaging is currently unavailable' : 'Write a message…'} value={body} onChangeText={setBody} multiline maxLength={4000} disabled={locked} />
      <IconButton icon="send" mode="contained" containerColor={colors.primary} iconColor="#FFFFFF" size={24} loading={sending} disabled={sending || locked || !body.trim()} onPress={() => void send()} accessibilityLabel="Send message" />
    </View>
  </Screen>;
}

function NextStepCard({
  conversation,
  isTrader,
  busy,
  onQuoteNow,
  onArrangeVisit,
  onConfirmVisitDetails,
  onOpenVisit,
  onVisitAction,
  onOpenJob,
  onCompareQuote,
}: {
  conversation: ConversationStatus;
  isTrader: boolean;
  busy: boolean;
  onQuoteNow: () => void;
  onArrangeVisit: () => void;
  onConfirmVisitDetails: () => void;
  onOpenVisit: () => void;
  onVisitAction: (action: 'accept' | 'decline' | 'cancel' | 'complete') => Promise<void>;
  onOpenJob: () => void;
  onCompareQuote: () => void;
}) {
  const visitWhen = conversation.siteVisitProposedAt ? formatVisitTime(conversation.siteVisitProposedAt) : '';
  const visitNote = conversation.siteVisitNote?.trim();

  if (conversation.jobStatus === 'cancelled') return <AppCard style={styles.nextStepCard}>
    <Chip icon="close-circle-outline">Job closed</Chip>
    <Text variant="titleLarge" style={styles.title}>This job has been cancelled</Text>
    <Text style={styles.muted}>The conversation remains as a record, but no quote or site visit should progress from here.</Text>
  </AppCard>;

  if (conversation.jobStatus === 'in_progress') return <AppCard style={styles.nextStepCard}>
    <Chip icon="check-decagram-outline">Quote accepted</Chip>
    <Text variant="titleLarge" style={styles.title}>{isTrader ? 'You have the job. Keep the project here.' : 'The job is now active in BuildPair'}</Text>
    <Text style={styles.muted}>{isTrader
      ? 'Use the job record for the private job address, agreed quote, BuildPay or direct-payment route, stage progress and variations. If scope changes, record it before doing the extra work.'
      : 'Finish the private job address and payment setup, then keep the accepted quote, stage progress and any scope changes attached to the same project.'}</Text>
    <View style={styles.nextActions}><Button mode="contained" icon="briefcase-check-outline" onPress={onOpenJob}>{isTrader ? 'Manage active job' : 'Open active job'}</Button></View>
  </AppCard>;

  if (conversation.jobStatus === 'completed') return <AppCard style={styles.nextStepCard}>
    <Chip icon="flag-checkered">Work complete</Chip>
    <Text variant="titleLarge" style={styles.title}>{isTrader ? 'Work is marked complete' : 'Review the completed job'}</Text>
    <Text style={styles.muted}>{isTrader
      ? 'The project record remains available for final payment status, history and the verified review path.'
      : 'Check the project payment record and history. Once the qualifying payment record is complete, BuildPair can unlock the verified review.'}</Text>
    <View style={styles.nextActions}><Button mode="contained" onPress={onOpenJob}>Open completed job</Button></View>
  </AppCard>;

  if (conversation.quoteStatus === 'pending') return <AppCard style={styles.nextStepCard}>
    <Chip icon="file-document-check-outline">Quote ready</Chip>
    <Text variant="titleLarge" style={styles.title}>{isTrader ? 'Quote sent. Waiting for the homeowner.' : 'A structured quote is ready to review'}</Text>
    <Text style={styles.muted}>{isTrader
      ? 'The homeowner can compare the price, scope, exclusions, timing, warranty and stage schedule before accepting.'
      : 'Review the full quote before accepting. Acceptance moves the job into private address and payment setup, where you choose BuildPay or direct payment.'}</Text>
    <View style={styles.nextActions}>{isTrader
      ? <Button mode="outlined" icon="file-document-edit-outline" onPress={onQuoteNow}>Update quote</Button>
      : <Button mode="contained" icon="compare" onPress={onCompareQuote}>Review & compare quote</Button>}
    </View>
  </AppCard>;

  if (conversation.siteVisitStatus === 'proposed') return <AppCard style={styles.nextStepCard}>
    <Chip icon="calendar-clock">Site visit proposed</Chip>
    <Text variant="titleLarge" style={styles.title}>{isTrader ? 'Waiting for the homeowner to confirm' : 'The tradesperson wants to inspect the job first'}</Text>
    <Text style={styles.visitMeta}>{visitWhen}</Text>
    {visitNote ? <Text style={styles.muted}>{visitNote}</Text> : null}
    <Text style={styles.muted}>{isTrader
      ? 'The homeowner must confirm the visit before their private street address is shared with you. You can still quote immediately if the existing information is enough.'
      : 'Confirming the visit privately shares this job address with this tradesperson only. The address stays off the public listing. The visit does not award the work.'}</Text>
    <View style={styles.nextActions}>{isTrader ? <>
      <Button mode="contained" icon="calendar-edit" onPress={onArrangeVisit}>Change time</Button>
      <Button mode="outlined" icon="file-document-edit-outline" onPress={onQuoteNow}>Quote now instead</Button>
      <Button mode="text" disabled={busy} onPress={() => void onVisitAction('cancel')}>Cancel visit</Button>
    </> : <>
      <Button mode="outlined" disabled={busy} onPress={() => void onVisitAction('decline')}>Decline</Button>
      <Button mode="contained" icon="home-map-marker" disabled={busy} onPress={onConfirmVisitDetails}>Add address & confirm visit</Button>
    </>}</View>
  </AppCard>;

  if (conversation.siteVisitStatus === 'confirmed') return <AppCard style={styles.nextStepCard}>
    <Chip icon="calendar-check">Site visit confirmed</Chip>
    <Text variant="titleLarge" style={styles.title}>{visitWhen}</Text>
    {visitNote ? <Text style={styles.muted}>{visitNote}</Text> : null}
    <Text style={styles.muted}>{isTrader
      ? 'The private visit address is available in the visit record. Inspect the job, clarify scope, then come back and create the formal BuildPair quote. The visit itself does not award the work.'
      : 'Your address is shared with this tradesperson for the confirmed visit. After the visit, ask them to put the formal quote into BuildPair so the scope and payment choices stay clear.'}</Text>
    <View style={styles.nextActions}>{isTrader ? <>
      <Button mode="contained" icon="home-map-marker" onPress={onOpenVisit}>Open visit & address</Button>
      <Button mode="outlined" icon="file-document-edit-outline" onPress={onQuoteNow}>Create quote now</Button>
    </> : null}</View>
  </AppCard>;

  if (conversation.siteVisitStatus === 'completed') return <AppCard style={styles.nextStepCard}>
    <Chip icon="home-check-outline">Site visit complete</Chip>
    <Text variant="titleLarge" style={styles.title}>{isTrader ? 'Now turn the visit into the formal quote' : 'The visit is done. The quote is the next step.'}</Text>
    <Text style={styles.muted}>{isTrader
      ? 'Enter the agreed scope, labour, materials, VAT, stage schedule, programme, exclusions and terms. This is the bit that gets the job back into BuildPair rather than leaving the commercial agreement buried in chat.'
      : 'The tradesperson can now prepare the structured BuildPair quote. Nothing is awarded until you review and accept it.'}</Text>
    <View style={styles.nextActions}>{isTrader ? <Button mode="contained" icon="file-document-edit-outline" onPress={onQuoteNow}>Create BuildPair quote</Button> : null}</View>
  </AppCard>;

  return <AppCard style={styles.nextStepCard}>
    <Chip icon="arrow-decision-outline">Next step</Chip>
    <Text variant="titleLarge" style={styles.title}>{isTrader ? 'Can you price it now, or do you need to see it?' : 'Your request is live. This is not where the process ends.'}</Text>
    <Text style={styles.muted}>{isTrader
      ? 'If the description and photos are enough, send the structured quote now. If you need to inspect access, condition, measurements or scope first, arrange a site visit. The full address is shared only after the homeowner confirms that visit.'
      : 'The tradesperson can ask questions, send a quote immediately, or request a site visit before quoting. Your exact address is not public and is shared only when you confirm a visit or award the job.'}</Text>
    <View style={styles.nextActions}>{isTrader ? <>
      <Button mode="contained" icon="file-document-edit-outline" onPress={onQuoteNow}>Quote now</Button>
      <Button mode="outlined" icon="calendar-account-outline" onPress={onArrangeVisit}>Arrange site visit</Button>
    </> : null}</View>
  </AppCard>;
}

function formatVisitTime(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  nextStepCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  nextActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  visitMeta: { color: colors.charcoal, fontWeight: '900', fontSize: 17 },
  aiNotice: { backgroundColor: colors.blueSoft, borderColor: '#C9DDEA' },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  noticeTitle: { color: colors.charcoal, fontWeight: '800' },
  warningCard: { backgroundColor: '#FFF8E8', borderColor: '#EAC987' },
  restrictedCard: { backgroundColor: '#FFF1EF', borderColor: '#E8AAA4' },
  warningTitle: { color: colors.charcoal, fontWeight: '900' },
  warningText: { color: colors.text, lineHeight: 22 },
  thread: { minHeight: 320, backgroundColor: colors.surfaceSoft, borderRadius: 20, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  messageRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingTop: 11, paddingBottom: 7, borderRadius: 18, gap: 4 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  theirs: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 },
  messageText: { color: colors.text, lineHeight: 22 },
  mineText: { color: '#FFFFFF' },
  flaggedText: { color: '#FFF3E8', fontWeight: '700', lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { color: colors.muted, fontSize: 11 },
  mineTime: { color: '#FFE3D2' },
  assistantCard: { backgroundColor: colors.surfaceRaised },
  assistantHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  assistantTitleBlock: { flex: 1, minWidth: 220, gap: 3 },
  title: { color: colors.charcoal, fontWeight: '900' },
  summary: { color: colors.muted, lineHeight: 20 },
  suggestions: { gap: 6 },
  suggestionButton: { alignSelf: 'stretch', borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  suggestionContent: { justifyContent: 'flex-start', minHeight: 44 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: colors.surfaceRaised, borderRadius: 18 },
  input: { flex: 1, backgroundColor: colors.surfaceRaised },
  muted: { color: colors.muted, lineHeight: 21 },
  error: { color: colors.danger },
});
