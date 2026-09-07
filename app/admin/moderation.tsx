import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type ConversationMessage = {
  id: string;
  senderId: string;
  body: string;
  aiRiskLevel: 'none' | 'low' | 'medium' | 'high' | 'severe';
  aiModerationReason: string | null;
  createdAt: string;
};

type Report = {
  id: string;
  reporterEmail: string | null;
  subjectUserId: string | null;
  subjectEmail: string | null;
  subjectSuspended: boolean | null;
  messageBody: string | null;
  messageRiskLevel: string | null;
  messageModerationReason: string | null;
  reviewComment: string | null;
  jobTitle: string | null;
  conversationId: string | null;
  conversationStatus: 'open' | 'warned' | 'restricted' | 'closed' | null;
  conversationReason: string | null;
  conversationModerationUpdatedAt: string | null;
  customerEmail: string | null;
  traderEmail: string | null;
  conversationMessages: ConversationMessage[];
  reason: string;
  details: string;
  status: string;
  adminNotes: string;
  createdAt: string;
  resolvedAt: string | null;
};

type AccountAction = 'none' | 'warn' | 'suspend' | 'unsuspend';
type ConversationAction = 'none' | 'warn' | 'restrict' | 'close' | 'reopen';
type ReportStatus = 'reviewed' | 'actioned' | 'dismissed';

