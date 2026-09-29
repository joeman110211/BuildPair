import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { colors, radii, shadows, spacing } from '@/constants/theme';

export type CompactNavItem = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  dividerBefore?: boolean;
  sectionLabel?: string;
};

export function CompactNavMenu({ items, accessibilityLabel = 'Menu' }: { items: CompactNavItem[]; accessibilityLabel?: string }) {
  const [open, setOpen] = useState(false);
  const { height: viewportHeight } = useWindowDimensions();
  const menuMaxHeight = Math.max(180, viewportHeight - 120);

  function run(item: CompactNavItem) {
    if (item.disabled) return;
    setOpen(false);
    item.onPress();
  }

  return <View style={styles.wrapper}>
    <IconButton icon={open ? 'close' : 'menu'} mode="outlined" style={styles.menuButton} accessibilityLabel={accessibilityLabel} accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} />
    {open ? <ScrollView
      accessibilityRole="menu"
      style={[styles.panel, { maxHeight: menuMaxHeight }]}
      contentContainerStyle={styles.panelContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {items.map((item, index) => <View key={`${item.label}-${index}`}>
        {item.dividerBefore ? <View style={styles.divider} /> : null}
        {item.sectionLabel ? <Text style={styles.sectionLabel}>{item.sectionLabel}</Text> : null}
        <Pressable
          accessibilityRole="menuitem"
          accessibilityLabel={item.label}
          accessibilityState={{ disabled: Boolean(item.disabled) }}
          disabled={item.disabled}
          onPress={() => run(item)}
          style={({ pressed }) => [styles.item, pressed && !item.disabled ? styles.itemPressed : null, item.disabled ? styles.itemDisabled : null]}
        >
          <Text style={styles.itemText}>{item.label}</Text>
        </Pressable>
      </View>)}
    </ScrollView> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 1000 },
  menuButton: { width: 44, height: 44, margin: 0, borderRadius: radii.md, backgroundColor: colors.surfaceRaised },
  panel: { position: 'absolute', top: 52, right: 0, width: 285, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, ...shadows.raised },
  panelContent: { paddingVertical: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  sectionLabel: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxs },
  item: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  itemPressed: { backgroundColor: colors.surfaceSoft },
  itemDisabled: { opacity: 0.45 },
  itemText: { color: colors.charcoal, fontWeight: '700' },
});
