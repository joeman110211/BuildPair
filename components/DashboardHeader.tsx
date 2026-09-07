import { useClerk } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { CompactNavMenu, type CompactNavItem } from '@/components/CompactNavMenu';
import { colors, controlHeights, spacing } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { dashboardHref, modeSetupHref } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';
import type { UserRole } from '@/types';

export function DashboardHeader({ home }: { home: '/customer/dashboard' | '/trader/dashboard' }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, getToken } = useCurrentUser();
  const [switchingMode, setSwitchingMode] = useState(false);
  const currentMode: UserRole = home.startsWith('/customer') ? 'customer' : 'trader';
  const otherMode: UserRole = currentMode === 'customer' ? 'trader' : 'customer';
  const otherEnabled = otherMode === 'customer' ? user?.customerEnabled : user?.traderEnabled;
  const otherLabel = otherMode === 'customer' ? 'Homeowner' : 'Tradesperson';
  const modeAction = otherEnabled ? `Switch to ${otherLabel}` : `Add ${otherLabel}`;
  const findHref = (currentMode === 'customer' ? '/(public)/directory' : '/trader/job-board') as Href;
  const findLabel = currentMode === 'customer' ? 'Find trades' : 'Find work';
  const jobsHref = (currentMode === 'customer' ? '/customer/jobs' : '/trader/my-jobs') as Href;
  const profileHref = (currentMode === 'customer' ? '/customer/profile' : '/trader/profile') as Href;
  const messagesHref = (currentMode === 'customer' ? '/customer/messages' : '/trader/messages') as Href;
  const notificationsHref = (currentMode === 'customer' ? '/customer/notifications' : '/trader/notifications') as Href;
  const settingsHref = (currentMode === 'customer' ? '/customer/settings' : '/trader/settings') as Href;
  const compact = width < 900;

  const go = (href: Href) => router.push(href);

  async function changeMode() {
    if (switchingMode) return;
    if (!otherEnabled) {
      go(modeSetupHref(otherMode));
      return;
    }

    setSwitchingMode(true);
    try {
      await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ role: otherMode }),
      }, getToken);
      router.replace(dashboardHref(otherMode));
    } catch (error) {
      Alert.alert('Could not switch profile', errorMessage(error));
    } finally {
      setSwitchingMode(false);
    }
  }

  async function doSignOut() {
    await signOut();
    router.replace('/');
  }

  const compactItems: CompactNavItem[] = [
    { label: 'Home', onPress: () => go(home) },
    { label: findLabel, onPress: () => go(findHref) },
    { label: 'Jobs', onPress: () => go(jobsHref) },
    { label: 'Messages', onPress: () => go(messagesHref) },
    { label: 'Profile', onPress: () => go(profileHref) },
    { label: 'Website home', dividerBefore: true, onPress: () => go('/') },
    { label: 'Advice Hub', onPress: () => go('/(public)/advice') },
    { label: 'Notifications', onPress: () => go(notificationsHref) },
    { label: 'Account & security', onPress: () => go(settingsHref) },
    { label: modeAction, dividerBefore: true, disabled: switchingMode, onPress: () => void changeMode() },
    { label: 'Sign out', dividerBefore: true, onPress: () => void doSignOut() },
  ];

  return <View style={[styles.header, compact ? styles.headerCompact : styles.headerDesktop]}>
    <Link href="/" asChild><Pressable style={styles.brandButton} accessibilityLabel="BuildPair website home"><BuildPairLogo compact /></Pressable></Link>
    {compact ? <CompactNavMenu items={compactItems} accessibilityLabel="Menu" /> : <View style={styles.actions}>
      <Link href="/" asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>Website home</Button></Link>
      <Link href="/(public)/advice" asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>Advice Hub</Button></Link>
      <Link href={findHref} asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>{findLabel}</Button></Link>
      <Link href={jobsHref} asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>Jobs</Button></Link>
      <Link href={messagesHref} asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>Messages</Button></Link>
      <Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft} onPress={() => router.push(notificationsHref)}>Notifications</Button>
      <Button mode="outlined" contentStyle={styles.navButtonContent} onPress={() => router.push(settingsHref)}>Account</Button>
      <Button mode={otherEnabled ? 'text' : 'outlined'} contentStyle={styles.navButtonContent} disabled={switchingMode} loading={switchingMode} onPress={() => void changeMode()}>{modeAction}</Button>
      <Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.muted} onPress={() => void doSignOut()}>Sign out</Button>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 72, backgroundColor: colors.surfaceRaised, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, shadowColor: colors.charcoal, shadowOpacity: 0.025, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4, overflow: 'visible' },
  headerCompact: { paddingHorizontal: spacing.md },
  headerDesktop: { paddingHorizontal: spacing.xxl },
  brandButton: { minHeight: 56, justifyContent: 'center', paddingHorizontal: spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xxs, justifyContent: 'flex-end' },
  navButtonContent: { minHeight: controlHeights.standard, paddingHorizontal: spacing.xxs },
});
