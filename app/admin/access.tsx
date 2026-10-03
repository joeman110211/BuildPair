import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type AdminRow = { id: string; email: string | null; createdAt: string };
type InviteRow = {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  acceptedUserId: string | null;
  createdAt: string;
};
type AccessData = { admins: AdminRow[]; invites: InviteRow[]; ownerUserId: string };

type CreateResult = {
  invite: { id: string; email: string; expiresAt: string; createdAt: string };
  inviteUrl: string;
};

export default function AdminAccessScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [data, setData] = useState<AccessData | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const nextData = await apiFetch<AccessData>('/api/admin/access-invites', {}, () => getTokenRef.current());
      setData(nextData);
      setLoadedAt(Date.now());
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function sendInvite() {
    try {
      setBusy('create');
      setError('');
      setNotice('');
      setInviteUrl('');
      const result = await apiFetch<CreateResult>('/api/admin/access-invites', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }, () => getTokenRef.current());
      setInviteUrl(result.inviteUrl);
      setNotice(`Administrator invitation sent to ${result.invite.email}.`);
      setEmail('');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }

  async function revokeInvite(inviteId: string) {
    try {
      setBusy(inviteId);
      setError('');
      await apiFetch('/api/admin/access-invites', {
        method: 'DELETE',
        body: JSON.stringify({ inviteId }),
      }, () => getTokenRef.current());
      setNotice('Invitation revoked.');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }

  async function removeAdmin(userId: string) {
    try {
      setBusy(userId);
      setError('');
      await apiFetch('/api/admin/access-invites', {
        method: 'PATCH',
        body: JSON.stringify({ userId }),
      }, () => getTokenRef.current());
      setNotice('Administrator access removed.');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }

  async function copyInvite() {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
        setNotice('Invitation link copied.');
      }
    } catch {
      setNotice('Copy was blocked by the browser. The link is shown below.');
    }
  }

  if (loading && !data && !error) return <LoadingScreen label="Loading administrator access…" />;

  const pending = data?.invites.filter((invite) => !invite.acceptedAt && !invite.revokedAt && new Date(invite.expiresAt).getTime() > loadedAt) ?? [];

  return <Screen title="Administrator Access" subtitle="Only the BuildPair owner can invite, approve or remove administrator accounts. Invitees create a separate admin password and do not go through the normal marketplace signup.">
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {notice ? <HelperText type="info" visible>{notice}</HelperText> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Invite an administrator</Text>
      <Text style={styles.muted}>Enter the exact email address you want to approve. BuildPair emails a private, single-use link that expires after 7 days.</Text>
      <TextInput label="Administrator email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" mode="outlined" />
      <Button mode="contained" loading={busy === 'create'} disabled={Boolean(busy) || !email.trim()} onPress={() => void sendInvite()} contentStyle={styles.button}>Send administrator invite</Button>
      {inviteUrl ? <View style={styles.linkBox}>
        <Text variant="labelLarge" style={styles.linkLabel}>Last invitation link</Text>
        <Text selectable style={styles.linkText}>{inviteUrl}</Text>
        {Platform.OS === 'web' ? <Button mode="outlined" onPress={() => void copyInvite()}>Copy link</Button> : null}
      </View> : null}
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Current administrators</Text>
      <View style={styles.list}>
        {data?.admins.map((admin) => {
          const owner = admin.id === data.ownerUserId;
          return <View key={admin.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{admin.email || admin.id}</Text>
              <Text variant="bodySmall" style={styles.muted}>{owner ? 'BuildPair owner' : 'Invited administrator'}</Text>
            </View>
            {owner ? <Chip>Owner</Chip> : <Button mode="outlined" loading={busy === admin.id} disabled={Boolean(busy)} onPress={() => void removeAdmin(admin.id)}>Remove access</Button>}
          </View>;
        })}
      </View>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Pending invitations</Text>
      {pending.length ? <View style={styles.list}>
        {pending.map((invite) => <View key={invite.id} style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>{invite.email}</Text>
            <Text variant="bodySmall" style={styles.muted}>Expires {new Date(invite.expiresAt).toLocaleString('en-GB')}</Text>
          </View>
          <Button mode="outlined" loading={busy === invite.id} disabled={Boolean(busy)} onPress={() => void revokeInvite(invite.id)}>Revoke</Button>
        </View>)}
      </View> : <Text style={styles.muted}>No pending administrator invitations.</Text>}
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  linkBox: { gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surfaceSoft, padding: 12 },
  linkLabel: { color: colors.charcoal, fontWeight: '900' },
  linkText: { color: colors.primary, fontSize: 12, lineHeight: 18 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  flex: { flex: 1, minWidth: 0, flexBasis: 210, flexShrink: 1, maxWidth: '100%' },
  rowTitle: { color: colors.charcoal, fontWeight: '800' },
});