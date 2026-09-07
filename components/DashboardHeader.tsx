import { useClerk } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Divider, Menu } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { modeSetupHref } from '@/lib/account-mode';
import type { UserRole } from '@/types';

export function DashboardHeader({ home }: { home: '/customer/dashboard' | '/trader/dashboard' }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentMode: UserRole = home.startsWith('/customer') ? 'customer' : 'trader';
  const otherMode: UserRole = currentMode === 'customer' ? 'trader' : 'customer';
  const otherEnabled = otherMode === 'customer' ? user?.customerEnabled : user?.traderEnabled;
  const otherLabel = otherMode === 'customer' ? 'Homeowner' : 'Tradesperson';
  const modeAction = otherEnabled ? `Switch to ${otherLabel}` : `Add ${otherLabel}`;
  const messagesHref = (currentMode === 'customer' ? '/customer/messages' : '/trader/messages') as Href;
  const notificationsHref = (currentMode === 'customer' ? '/customer/notifications' : '/trader/notifications') as Href;
  const compact = width < 900;

  const go = (href: Href) => {
    setMenuOpen(false);
    router.push(href);
  };

  const doSignOut = () => {
    setMenuOpen(false);
    signOut(() => router.replace('/auth/account'));
  };

  return <View style={styles.header}>
    <Link href={home} asChild><Pressable style={styles.brandButton} accessibilityLabel="BuildPair home"><BuildPairLogo compact /></Pressable></Link>
    {compact ? <Menu
      visible={menuOpen}
      onDismiss={() => setMenuOpen(false)}
      anchor={<Button mode="outlined" compact contentStyle={styles.menuButtonContent} onPress={() => setMenuOpen((value) => !value)}>Account menu</Button>}
      contentStyle={styles.menuContent}
    >
      <Menu.Item title="Notifications" onPress={() => go(notificationsHref)} />
      <Menu.Item title="Messages" onPress={() => go(messagesHref)} />
      <Menu.Item title="Settings" onPress={() => go('/settings')} />
      <Divider />
      <Menu.Item title={modeAction} onPress={() => go(modeSetupHref(otherMode))} />
      {user?.isAdmin ? <Menu.Item title="Moderation" onPress={() => go('/admin/moderation')} /> : null}
      <Divider />
      <Menu.Item title="Sign out" onPress={doSignOut} />
    </Menu> : <View style={styles.actions}>
      <Link href="/(public)/directory" asChild><Button textColor={colors.charcoalSoft}>Find Trades</Button></Link>
      <Link href={messagesHref} asChild><Button textColor={colors.charcoalSoft}>Messages</Button></Link>
      <Button textColor={colors.charcoalSoft} onPress={() => router.push(notificationsHref)}>Notifications</Button>
      <Button mode="outlined" onPress={() => router.push('/settings')}>Settings</Button>
      <Link href={modeSetupHref(otherMode)} asChild><Button compact mode={otherEnabled ? 'text' : 'outlined'}>{modeAction}</Button></Link>
      {user?.isAdmin ? <Link href="/admin/moderation" asChild><Button>Moderation</Button></Link> : null}
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
