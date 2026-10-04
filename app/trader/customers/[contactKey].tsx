import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/BrandButton';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type Note = { id:string; note:string; followUpAt:string|null; completedAt:string|null; createdAt:string; updatedAt:string };
type QuoteRow = { id:string; quoteNumber:string; jobTitle:string; jobAddress:string|null; totalAmount:number; status:string; managedJobId:string|null; warrantyText:string|null; createdAt:string };
type InvoiceRow = { id:string; invoiceNumber:string; totalAmount:number; status:string; dueAt:string|null; createdAt:string };
type AftercareRow = { id:string; jobId:string; entryType:string; title:string; body:string; dueAt:string|null; status:string; createdAt:string };
type CustomerDetail = {
  contactKey:string; name:string; email:string|null; phone:string|null; addresses:string[];
  outstandingValue:number; managedJobs:string[]; nextFollowUp:string|null;
  quotes:QuoteRow[]; invoices:InvoiceRow[]; notes:Note[]; aftercare:AftercareRow[];
};

export default function CustomerDetailScreen() {
  const { contactKey } = useLocalSearchParams<{ contactKey: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CustomerDetail>();
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!contactKey) return;
    try {
      setData(await apiFetch<CustomerDetail>(`/api/trader-customers/detail?contactKey=${encodeURIComponent(contactKey)}`, {}, getToken));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [contactKey, getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function addNote() {
    if (!data || note.trim().length < 1) return;
    try {
      setBusy(true); setError('');
      const followUpAt = followUpDate.trim() ? new Date(`${followUpDate.trim()}T09:00:00`).toISOString() : null;
      await apiFetch('/api/trader-customers/detail', {
        method: 'POST',
        body: JSON.stringify({ contactKey: data.contactKey, note: note.trim(), followUpAt }),
      }, getToken);
      setNote(''); setFollowUpDate('');
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function noteAction(id: string, action: 'complete' | 'reopen') {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/trader-customers/detail', { method:'PATCH', body:JSON.stringify({ id, action }) }, getToken);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (!data && !error) return <LoadingScreen label="Loading customer history…" />;
  if (!data) return <Screen title="Customer"><EmptyState title="Customer history unavailable" body={error} /></Screen>;

  return <Screen title={data.name} subtitle="Customer history, follow-ups and repeat work in one place.">
    <AppCard>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>{data.name}</Text>
          {data.email ? <Text style={styles.muted}>{data.email}</Text> : null}
          {data.phone ? <Text style={styles.muted}>{data.phone}</Text> : null}
        </View>
        {data.outstandingValue > 0 ? <Chip icon="alert-circle-outline">{formatMoney(data.outstandingValue)} outstanding</Chip> : <Chip icon="check-circle-outline">No outstanding invoices</Chip>}
      </View>
      <View style={styles.actions}>
        <Button compact mode="contained" icon="file-document-edit-outline" onPress={() => router.push({ pathname:'/trader/quotes/new', params:{ customerName:data.name, customerEmail:data.email ?? '', customerPhone:data.phone ?? '' } } as Href)}>New quote</Button>
        {data.email ? <Button compact mode="outlined" icon="receipt-text-outline" onPress={() => router.push({ pathname:'/trader/invoices/new', params:{ customerName:data.name, customerEmail:data.email } } as Href)}>New invoice</Button> : null}
        {data.email ? <Button compact icon="email-outline" onPress={() => void Linking.openURL(`mailto:${data.email}`)}>Email</Button> : null}
        {data.phone ? <Button compact icon="phone-outline" onPress={() => void Linking.openURL(`tel:${data.phone}`)}>Call</Button> : null}
      </View>
    </AppCard>

    {data.addresses.length ? <AppCard>
      <Text variant="titleMedium" style={styles.title}>Known job addresses</Text>
      {data.addresses.map((address) => <Text key={address} style={styles.muted}>• {address}</Text>)}
    </AppCard> : null}

    <AppCard>
      <Text variant="titleMedium" style={styles.title}>Notes & follow-up</Text>
      <TextInput mode="outlined" label="Customer note" value={note} onChangeText={setNote} multiline numberOfLines={3} />
      <TextInput mode="outlined" label="Follow-up date YYYY-MM-DD (optional)" value={followUpDate} onChangeText={setFollowUpDate} keyboardType="numbers-and-punctuation" />
      <Button mode="contained" icon="plus" disabled={busy || !note.trim()} loading={busy} onPress={() => void addNote()}>Add note</Button>
      {data.nextFollowUp ? <Chip icon="calendar-clock">Next follow-up {new Date(data.nextFollowUp).toLocaleDateString('en-GB')}</Chip> : null}
      {!data.notes.length ? <Text style={styles.muted}>No customer notes yet.</Text> : data.notes.map((item) => <View key={item.id} style={styles.note}>
        <View style={styles.flex}><Text>{item.note}</Text><Text variant="bodySmall" style={styles.muted}>{item.followUpAt ? `Follow up ${new Date(item.followUpAt).toLocaleDateString('en-GB')}` : `Added ${new Date(item.createdAt).toLocaleDateString('en-GB')}`}</Text></View>
        <Button compact disabled={busy} onPress={() => void noteAction(item.id, item.completedAt ? 'reopen' : 'complete')}>{item.completedAt ? 'Reopen' : 'Done'}</Button>
      </View>)}
    </AppCard>

    <AppCard>
      <View style={styles.row}><Text variant="titleMedium" style={styles.title}>Quotes</Text><Chip>{data.quotes.length}</Chip></View>
      {!data.quotes.length ? <Text style={styles.muted}>No quotes recorded.</Text> : data.quotes.map((quote) => <View key={quote.id} style={styles.historyRow}>
        <View style={styles.flex}><Text style={styles.title}>{quote.jobTitle}</Text><Text style={styles.muted}>{quote.quoteNumber} · {quote.status}{quote.jobAddress ? ` · ${quote.jobAddress}` : ''}</Text></View>
        <Text style={styles.money}>{formatMoney(quote.totalAmount)}</Text>
        <Button compact mode="outlined" icon="content-copy" onPress={() => router.push(`/trader/quotes/new?cloneQuoteId=${encodeURIComponent(quote.id)}` as Href)}>Repeat quote</Button>
        {quote.managedJobId ? <Button compact mode="text" onPress={() => router.push(`/trader/jobs/${quote.managedJobId}` as Href)}>Project</Button> : null}
      </View>)}
    </AppCard>

    <AppCard>
      <View style={styles.row}><Text variant="titleMedium" style={styles.title}>Invoices</Text><Chip>{data.invoices.length}</Chip></View>
      {!data.invoices.length ? <Text style={styles.muted}>No invoices recorded.</Text> : data.invoices.map((invoice) => <View key={invoice.id} style={styles.historyRow}>
        <View style={styles.flex}><Text style={styles.title}>Invoice {invoice.invoiceNumber}</Text><Text style={styles.muted}>{invoice.status}{invoice.dueAt ? ` · due ${new Date(invoice.dueAt).toLocaleDateString('en-GB')}` : ''}</Text></View>
        <Text style={styles.money}>{formatMoney(invoice.totalAmount)}</Text>
      </View>)}
    </AppCard>

    {data.aftercare.length ? <AppCard>
      <View style={styles.row}><Text variant="titleMedium" style={styles.title}>Warranty & aftercare</Text><Chip>{data.aftercare.length}</Chip></View>
      {data.aftercare.map((item) => <View key={item.id} style={styles.historyRow}><View style={styles.flex}><Text style={styles.title}>{item.title}</Text><Text style={styles.muted}>{item.entryType}{item.dueAt ? ` · ${new Date(item.dueAt).toLocaleDateString('en-GB')}` : ''} · {item.status}</Text>{item.body ? <Text style={styles.muted}>{item.body}</Text> : null}</View><Button compact mode="text" onPress={() => router.push(`/trader/jobs/${item.jobId}` as Href)}>Open job</Button></View>)}
    </AppCard> : null}

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </Screen>;
}

const styles = StyleSheet.create({
  row:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:spacing.sm},
  flex:{flex:1,minWidth:0,flexBasis:220,flexShrink:1,gap:4},
  title:{color:colors.charcoal,fontWeight:'900'},
  muted:{color:colors.muted,lineHeight:21},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:6},
  note:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start',paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:colors.border},
  historyRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:colors.border},
  money:{color:colors.primary,fontWeight:'900'},
});
