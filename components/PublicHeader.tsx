import { useClerk } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Divider, Menu, Text } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { dashboardHref } from '@/lib/account-mode';
import { useAuthAvailable } from '@/lib/auth-availability';
import type { UserRole } from '@/types';

const NAV_ITEMS: { label: string; href: Href }[] = [
  { label: 'Home', href: '/' },
  { label: 'Find Trades', href: '/(public)/directory' },
  { label: 'How It Works', href: '/(public)/how-it-works' },
  { label: 'Membership', href: '/(public)/pricing' as Href },
  { label: 'Advice Hub', href: '/(public)/advice' as Href },
  { label: 'For Trades', href: '/(public)/for-tradespeople' },
  { label: 'Trust & Safety', href: '/(public)/trust-safety' as Href },
  { label: 'About', href: '/(public)/about' },
];

const SUPPORT_ITEMS: { label: string; href: Href }[] = [
  { label: 'Building Rules', href: '/(public)/building-regulations' as Href },
  { label: 'Report a User', href: '/(public)/report' as Href },
  { label: 'Browse Jobs', href: '/(public)/jobs' },
  { label: 'For Homeowners', href: '/(public)/for-homeowners' },
  { label: 'Download App', href: '/(public)/download' },
  { label: 'Contact Us', href: '/(public)/contact' },
];

const LEGAL_ITEMS: { label: string; href: Href }[] = [
  { label: 'Marketplace Standards', href: '/(public)/marketplace-standards' as Href },
  { label: 'Terms & Conditions', href: '/(public)/terms' },
  { label: 'Privacy Policy', href: '/(public)/privacy' },
  { label: 'Cookie Policy', href: '/(public)/cookies' },
  { label: 'Disclaimer', href: '/(public)/disclaimer' },
];

function HeaderBrand() {
  return <Link href="/" asChild><Pressable style={styles.brandPressable} accessibilityLabel="BuildPair home"><BuildPairLogo compact /></Pressable></Link>;
}

function NavMenu({ dashboard, signedIn, onSignOut, preview = false }: { dashboard?: Href; signedIn?: boolean; onSignOut?: () => void; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const go = (href: Href) => {
    setOpen(false);
    router.push(href);
  };

  return <Menu
    visible={open}
    onDismiss={() => setOpen(false)}
    anchor={<Button compact mode="text" onPress={() => setOpen((value) => !value)} accessibilityLabel="Open navigation menu">Menu</Button>}
    contentStyle={styles.menuContent}
  >
    {NAV_ITEMS.map((item) => <Menu.Item key={item.label} title={item.label} onPress={() => go(item.href)} />)}
    <Divider />
    {SUPPORT_ITEMS.map((item) => <Menu.Item key={item.label} title={item.label} onPress={() => go(item.href)} />)}
    <Divider />
    {LEGAL_ITEMS.map((item) => <Menu.Item key={item.label} title={item.label} onPress={() => go(item.href)} />)}
    <Divider />
    {preview ? <Menu.Item title="Sign in unavailable in public preview" disabled /> : signedIn && dashboard ? <>
      <Menu.Item title="Dashboard" onPress={() => go(dashboard)} />
      <Menu.Item title="Sign out" onPress={() => { setOpen(false); onSignOut?.(); }} />
    </> : <>
      <Menu.Item title="Sign in" onPress={() => go('/auth/account')} />
      <Menu.Item title="Join BuildPair" onPress={() => go('/auth/account')} />
    </>}
  </Menu>;
}

function DesktopNav() {
  return <View style={styles.desktopNav}>
    {NAV_ITEMS.slice(1, 6).map((item) => <Link href={item.href} asChild key={item.label}><Button compact textColor={colors.charcoalSoft}>{item.label}</Button></Link>)}
  </View>;
}

function AuthenticatedHeader() {
  const { width } = useWindowDimensions();
  const { user, isSignedIn } = useCurrentUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const compact = width < 1040;

  let mode: UserRole | null = null;
  if (user?.activeMode === 'customer' && user.customerEnabled) mode = 'customer';
  else if (user?.activeMode === 'trader' && user.traderEnabled) mode = 'trader';
  else if (user?.customerEnabled) mode = 'customer';
  else if (user?.traderEnabled) mode = 'trader';

  const dashboard = (mode ? dashboardHref(mode) : '/auth/choose-role') as Href;
  const doSignOut = () => signOut(() => router.replace('/'));

  return <View style={styles.header}>
    <HeaderBrand />
    {compact ? <NavMenu dashboard={dashboard} signedIn={isSignedIn} onSignOut={doSignOut} /> : <View style={styles.actions}>
      <DesktopNav />
      {isSignedIn ? <>
        <Button mode="contained" contentStyle={styles.primaryAction} onPress={() => router.push(dashboard)}>Dashboard</Button>
        <NavMenu dashboard={dashboard} signedIn onSignOut={doSignOut} />
      </> : <>
        <Link href="/auth/account" asChild><Button textColor={colors.charcoal}>Sign in</Button></Link>
        <Link href="/auth/account" asChild><Button mode="contained" contentStyle={styles.primaryAction}>Join BuildPair</Button></Link>
        <NavMenu />
      </>}
    </View>}
  </View>;
}

function PreviewHeader() {
  const { width } = useWindowDimensions();
  const compact = width < 1040;
  return <View style={styles.header}>
    <HeaderBrand />
    {compact ? <NavMenu preview /> : <View style={styles.actions}>
      <DesktopNav />
      <Text variant="bodySmall" style={styles.preview}>Public preview</Text>
      <NavMenu preview />
    </View>}
  </View>;
}

export function PublicHeader() {
  const authAvailable = useAuthAvailable();
  return authAvailable ? <AuthenticatedHeader /> : <PreviewHeader />;
}

const styles = StyleSheet.create({
  header: { minHeight: 74, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.985)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: colors.charcoal, shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2, zIndex: 20 },
  brandPressable: { minHeight: 58, justifyContent: 'center', paddingHorizontal: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'flex-end' },
  desktopNav: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  primaryAction: { minHeight: 44, paddingHorizontal: 6 },
  preview: { opacity: 0.62, marginLeft: 4 },
  menuContent: { backgroundColor: colors.surfaceRaised, borderRadius: 20, minWidth: 285, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
});
