import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  vatAmount: number;
  depositAmount: number;
  totalAmount: number;
  dueAt: string | null;
  status: 'draft' | 'sent' | 'paid' | 'void' | 'overdue';
  createdAt: string;
};

export default function InvoicesScreen() {
  const { getToken } = useAuth();
  const [renderedAt] = useState(() => Date.now());
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setLoading(true); setError(''); setInvoices(await apiFetch('/api/invoices', {}, getToken)); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function sendReminder(id: string) {
    try {
      setBusy(id); setError('');
      await apiFetch('/api/business-reminders', { method: 'POST', body: JSON.stringify({ kind: 'invoice', id }) }, getToken);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(undefined); }
  }

  async function changeStatus(id: string, action: 'send' | 'paid' | 'void') {
    try {
      setBusy(id); setError('');
      await apiFetch(`/api/invoices/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(undefined); }
  }

  if (loading) return <LoadingScreen label="Loading invoices…" />;
  return <Screen title="Invoices" subtitle="Keep sent, paid and outstanding invoices in one place.">
    <Link href="/trader/invoices/new" asChild><Button mode="contained" icon="plus">New invoice</Button></Link>
    {error ? <EmptyState title="Something needs attention" body={error} action={<Button onPress={load}>Try again</Button>} /> : null}
    {!error && !invoices.length ? <EmptyState title="No invoices yet" body="Create your first invoice and it will stay here for tracking." action={<Link href="/trader/invoices/new" asChild><Button mode="contained">Create invoice</Button></Link>} /> : invoices.map((invoice) => {
      const overdue = invoice.status === 'sent' && invoice.dueAt && new Date(invoice.dueAt).getTime() < renderedAt;
      const displayStatus = overdue ? 'overdue' : invoice.status;
      return <AppCard key={invoice.id}>
        <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Invoice {invoice.invoiceNumber}</Text><Text style={styles.muted}>{invoice.customerName} · {invoice.customerEmail}</Text></View><Chip>{displayStatus}</Chip></View>
        <View style={styles.row}><Text>Total</Text><Text variant="titleLarge" style={styles.total}>{formatMoney(invoice.totalAmount)}</Text></View>
        {invoice.depositAmount ? <Text style={styles.muted}>Deposit recorded: {formatMoney(invoice.depositAmount)}</Text> : null}
        {invoice.dueAt ? <Text style={overdue ? styles.overdue : styles.muted}>Due {new Date(invoice.dueAt).toLocaleDateString('en-GB')}</Text> : null}
        {invoice.status !== 'paid' && invoice.status !== 'void' ? <View style={styles.actions}>{invoice.status === 'draft' ? <Button mode="contained" icon="email-send" loading={busy === invoice.id} disabled={Boolean(busy)} onPress={() => changeStatus(invoice.id, 'send')}>Send invoice</Button> : (() => { const dueSoon = Boolean(invoice.dueAt && new Date(invoice.dueAt).getTime() - renderedAt <= 48 * 60 * 60 * 1000); const oldEnoughWithoutDueDate = !invoice.dueAt && renderedAt - new Date(invoice.createdAt).getTime() >= 7 * 24 * 60 * 60 * 1000; return overdue || dueSoon || oldEnoughWithoutDueDate ? <Button mode="outlined" icon="bell-outline" loading={busy === invoice.id} disabled={Boolean(busy)} onPress={() => void sendReminder(invoice.id)}>{overdue ? 'Remind overdue' : 'Friendly reminder'}</Button> : null; })()}<Button mode={invoice.status === 'draft' ? 'outlined' : 'contained'} loading={busy === invoice.id} disabled={Boolean(busy)} onPress={() => changeStatus(invoice.id, 'paid')}>Mark paid</Button><Button mode="outlined" disabled={Boolean(busy)} onPress={() => changeStatus(invoice.id, 'void')}>Void</Button></View> : null}
      </AppCard>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, flex: { flex: 1, minWidth: 180 }, title: { fontWeight: '800' }, muted: { color: colors.muted }, total: { color: colors.primary, fontWeight: '900' }, overdue: { color: colors.danger, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' } });
