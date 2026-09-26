import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { FormSelect } from '@/components/FormSelect';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { PROPERTY_TYPES } from '@/constants/options';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type PropertyType = (typeof PROPERTY_TYPES)[number];
type SavedProperty = {
  id: string;
  nickname: string;
  propertyType: string;
  postcode: string;
  addressLine1: string;
  addressLine2: string | null;
  townCity: string;
  accessNotes: string;
};

export default function CustomerPropertiesScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const [nickname, setNickname] = useState('My home');
  const [propertyType, setPropertyType] = useState<PropertyType>();
  const [postcode, setPostcode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [townCity, setTownCity] = useState('');
  const [accessNotes, setAccessNotes] = useState('');

  const load = useCallback(async () => {
    try { setItems(await apiFetch<SavedProperty[]>('/api/customer-properties', {}, getToken)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken]);
  useEffect(() => { void load(); }, [load]);

  function reset() {
    setEditId(undefined); setNickname('My home'); setPropertyType(undefined); setPostcode('');
    setAddressLine1(''); setAddressLine2(''); setTownCity(''); setAccessNotes(''); setConfirmDelete(undefined);
  }
  function edit(item: SavedProperty) {
    setEditId(item.id); setNickname(item.nickname); setPropertyType(PROPERTY_TYPES.find((x) => x === item.propertyType));
    setPostcode(item.postcode); setAddressLine1(item.addressLine1); setAddressLine2(item.addressLine2 ?? '');
    setTownCity(item.townCity); setAccessNotes(item.accessNotes); setConfirmDelete(undefined);
  }
  async function save() {
    if (!propertyType) return;
    try {
      setBusy(true); setError('');
      await apiFetch('/api/customer-properties', { method: 'POST', body: JSON.stringify({ id: editId, nickname, propertyType, postcode, addressLine1, addressLine2, townCity, accessNotes }) }, getToken);
      reset(); await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    try {
      setBusy(true); setError('');
      await apiFetch(`/api/customer-properties?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, getToken);
      reset(); await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  if (loading) return <LoadingScreen label="Loading your properties…" />;
  const ready = Boolean(propertyType && nickname.trim().length >= 2 && postcode.trim().length >= 5 && addressLine1.trim().length >= 3 && townCity.trim().length >= 2);

  return <Screen title="Saved properties" subtitle="Save private property details once. New jobs can reuse the postcode and property type while the exact address stays private from the public marketplace.">
    <AppCard style={styles.formCard}>
      <Text variant="titleLarge" style={styles.title}>{editId ? 'Edit property' : 'Add a property'}</Text>
      <Text style={styles.muted}>This is private account information. When you use a saved property for a job, BuildPair snapshots the address into that job so old project records do not change if you later edit the property.</Text>
      <TextInput mode="outlined" label="Property nickname" value={nickname} onChangeText={setNickname} placeholder="e.g. Home, Mum's flat, Rental 1" />
      <FormSelect label="Property type" value={propertyType} options={PROPERTY_TYPES} onChange={setPropertyType} />
      <TextInput mode="outlined" label="Postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" />
      <TextInput mode="outlined" label="House number/name and street" value={addressLine1} onChangeText={setAddressLine1} />
      <TextInput mode="outlined" label="Address line 2 (optional)" value={addressLine2} onChangeText={setAddressLine2} />
      <TextInput mode="outlined" label="Town / city" value={townCity} onChangeText={setTownCity} />
      <TextInput mode="outlined" label="Access / parking notes (optional)" value={accessNotes} onChangeText={setAccessNotes} multiline maxLength={1000} />
      <View style={styles.actions}><Button mode="contained" loading={busy} disabled={busy || !ready} onPress={() => void save()}>{editId ? 'Save changes' : 'Save property'}</Button>{editId ? <Button mode="text" disabled={busy} onPress={reset}>Cancel</Button> : null}</View>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </AppCard>

    {!items.length ? <EmptyState title="No saved properties yet" body="Add your home once and BuildPair can reuse the sensible bits on later jobs without publishing your street address." /> : items.map((item) => <AppCard key={item.id}>
      <Text variant="titleLarge" style={styles.title}>{item.nickname}</Text>
      <Text style={styles.muted}>{item.propertyType} · {item.postcode}</Text>
      <Text>{[item.addressLine1, item.addressLine2, item.townCity].filter(Boolean).join(', ')}</Text>
      {item.accessNotes ? <Text style={styles.muted}>Access: {item.accessNotes}</Text> : null}
      <View style={styles.actions}>
        <Button mode="contained" icon="briefcase-plus-outline" onPress={() => router.push({ pathname: '/customer/new-job', params: { propertyId: item.id } } as Href)}>Use for a new job</Button>
        <Button mode="outlined" onPress={() => edit(item)}>Edit</Button>
        {confirmDelete === item.id ? <><Button textColor={colors.danger} disabled={busy} onPress={() => void remove(item.id)}>Confirm delete</Button><Button mode="text" onPress={() => setConfirmDelete(undefined)}>Keep</Button></> : <Button mode="text" textColor={colors.danger} onPress={() => setConfirmDelete(item.id)}>Delete</Button>}
      </View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  formCard: { backgroundColor: colors.surfaceSoft },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
