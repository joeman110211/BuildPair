import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Credential = { id: string; traderId: string; businessName?: string | null; credentialType: string; name: string; issuer?: string | null; referenceNumber?: string | null; documentUrl?: string | null; expiresAt?: string | null; status: string; createdAt: string };

export default function CredentialQueue() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [items, setItems] = useState<Credential[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState('');
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try { setItems(await apiFetch<Credential[]>('/api/admin/credentials', {}, () => getTokenRef.current())); setError(''); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function review(item: Credential, status: 'verified' | 'rejected') {
    try {
      setBusy(item.id); setError('');
      await apiFetch('/api/credentials', { method: 'PATCH', body: JSON.stringify({ id: item.id, status, rejectionReason: reasons[item.id] || undefined }) }, () => getTokenRef.current());
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(undefined); }
  }
  if (loading) return <LoadingScreen label="Loading verification queue…" />;
  return <Screen title="Credential Verification" subtitle="Only evidence reviewed here can receive a public BuildPair Verified status.">
    <View style={styles.top}><Button mode="outlined" icon="shield-search" onPress={() => void load()}>Refresh</Button><Button mode="text" onPress={() => router.push('/admin/moderation')}>Moderation queue</Button></View>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {!items.length ? <EmptyState title="Verification queue clear" body="New insurance, identity and qualification submissions will appear here." /> : items.map((item) => <AppCard key={item.id}>
      <Text variant="titleLarge" style={styles.title}>{item.businessName || 'Tradesperson'}</Text>
      <Text variant="titleMedium">{item.name}</Text>
      <Text style={styles.muted}>{item.credentialType.replaceAll('_', ' ')}{item.issuer ? ` · ${item.issuer}` : ''}</Text>
      {item.referenceNumber ? <Text>Reference: {item.referenceNumber}</Text> : null}
      {item.expiresAt ? <Text>Expires: {new Date(item.expiresAt).toLocaleDateString('en-GB')}</Text> : null}
      {item.documentUrl ? <><Image source={{ uri: item.documentUrl }} style={styles.evidence} resizeMode="contain" /><Button icon="open-in-new" onPress={() => Linking.openURL(item.documentUrl!)}>Open evidence</Button></> : <Text style={styles.warning}>No evidence image supplied. Do not verify unless the reference can be independently checked.</Text>}
      <TextInput mode="outlined" label="Rejection reason (if needed)" value={reasons[item.id] ?? ''} onChangeText={(value) => setReasons((current) => ({ ...current, [item.id]: value }))} multiline />
      <View style={styles.actions}><Button mode="outlined" textColor={colors.danger} disabled={busy === item.id} onPress={() => void review(item, 'rejected')}>Reject</Button><Button mode="contained" icon="shield-check" loading={busy === item.id} disabled={Boolean(busy)} onPress={() => void review(item, 'verified')}>Mark verified</Button></View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, title: { color: colors.charcoal, fontWeight: '900' }, muted: { color: colors.muted }, warning: { color: colors.warning },
  evidence: { width: '100%', height: 260, borderRadius: 16, backgroundColor: colors.surfaceSoft }, actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
});
