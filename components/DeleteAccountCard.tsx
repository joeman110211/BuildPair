import { useClerk, useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

export function DeleteAccountCard() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (confirmation !== 'DELETE MY ACCOUNT') return;
    Alert.alert('Permanently delete BuildPair account?', 'This removes your login and personal profile data. Transaction records that must be retained for audit or legal reasons are anonymised and kept only where required.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete permanently', style: 'destructive', onPress: async () => {
        try {
          setBusy(true); setError('');
          await apiFetch('/api/me/delete', { method: 'POST', body: JSON.stringify({ confirmation }) }, getToken);
          await signOut();
          router.replace('/');
        } catch (e) { setError(errorMessage(e)); setBusy(false); }
      } },
    ]);
  }

  return <AppCard style={styles.card}>
    <Text variant="titleLarge" style={styles.title}>Delete account</Text>
    <Text style={styles.body}>Permanently remove your BuildPair login and scrub personal marketplace data. This cannot be undone.</Text>
    <TextInput mode="outlined" label="Type DELETE MY ACCOUNT" accessibilityLabel="Type DELETE MY ACCOUNT" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" />
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="outlined" textColor={colors.danger} loading={busy} disabled={busy || confirmation !== 'DELETE MY ACCOUNT'} onPress={() => void remove()}>Permanently delete account</Button>
  </AppCard>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#F1C8C8' },
  title: { color: colors.danger, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 21 },
});
