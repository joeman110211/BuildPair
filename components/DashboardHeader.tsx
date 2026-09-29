import { useClerk } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Badge, Button, IconButton } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { CompactNavMenu, type CompactNavItem } from '@/components/CompactNavMenu';
import { SITE_LANGUAGE } from '@/constants/site-language';
import { colors, controlHeights, shadows, spacing } from '@/constants/theme';
import { useActivityCounts } from '@/hooks/useActivityCounts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { dashboardHref, modeSetupHref } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';
import type { UserRole } from '@/types';

export function DashboardHeader({ home }: { home: '/customer/dashboard' | '/trader/dashboard' }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, getToken } = useCurrentUser();
  const { unreadMessages, unreadNotifications } = useActivityCounts(10000);
  const [switchingMode, setSwitchingMode] = useState(false);
  const currentMode: UserRole = home.startsWith('/customer') ? 'customer' : 'trader';
  const otherMode: UserRole = currentMode === 'customer' ? 'trader' : 'customer';
  const otherEnabled = otherMode === 'customer' ? user?.customerEnabled : user?.traderEnabled;
  const otherLabel = otherMode === 'customer' ? 'Homeowner' : 'Tradesperson';
  const modeAction = otherEnabled ? `Switch ${otherLabel}` : `Add ${otherLabel}`;
  const findHref = (currentMode === 'customer' ? '/(public)/directory' : '/trader/job-board') as Href;
  const findLabel = currentMode === 'customer' ? SITE_LANGUAGE.findTrade : SITE_LANGUAGE.findWork;
  const jobsHref = (currentMode === 'customer' ? '/customer/jobs' : '/trader/my-jobs') as Href;
  const quotesHref = '/trader/quotes' as Href;
  const profileHref = (currentMode === 'customer' ? '/customer/profile' : '/trader/profile') as Href;
  const messagesHref = (currentMode === 'customer' ? '/customer/messages' : '/trader/messages') as Href;
  const notificationsHref = (currentMode === 'customer' ? '/customer/notifications' : '/trader/notifications') as Href;
  const settingsHref = (currentMode === 'customer' ? '/customer/settings' : '/trader/settings') as Href;
  const compact = width < 900;

  const go = (href: Href) => router.push(href);

  async function changeMode() {
    if (switchingMode) return;
    if (!otherEnabled) { go(modeSetupHref(otherMode)); return; }
    setSwitchingMode(true);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ role: otherMode }) }, getToken);
      router.replace(dashboardHref(otherMode));
    } catch (error) {
      Alert.alert('Could not switch profile', errorMessage(error));
    } finally { setSwitchingMode(false); }
  }

  async function doSignOut() {
    await signOut();
    router.replace('/');
  }

  const messageLabel = unreadMessages ? `Messages (${unreadMessages > 99 ? '99+' : unreadMessages})` : 'Messages';
  const notificationLabel = unreadNotifications ? `Notifications (${unreadNotifications > 99 ? '99+' : unreadNotifications})` : 'Notifications';
  const compactItems: CompactNavItem[] = [
    { label: 'Home', sectionLabel: 'BuildPair', onPress: () => go('/') },
    { label: 'Dashboard', onPress: () => go(home) },
    { label: findLabel, onPress: () => go(findHref) },
    { label: 'Jobs', onPress: () => go(jobsHref) },
    ...(currentMode === 'trader' ? [
      { label: 'Quotes', onPress: () => go(quotesHref) },
      { label: 'Customers', onPress: () => go('/trader/customers') },
      { label: 'Calendar', onPress: () => go('/trader/calendar') },
      { label: 'Project+', onPress: () => go('/trader/project-plus') },
    ] satisfies CompactNavItem[] : [{ label: 'Project+', onPress: () => go('/customer/project-plus') } satisfies CompactNavItem]),
    { label: messageLabel, onPress: () => go(messagesHref) },
    { label: notificationLabel, onPress: () => go(notificationsHref) },
    { label: 'Profile', sectionLabel: 'Your account', dividerBefore: true, onPress: () => go(profileHref) },
    { label: 'Settings', onPress: () => go(settingsHref) },
    { label: 'Advice', sectionLabel: 'Help', dividerBefore: true, onPress: () => go('/(public)/advice') },
    { label: modeAction, sectionLabel: 'Profiles', dividerBefore: true, disabled: switchingMode, onPress: () => void changeMode() },
    { label: 'Sign out', onPress: () => void doSignOut() },
  ];

  return <View style={[styles.header, compact ? styles.headerCompact : styles.headerDesktop]}>
    <Link href="/" asChild><Pressable style={[styles.brandButton, compact && styles.brandButtonCompact]} accessibilityLabel="BuildPair home"><BuildPairLogo compact /></Pressable></Link>
    {compact ? <View style={styles.compactActions}>
      <View style={styles.notificationWrap}>
        <IconButton icon="bell-outline" size={24} onPress={() => router.push(notificationsHref)} accessibilityLabel={notificationLabel} />
        {unreadNotifications ? <Badge style={styles.notificationBadge} size={18}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Badge> : null}
      </View>
      <CompactNavMenu items={compactItems} accessibilityLabel="Menu" />
    </View> : <View style={styles.actions}>
      <Link href={home} asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>Dashboard</Button></Link>
      <Link href={findHref} asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>{findLabel}</Button></Link>
      <Link href={jobsHref} asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>Jobs</Button></Link>
      {currentMode === 'trader' ? <Link href={quotesHref} asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>Quotes</Button></Link> : null}
      <Link href={messagesHref} asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>{messageLabel}</Button></Link>
      <Button mode="text" contentStyle={styles.navButtonContent} textColor={unreadNotifications ? colors.primary : colors.charcoalSoft} onPress={() => router.push(notificationsHref)}>{notificationLabel}</Button>
      <Button mode="outlined" contentStyle={styles.navButtonContent} onPress={() => router.push(settingsHref)} >Settings</Button>
      <Button mode={otherEnabled ? 'text' : 'outlined'} contentStyle={styles.navButtonContent} disabled={switchingMode} loading={switchingMode} onPress={() => void changeMode()}>{modeAction}</Button>
      <Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.muted} onPress={() => void doSignOut()}>Sign out</Button>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 72, backgroundColor: 'rgba(255,255,255,0.985)', borderBottomWidth: 1, borderColor: '#E8E1DA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, ...shadows.subtle, overflow: 'visible' },
  headerCompact: { paddingHorizontal: spacing.md },
  headerDesktop: { paddingHorizontal: spacing.xxl },
  brandButton: { minHeight: 56, justifyContent: 'center', paddingHorizontal: spacing.xxs },
  brandButtonCompact: { paddingLeft: spacing.sm, paddingRight: 0 },
  compactActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  notificationWrap: { position: 'relative' },
  notificationBadge: { position: 'absolute', top: 2, right: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xxs, justifyContent: 'flex-end' },
  navButtonContent: { minHeight: controlHeights.standard, paddingHorizontal: spacing.xxs },
});
