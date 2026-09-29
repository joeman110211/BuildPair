import type { Href } from 'expo-router';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows } from '@/constants/theme';

type Variant = 'public' | 'customer' | 'trader';

type NavItem = {
  label: string;
  icon: string;
  href: Href;
  match: (pathname: string) => boolean;
  prominent?: boolean;
};

const publicItems: NavItem[] = [
  { label: 'Home', icon: 'home-outline', href: '/', match: (p) => p === '/' },
  { label: 'Find', icon: 'magnify', href: '/(public)/directory', match: (p) => p.includes('/directory') },
  { label: 'Join', icon: 'account-plus-outline', href: '/auth/account', match: (p) => p.includes('/auth'), prominent: true },
  { label: 'Advice', icon: 'lightbulb-outline', href: '/(public)/advice', match: (p) => p.includes('/advice') },
  { label: 'Account', icon: 'account-circle-outline', href: '/auth/account', match: (p) => p.includes('/auth') },
];

const customerItems: NavItem[] = [
  { label: 'Home', icon: 'home-outline', href: '/customer/dashboard', match: (p) => p === '/customer/dashboard' },
  { label: 'Find', icon: 'magnify', href: '/(public)/directory', match: (p) => p.includes('/directory') },
  { label: 'Jobs', icon: 'briefcase-outline', href: '/customer/jobs', match: (p) => p === '/customer/jobs' },
  { label: 'Messages', icon: 'message-outline', href: '/customer/messages', match: (p) => p === '/customer/messages' },
  { label: 'Account', icon: 'account-circle-outline', href: '/customer/profile', match: (p) => p.includes('/customer/profile') || p.includes('/customer/settings') },
];

const traderItems: NavItem[] = [
  { label: 'Home', icon: 'home-outline', href: '/trader/dashboard', match: (p) => p === '/trader/dashboard' },
  { label: 'Find work', icon: 'briefcase-search-outline', href: '/trader/job-board', match: (p) => p.includes('/trader/job-board') },
  { label: 'Jobs', icon: 'hammer-wrench', href: '/trader/my-jobs', match: (p) => p === '/trader/my-jobs' },
  { label: 'Messages', icon: 'message-outline', href: '/trader/messages', match: (p) => p === '/trader/messages' },
  { label: 'Account', icon: 'account-circle-outline', href: '/trader/profile', match: (p) => p.includes('/trader/profile') || p.includes('/trader/settings') },
];

function hideForDetailScreen(pathname: string, variant: Variant) {
  if (variant === 'customer') {
    return pathname.includes('/customer/new-job') ||
      pathname.startsWith('/customer/jobs/') ||
      pathname.startsWith('/customer/compare/') ||
      (pathname.startsWith('/customer/messages/') && pathname !== '/customer/messages');
  }
  if (variant === 'trader') {
    return pathname.startsWith('/trader/jobs/') ||
      pathname.includes('/trader/onboarding') ||
      pathname.includes('/trader/subscription') ||
      pathname.startsWith('/trader/quotes/') ||
      pathname.startsWith('/trader/visits/') ||
      pathname.startsWith('/trader/invoices/') ||
      (pathname.startsWith('/trader/messages/') && pathname !== '/trader/messages');
  }
  return false;
}

export function NativeBottomNav({ variant }: { variant: Variant }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (hideForDetailScreen(pathname, variant)) return null;

  const items = variant === 'customer' ? customerItems : variant === 'trader' ? traderItems : publicItems;

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      <View style={styles.row}>
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <View style={[styles.iconWrap, item.prominent && styles.prominentIconWrap, active && !item.prominent && styles.activeIconWrap]}>
                <Icon
                  source={item.icon}
                  size={item.prominent ? 24 : 22}
                  color={item.prominent ? '#FFFFFF' : active ? colors.primaryDark : colors.charcoalSoft}
                />
              </View>
              <Text numberOfLines={1} style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexShrink: 0,
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E1DA',
    ...shadows.raised,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingTop: 5,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 16,
  },
  itemPressed: { backgroundColor: colors.surfaceSoft },
  iconWrap: {
    minWidth: 38,
    height: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrap: { backgroundColor: colors.primarySoft },
  prominentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: -16,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surfaceRaised,
    ...shadows.subtle,
  },
  label: { color: colors.muted, fontSize: 10.5, lineHeight: 14, fontWeight: '700' },
  activeLabel: { color: colors.primaryDark, fontWeight: '900' },
});
