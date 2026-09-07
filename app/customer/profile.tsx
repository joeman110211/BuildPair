import { useUser } from '@clerk/expo';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { DeleteAccountCard } from '@/components/DeleteAccountCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { modeSetupHref } from '@/lib/account-mode';

export default function CustomerProfile() {
  const { user, loading } = useCurrentUser();
  const { user: clerkUser } = useUser();
  if (loading) return <LoadingScreen />;

  const name = clerkUser?.fullName || clerkUser?.firstName || 'BuildPair homeowner';
  return <Screen title="Profile & account" subtitle="Manage your BuildPair identity, account modes and homeowner tools.">
    <AppCard style={styles.identityCard}>
      <View style={styles.identity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>BUILDPAIR ACCOUNT</Text>
          <Text variant="headlineSmall" style={styles.title}>{name}</Text>
          <Text style={styles.muted}>{user?.email || clerkUser?.primaryEmailAddress?.emailAddress || 'Email linked through your sign-in provider'}</Text>
          <View style={styles.chips}><Chip compact>Homeowner</Chip>{user?.traderEnabled ? <Chip compact>Tradesperson enabled</Chip> : null}</View>
        </View>
      </View>
    </AppCard>

    <AppCard>
      <Text style={styles.eyebrow}>ACCOUNT MODES</Text>
      <Text variant="titleLarge" style={styles.title}>Use one login for both sides of BuildPair</Text>
      <Text style={styles.muted}>Your homeowner jobs and your trade business can stay attached to one identity while keeping their dashboards and workflows separate.</Text>
      <View style={styles.modeRow}>
        <View style={styles.modeMark}><Text style={styles.modeMarkText}>H</Text></View>
        <View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Homeowner</Text><Text style={styles.muted}>Post jobs, compare quotes, message trades and manage projects.</Text></View>
        <Chip>Active</Chip>
      </View>
      <View style={styles.modeRow}>
        <View style={[styles.modeMark, styles.tradeMark]}><Text style={styles.modeMarkText}>T</Text></View>
        <View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Tradesperson</Text><Text style={styles.muted}>Build a business profile, find work, quote and manage customers.</Text></View>
        {user?.traderEnabled ? <Link href={modeSetupHref('trader')} asChild><Button mode="outlined">Switch mode</Button></Link> : <Link href={modeSetupHref('trader')} asChild><Button mode="contained">Add tradesperson mode</Button></Link>}
      </View>
    </AppCard>

    <AppCard>
      <Text style={styles.eyebrow}>HOMEOWNER TOOLS</Text>
      <Text variant="titleLarge" style={styles.title}>Quick access</Text>
      <View style={styles.actions}>
        <Link href="/(public)/directory" asChild><Button mode="outlined">Find trades</Button></Link>
        <Link href="/customer/saved-trades" asChild><Button mode="outlined">Saved trades</Button></Link>
        <Link href="/customer/new-job" asChild><Button mode="outlined">Post a job</Button></Link>
        <Link href="/customer/messages" asChild><Button mode="outlined">Messages</Button></Link>
        <Link href="/customer/notifications" asChild><Button mode="outlined">Notifications</Button></Link>
        <Link href="/settings" asChild><Button mode="outlined">Account & security</Button></Link>
      </View>
    </AppCard>

    <DeleteAccountCard />
  </Screen>;
}

const styles = StyleSheet.create({
  identityCard: { backgroundColor: colors.navySoft, borderColor: '#D5E0E8' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 15, flexWrap: 'wrap' },
  avatar: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 29 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  flex: { flex: 1, minWidth: 220, gap: 5 },
  title: { fontWeight: '900', color: colors.charcoal },
  muted: { color: colors.muted, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  modeRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.border },
  modeMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tradeMark: { backgroundColor: colors.accent },
  modeMarkText: { color: '#FFFFFF', fontWeight: '900' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
