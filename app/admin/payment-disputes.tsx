import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type AdminDispute = {
  id: string;
  jobId: string;
  jobTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  milestoneStatus: string;
  paymentId: string;
  paymentStatus: string;
  customerEmail: string | null;
  traderEmail: string | null;
  status: 'open' | 'responded' | 'escalated' | 'resolved_release';
  reason: string;
  traderResponse: string | null;
  escalationNote: string | null;
  adminNote: string | null;
  resolutionNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
};

export default function AdminPaymentDisputesScreen() {
  const { getToken } = useAuth();
  const [rows, setRows] = useState<AdminDispute[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<AdminDispute[]>('/api/admin/payment-disputes', {}, getToken);
      setRows(result);
      setNotes(Object.fromEntries(result.map((item) => [item.id, item.adminNote ?? ''])));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function act(item: AdminDispute, action: 'note' | 'return_to_release_review') {
    try {
      setBusyId(item.id); setError('');
      await apiFetch('/api/admin/payment-disputes', {
        method: 'PATCH',
        body: JSON.stringify({ action, disputeId: item.id, note: notes[item.id] ?? '' }),
      }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusyId(undefined); }
  }

  if (loading) return <LoadingScreen label="Loading BuildPay disputes…" />;
  const active = rows.filter((item) => item.status !== 'resolved_release');
  const resolved = rows.filter((item) => item.status === 'resolved_release');

  return <Screen title="BuildPay disputes" subtitle="Review paused stage payments. An administrator can record a review and return a stage to homeowner release review, but this screen never silently transfers or refunds money.">
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {!active.length ? <EmptyState title="No active BuildPay disputes" body="There are no open, responded or escalated stage-payment issues waiting for review." /> : active.map((item) => {
      const busy = busyId === item.id;
      return <AppCard key={item.id} style={item.status === 'escalated' ? styles.escalated : undefined}>
        <View style={styles.row}>
          <View style={styles.chips}><Chip icon="alert-circle-outline">{label(item.status)}</Chip><Chip>{item.paymentStatus}</Chip><Chip>{formatMoney(item.milestoneAmount)}</Chip></View>
          <Text style={styles.muted}>{new Date(item.createdAt).toLocaleString('en-GB')}</Text>
        </View>
        <Text variant="titleLarge" style={styles.title}>{item.jobTitle}</Text>
        <Text variant="titleMedium" style={styles.title}>{item.milestoneTitle}</Text>
        <Text style={styles.muted}>Homeowner: {item.customerEmail ?? 'Unknown'} · Tradesperson: {item.traderEmail ?? 'Unknown'}</Text>
        <Text variant="labelLarge">Homeowner issue</Text><Text>{item.reason}</Text>
        {item.traderResponse ? <><Text variant="labelLarge">Tradesperson response</Text><Text>{item.traderResponse}</Text></> : <Text style={styles.muted}>No tradesperson response recorded yet.</Text>}
        {item.escalationNote ? <><Text variant="labelLarge">Escalation</Text><Text>{item.escalationNote}</Text></> : null}
        <TextInput mode="outlined" multiline label="Admin review note" value={notes[item.id] ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [item.id]: value }))} />
        <View style={styles.actions}>
          <Button mode="outlined" loading={busy && busyId === item.id} disabled={busy || (notes[item.id] ?? '').trim().length < 3} onPress={() => void act(item, 'note')}>Save review note</Button>
          <Button mode="contained" loading={busy && busyId === item.id} disabled={busy || (notes[item.id] ?? '').trim().length < 10 || item.paymentStatus !== 'disputed' || item.milestoneStatus !== 'disputed'} onPress={() => void act(item, 'return_to_release_review')}>Return to homeowner release review</Button>
        </View>
        <Text style={styles.warning}>This does not transfer the stage. It removes the dispute pause and puts the stage back at homeowner approval. Refunds and chargeback outcomes remain separate financial actions until BuildPair's adjudication/refund policy is formally approved.</Text>
      </AppCard>;
    })}

    {resolved.length ? <><Text variant="titleLarge" style={styles.title}>Resolved history</Text>{resolved.slice(0, 50).map((item) => <AppCard key={item.id}><View style={styles.row}><Chip icon="check-circle-outline">Resolved</Chip><Text style={styles.muted}>{item.resolvedAt ? new Date(item.resolvedAt).toLocaleString('en-GB') : ''}</Text></View><Text variant="titleMedium" style={styles.title}>{item.jobTitle} · {item.milestoneTitle}</Text><Text>{item.resolutionNote ?? item.adminNote ?? 'Returned to release review.'}</Text></AppCard>)}</> : null}
  </Screen>;
}

function label(status: AdminDispute['status']) {
  if (status === 'responded') return 'Response received';
  if (status === 'escalated') return 'Escalated';
  if (status === 'resolved_release') return 'Resolved';
  return 'Open';
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  warning: { color: colors.warning, lineHeight: 20, fontWeight: '700' },
  escalated: { borderColor: colors.danger, borderWidth: 2 },
});
