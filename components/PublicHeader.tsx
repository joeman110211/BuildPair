import { useClerk } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { CompactNavMenu, type CompactNavItem } from '@/components/CompactNavMenu';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
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
];

const QUICK_NAV: { label: string; href: Href }[] = [
  { label: 'Home', href: '/' },
  { label: 'Find Trades', href: '/(public)/directory' },
  { label: 'How It Works', href: '/(public)/how-it-works' },
  { label: 'Membership', href: '/(public)/pricing' as Href },
];

function HeaderBrand() {
  return <Link href="/" asChild><Pressable style={styles.brandPressable} accessibilityLabel="BuildPair home"><BuildPairLogo compact /></Pressable></Link>;
}

function NavMenu({ dashboard, signedIn, onSignOut, preview = false }: { dashboard?: Href; signedIn?: boolean; onSignOut?: () => void; preview?: boolean }) {
  const router = useRouter();
  const go = (href: Href) => router.push(href);
  const items: CompactNavItem[] = [
    { label: 'Home', sectionLabel: 'Explore', onPress: () => go('/') },
    { label: 'Find Trades', onPress: () => go('/(public)/directory') },
    { label: 'How It Works', onPress: () => go('/(public)/how-it-works') },
    { label: 'Membership', onPress: () => go('/(public)/pricing') },
    { label: 'For Homeowners', sectionLabel: 'Guides', dividerBefore: true, onPress: () => go('/(public)/for-homeowners') },
    { label: 'For Tradespeople', onPress: () => go('/(public)/for-tradespeople') },
    { label: 'Advice Hub', onPress: () => go('/(public)/advice') },
    { label: 'Trust & Safety', sectionLabel: 'Support', dividerBefore: true, onPress: () => go('/(public)/trust-safety') },
    { label: 'Contact Us', onPress: () => go('/(public)/contact') },
  ];

  if (preview) {
    items.push({ label: 'Sign in unavailable in public preview', sectionLabel: 'Account', dividerBefore: true, disabled: true, onPress: () => undefined });
  } else if (signedIn && dashboard) {
    items.push({ label: 'Dashboard', sectionLabel: 'Account', dividerBefore: true, onPress: () => go(dashboard) });
    items.push({ label: 'Sign out', onPress: () => onSignOut?.() });
  } else {
    items.push({ label: 'Sign in', sectionLabel: 'Account', dividerBefore: true, onPress: () => go('/auth/account') });
    items.push({ label: 'Join BuildPair', onPress: () => go('/auth/account') });
  }

  return <CompactNavMenu items={items} accessibilityLabel="Menu" />;
}

function DesktopNav() {
  return <View style={styles.desktopNav}>
    {NAV_ITEMS.slice(1).map((item) => <Link href={item.href} asChild key={item.label}><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>{item.label}</Button></Link>)}
  </View>;
}

function MobileQuickNav() {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickNav} contentContainerStyle={styles.quickNavContent} accessibilityLabel="BuildPair quick navigation">
    {QUICK_NAV.map((item) => <Link key={item.label} href={item.href} asChild><Button mode="text" textColor={colors.charcoalSoft} contentStyle={styles.quickButtonContent} style={styles.quickButton}>{item.label}</Button></Link>)}
  </ScrollView>;
}

function CompactShell({ menu }: { menu: ReactNode }) {
  return <View style={styles.shell}><View style={styles.compactHeader}><HeaderBrand />{menu}</View><MobileQuickNav /></View>;
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
  const doSignOut = async () => { await signOut(); router.replace('/'); };

  if (compact) return <CompactShell menu={<NavMenu dashboard={dashboard} signedIn={isSignedIn} onSignOut={() => void doSignOut()} />} />;
  return <View style={styles.header}>
    <HeaderBrand />
    <View style={styles.actions}>
      <DesktopNav />
      {isSignedIn ? <><Button mode="contained" contentStyle={styles.primaryAction} onPress={() => router.push(dashboard)}>Dashboard</Button><NavMenu dashboard={dashboard} signedIn onSignOut={() => void doSignOut()} /></> : <><Link href="/auth/account" asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoal}>Sign in</Button></Link><Link href="/auth/account" asChild><Button mode="contained" contentStyle={styles.primaryAction}>Join BuildPair</Button></Link><NavMenu /></>}
    </View>
  </View>;
}

function PreviewHeader() {
  const { width } = useWindowDimensions();
  const compact = width < 1040;
  if (compact) return <CompactShell menu={<NavMenu preview />} />;
  return <View style={styles.header}><HeaderBrand /><View style={styles.actions}><DesktopNav /><Text variant="bodySmall" style={styles.preview}>Public preview</Text><NavMenu preview /></View></View>;
}

export function PublicHeader() {
  const authAvailable = useAuthAvailable();
  return authAvailable ? <AuthenticatedHeader /> : <PreviewHeader />;
}

const baseHeader = { minHeight: 72, paddingHorizontal: spacing.xxl, backgroundColor: 'rgba(255,255,255,0.985)', flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const };

const styles = StyleSheet.create({
  shell: { backgroundColor: 'rgba(255,255,255,0.985)', borderBottomWidth: 1, borderColor: colors.border, zIndex: 200, shadowColor: colors.charcoal, shadowOpacity: 0.025, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4, overflow: 'visible' },
  compactHeader: { ...baseHeader, paddingHorizontal: spacing.md, zIndex: 200, overflow: 'visible' },
  header: { ...baseHeader, borderBottomWidth: 1, borderColor: colors.border, shadowColor: colors.charcoal, shadowOpacity: 0.025, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, zIndex: 20 },
  brandPressable: { minHeight: 56, justifyContent: 'center', paddingHorizontal: spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, justifyContent: 'flex-end' },
  desktopNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  navButtonContent: { minHeight: controlHeights.standard, paddingHorizontal: spacing.xxs },
  primaryAction: { minHeight: controlHeights.standard, paddingHorizontal: spacing.sm },
  preview: { opacity: 0.62, marginLeft: spacing.xxs },
  quickNav: { maxHeight: 48, backgroundColor: colors.surfaceRaised, borderTopWidth: 1, borderTopColor: '#F1EBE5', zIndex: 1 },
  quickNavContent: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: spacing.xxs, alignItems: 'center' },
  quickButton: { borderRadius: radii.pill },
  quickButtonContent: { minHeight: 36, paddingHorizontal: spacing.xxs },
});
