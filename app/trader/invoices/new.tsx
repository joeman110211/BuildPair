import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney, poundsToPence } from '@/lib/money';

type Line = { description: string; quantity: string; unitPrice: string };

export default function NewInvoiceScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { customerName: presetCustomerName, customerEmail: presetCustomerEmail } = useLocalSearchParams<{ customerName?: string; customerEmail?: string }>();
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`);
  const [customerName, setCustomerName] = useState(presetCustomerName ?? '');
  const [customerEmail, setCustomerEmail] = useState(presetCustomerEmail ?? '');
  const [items, setItems] = useState<Line[]>([{ description: 'Labour', quantity: '1', unitPrice: '' }]);
  const [vat, setVat] = useState('no');
  const [deposit, setDeposit] = useState('');
  const [dueDays, setDueDays] = useState('14');
  const [notes, setNotes] = useState('');
  const [sendNow, setSendNow] = useState('yes');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Math.round(Number(item.quantity || 0) * poundsToPence(item.unitPrice)), 0);
    const vatAmount = vat === 'yes' ? Math.round(subtotal * 0.2) : 0;
    return { subtotal, vatAmount, total: subtotal + vatAmount };
  }, [items, vat]);
  function update(index: number, key: keyof Line, value: string) { setItems((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  async function submit() {
    try {
      setBusy(true); setError('');
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + Number(dueDays));
      const result = await apiFetch<{ deliveryWarning?: string }>('/api/invoices', { method: 'POST', body: JSON.stringify({ invoiceNumber, customerName, customerEmail, items: items.map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPrice: poundsToPence(item.unitPrice) })), vatAmount: totals.vatAmount, depositAmount: poundsToPence(deposit), dueAt: dueAt.toISOString(), notes, sendNow: sendNow === 'yes' }) }, getToken);
      if (result.deliveryWarning) alert(result.deliveryWarning);
      router.replace('/trader/invoices');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const valid = invoiceNumber && customerName.length >= 2 && customerEmail.includes('@') && items.every((item) => item.description.length >= 2 && Number(item.quantity) > 0) && totals.total > 0 && poundsToPence(deposit) <= totals.total;
  const footer = <Button mode="contained" loading={busy} disabled={!valid || busy} onPress={submit}>{sendNow === 'yes' ? 'Save and send invoice' : 'Save draft'}</Button>;

  return <Screen title="Create invoice" subtitle="Itemise it properly. ‘Building work — £4,000’ helps absolutely nobody." footer={footer}>
    <TextInput label="Invoice number" value={invoiceNumber} onChangeText={setInvoiceNumber} mode="outlined" /><TextInput label="Customer name" value={customerName} onChangeText={setCustomerName} mode="outlined" /><TextInput label="Customer email" value={customerEmail} onChangeText={setCustomerEmail} mode="outlined" keyboardType="email-address" autoCapitalize="none" />
    <Text variant="titleLarge">Items</Text>{items.map((item, index) => <AppCard key={index}><TextInput label="Description" value={item.description} onChangeText={(value) => update(index, 'description', value)} mode="outlined" /><View style={styles.row}><TextInput style={styles.half} label="Quantity" value={item.quantity} onChangeText={(value) => update(index, 'quantity', value)} keyboardType="decimal-pad" mode="outlined" /><TextInput style={styles.half} label="Unit price (£)" value={item.unitPrice} onChangeText={(value) => update(index, 'unitPrice', value)} keyboardType="decimal-pad" mode="outlined" /></View>{items.length > 1 ? <Button textColor="#B91C1C" onPress={() => setItems((current) => current.filter((_, i) => i !== index))}>Remove line</Button> : null}</AppCard>)}
    <Button mode="outlined" icon="plus" onPress={() => setItems((current) => [...current, { description: '', quantity: '1', unitPrice: '' }])}>Add line item</Button>
    <Text variant="labelLarge">Add 20% VAT?</Text><SegmentedButtons value={vat} onValueChange={setVat} buttons={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} /><TextInput label="Deposit already paid / requested (£)" value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" mode="outlined" />
    <Text variant="labelLarge">Payment due</Text><SegmentedButtons value={dueDays} onValueChange={setDueDays} buttons={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} />
    <TextInput label="Notes" value={notes} onChangeText={setNotes} mode="outlined" multiline />
    <AppCard><Text>Subtotal: {formatMoney(totals.subtotal)}</Text><Text>VAT: {formatMoney(totals.vatAmount)}</Text><Text variant="headlineSmall">Total: {formatMoney(totals.total)}</Text></AppCard>
    <Text variant="labelLarge">Email it now?</Text><SegmentedButtons value={sendNow} onValueChange={setSendNow} buttons={[{ value: 'yes', label: 'Save & email' }, { value: 'no', label: 'Save draft' }]} /><HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </Screen>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 10 }, half: { flex: 1 } });
