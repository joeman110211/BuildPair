import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

const TRADE_REASONS = [
  ['weather','Weather'], ['materials','Materials / delivery'], ['illness_staffing','Illness / staffing'],
  ['access','Access'], ['site_condition','Unexpected site condition'], ['other','Other'],
] as const;
const CUSTOMER_REASONS = [
  ['access','Access'], ['customer_change','Decision / scope change'], ['availability','Availability'], ['other','Other'],
] as const;

export function ProjectUpdateComposer({ jobId, role }: { jobId:string; role:'customer'|'trader' }) {
  const { getToken } = useAuth();
  const options = role === 'trader' ? TRADE_REASONS : CUSTOMER_REASONS;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(options[0][0]);
  const [note, setNote] = useState('');
  const [revisedDate, setRevisedDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function send() {
    try {
      setBusy(true); setError(''); setStatus('');
      await apiFetch(`/api/jobs/${jobId}/project-update`, { method:'POST', body:JSON.stringify({ reason, note, revisedDate }) }, getToken);
      setNote(''); setRevisedDate(''); setOpen(false); setStatus('Project update sent and added to the timeline ✓');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  return <AppCard style={styles.card}>
    <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Delay or problem?</Text><Text style={styles.muted}>Record it once in the project instead of letting an important change disappear into a phone call or WhatsApp thread.</Text></View><Button mode={open ? 'text' : 'outlined'} icon="alert-circle-outline" onPress={() => setOpen((value) => !value)}>{open ? 'Close' : 'Report a delay / problem'}</Button></View>
    {open ? <View style={styles.form}>
      <Text variant="labelLarge">What happened?</Text>
      <View style={styles.chips}>{options.map(([value,label]) => <Chip key={value} selected={reason === value} showSelectedCheck onPress={() => setReason(value)}>{label}</Chip>)}</View>
      <TextInput mode="outlined" label="What does the other person need to know?" value={note} onChangeText={setNote} multiline maxLength={1200} />
      <TextInput mode="outlined" label="Revised / expected date YYYY-MM-DD (optional)" value={revisedDate} onChangeText={setRevisedDate} keyboardType="numbers-and-punctuation" />
      <Text style={styles.muted}>This records an update and notifies the other party. It does not silently change the agreed quote, price or payment stages.</Text>
      <Button mode="contained" loading={busy} disabled={busy || note.trim().length < 8} onPress={() => void send()}>Send project update</Button>
    </View> : null}
    <HelperText type="info" visible={Boolean(status)}>{status}</HelperText>
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </AppCard>;
}

const styles = StyleSheet.create({
  card:{ backgroundColor:colors.surfaceSoft },
  row:{ flexDirection:'row', flexWrap:'wrap', gap:spacing.sm, justifyContent:'space-between', alignItems:'center' },
  flex:{ flex:1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap:4 },
  form:{ gap:spacing.sm },
  chips:{ flexDirection:'row', flexWrap:'wrap', gap:6 },
  title:{ color:colors.charcoal, fontWeight:'900' },
  muted:{ color:colors.muted, lineHeight:21 },
});
