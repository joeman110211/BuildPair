import type { Href } from 'expo-router';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { UserRole } from '@/types';

type NavItem = { label: string; href: Href; matches: string[] };

const traderItems: NavItem[] = [
  { label: 'Home', href: '/trader/dashboard', matches: ['/trader/dashboard'] },
  { label: 'Find Work', href: '/trader/job-board', matches: ['/trader/job-board'] },
  { label: 'Jobs', href: '/trader/my-jobs', matches: ['/trader/my-jobs', '/trader/jobs/', '/trader/quotes/', '/trader/invoices'] },
  { label: 'Messages', href: '/trader/messages', matches: ['/trader/messages'] },
  { label: 'Profile', href: '/trader/profile', matches: ['/trader/profile', '/trader/onboarding', '/trader/trust', '/trader/analytics', '/trader/stories', '/trader/saved-searches', '/trader/subscription'] },
];

const customerItems: NavItem[] = [
  { label: 'Home', href: '/customer/dashboard', matches: ['/customer/dashboard'] },
  { label: 'Find Trades', href: '/(public)/directory', matches: ['/directory'] },
  { label: 'Jobs', href: '/customer/jobs', matches: ['/customer/jobs', '/customer/new-job', '/customer/compare/'] },
  { label: 'Messages', href: '/customer/messages', matches: ['/customer/messages'] },
  { label: 'Profile', href: '/customer/profile', matches: ['/customer/profile'] },
];

export function AppBottomNav({ role }: { role: UserRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  if (width >= 900) return null;

  const items = role === 'trader' ? traderItems : customerItems;
  return <View style={styles.wrap} accessibilityLabel={`${role === 'trader' ? 'Tradesperson' : 'Homeowner'} navigation`}>
    {items.map((item) => {
      const active = item.matches.some((match) => pathname.includes(match));
      return <Pressable
        key={item.label}
        onPress={() => router.push(item.href)}
        style={[styles.item, active && styles.itemActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label}
      >
        <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}

export function SignedInBottomNav() {
  const { user, isSignedIn } = useCurrentUser();
  if (!isSignedIn || !user) return null;

  let role: UserRole | null = null;
  if (user.activeMode === 'customer' && user.customerEnabled) role = 'customer';
  else if (user.activeMode === 'trader' && user.traderEnabled) role = 'trader';
  else if (user.customerEnabled) role = 'customer';
  else if (user.traderEnabled) role = 'trader';

  return role ? <AppBottomNav role={role} /> : null;
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 62,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 9,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  itemActive: { backgroundColor: colors.primarySoft },
  label: { color: colors.muted, fontWeight: '800', fontSize: 11, textAlign: 'center' },
  labelActive: { color: colors.primary, fontWeight: '900' },
});