export default function ModerationScreen() {
  const { getToken } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const rows = await apiFetch<Report[]>('/api/admin/reports', {}, getToken);
      setReports(rows);
      setNotes(Object.fromEntries(rows.map((report) => [report.id, report.adminNotes ?? ''])));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function update(
    report: Report,
    status: ReportStatus,
    accountAction: AccountAction = 'none',
    conversationAction: ConversationAction = 'none',
  ) {
    setBusyId(report.id);
    try {
      await apiFetch('/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({ id: report.id, status, adminNotes: notes[report.id] ?? '', accountAction, conversationAction }),
      }, getToken);
      await load();
    } catch (e) { Alert.alert('Moderation action failed', errorMessage(e)); }
    finally { setBusyId(null); }
  }

  function confirmSuspend(report: Report) {
    Alert.alert('Suspend account?', `This blocks ${report.subjectEmail ?? 'the reported account'} from authenticated BuildPair activity and removes trader profiles from public discovery.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => void update(report, 'actioned', 'suspend') },
    ]);
  }

  function confirmClose(report: Report) {
    Alert.alert('Close conversation?', 'Both sides will be able to read the history but neither side will be able to send new messages until an administrator reopens it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close conversation', style: 'destructive', onPress: () => void update(report, 'actioned', 'none', 'close') },
    ]);
  }

  if (loading) return <LoadingScreen label="Loading moderation queue…" />;
  return <Screen title="Moderation queue" subtitle="Review reports in context, record the reason for your decision, then warn, restrict, close or suspend only where the evidence supports it.">
    {error ? <EmptyState title="Moderation unavailable" body={error} action={<Button onPress={load}>Try again</Button>} /> : null}
    {!error && !reports.length ? <EmptyState title="No reports" body="There are currently no moderation reports to review." /> : reports.map((report) => {
      const isExpanded = Boolean(expanded[report.id]);
      const busy = busyId === report.id;
      return <AppCard key={report.id}>
        <View style={styles.row}>
          <View style={styles.chips}><Chip>{report.status}</Chip>{report.conversationStatus ? <Chip icon="message-alert-outline">Chat: {report.conversationStatus}</Chip> : null}{report.subjectSuspended ? <Chip icon="cancel">Account suspended</Chip> : null}</View>
          <Text style={styles.muted}>{new Date(report.createdAt).toLocaleString()}</Text>
        </View>
        <Text variant="titleMedium" style={styles.title}>{report.reason.replaceAll('_', ' ')}</Text>
        <Text>Reporter: {report.reporterEmail ?? 'Unknown account'}</Text>
        <Text>Reported account: {report.subjectEmail ?? report.subjectUserId ?? 'No account target'}</Text>
        {report.jobTitle ? <Text>Job: {report.jobTitle}</Text> : null}
        {report.customerEmail || report.traderEmail ? <Text style={styles.muted}>Conversation: homeowner {report.customerEmail ?? 'unknown'} · tradesperson {report.traderEmail ?? 'unknown'}</Text> : null}

        {report.messageBody ? <>
          <Divider />
          <Text variant="labelLarge">Reported / flagged message</Text>
          <View style={styles.flaggedMessage}><Text>{report.messageBody}</Text>{report.messageRiskLevel && report.messageRiskLevel !== 'none' ? <Text variant="bodySmall" style={styles.risk}>AI risk: {report.messageRiskLevel}{report.messageModerationReason ? ` · ${report.messageModerationReason}` : ''}</Text> : null}</View>
        </> : null}
        {report.reviewComment ? <><Divider /><Text variant="labelLarge">Reported review</Text><Text>{report.reviewComment}</Text></> : null}
        {report.details ? <Text style={styles.muted}>Report details: {report.details}</Text> : null}
        {report.conversationReason ? <Text style={styles.muted}>Current moderation reason: {report.conversationReason}</Text> : null}

        {report.conversationId ? <>
          <Button icon={isExpanded ? 'chevron-up' : 'chevron-down'} mode="outlined" onPress={() => setExpanded((current) => ({ ...current, [report.id]: !isExpanded }))}>{isExpanded ? 'Hide conversation history' : `Review conversation history (${report.conversationMessages?.length ?? 0})`}</Button>
          {isExpanded ? <View style={styles.history}>
            {(report.conversationMessages ?? []).length ? report.conversationMessages.map((message) => {
              const flagged = message.aiRiskLevel && message.aiRiskLevel !== 'none' && message.aiRiskLevel !== 'low';
              return <View key={message.id} style={[styles.historyMessage, flagged && styles.historyFlagged]}>
                <View style={styles.row}><Text variant="labelMedium" style={styles.historySender}>{message.senderId === report.subjectUserId ? 'Reported account' : 'Other participant'}</Text><Text variant="bodySmall" style={styles.muted}>{new Date(message.createdAt).toLocaleString()}</Text></View>
                <Text style={styles.historyBody}>{message.body}</Text>
                {flagged ? <Text variant="bodySmall" style={styles.risk}>AI flag: {message.aiRiskLevel}{message.aiModerationReason ? ` · ${message.aiModerationReason}` : ''}</Text> : null}
              </View>;
            }) : <Text style={styles.muted}>No conversation messages were returned.</Text>}
          </View> : null}
        </> : null}

        <TextInput mode="outlined" label="Admin notes / reason for action" multiline maxLength={4000} value={notes[report.id] ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [report.id]: value }))} />

        <View style={styles.sectionActions}>
          <Text variant="labelLarge" style={styles.actionLabel}>Conversation controls</Text>
          <View style={styles.actions}>
            {report.conversationId ? <>
              <Button disabled={busy} mode="outlined" icon="alert-outline" onPress={() => void update(report, 'actioned', 'none', 'warn')}>Warn in chat</Button>
              <Button disabled={busy} mode="outlined" icon="pause-circle-outline" onPress={() => void update(report, 'actioned', 'none', 'restrict')}>Restrict messaging</Button>
              {report.conversationStatus !== 'closed' ? <Button disabled={busy} mode="outlined" textColor={colors.danger} icon="close-circle-outline" onPress={() => confirmClose(report)}>Close conversation</Button> : null}
              {report.conversationStatus !== 'open' ? <Button disabled={busy} mode="outlined" icon="lock-open-outline" onPress={() => void update(report, 'reviewed', 'none', 'reopen')}>Reopen</Button> : null}
            </> : <Text style={styles.muted}>This report is not linked to a chat.</Text>}
          </View>
        </View>

        <View style={styles.sectionActions}>
          <Text variant="labelLarge" style={styles.actionLabel}>Account and report controls</Text>
          <Text style={styles.muted}>Use the notes box above for the reason. Account warnings are delivered as an in-app notification; suspension blocks authenticated activity.</Text>
          <View style={styles.actions}>
            <Button disabled={busy} onPress={() => void update(report, 'reviewed')}>Mark reviewed</Button>
            <Button disabled={busy} onPress={() => void update(report, 'dismissed')}>Dismiss</Button>
            {report.subjectUserId && !report.subjectSuspended ? <Button mode="outlined" icon="alert-outline" disabled={busy} onPress={() => void update(report, 'actioned', 'warn')}>Warn account</Button> : null}
            {report.subjectUserId && !report.subjectSuspended ? <Button mode="contained" buttonColor={colors.danger} disabled={busy} onPress={() => confirmSuspend(report)}>Suspend account</Button> : null}
            {report.subjectUserId && report.subjectSuspended ? <Button mode="outlined" disabled={busy} onPress={() => void update(report, 'reviewed', 'unsuspend')}>Restore account</Button> : null}
          </View>
        </View>
      </AppCard>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sectionActions: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  actionLabel: { color: colors.charcoal, fontWeight: '900' },
  title: { fontWeight: '800', textTransform: 'capitalize', color: colors.charcoal },
  muted: { color: colors.muted, lineHeight: 20 },
  flaggedMessage: { padding: 12, backgroundColor: '#FFF8E8', borderRadius: 14, borderWidth: 1, borderColor: '#EAC987', gap: 6 },
  risk: { color: colors.warning, fontWeight: '800' },
  history: { gap: 8, backgroundColor: colors.surfaceSoft, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: colors.border },
  historyMessage: { backgroundColor: colors.surfaceRaised, padding: 10, borderRadius: 12, gap: 5, borderWidth: 1, borderColor: colors.border },
  historyFlagged: { borderColor: '#E6B35F', backgroundColor: '#FFF9EC' },
  historySender: { color: colors.charcoal, fontWeight: '800' },
  historyBody: { color: colors.text, lineHeight: 21 },
});
