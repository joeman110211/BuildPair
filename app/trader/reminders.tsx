import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/BrandButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Preferences = {
  quoteEnabled: boolean;
  quoteAfterDays: number;
  invoiceDueEnabled: boolean;
  invoiceOverdueEnabled: boolean;
  overdueAfterDays: number;
};

export default function ReminderSettingsScreen() {
  const { getToken } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>();
  const [quoteDays, setQuoteDays] = useState('3');
  const [overdueDays, setOverdueDays] = useState('3');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<Preferences>('/api/reminder-preferences', {}, getToken);
      setPrefs(result);
      setQuoteDays(String(result.quoteAfterDays));
      setOverdueDays(String(result.overdueAfterDays));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, [getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function save() {
    if (!prefs) return;
    try {
      setBusy(true); setSaved(false); setError('');
      const result = await apiFetch<Preferences>('/api/reminder-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          ...prefs,
          quoteAfterDays: Number(quoteDays),
          overdueAfterDays: Number(overdueDays),
        }),
      }, getToken);
      setPrefs(result);
      setQuoteDays(String(result.quoteAfterDays));
      setOverdueDays(String(result.overdueAfterDays));
      setSaved(true);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (!prefs) return <LoadingScreen label="Loading reminder rules…" />;

  return <Screen title="Automatic reminders" subtitle="Choose when BuildPair should send a polite follow-up for your own customer quotes and invoices.">
    <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Quote follow-up</Text><Text style={styles.muted}>Send one automatic friendly reminder when an outside-customer quote is still awaiting a decision.</Text></View><Switch value={prefs.quoteEnabled} onValueChange={(value) => setPrefs((current) => current ? { ...current, quoteEnabled: value } : current)} /></View>
      <TextInput mode="outlined" label="Days after quote is sent" value={quoteDays} onChangeText={setQuoteDays} keyboardType="number-pad" disabled={!prefs.quoteEnabled} />
      <Text variant="bodySmall" style={styles.muted}>Minimum 2 days. Manual reminders remain available and BuildPair keeps the existing anti-pestering throttle.</Text>
    </AppCard>

    <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Invoice due reminder</Text><Text style={styles.muted}>Send one friendly reminder when an outstanding invoice reaches its due date.</Text></View><Switch value={prefs.invoiceDueEnabled} onValueChange={(value) => setPrefs((current) => current ? { ...current, invoiceDueEnabled: value } : current)} /></View>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Overdue reminder</Text><Text style={styles.muted}>Send one further reminder only after the invoice has remained outstanding for the delay you choose.</Text></View><Switch value={prefs.invoiceOverdueEnabled} onValueChange={(value) => setPrefs((current) => current ? { ...current, invoiceOverdueEnabled: value } : current)} /></View>
      <TextInput mode="outlined" label="Days overdue before reminder" value={overdueDays} onChangeText={setOverdueDays} keyboardType="number-pad" disabled={!prefs.invoiceOverdueEnabled} />
    </AppCard>

    {saved ? <Text style={styles.saved}>Reminder rules saved ✓</Text> : null}
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" icon="content-save-outline" loading={busy} disabled={busy || Number(quoteDays) < 2 || Number(quoteDays) > 30 || Number(overdueDays) < 1 || Number(overdueDays) > 30} onPress={() => void save()}>Save reminder rules</Button>
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, gap: 4 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  saved: { color: colors.success, fontWeight: '800' },
});
