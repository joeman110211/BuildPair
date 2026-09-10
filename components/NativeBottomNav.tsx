import type { Href } from 'expo-router';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

type Variant = 'public' | 'customer' | 'trader';

type NavItem = {
  label: string;
  glyph: string;
  href: Href;
  match: (pathname: string) => boolean;
  prominent?: boolean;
};

const publicItems: NavItem[] = [
  { label: 'Home', glyph: '⌂', href: '/', match: (p) => p === '/' },
  { label: 'Find', glyph: '⌕', href: '/(public)/directory', match: (p) => p.includes('/directory') },
  { label: 'Post', glyph: '+', href: '/auth/account', match: (p) => p.includes('/new-job'), prominent: true },
  { label: 'Advice', glyph: '▤', href: '/(public)/advice', match: (p) => p.includes('/advice') },
  { label: 'Account', glyph: '○', href: '/auth/account', match: (p) => p.includes('/auth') },
];

const customerItems: NavItem[] = [
  { label: 'Home', glyph: '⌂', href: '/customer/dashboard', match: (p) => p === '/customer/dashboard' },
  { label: 'Find', glyph: '⌕', href: '/(public)/directory', match: (p) => p.includes('/directory') },
  { label: 'Jobs', glyph: '▤', href: '/customer/jobs', match: (p) => p === '/customer/jobs' },
  { label: 'Messages', glyph: '●', href: '/customer/messages', match: (p) => p === '/customer/messages' },
  { label: 'Account', glyph: '○', href: '/customer/profile', match: (p) => p.includes('/customer/profile') || p.includes('/customer/settings') },
];

const traderItems: NavItem[] = [
  { label: 'Home', glyph: '⌂', href: '/trader/dashboard', match: (p) => p === '/trader/dashboard' },
  { label: 'Find work', glyph: '⌕', href: '/trader/job-board', match: (p) => p.includes('/trader/job-board') },
  { label: 'Jobs', glyph: '▤', href: '/trader/my-jobs', match: (p) => p === '/trader/my-jobs' },
  { label: 'Messages', glyph: '●', href: '/trader/messages', match: (p) => p === '/trader/messages' },
  { label: 'Account', glyph: '○', href: '/trader/profile', match: (p) => p.includes('/trader/profile') || p.includes('/trader/settings') },
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
              style={styles.item}
            >
              <View style={[styles.iconWrap, item.prominent && styles.prominentIconWrap, active && !item.prominent && styles.activeIconWrap]}>
                <Text style={[styles.glyph, item.prominent && styles.prominentGlyph, active && !item.prominent && styles.activeGlyph]}>{item.glyph}</Text>
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
    borderTopColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
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
  },
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
  },
  glyph: { color: colors.charcoalSoft, fontSize: 21, lineHeight: 23, fontWeight: '800' },
  activeGlyph: { color: colors.primaryDark },
  prominentGlyph: { color: '#FFFFFF', fontSize: 28, lineHeight: 30, fontWeight: '500' },
  label: { color: colors.muted, fontSize: 10.5, lineHeight: 14, fontWeight: '700' },
  activeLabel: { color: colors.primaryDark, fontWeight: '900' },
});
