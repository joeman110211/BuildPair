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
import { apiFetch } from '@/lib/api';
import { useAuthAvailable } from '@/lib/auth-availability';
import { waitlistHref } from '@/lib/launch';
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
  { label: 'Advice Hub', href: '/(public)/advice' as Href },
  { label: 'For Trades', href: '/(public)/for-tradespeople' },
];

function HeaderBrand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" asChild><Pressable style={styles.brandPressable} accessibilityLabel="BuildPair home"><BuildPairLogo compact={compact} /></Pressable></Link>;
}

function NavMenu({ dashboard, signedIn, onDashboard, onSignOut, preview = false }: { dashboard?: Href; signedIn?: boolean; onDashboard?: () => void; onSignOut?: () => void; preview?: boolean }) {
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
    { label: "What's new", onPress: () => go('/(public)/updates') },
    { label: 'Trust & Safety', sectionLabel: 'Support', dividerBefore: true, onPress: () => go('/(public)/trust-safety') },
    { label: 'Contact Us', onPress: () => go('/(public)/contact') },
  ];

  if (preview) {
    items.push({ label: 'Get early access', sectionLabel: 'Launch', dividerBefore: true, onPress: () => go(waitlistHref(null, 'header-menu')) });
  } else if (signedIn && dashboard) {
    items.push({ label: 'Dashboard', sectionLabel: 'Account', dividerBefore: true, onPress: () => onDashboard ? onDashboard() : go(dashboard) });
    items.push({ label: 'Sign out', onPress: () => onSignOut?.() });
  } else {
    items.push({ label: 'Sign in', sectionLabel: 'Account', dividerBefore: true, onPress: () => go('/auth/account') });
    items.push({ label: 'Get early access', onPress: () => go(waitlistHref(null, 'header-menu')) });
  }

  return <CompactNavMenu items={items} accessibilityLabel="Menu" />;
}

function DesktopNav() {
  return <View style={styles.desktopNav}>
    {NAV_ITEMS.slice(1).map((item) => <Link href={item.href} asChild key={item.label}><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoalSoft}>{item.label}</Button></Link>)}
  </View>;
}

function MobileQuickNav() {
  return <View style={styles.quickNavShell}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickNav} contentContainerStyle={styles.quickNavContent} accessibilityLabel="BuildPair quick navigation">
      {QUICK_NAV.map((item) => <Link key={item.label} href={item.href} asChild><Button compact mode="text" textColor={colors.charcoalSoft} labelStyle={styles.quickButtonLabel} contentStyle={styles.quickButtonContent} style={styles.quickButton}>{item.label}</Button></Link>)}
    </ScrollView>
  </View>;
}

function CompactShell({ menu }: { menu: ReactNode }) {
  return <View style={styles.shell}><View style={styles.compactHeader}><HeaderBrand compact />{menu}</View><MobileQuickNav /></View>;
}

function AuthenticatedHeader() {
  const { width } = useWindowDimensions();
  const { user, isSignedIn, getToken } = useCurrentUser();
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
  const openDashboard = async () => {
    if (!mode) {
      router.replace('/auth/choose-role');
      return;
    }
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ role: mode }) }, getToken);
    } catch {
      // The protected dashboard performs its own account check; still navigate so the
      // user gets a visible error/retry screen rather than being stranded on a public page.
    }
    router.replace(dashboardHref(mode));
  };

  if (compact) return <CompactShell menu={<NavMenu dashboard={dashboard} signedIn={isSignedIn} onDashboard={() => void openDashboard()} onSignOut={() => void doSignOut()} />} />;
  return <View style={styles.header}>
    <HeaderBrand />
    <View style={styles.actions}>
      <DesktopNav />
      {isSignedIn ? <><Button mode="contained" style={styles.headerActionButton} contentStyle={styles.primaryAction} onPress={() => void openDashboard()}>Dashboard</Button><NavMenu dashboard={dashboard} signedIn onDashboard={() => void openDashboard()} onSignOut={() => void doSignOut()} /></> : <><Link href="/auth/account" asChild><Button mode="text" contentStyle={styles.navButtonContent} textColor={colors.charcoal}>Sign in</Button></Link><Link href={waitlistHref(null, 'header')} asChild><Button mode="contained" style={styles.headerActionButton} contentStyle={styles.primaryAction}>Create account</Button></Link><NavMenu /></>}
    </View>
  </View>;
}

function PreviewHeader() {
  const { width } = useWindowDimensions();
  const compact = width < 1040;
  if (compact) return <CompactShell menu={<NavMenu preview />} />;
  return <View style={styles.header}><HeaderBrand /><View style={styles.actions}><DesktopNav /><Link href={waitlistHref(null, 'preview-header')} asChild><Button mode="contained" style={styles.headerActionButton} contentStyle={styles.primaryAction}>Create account</Button></Link><Text variant="bodySmall" style={styles.preview}>Public preview</Text><NavMenu preview /></View></View>;
}

export function PublicHeader() {
  const authAvailable = useAuthAvailable();
  return authAvailable ? <AuthenticatedHeader /> : <PreviewHeader />;
}

const baseHeader = { minHeight: 72, paddingHorizontal: spacing.xxl, backgroundColor: 'rgba(255,255,255,0.985)', flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const };

const styles = StyleSheet.create({
  shell: { backgroundColor: 'rgba(255,255,255,0.985)', borderBottomWidth: 1, borderColor: colors.border, zIndex: 200, shadowColor: colors.charcoal, shadowOpacity: 0.025, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4, overflow: 'visible', flexShrink: 0 },
  compactHeader: { ...baseHeader, paddingHorizontal: spacing.md, zIndex: 200, overflow: 'visible', flexShrink: 0 },
  header: { ...baseHeader, borderBottomWidth: 1, borderColor: colors.border, shadowColor: colors.charcoal, shadowOpacity: 0.025, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, zIndex: 20 },
  brandPressable: { minHeight: 64, justifyContent: 'center', paddingHorizontal: spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, justifyContent: 'flex-end' },
  desktopNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  navButtonContent: { minHeight: controlHeights.standard, paddingHorizontal: spacing.xxs },
  headerActionButton: { borderRadius: radii.md },
  primaryAction: { minHeight: controlHeights.standard, paddingHorizontal: spacing.sm },
  preview: { opacity: 0.62, marginLeft: spacing.xxs },
  quickNavShell: { height: 48, minHeight: 48, flexShrink: 0, backgroundColor: colors.surfaceRaised, borderTopWidth: 1, borderTopColor: '#F1EBE5', overflow: 'hidden' },
  quickNav: { flexGrow: 0, height: 48 },
  quickNavContent: { minHeight: 48, minWidth: '100%', paddingHorizontal: 4, gap: 0, alignItems: 'center', justifyContent: 'space-around' },
  quickButton: { borderRadius: radii.md },
  quickButtonContent: { minHeight: 36, paddingHorizontal: 2 },
  quickButtonLabel: { fontSize: 12, marginHorizontal: 0 },
});