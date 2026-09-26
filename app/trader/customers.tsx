import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type CustomerRow = { contactKey: string; name: string; email: string | null; phone: string | null; lastActivity: string; quoteCount: number; acceptedQuoteValue: number; invoiceCount: number; invoicedValue: number };

export default function TraderCustomersScreen() {
  const { getToken } = useAuth();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setRows(await apiFetch<CustomerRow[]>('/api/trader-customers', {}, getToken)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <LoadingScreen label="Loading customers…" />;

  return <Screen title="Customer book" subtitle="Customers from outside quotes and invoices stay together so BuildPair remains useful even when BuildPair did not generate the lead.">
    {error ? <EmptyState title="Customer book needs attention" body={error} /> : null}
    {!rows.length ? <EmptyState title="No customer history yet" body="Create an outside-customer quote or invoice and that customer will appear here automatically." /> : rows.map((row) => <AppCard key={row.contactKey}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{row.name}</Text><Text style={styles.muted}>{row.email || row.phone || 'Customer details held on their documents'}</Text><Text style={styles.muted}>Last activity {new Date(row.lastActivity).toLocaleDateString('en-GB')}</Text></View><Chip>{row.quoteCount} quote{row.quoteCount === 1 ? '' : 's'}</Chip></View>
      <View style={styles.stats}><Text style={styles.stat}>Accepted quote value: <Text style={styles.strong}>{formatMoney(row.acceptedQuoteValue)}</Text></Text><Text style={styles.stat}>Invoices: <Text style={styles.strong}>{row.invoiceCount}</Text> · {formatMoney(row.invoicedValue)}</Text></View>
      <View style={styles.actions}>{row.email ? <Button compact icon="email-outline" onPress={() => void Linking.openURL(`mailto:${row.email}`)}>Email</Button> : null}{row.phone ? <Button compact icon="phone-outline" onPress={() => void Linking.openURL(`tel:${row.phone}`)}>Call</Button> : null}</View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, minWidth: 220, gap: 4 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { color: colors.text },
  strong: { color: colors.charcoal, fontWeight: '900' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
