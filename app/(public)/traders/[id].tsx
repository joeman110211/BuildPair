import { useAuth } from '@clerk/expo';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import TraderProfileStorefront from '@/components/TraderProfileStorefront';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type PublicProfileGate = {
  businessName: string;
  tradeCategory: string;
  tradeCategories?: string[];
  publicLocked?: boolean;
};

export default function PublicTraderProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  const [profile, setProfile] = useState<PublicProfileGate>();
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const tokenGetter = isSignedIn ? () => getTokenRef.current() : undefined;
      setProfile(await apiFetch<PublicProfileGate>(`/api/traders/${id}`, {}, tokenGetter));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id, isSignedIn]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (error && !profile) return <Screen><EmptyState title="Profile unavailable" body={error} /></Screen>;
  if (!profile) return <LoadingScreen label="Checking profile…" />;

  if (!profile.publicLocked) return <TraderProfileStorefront />;

  const categories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];

  return <Screen>
    <View style={styles.shell}>
      <AppCard style={styles.card}>
        <View style={styles.lockBadge}><Text style={styles.lockBadgeText}>PUBLIC PROFILE INACTIVE</Text></View>
        <Text variant="headlineMedium" style={styles.title}>This BuildPair profile isn’t publicly active.</Text>
        <Text variant="titleMedium" style={styles.businessName}>{profile.businessName}</Text>
        <Text style={styles.tradeLine}>{categories.filter(Boolean).join(' · ')}</Text>
        <Text style={styles.body}>
          This tradesperson has a BuildPair account, but full public profiles are available only while a paid tradesperson membership is active.
        </Text>
        <Text style={styles.body}>
          Creating or signing into a homeowner account will not unlock an inactive profile. If this tradesperson activates their public profile later, this same shared link will begin showing it automatically.
        </Text>
        <View style={styles.actions}>
          <Link href="/(public)/directory" asChild><Button mode="contained" icon="magnify">Find active local trades</Button></Link>
          {!isSignedIn ? <Link href="/auth/sign-up?mode=customer" asChild><Button mode="outlined" icon="account-plus-outline">Create homeowner account</Button></Link> : null}
        </View>
      </AppCard>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  shell: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 28 },
  card: { gap: 12, padding: 22 },
  lockBadge: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: colors.surfaceSoft, paddingHorizontal: 10, paddingVertical: 5 },
  lockBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  businessName: { color: colors.charcoal, fontWeight: '800' },
  tradeLine: { color: colors.muted, fontWeight: '700' },
  body: { color: colors.charcoalSoft, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
});
