import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors, radii, spacing } from '@/constants/theme';

export type CompactNavItem = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  dividerBefore?: boolean;
};

export function CompactNavMenu({ items, accessibilityLabel = 'Menu' }: { items: CompactNavItem[]; accessibilityLabel?: string }) {
  const [open, setOpen] = useState(false);

  function run(item: CompactNavItem) {
    if (item.disabled) return;
    setOpen(false);
    item.onPress();
  }

  return <View style={styles.wrapper}>
    <Button
      mode="outlined"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen((value) => !value)}
      contentStyle={styles.buttonContent}
    >
      Menu
    </Button>
    {open ? <View accessibilityRole="menu" style={styles.panel}>
      {items.map((item, index) => <View key={`${item.label}-${index}`}>
        {item.dividerBefore ? <View style={styles.divider} /> : null}
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
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 1000 },
  buttonContent: { minHeight: 44, paddingHorizontal: spacing.xs },
  panel: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: 285,
    maxWidth: '88vw',
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  item: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  itemPressed: { backgroundColor: colors.surfaceSoft },
  itemDisabled: { opacity: 0.45 },
  itemText: { color: colors.charcoal, fontWeight: '700' },
});
