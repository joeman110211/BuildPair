import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type AdminActionProposal = { action: Record<string, unknown>; title: string; summary: string; impact: string[]; risk: 'medium' | 'high'; confirmLabel: string; proposalNonce: string };
type ChatTurn = { role: 'user' | 'assistant'; content: string; actionProposal?: AdminActionProposal | null; actionStatus?: 'pending' | 'completed' | 'cancelled' | 'failed'; actionMessage?: string };
type AssistantResponse = { answer: string; actionProposal: AdminActionProposal | null };
type AiRequestRow = { id: number; userId: string | null; userEmail: string | null; endpoint: string; requestText: string; responseText: string | null; status: string; model: string | null; providerCalled: boolean; latencyMs: number | null; metadata: Record<string, unknown>; createdAt: string };
type AiAuditResponse = { requests: AiRequestRow[]; usage24h: { requests24h: number; providerCalls24h: number; blocked24h: number; errors24h: number }; globalDailyLimit: number; generatedAt: string };
type ConversationFilter = 'all' | 'homeowner' | 'trade' | 'anonymous' | 'errors' | 'unanswered';

const QUICK_PROMPTS = [
  'What is happening across BuildPair right now from the live data you can see?',
  'Explain what admin actions you can prepare and which ones need confirmation.',
  'Explain every AI feature, what it sees and how usage is protected.',
  'What should I investigate first if users are reporting account problems?',
] as const;

