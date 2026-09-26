import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { FormSelect } from '@/components/FormSelect';
import { PhotoUploader } from '@/components/PhotoUploader';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { AvailabilitySlot, TraderCredential, TraderProfile } from '@/types';

const CREDENTIAL_TYPES = ['identity','public_liability','qualification','gas_safe','niceic','napit','trustmark','other'] as const;

type CredentialType = typeof CREDENTIAL_TYPES[number];

export default function TraderTrustScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [credentials, setCredentials] = useState<TraderCredential[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [profile, setProfile] = useState<TraderProfile>();
  const [type, setType] = useState<CredentialType>('public_liability');
  const [name, setName] = useState('Public liability insurance');
  const [issuer, setIssuer] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [expiresDate, setExpiresDate] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [availabilityStart, setAvailabilityStart] = useState('');
  const [availabilityEnd, setAvailabilityEnd] = useState('');
  const [availabilityNote, setAvailabilityNote] = useState('Available for new work');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      const token = () => getTokenRef.current();
      const [credentialRows, availabilityRows, ownProfile] = await Promise.all([
        apiFetch<TraderCredential[]>('/api/credentials', {}, token),
        apiFetch<AvailabilitySlot[]>('/api/availability', {}, token),
        apiFetch<TraderProfile>('/api/me/profile', {}, token),
      ]);
      setCredentials(credentialRows); setAvailability(availabilityRows); setProfile(ownProfile); setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submitCredential() {
    try {
      setBusy(true); setError('');
      const expiresAt = expiresDate.trim() ? new Date(`${expiresDate.trim()}T23:59:59.000Z`).toISOString() : undefined;
      await apiFetch('/api/credentials', {
        method: 'POST',
        body: JSON.stringify({ credentialType: type, name, issuer: issuer || undefined, referenceNumber: referenceNumber || undefined, documentUrl: evidence[0], expiresAt }),
      }, () => getTokenRef.current());
      setIssuer(''); setReferenceNumber(''); setExpiresDate(''); setEvidence([]);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function addAvailability(dayOffset: number) {
    try {
      setBusy(true); setError('');
      const start = new Date();
      start.setDate(start.getDate() + dayOffset);
      start.setHours(8, 0, 0, 0);
      const end = new Date(start);
      end.setHours(18, 0, 0, 0);
      await apiFetch('/api/availability', { method: 'POST', body: JSON.stringify({ startsAt: start.toISOString(), endsAt: end.toISOString(), status: 'available', note: 'Available for new work' }) }, () => getTokenRef.current());
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function addAvailabilityRange() {
    try {
      setBusy(true); setError('');
      const start = new Date(`${availabilityStart.trim()}T08:00:00`);
      const end = new Date(`${availabilityEnd.trim() || availabilityStart.trim()}T18:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error('Enter availability dates as YYYY-MM-DD.');
      await apiFetch('/api/availability', { method: 'POST', body: JSON.stringify({ startsAt: start.toISOString(), endsAt: end.toISOString(), status: 'available', note: availabilityNote.trim() || 'Available for new work' }) }, () => getTokenRef.current());
      setAvailabilityStart(''); setAvailabilityEnd(''); setAvailabilityNote('Available for new work');
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function removeAvailability(id: string) {
    try {
      await apiFetch('/api/availability', { method: 'DELETE', body: JSON.stringify({ id }) }, () => getTokenRef.current());
      setAvailability((current) => current.filter((slot) => slot.id !== id));
    } catch (e) { setError(errorMessage(e)); }
  }

  if (loading) return <LoadingScreen label="Loading trust settings…" />;
  const verified = credentials.filter((credential) => credential.status === 'verified');
  const availabilityTier = profile?.subscriptionTier ?? 'free';
  const availabilityPlan = availabilityTier === 'featured'
    ? { name: 'Pro', horizon: '6 months', max: 'up to 180 availability windows' }
    : availabilityTier === 'basic'
      ? { name: 'Plus', horizon: '12 weeks', max: 'up to 24 availability windows' }
      : availabilityTier === 'core'
        ? { name: 'Core', horizon: '60 days', max: 'your next available window' }
        : null;
  return <Screen title="Trust & Availability" subtitle="Show homeowners what has actually been checked and when you can realistically take new work.">
    <View style={styles.stats}>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{verified.length}</Text><Text style={styles.muted}>verified credentials</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{availability.length}</Text><Text style={styles.muted}>upcoming availability slots</Text></AppCard>
    </View>

    {error ? <HelperText type="error" visible>{error}</HelperText> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Verification evidence</Text>
      <Text style={styles.muted}>Submit insurance, identity, qualifications or regulator details. BuildPair only shows a public verified badge after an admin review.</Text>
      <FormSelect label="Credential type" value={type} options={CREDENTIAL_TYPES} onChange={setType} />
      <TextInput mode="outlined" label="Credential / policy name" value={name} onChangeText={setName} />
      <TextInput mode="outlined" label="Issuer (optional)" value={issuer} onChangeText={setIssuer} />
      <TextInput mode="outlined" label="Reference / registration number (optional)" value={referenceNumber} onChangeText={setReferenceNumber} />
      <TextInput mode="outlined" label="Expiry date YYYY-MM-DD (optional)" value={expiresDate} onChangeText={setExpiresDate} keyboardType="numbers-and-punctuation" />
      <PhotoUploader kind="trader" photos={evidence} onChange={setEvidence} max={1} />
      <Button mode="contained" icon="shield-check-outline" loading={busy} disabled={busy || name.trim().length < 2} onPress={() => void submitCredential()}>Submit for verification</Button>
    </AppCard>

    <View style={styles.sectionHeading}><Text variant="titleLarge" style={styles.title}>Your credentials</Text></View>
    {!credentials.length ? <EmptyState title="No credentials submitted" body="Add evidence above to start building a verified trust profile." /> : credentials.map((credential) => <AppCard key={credential.id}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{credential.name}</Text><Text style={styles.muted}>{credential.issuer || credential.credentialType.replaceAll('_', ' ')}</Text></View><Chip icon={credential.status === 'verified' ? 'check-decagram' : credential.status === 'rejected' ? 'alert-circle-outline' : 'clock-outline'}>{credential.status}</Chip></View>
      {credential.referenceNumber ? <Text style={styles.muted}>Reference: {credential.referenceNumber}</Text> : null}
      {credential.expiresAt ? <Text style={styles.muted}>Expires {new Date(credential.expiresAt).toLocaleDateString('en-GB')}</Text> : null}
      {credential.rejectionReason ? <Text style={styles.error}>{credential.rejectionReason}</Text> : null}
    </AppCard>)}

    <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Optional public availability</Text><Text style={styles.muted}>Publish only the windows when you want new enquiries. Homeowners see availability windows, never private diary entries, customer names, job addresses or your personal calendar.</Text></View>{availabilityPlan ? <Chip icon="calendar-check-outline">{availabilityPlan.name} · {availabilityPlan.horizon}</Chip> : <Chip icon="lock-outline">Paid plans</Chip>}</View>
      {availabilityPlan ? <>
        <Text style={styles.muted}>{availabilityPlan.name} includes {availabilityPlan.max}. You can remove or replace availability whenever your workload changes.</Text>
        <View style={styles.actions}>
          <Button mode="outlined" disabled={busy} onPress={() => void addAvailability(0)}>Today</Button>
          <Button mode="outlined" disabled={busy} onPress={() => void addAvailability(1)}>Tomorrow</Button>
          <Button mode="outlined" disabled={busy} onPress={() => void addAvailability(7)}>Next week</Button>
        </View>
        <View style={styles.twoCol}>
          <TextInput style={styles.flex} mode="outlined" label="Available from YYYY-MM-DD" value={availabilityStart} onChangeText={setAvailabilityStart} keyboardType="numbers-and-punctuation" />
          <TextInput style={styles.flex} mode="outlined" label="Available until YYYY-MM-DD" value={availabilityEnd} onChangeText={setAvailabilityEnd} keyboardType="numbers-and-punctuation" />
        </View>
        <TextInput mode="outlined" label="Private note for you (not shown publicly)" value={availabilityNote} onChangeText={setAvailabilityNote} maxLength={300} />
        <Button mode="contained" icon="calendar-plus" disabled={busy || availabilityStart.trim().length !== 10} loading={busy} onPress={() => void addAvailabilityRange()}>Publish availability window</Button>
      </> : <Text style={styles.muted}>Availability publishing starts with BuildPair Core. Trust evidence and verified credentials remain separate from membership and are never hidden because someone is on a lower plan.</Text>}
    </AppCard>

    {!availability.length ? <EmptyState title="No availability published" body="Add a day above when you are ready for new enquiries." /> : availability.map((slot) => <AppCard key={slot.id}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{new Date(slot.startsAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</Text><Text style={styles.muted}>{new Date(slot.startsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–{new Date(slot.endsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {slot.note || slot.status}</Text></View><Button compact textColor={colors.danger} onPress={() => void removeAvailability(slot.id)}>Remove</Button></View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 180 },
  statNumber: { color: colors.primary, fontWeight: '900' },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  error: { color: colors.danger },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 220, gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionHeading: { marginTop: 4 },
});
