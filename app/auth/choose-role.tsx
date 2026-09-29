import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { dashboardHref, parseAccountMode, safeInternalReturnTo } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';
import { HOMEOWNER_REGISTRATION_OPEN } from '@/lib/launch';
import type { CurrentUser, UserRole } from '@/types';
import { firstParam } from '@/lib/search-params';

type ModeActivationResponse = CurrentUser & { wasEnabled?: boolean };


export default function ChooseRoleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; trade?: string | string[]; returnTo?: string | string[] }>();
  const requestedMode = parseAccountMode(params.mode);
  const requestedTrade = TRADE_CATEGORIES.find((trade) => trade === firstParam(params.trade));
  const returnTo = safeInternalReturnTo(params.returnTo);
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user, error: loadError, refresh } = useCurrentUser();
  const [role, setRole] = useState<UserRole | null>(requestedMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const autoStarted = useRef(false);

  function navigate(href: Href) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign(String(href));
      return;
    }
    router.replace(href);
  }

  async function save(selectedRole = role) {
    if (!selectedRole || busy || !authLoaded || !isSignedIn) return;
    if (selectedRole === 'customer' && !HOMEOWNER_REGISTRATION_OPEN) {
      setError('Homeowner accounts open at launch. Tradespeople can create profiles now.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      const result = await apiFetch<ModeActivationResponse>(
        '/api/me',
        { method: 'PATCH', body: JSON.stringify({ role: selectedRole }) },
        getToken,
      );
      const wasEnabled = typeof result.wasEnabled === 'boolean'
        ? result.wasEnabled
        : selectedRole === 'customer'
          ? Boolean(user?.customerEnabled)
          : Boolean(user?.traderEnabled);

      if (selectedRole === 'customer' && returnTo) {
        navigate(returnTo as Href);
      } else if (selectedRole === 'trader' && !wasEnabled) {
        navigate((requestedTrade ? `/trader/onboarding?trade=${encodeURIComponent(requestedTrade)}` : '/trader/onboarding') as Href);
      } else {
        navigate(dashboardHref(selectedRole));
      }
    } catch (e) {
      autoStarted.current = false;
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!requestedMode || !authLoaded || !isSignedIn || autoStarted.current) return;
    autoStarted.current = true;
    setRole(requestedMode);
    void save(requestedMode);
    // save intentionally runs once after Clerk has established the signed-in session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedMode, authLoaded, isSignedIn]);

  if (!authLoaded || (requestedMode && busy && !error)) {
    return <LoadingScreen label={requestedMode === 'trader' ? 'Opening Tradesperson mode…' : 'Opening Homeowner mode…'} />;
  }

  return (
    <Screen
      title="How will you use BuildPair?"
      subtitle="One login can have both profiles. Choose the side you want to open or add."
      backHref="/auth/account"
    >
      <View style={styles.grid}>
        {([['customer', '🏠 Homeowner', 'Post jobs, compare quotes and pay safely.'], ['trader', '🔨 Tradesperson', 'Build a public profile, find work, quote and invoice customers.']] as const).map(([value, title, body]) => {
          const enabled = value === 'customer' ? user?.customerEnabled : user?.traderEnabled;
          const selected = role === value;
          return (
            <Pressable key={value} onPress={() => setRole(value)} style={styles.choice}>
              <AppCard style={[styles.choiceCard, selected && styles.selected]} elevated={!selected}>
                <View style={styles.choiceTop}>
                  <Text variant="titleLarge" style={styles.choiceTitle}>{title}</Text>
                  <View style={[styles.status, enabled ? styles.statusEnabled : styles.statusAdd]}>
                    <Text variant="labelSmall" style={enabled ? styles.enabledText : styles.addText}>{enabled ? '✓ Enabled' : '+ Add profile'}</Text>
                  </View>
                </View>
                <Text style={styles.muted}>{body}</Text>
                {selected ? <Text variant="labelMedium" style={styles.selectedText}>Selected</Text> : null}
              </AppCard>
            </Pressable>
          );
        })}
      </View>

      {loadError ? (
        <AppCard style={styles.errorCard}>
          <Text variant="titleMedium" style={styles.errorTitle}>We couldn’t preload your BuildPair account</Text>
          <Text style={styles.errorBody}>{loadError}</Text>
          <Text style={styles.errorHint}>You can still choose a profile below. BuildPair will retry the account connection when you continue.</Text>
          <Button mode="outlined" icon="refresh" onPress={() => void refresh()}>Retry account connection</Button>
        </AppCard>
      ) : null}

      {!isSignedIn ? <HelperText type="error" visible>You need to be signed in before choosing a profile.</HelperText> : null}
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button
        mode="contained"
        disabled={!role || busy || !authLoaded || !isSignedIn || (role === 'customer' && !HOMEOWNER_REGISTRATION_OPEN)}
        loading={busy}
        onPress={() => void save()}
        contentStyle={styles.continueButton}
        style={styles.continueAction}
      >
        {role === 'trader' ? (user?.traderEnabled ? 'Continue' : 'Add profile') : role === 'customer' ? (!HOMEOWNER_REGISTRATION_OPEN ? 'Opens at launch' : user?.customerEnabled ? 'Continue' : 'Add profile') : 'Continue'}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 14 },
  choice: { borderRadius: 20 },
  choiceCard: { backgroundColor: colors.surfaceRaised },
  selected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#FFF9F5' },
  choiceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  choiceTitle: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 22 },
  status: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusEnabled: { backgroundColor: '#E8F4EA' },
  statusAdd: { backgroundColor: colors.surfaceStrong },
  enabledText: { color: colors.success, fontWeight: '800' },
  addText: { color: colors.charcoalSoft, fontWeight: '800' },
  selectedText: { color: colors.primary, fontWeight: '900' },
  errorCard: { gap: 10, borderWidth: 1, borderColor: '#F0B9B3', backgroundColor: '#FFF7F6' },
  errorTitle: { color: colors.charcoal, fontWeight: '900' },
  errorBody: { color: colors.danger, lineHeight: 22 },
  errorHint: { color: colors.muted, lineHeight: 21 },
  continueButton: { minHeight: 50 },
  continueAction: { borderRadius: 16 },
});
