import { useClerk } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Divider, Menu } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { dashboardHref, modeSetupHref } from '@/lib/account-mode';
import { apiFetch, errorMessage } from '@/lib/api';
import type { UserRole } from '@/types';

export function DashboardHeader({ home }: { home: '/customer/dashboard' | '/trader/dashboard' }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, getToken } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const currentMode: UserRole = home.startsWith('/customer') ? 'customer' : 'trader';
  const otherMode: UserRole = currentMode === 'customer' ? 'trader' : 'customer';
  const otherEnabled = otherMode === 'customer' ? user?.customerEnabled : user?.traderEnabled;
  const otherLabel = otherMode === 'customer' ? 'Homeowner' : 'Tradesperson';
  const modeAction = otherEnabled ? `Switch to ${otherLabel}` : `Add ${otherLabel}`;
  const messagesHref = (currentMode === 'customer' ? '/customer/messages' : '/trader/messages') as Href;
  const notificationsHref = (currentMode === 'customer' ? '/customer/notifications' : '/trader/notifications') as Href;
  const settingsHref = (currentMode === 'customer' ? '/customer/settings' : '/trader/settings') as Href;
  const compact = width < 900;

  const go = (href: Href) => {
    setMenuOpen(false);
    router.push(href);
  };

  async function changeMode() {
    if (switchingMode) return;
    if (!otherEnabled) {
      go(modeSetupHref(otherMode));
      return;
    }

    setMenuOpen(false);
    setSwitchingMode(true);
    try {
      await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ role: otherMode }),
      }, getToken);
      setSwitchingMode(false);
      router.replace(dashboardHref(otherMode));
    } catch (error) {
      setSwitchingMode(false);
      Alert.alert('Could not switch profile', errorMessage(error));
    }
  }

  const doSignOut = () => {
    setMenuOpen(false);
    signOut(() => router.replace('/'));
  };

  return <View style={styles.header}>
    <Link href="/" asChild><Pressable style={styles.brandButton} accessibilityLabel="BuildPair website home"><BuildPairLogo compact /></Pressable></Link>
    {compact ? <Menu
      visible={menuOpen}
      onDismiss={() => setMenuOpen(false)}
      anchor={<Button mode="outlined" compact contentStyle={styles.menuButtonContent} onPress={() => setMenuOpen((value) => !value)}>Account menu</Button>}
      contentStyle={styles.menuContent}
    >
      <Menu.Item title="Website home" onPress={() => go('/')} />
      <Menu.Item title="Advice Hub" onPress={() => go('/(public)/advice')} />
      <Menu.Item title="Find Trades" onPress={() => go('/(public)/directory')} />
      <Divider />
      <Menu.Item title="Notifications" onPress={() => go(notificationsHref)} />
      <Menu.Item title="Messages" onPress={() => go(messagesHref)} />
      <Menu.Item title="Account & security" onPress={() => go(settingsHref)} />
      <Divider />
      <Menu.Item title={modeAction} disabled={switchingMode} onPress={() => void changeMode()} />
      <Divider />
      <Menu.Item title="Sign out" onPress={doSignOut} />
    </Menu> : <View style={styles.actions}>
      <Link href="/" asChild><Button textColor={colors.charcoalSoft}>Website Home</Button></Link>
      <Link href="/(public)/advice" asChild><Button textColor={colors.charcoalSoft}>Advice Hub</Button></Link>
      <Link href="/(public)/directory" asChild><Button textColor={colors.charcoalSoft}>Find Trades</Button></Link>
      <Link href={messagesHref} asChild><Button textColor={colors.charcoalSoft}>Messages</Button></Link>
      <Button textColor={colors.charcoalSoft} onPress={() => router.push(notificationsHref)}>Notifications</Button>
      <Button mode="outlined" onPress={() => router.push(settingsHref)}>Account</Button>
      <Button compact mode={otherEnabled ? 'text' : 'outlined'} disabled={switchingMode} loading={switchingMode} onPress={() => void changeMode()}>{modeAction}</Button>
      <Button compact textColor={colors.muted} onPress={doSignOut}>Sign out</Button>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 68, paddingHorizontal: 14, backgroundColor: colors.surfaceRaised, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, shadowColor: colors.charcoal, shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  brandButton: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
  menuButtonContent: { minHeight: 40, paddingHorizontal: 3 },
  menuContent: { backgroundColor: colors.surfaceRaised, borderRadius: 18, minWidth: 230, borderWidth: 1, borderColor: colors.border },
});
