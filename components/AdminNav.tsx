import { Link, usePathname } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

const links = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/insights', label: 'Insights' },
  { href: '/admin/visitors', label: 'Visitors' },
  { href: '/admin/presence', label: 'Live' },
  { href: '/admin/jobs', label: 'Jobs' },
  { href: '/admin/profiles', label: 'Profiles' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/moderation', label: 'Safety' },
  { href: '/admin/system', label: 'System' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <View style={styles.shell}>
      <View style={styles.titleRow}>
        <Text variant="labelLarge" style={styles.brand}>BuildPair Admin</Text>
        <Text variant="bodySmall" style={styles.hint}>Owner tools</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.links}>
        {links.map((item) => {
          const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href as never} asChild>
              <Button
                compact
                mode={selected ? 'contained' : 'text'}
                style={styles.button}
                labelStyle={selected ? styles.selectedLabel : styles.label}
              >
                {item.label}
              </Button>
            </Link>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 8,
    paddingBottom: 7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  brand: { color: colors.charcoal, fontWeight: '900' },
  hint: { color: colors.muted },
  links: { gap: 2, paddingHorizontal: 8, alignItems: 'center' },
  button: { borderRadius: 999 },
  label: { color: colors.primary, fontWeight: '800' },
  selectedLabel: { fontWeight: '900' },
});
