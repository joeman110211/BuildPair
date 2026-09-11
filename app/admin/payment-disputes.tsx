import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type Dispute = {
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
  disputeReason: string | null;
  disputeStatus: 'open' | 'trader_response' | 'escalated';
  disputeResponse: string | null;
  disputeResponseAt: string | null;
  disputeEscalatedAt: string | null;
  resolutionNote: string | null;
  refundRequestedAt: string | null;
  refundApprovedAt: string | null;
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string;
  businessName: string | null;
};

export default function AdminPaymentDisputesScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [rows, setRows] = useState<Dispute[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string>();
  const [error, setError] = useState('');
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try { setRows(await apiFetch<Dispute[]>('/api/admin/payment-disputes', {}, () => getTokenRef.current())); setError(''); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function saveNote(row: Dispute) {
    const note = (notes[row.milestoneId] ?? row.resolutionNote ?? '').trim();
    if (note.length < 5) return;
    try {
      setSaving(row.milestoneId); setError('');
      await apiFetch('/api/admin/payment-disputes', { method: 'POST', body: JSON.stringify({ milestoneId: row.milestoneId, note }) }, () => getTokenRef.current());
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(undefined); }
  }

  if (loading) return <LoadingScreen label="Loading BuildPay issues…" />;
  return <Screen title="BuildPay issues" subtitle="Unreleased payment stages that are paused, awaiting a response or escalated for human attention.">
    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Admin review, not automatic adjudication</Text>
      <Text style={styles.muted}>BuildPair can preserve the record, keep unreleased funds paused, help the parties communicate and record agreed outcomes. Do not treat this screen as permission to decide workmanship or release/refund money without the relevant payment and legal basis.</Text>
      <Button icon="refresh" onPress={() => void load()}>Refresh queue</Button>
    </AppCard>
    {error ? <HelperText type="error">{error}</HelperText> : null}
    {!rows.length ? <AppCard><Chip icon="check-circle-outline">Clear</Chip><Text>No open BuildPay issues need admin attention.</Text></AppCard> : rows.map((row) => <AppCard key={row.milestoneId} style={row.disputeStatus === 'escalated' ? styles.escalated : undefined}>
      <View style={styles.header}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>{row.jobTitle}</Text><Text variant="titleMedium">{row.milestoneTitle} · {formatMoney(row.amount)}</Text><Text style={styles.muted}>{row.businessName ?? row.traderId}</Text></View><Chip icon={row.disputeStatus === 'escalated' ? 'alert' : 'pause-circle-outline'}>{row.disputeStatus.replaceAll('_', ' ')}</Chip></View>
      <Text variant="labelLarge">Homeowner issue</Text><Text>{row.disputeReason || 'No reason recorded.'}</Text>
      {row.disputeResponse ? <><Text variant="labelLarge">Tradesperson response</Text><Text>{row.disputeResponse}</Text></> : null}
      {row.refundRequestedAt ? <Chip icon="cash-refund">Refund requested</Chip> : null}
      <TextInput mode="outlined" label="Admin note" value={notes[row.milestoneId] ?? row.resolutionNote ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [row.milestoneId]: value }))} multiline />
      <Button mode="outlined" loading={saving === row.milestoneId} disabled={Boolean(saving)} onPress={() => void saveNote(row)}>Save admin note</Button>
      <Text selectable style={styles.id}>job {row.jobId} · stage {row.milestoneId}</Text>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  escalated: { borderColor: colors.danger, borderWidth: 2 },
  id: { color: colors.muted, fontFamily: 'monospace', fontSize: 11 },
});
