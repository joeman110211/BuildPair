import { useClerk } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, IconButton } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { CompactNavMenu, type CompactNavItem } from '@/components/CompactNavMenu';
import { colors, spacing } from '@/constants/theme';
import { useActivityCounts } from '@/hooks/useActivityCounts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { dashboardHref, modeSetupHref } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';
import type { UserRole } from '@/types';

export function DashboardHeader({ home }: { home: '/customer/dashboard' | '/trader/dashboard' }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const { user, getToken } = useCurrentUser();
  const { unreadMessages, unreadNotifications } = useActivityCounts(10000);
  const [switchingMode, setSwitchingMode] = useState(false);
  const currentMode: UserRole = home.startsWith('/customer') ? 'customer' : 'trader';
  const otherMode: UserRole = currentMode === 'customer' ? 'trader' : 'customer';
  const otherEnabled = otherMode === 'customer' ? user?.customerEnabled : user?.traderEnabled;
  const otherLabel = otherMode === 'customer' ? 'Homeowner' : 'Tradesperson';
  const modeAction = otherEnabled ? `Switch to ${otherLabel}` : `Add ${otherLabel}`;
  const messagesHref = (currentMode === 'customer' ? '/customer/messages' : '/trader/messages') as Href;
  const notificationsHref = (currentMode === 'customer' ? '/customer/notifications' : '/trader/notifications') as Href;
  const profileHref = (currentMode === 'customer' ? '/customer/profile' : '/trader/profile') as Href;
  const settingsHref = (currentMode === 'customer' ? '/customer/settings' : '/trader/settings') as Href;

  const go = (href: Href) => router.push(href);

  async function changeMode() {
    if (switchingMode) return;
    if (!otherEnabled) {
      go(modeSetupHref(otherMode));
      return;
    }
    setSwitchingMode(true);
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ role: otherMode }) }, getToken);
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

  const items: CompactNavItem[] = [
    { label: 'Profile', sectionLabel: 'Your account', onPress: () => go(profileHref) },
    { label: 'Account & security', onPress: () => go(settingsHref) },
    { label: unreadMessages ? `Messages (${unreadMessages > 99 ? '99+' : unreadMessages})` : 'Messages', sectionLabel: 'Activity', dividerBefore: true, onPress: () => go(messagesHref) },
    { label: unreadNotifications ? `Notifications (${unreadNotifications > 99 ? '99+' : unreadNotifications})` : 'Notifications', onPress: () => go(notificationsHref) },
    { label: modeAction, sectionLabel: 'Account mode', dividerBefore: true, disabled: switchingMode, onPress: () => void changeMode() },
    { label: 'Advice Hub', sectionLabel: 'Help', dividerBefore: true, onPress: () => go('/(public)/advice') },
    { label: 'Sign out', dividerBefore: true, onPress: () => void doSignOut() },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable style={styles.brandButton} accessibilityLabel="BuildPair home">
            <BuildPairLogo compact />
          </Pressable>
        </Link>
        <View style={styles.actions}>
          <View style={styles.notificationWrap}>
            <IconButton icon="bell-outline" size={23} onPress={() => router.push(notificationsHref)} accessibilityLabel="Notifications" />
            {unreadNotifications ? <Badge style={styles.badge} size={17}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Badge> : null}
          </View>
          <CompactNavMenu items={items} accessibilityLabel="More" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flexShrink: 0,
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 100,
  },
  header: {
    minHeight: 58,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandButton: { minHeight: 52, justifyContent: 'center', paddingLeft: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  notificationWrap: { position: 'relative' },
  badge: { position: 'absolute', top: 2, right: 0 },
});
