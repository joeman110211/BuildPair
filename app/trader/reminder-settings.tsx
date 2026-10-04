import { useAuth } from '@clerk/expo';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/BrandButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Rules = {
  quoteRemindersEnabled: boolean;
  quoteAfterDays: number;
  invoiceDueRemindersEnabled: boolean;
  invoiceDueBeforeDays: number;
  invoiceOverdueRemindersEnabled: boolean;
  invoiceOverdueAfterDays: number;
};

export default function ReminderSettingsScreen() {
  const { getToken } = useAuth();
  const [rules, setRules] = useState<Rules>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void apiFetch<Rules>('/api/reminder-rules', {}, getToken)
      .then((value) => { if (active) setRules(value); })
      .catch((e) => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [getToken]);

  async function save() {
    if (!rules) return;
    try {
      setBusy(true); setError(''); setSaved(false);
      const next = await apiFetch<Rules>('/api/reminder-rules', {
        method: 'PUT',
        body: JSON.stringify(rules),
      }, getToken);
      setRules(next);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!rules && !error) return <LoadingScreen label="Loading reminder rules…" />;

  return <Screen title="Automatic reminders" subtitle="Choose when BuildPair should send a polite follow-up for your quotes and invoices.">
    {rules ? <>
      <AppCard>
        <View style={styles.row}>
          <View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Quote follow-ups</Text><Text style={styles.muted}>Send one automatic reminder when a sent quote has been waiting for a decision.</Text></View>
          <Switch value={rules.quoteRemindersEnabled} onValueChange={(value) => setRules({ ...rules, quoteRemindersEnabled: value })} />
        </View>
        <TextInput mode="outlined" label="Days after quote is sent" keyboardType="number-pad" disabled={!rules.quoteRemindersEnabled} value={String(rules.quoteAfterDays)} onChangeText={(value) => setRules({ ...rules, quoteAfterDays: Math.max(2, Math.min(30, Number(value || 2))) })} />
      </AppCard>

      <AppCard>
        <View style={styles.row}>
          <View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Invoice due reminder</Text><Text style={styles.muted}>Send a reminder on or shortly before the invoice due date.</Text></View>
          <Switch value={rules.invoiceDueRemindersEnabled} onValueChange={(value) => setRules({ ...rules, invoiceDueRemindersEnabled: value })} />
        </View>
        <TextInput mode="outlined" label="Days before due date" keyboardType="number-pad" disabled={!rules.invoiceDueRemindersEnabled} value={String(rules.invoiceDueBeforeDays)} onChangeText={(value) => setRules({ ...rules, invoiceDueBeforeDays: Math.max(0, Math.min(14, Number(value || 0))) })} />
      </AppCard>

      <AppCard>
        <View style={styles.row}>
          <View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Overdue invoice reminder</Text><Text style={styles.muted}>Send one automatic follow-up after an unpaid invoice passes its due date.</Text></View>
          <Switch value={rules.invoiceOverdueRemindersEnabled} onValueChange={(value) => setRules({ ...rules, invoiceOverdueRemindersEnabled: value })} />
        </View>
        <TextInput mode="outlined" label="Days after due date" keyboardType="number-pad" disabled={!rules.invoiceOverdueRemindersEnabled} value={String(rules.invoiceOverdueAfterDays)} onChangeText={(value) => setRules({ ...rules, invoiceOverdueAfterDays: Math.max(1, Math.min(30, Number(value || 1))) })} />
      </AppCard>

      <Text style={styles.muted}>BuildPair keeps a reminder audit and blocks another reminder for the same item within 48 hours, including manual reminders.</Text>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      {saved ? <HelperText type="info" visible>Reminder rules saved.</HelperText> : null}
      <Button mode="contained" icon="content-save-outline" loading={busy} disabled={busy} onPress={() => void save()}>Save reminder rules</Button>
    </> : <HelperText type="error" visible>{error}</HelperText>}
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  flex: { flex: 1, minWidth: 0, flexBasis: 240, flexShrink: 1, maxWidth: '100%', gap: spacing.xxs },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
});