function fmt(value: string) { return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' }); }
function endpointLabel(value: string) { return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function parseMaybeJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try { return asRecord(JSON.parse(value)); } catch { return {}; }
}
function requestDetails(item: AiRequestRow) {
  const parsed = parseMaybeJson(item.requestText);
  const meta = asRecord(item.metadata);
  const audience = String(parsed.audience ?? meta.audience ?? '').toLowerCase();
  const pathname = String(parsed.pathname ?? meta.pathname ?? '');
  const messages = Array.isArray(parsed.messages) ? parsed.messages as Record<string, unknown>[] : [];
  const latest = [...messages].reverse().find((entry) => entry.role === 'user' && typeof entry.content === 'string');
  const asked = typeof latest?.content === 'string' ? latest.content : (typeof parsed.message === 'string' ? parsed.message : item.requestText);
  const parsedResponse = parseMaybeJson(item.responseText);
  const answer = typeof parsedResponse.reply === 'string' ? parsedResponse.reply : typeof parsedResponse.answer === 'string' ? parsedResponse.answer : item.responseText;
  return { audience, pathname, asked, answer };
}
function pageName(pathname: string) {
  if (!pathname || pathname === '/') return 'Home page';
  const clean = (pathname.split('?')[0] ?? '').replace(/^\/+|\/+$/g, '');
  if (!clean) return 'Home page';
  const last = clean.split('/').filter(Boolean).pop() ?? clean;
  return last.replace(/[()_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
function personLabel(item: AiRequestRow, audience: string) {
  if (item.userEmail) return audience === 'tradesperson' ? `Trade · ${item.userEmail}` : audience === 'homeowner' ? `Homeowner · ${item.userEmail}` : item.userEmail;
  if (item.userId) return audience === 'tradesperson' ? 'Signed-in trade' : audience === 'homeowner' ? 'Signed-in homeowner' : 'Signed-in user';
  if (audience === 'tradesperson') return 'Anonymous trade visitor';
  if (audience === 'homeowner') return 'Anonymous homeowner';
  return 'Anonymous visitor';
}
function filterLabel(filter: ConversationFilter) { return ({ all: 'All', homeowner: 'Homeowners', trade: 'Trades', anonymous: 'Anonymous', errors: 'Errors', unanswered: 'Unanswered' } as const)[filter]; }

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
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all');
  const [conversationQuery, setConversationQuery] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const history = useMemo(() => turns.slice(-8).map(({ role, content }) => ({ role, content })), [turns]);
  const loadAudit = useCallback(async () => {
    try { setAudit(await apiFetch<AiAuditResponse>('/api/admin/ai-requests', {}, () => getTokenRef.current())); setAuditError(''); }
    catch (e) { setAuditError(errorMessage(e)); }
    finally { setAuditLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void loadAudit(), 0); return () => clearTimeout(timer); }, [loadAudit]);

  const conversations = useMemo(() => {
    const needle = conversationQuery.trim().toLowerCase();
    return (audit?.requests ?? []).map((item) => ({ item, ...requestDetails(item) })).filter((row) => {
      const isError = row.item.status === 'error' || row.item.status === 'blocked';
      const unanswered = !row.answer || row.item.status === 'error' || row.item.status === 'blocked';
      if (conversationFilter === 'homeowner' && row.audience !== 'homeowner') return false;
      if (conversationFilter === 'trade' && row.audience !== 'tradesperson') return false;
      if (conversationFilter === 'anonymous' && (row.item.userId || row.item.userEmail)) return false;
      if (conversationFilter === 'errors' && !isError) return false;
      if (conversationFilter === 'unanswered' && !unanswered) return false;
      if (!needle) return true;
      return [row.asked, row.answer ?? '', row.pathname, row.item.userEmail ?? '', row.item.endpoint].some((value) => value.toLowerCase().includes(needle));
    });
  }, [audit?.requests, conversationFilter, conversationQuery]);

  const send = async (value = message) => {
    const trimmed = value.trim(); if (!trimmed || sending) return;
    setTurns((current) => [...current, { role: 'user', content: trimmed }]); setMessage(''); setSending(true); setError('');
    try {
      const response = await apiFetch<AssistantResponse>('/api/admin/assistant', { method: 'POST', body: JSON.stringify({ message: trimmed, history }) }, () => getTokenRef.current());
      setTurns((current) => [...current, { role: 'assistant', content: response.answer, actionProposal: response.actionProposal, actionStatus: response.actionProposal ? 'pending' : undefined }]);
    } catch (e) { setError(errorMessage(e)); } finally { setSending(false); void loadAudit(); }
  };
  const cancelAction = (index: number) => setTurns((current) => current.map((turn, i) => i === index ? { ...turn, actionStatus: 'cancelled', actionMessage: 'Cancelled. No change was made.' } : turn));
  const executeAction = async (index: number, proposal: AdminActionProposal) => {
    if (executingIndex != null) return; setExecutingIndex(index);
    try {
      await apiFetch('/api/admin/assistant-action', { method: 'POST', body: JSON.stringify({ confirmed: true, proposalNonce: proposal.proposalNonce, action: proposal.action }) }, () => getTokenRef.current());
      setTurns((current) => current.map((turn, i) => i === index ? { ...turn, actionStatus: 'completed', actionMessage: 'Confirmed action completed successfully.' } : turn)); void loadAudit();
    } catch (e) { setTurns((current) => current.map((turn, i) => i === index ? { ...turn, actionStatus: 'failed', actionMessage: errorMessage(e) } : turn)); }
    finally { setExecutingIndex(null); }
  };

  return <Screen title="Admin Assistant" subtitle="Private BuildPair control assistant plus AI conversation intelligence for the protected admin area.">
    <AppCard style={styles.introCard}><View style={styles.introHeader}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Admin-only BuildPair control assistant</Text><Text style={styles.body}>Investigate BuildPair, prepare supported admin actions and see what visitors are actually asking BuildPair AI.</Text></View><Chip>Admin-only</Chip></View><View style={styles.notice}><Text style={styles.noticeTitle}>Reads freely. Writes only after you confirm.</Text><Text style={styles.noticeText}>Any state-changing action still appears as a separate confirmation card before the protected admin backend is called.</Text></View><View style={styles.shortcutRow}><Link href="/admin/dashboard" asChild><Button mode="outlined">Overview</Button></Link><Link href="/admin/system" asChild><Button mode="outlined">System health</Button></Link><Link href="/admin/users" asChild><Button mode="outlined">Users</Button></Link></View></AppCard>
    <AppCard><Text variant="titleMedium" style={styles.title}>Quick questions</Text><View style={styles.quickGrid}>{QUICK_PROMPTS.map((prompt) => <Button key={prompt} mode="outlined" style={styles.quickButton} contentStyle={styles.quickButtonContent} onPress={() => void send(prompt)}>{prompt}</Button>)}</View></AppCard>
    <AppCard style={styles.chatCard}><View style={styles.chatHeader}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Admin conversation</Text><Text style={styles.muted}>Ask it to investigate BuildPair or prepare an admin change.</Text></View>{turns.length ? <Button compact mode="text" onPress={() => { setTurns([]); setError(''); }}>Clear</Button> : null}</View><ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent} nestedScrollEnabled>{!turns.length ? <View style={styles.emptyChat}><Text style={styles.emptyTitle}>Ask it to investigate, explain or prepare an admin action.</Text></View> : turns.map((turn, index) => <View key={`${turn.role}-${index}`} style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.assistantBubble]}><Text style={styles.bubbleLabel}>{turn.role === 'user' ? 'You' : 'BuildPair Admin Assistant'}</Text><Text selectable style={styles.bubbleText}>{turn.content}</Text>{turn.role === 'assistant' && turn.actionProposal ? <View style={styles.actionCard}><View style={styles.actionHeader}><View style={styles.flex}><Text style={styles.actionTitle}>{turn.actionProposal.title}</Text><Text style={styles.actionSummary}>{turn.actionProposal.summary}</Text></View><Chip>{turn.actionProposal.risk === 'high' ? 'High impact' : 'Confirmation required'}</Chip></View>{turn.actionProposal.impact.map((item) => <Text key={item} style={styles.actionImpactText}>• {item}</Text>)}{turn.actionStatus === 'pending' ? <View style={styles.actionButtons}><Button mode="outlined" onPress={() => cancelAction(index)}>Cancel</Button><Button mode="contained" loading={executingIndex === index} onPress={() => void executeAction(index, turn.actionProposal!)}>{turn.actionProposal.confirmLabel}</Button></View> : null}{turn.actionMessage ? <Text style={turn.actionStatus === 'failed' ? styles.actionError : styles.actionResult}>{turn.actionMessage}</Text> : null}</View> : null}</View>)}</ScrollView>{error ? <HelperText type="error" visible>{error}</HelperText> : null}<TextInput mode="outlined" multiline value={message} onChangeText={setMessage} placeholder="Ask about BuildPair or tell the Admin Assistant what you want changed…" disabled={sending}/><View style={styles.sendRow}><Text style={styles.mutedSmall}>Private tokens remain hidden.</Text><Button mode="contained" loading={sending} disabled={sending || !message.trim()} onPress={() => void send()}>Send</Button></View></AppCard>

    <AppCard style={styles.auditCard}>
      <View style={styles.auditHeader}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>AI Conversations</Text><Text style={styles.muted}>See what homeowners, trades and anonymous visitors ask, where they asked it, what BuildPair AI replied and where the helper failed to answer. This is product feedback disguised as a chat log, which is considerably more useful than 30 rows of database soup.</Text></View><Button icon="refresh" loading={auditLoading} onPress={() => void loadAudit()}>Refresh</Button></View>
      {audit ? <View style={styles.usageRow}><Chip>{audit.usage24h.requests24h} AI actions / 24h</Chip><Chip>{audit.usage24h.providerCalls24h} Gemini calls</Chip><Chip>{audit.usage24h.errors24h} errors</Chip><Chip>{audit.usage24h.blocked24h} blocked</Chip></View> : null}
      <TextInput mode="outlined" label="Search questions, answers, pages or users" value={conversationQuery} onChangeText={setConversationQuery} />
      <View style={styles.filterRow}>{(['all','homeowner','trade','anonymous','errors','unanswered'] as ConversationFilter[]).map((filter) => <Chip key={filter} selected={conversationFilter === filter} onPress={() => setConversationFilter(filter)}>{filterLabel(filter)}</Chip>)}</View>
      {auditError ? <HelperText type="error" visible>{auditError}</HelperText> : null}
      {!auditLoading && audit && !conversations.length ? <Text style={styles.muted}>No AI conversations match this filter.</Text> : null}
      <Text style={styles.mutedSmall}>Showing {conversations.length} of {audit?.requests.length ?? 0} recent AI interactions.</Text>
      {conversations.length ? <ScrollView style={styles.auditList} contentContainerStyle={styles.auditListContent} nestedScrollEnabled>{conversations.map((row) => <View key={row.item.id} style={styles.conversationItem}><View style={styles.conversationTop}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{personLabel(row.item, row.audience)} · {pageName(row.pathname)} · {new Date(row.item.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.mutedSmall}>{fmt(row.item.createdAt)} · {endpointLabel(row.item.endpoint)}</Text></View><View style={styles.chipRow}><Chip>{row.item.status}</Chip>{row.audience ? <Chip>{row.audience === 'tradesperson' ? 'Trade' : row.audience === 'homeowner' ? 'Homeowner' : 'Public'}</Chip> : null}{!row.item.userId && !row.item.userEmail ? <Chip>Anonymous</Chip> : null}</View></View><View style={styles.qaBox}><Text style={styles.questionLabel}>Asked</Text><Text selectable style={styles.questionText}>“{row.asked || 'No question text recorded.'}”</Text></View><View style={styles.qaBox}><Text style={styles.answerLabel}>BuildPair AI</Text><Text selectable style={styles.answerText}>{row.answer || 'No answer recorded.'}</Text></View>{row.item.status === 'error' || row.item.status === 'blocked' || !row.answer ? <Text style={styles.problem}>Needs attention · this interaction was not successfully answered.</Text> : null}</View>)}</ScrollView> : null}
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  introCard:{borderColor:'#D5E1EA'},introHeader:{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:10},flex:{flex:1,minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%',gap:5},title:{color:colors.charcoal,fontWeight:'900'},body:{color:colors.charcoalSoft,lineHeight:22},muted:{color:colors.muted,lineHeight:20},mutedSmall:{color:colors.muted,fontSize:11,lineHeight:16},notice:{padding:13,borderRadius:14,backgroundColor:'#FFF4EA',gap:4},noticeTitle:{color:colors.charcoal,fontWeight:'900'},noticeText:{color:colors.charcoalSoft,lineHeight:20},shortcutRow:{flexDirection:'row',flexWrap:'wrap',gap:8},quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},quickButton:{ flexShrink: 1,flexGrow:1,flexBasis:240,minWidth:0,maxWidth:'100%'},quickButtonContent:{minHeight:48},chatCard:{gap:12},chatHeader:{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:10},transcript:{maxHeight:620,minHeight:180},transcriptContent:{gap:10,paddingVertical:4},emptyChat:{minHeight:150,alignItems:'center',justifyContent:'center'},emptyTitle:{color:colors.charcoal,fontWeight:'900',textAlign:'center'},bubble:{maxWidth:'94%',padding:12,borderRadius:16,gap:8},userBubble:{alignSelf:'flex-end',backgroundColor:colors.primarySoft,borderWidth:1,borderColor:'#F2D7C3'},assistantBubble:{alignSelf:'flex-start',backgroundColor:colors.surfaceSoft,borderWidth:1,borderColor:colors.border},bubbleLabel:{color:colors.muted,fontSize:10,fontWeight:'900',textTransform:'uppercase'},bubbleText:{color:colors.charcoal,lineHeight:21},actionCard:{gap:10,padding:12,borderRadius:14,borderWidth:1,borderColor:'#E6B98D',backgroundColor:'#FFF9F3'},actionHeader:{flexDirection:'row',flexWrap:'wrap',gap:8},actionTitle:{color:colors.charcoal,fontWeight:'900',fontSize:16},actionSummary:{color:colors.charcoalSoft,lineHeight:20},actionImpactText:{color:colors.charcoalSoft,lineHeight:19},actionButtons:{flexDirection:'row',justifyContent:'flex-end',gap:8},actionResult:{color:colors.charcoal,fontWeight:'800'},actionError:{color:colors.danger,fontWeight:'800'},sendRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},auditCard:{gap:12},auditHeader:{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:10},usageRow:{flexDirection:'row',flexWrap:'wrap',gap:7},filterRow:{flexDirection:'row',flexWrap:'wrap',gap:7},auditList:{maxHeight:1300},auditListContent:{gap:12,paddingVertical:2},conversationItem:{gap:9,padding:13,borderWidth:1,borderColor:colors.border,borderRadius:14,backgroundColor:colors.surfaceSoft},conversationTop:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8},chipRow:{flexDirection:'row',flexWrap:'wrap',gap:6},qaBox:{gap:4,padding:11,borderRadius:11,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border},questionLabel:{color:colors.primary,fontSize:11,fontWeight:'900'},questionText:{color:colors.charcoal,fontSize:14,lineHeight:20,fontWeight:'700'},answerLabel:{color:colors.muted,fontSize:11,fontWeight:'900'},answerText:{color:colors.charcoalSoft,fontSize:13,lineHeight:20},problem:{color:colors.danger,fontWeight:'800'}
});