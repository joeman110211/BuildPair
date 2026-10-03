import { Link, usePathname, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { colors } from '@/constants/theme';
import { ADMIN_NAV_GROUPS, adminNavItemForPath } from '@/lib/admin/navigation';

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const compact = width < 760;
  const [menuOpen, setMenuOpen] = useState(false);
  const current = useMemo(() => adminNavItemForPath(pathname), [pathname]);

  const openMobileRoute = (href: string) => {
    setMenuOpen(false);
    if (pathname !== href) router.push(href as never);
  };

  return (
    <View style={styles.shell}>
      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <Text variant="labelLarge" style={styles.brand}>BuildPair Admin</Text>
          <Text variant="bodySmall" style={styles.currentLabel}>{current.label}</Text>
        </View>
        {compact ? <Button compact mode={menuOpen ? 'contained' : 'outlined'} onPress={() => setMenuOpen((value) => !value)}>{menuOpen ? 'Close' : 'Menu'}</Button> : null}
      </View>

      <View style={styles.contextBar}>
        <View style={styles.contextCopy}>
          <Text variant="labelLarge" style={styles.contextTitle}>{current.label}</Text>
          <Text variant="bodySmall" style={styles.contextText}>{current.description}</Text>
        </View>
        {current.href !== '/admin/assistant' ? <Link href="/admin/assistant" asChild><Button compact mode="text">Ask assistant</Button></Link> : null}
      </View>

      {compact ? (
        menuOpen ? <ScrollView
          style={[styles.mobileMenu, { maxHeight: Math.max(260, Math.min(560, height * 0.62)) }]}
          contentContainerStyle={styles.mobileMenuContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {ADMIN_NAV_GROUPS.map((group) => <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={styles.groupDescription}>{group.description}</Text>
            <View style={styles.groupLinks}>
              {group.items.map((item) => {
                const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => openMobileRoute(item.href)}
                  style={({ pressed }) => [styles.mobileLink, selected && styles.mobileLinkSelected, pressed && styles.pressed]}
                >
                  <View style={styles.mobileLinkCopy}>
                    <Text style={[styles.mobileLinkLabel, selected && styles.mobileLinkLabelSelected]}>{item.label}</Text>
                    <Text style={styles.mobileLinkDescription}>{item.description}</Text>
                  </View>
                  <Text style={[styles.arrow, selected && styles.arrowSelected]}>→</Text>
                </Pressable>;
              })}
            </View>
          </View>)}
        </ScrollView> : null
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.desktopLinks}>
          {ADMIN_NAV_GROUPS.flatMap((group) => group.items).map((item) => {
            const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href as never} asChild>
              <Button compact mode={selected ? 'contained' : 'text'} style={styles.desktopButton} labelStyle={selected ? styles.selectedLabel : styles.label}>{item.shortLabel}</Button>
            </Link>;
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 10 },
  topRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 9 },
  brandBlock: { flex: 1, minWidth: 0, gap: 1 },
  brand: { color: colors.charcoal, fontWeight: '900' },
  currentLabel: { color: colors.muted },
  contextBar: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  contextCopy: { flex: 1, minWidth: 0, gap: 2 },
  contextTitle: { color: colors.charcoal, fontWeight: '900' },
  contextText: { color: colors.muted, lineHeight: 17 },
  desktopLinks: { gap: 2, paddingHorizontal: 8, paddingVertical: 7, alignItems: 'center' },
  desktopButton: { borderRadius: 999 },
  label: { color: colors.primary, fontWeight: '800' },
  selectedLabel: { fontWeight: '900' },
  mobileMenu: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#FFFFFF' },
  mobileMenuContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24, gap: 16 },
  group: { gap: 4 },
  groupTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 13 },
  groupDescription: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 3 },
  groupLinks: { gap: 6 },
  mobileLink: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
  mobileLinkSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  mobileLinkCopy: { flex: 1, minWidth: 0, gap: 2 },
  mobileLinkLabel: { color: colors.charcoal, fontWeight: '800' },
  mobileLinkLabelSelected: { color: colors.primaryDark, fontWeight: '900' },
  mobileLinkDescription: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  arrow: { color: colors.muted, fontWeight: '900' },
  arrowSelected: { color: colors.primary },
  pressed: { opacity: 0.72 },
});
