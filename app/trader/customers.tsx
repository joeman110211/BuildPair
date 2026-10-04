import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Chip, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type CustomerRow = {
  contactKey: string; name: string; email: string | null; phone: string | null; lastActivity: string;
  quoteCount: number; acceptedQuoteValue: number; invoiceCount: number; invoicedValue: number;
  outstandingValue: number; managedJobCount: number; addresses: string[]; latestQuoteId: string | null;
  openAftercareCount: number; notes: string;
};

export default function TraderCustomersScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const next = await apiFetch<CustomerRow[]>('/api/trader-customers', {}, getToken);
      setRows(next);
      setNotes(Object.fromEntries(next.map((row) => [row.contactKey, row.notes ?? ''])));
      setError('');
    }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function saveNote(row: CustomerRow) {
    try {
      setSavingNote(row.contactKey); setError('');
      await apiFetch('/api/trader-customers', { method: 'PATCH', body: JSON.stringify({ contactKey: row.contactKey, notes: notes[row.contactKey] ?? '' }) }, getToken);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSavingNote(undefined); }
  }

  if (loading) return <LoadingScreen label="Loading customers…" />;

  return <Screen title="Customer book" subtitle="Customers from outside quotes and invoices stay together so BuildPair remains useful even when BuildPair did not generate the lead.">
    {error ? <EmptyState title="Customer book needs attention" body={error} /> : null}
    {!rows.length ? <EmptyState title="No customer history yet" body="Create an outside-customer quote or invoice and that customer will appear here automatically." /> : rows.map((row) => <AppCard key={row.contactKey}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{row.name}</Text><Text style={styles.muted}>{row.email || row.phone || 'Customer details held on their documents'}</Text><Text style={styles.muted}>Last activity {new Date(row.lastActivity).toLocaleDateString('en-GB')}</Text></View><Chip>{row.quoteCount} quote{row.quoteCount === 1 ? '' : 's'}</Chip></View>
      <View style={styles.stats}><Text style={styles.stat}>Accepted quote value: <Text style={styles.strong}>{formatMoney(row.acceptedQuoteValue)}</Text></Text><Text style={styles.stat}>Invoices: <Text style={styles.strong}>{row.invoiceCount}</Text> · {formatMoney(row.invoicedValue)}</Text>{row.outstandingValue > 0 ? <Text style={styles.stat}>Outstanding: <Text style={styles.strong}>{formatMoney(row.outstandingValue)}</Text></Text> : null}</View>
      <View style={styles.chips}>
        {row.managedJobCount ? <Chip compact icon="briefcase-outline">{row.managedJobCount} managed job{row.managedJobCount === 1 ? '' : 's'}</Chip> : null}
        {row.openAftercareCount ? <Chip compact icon="calendar-heart">{row.openAftercareCount} aftercare item{row.openAftercareCount === 1 ? '' : 's'}</Chip> : null}
      </View>
      {row.addresses?.length ? <View style={styles.addresses}><Text variant="labelLarge" style={styles.title}>Known properties</Text>{row.addresses.slice(0, 4).map((address) => <Text key={address} style={styles.muted}>{address}</Text>)}</View> : null}
      <View style={styles.noteBox}>
        <TextInput mode="outlined" label="Private customer notes" value={notes[row.contactKey] ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [row.contactKey]: value }))} multiline maxLength={4000} />
        <Button compact mode="text" icon="content-save-outline" loading={savingNote === row.contactKey} disabled={Boolean(savingNote)} onPress={() => void saveNote(row)}>Save note</Button>
      </View>
      <View style={styles.actions}>
        <Button compact mode="contained" icon="file-document-edit-outline" onPress={() => router.push({ pathname: '/trader/quotes/new', params: { customerName: row.name, customerEmail: row.email ?? '', customerPhone: row.phone ?? '' } } as Href)}>New quote</Button>
        {row.latestQuoteId ? <Button compact mode="outlined" icon="content-copy" onPress={() => router.push({ pathname: '/trader/quotes/new', params: { copyQuoteId: row.latestQuoteId } } as Href)}>Repeat previous quote</Button> : null}
        {row.email ? <Button compact mode="outlined" icon="receipt-text-outline" onPress={() => router.push({ pathname: '/trader/invoices/new', params: { customerName: row.name, customerEmail: row.email } } as Href)}>New invoice</Button> : null}
        {row.email ? <Button compact icon="email-outline" onPress={() => void Linking.openURL(`mailto:${row.email}`)}>Email</Button> : null}
        {row.phone ? <Button compact icon="phone-outline" onPress={() => void Linking.openURL(`tel:${row.phone}`)}>Call</Button> : null}
      </View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 4 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  addresses: { gap: 3 },
  noteBox: { gap: 4 },
  stat: { color: colors.text },
  strong: { color: colors.charcoal, fontWeight: '900' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
