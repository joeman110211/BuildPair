import type { Href } from 'expo-router';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Badge, Text } from 'react-native-paper';
import { colors, radii, spacing } from '@/constants/theme';
import { useActivityCounts } from '@/hooks/useActivityCounts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { UserRole } from '@/types';

type NavItem = { label: string; href: Href; matches: string[] };

const traderItems: NavItem[] = [
  { label: 'Home', href: '/trader/dashboard', matches: ['/trader/dashboard'] },
  { label: 'Find work', href: '/trader/job-board', matches: ['/trader/job-board'] },
  { label: 'Jobs', href: '/trader/my-jobs', matches: ['/trader/my-jobs', '/trader/jobs/', '/trader/quotes/', '/trader/invoices', '/trader/visits/'] },
  { label: 'Messages', href: '/trader/messages', matches: ['/trader/messages'] },
  { label: 'Profile', href: '/trader/profile', matches: ['/trader/profile', '/trader/onboarding', '/trader/trust', '/trader/analytics', '/trader/stories', '/trader/saved-searches', '/trader/subscription'] },
];

const customerItems: NavItem[] = [
  { label: 'Home', href: '/customer/dashboard', matches: ['/customer/dashboard'] },
  { label: 'Find trades', href: '/(public)/directory', matches: ['/directory'] },
  { label: 'Jobs', href: '/customer/jobs', matches: ['/customer/jobs', '/customer/new-job', '/customer/compare/'] },
  { label: 'Messages', href: '/customer/messages', matches: ['/customer/messages'] },
  { label: 'Profile', href: '/customer/profile', matches: ['/customer/profile'] },
];

export function AppBottomNav({ role }: { role: UserRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { unreadMessages } = useActivityCounts(10000);
  if (width >= 900) return null;

  const items = role === 'trader' ? traderItems : customerItems;
  return <View style={styles.wrap} accessibilityLabel={`${role === 'trader' ? 'Tradesperson' : 'Homeowner'} navigation`}>
    {items.map((item) => {
      const active = role === 'trader' && item.label === 'Home'
        ? pathname === '/trader' || pathname === '/trader/dashboard'
        : item.matches.some((match) => pathname.includes(match));
      const showUnread = item.label === 'Messages' && unreadMessages > 0;
      return <Pressable
        key={item.label}
        onPress={() => router.push(item.href)}
        style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={showUnread ? `Messages, ${unreadMessages} unread` : item.label}
      >
        <View style={styles.labelRow}>
          <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          {showUnread ? <Badge size={18}>{unreadMessages > 99 ? '99+' : unreadMessages}</Badge> : null}
        </View>
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
    minHeight: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 5,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  itemActive: { backgroundColor: colors.primarySoft },
  itemPressed: { opacity: 0.72 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, maxWidth: '100%' },
  label: { color: colors.muted, fontWeight: '800', fontSize: 11, textAlign: 'center', flexShrink: 1 },
  labelActive: { color: colors.primaryDark, fontWeight: '900' },
});
