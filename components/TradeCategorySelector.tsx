import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Chip, Text } from 'react-native-paper';
import { SUB_SKILLS, TRADE_CATEGORIES, type TradeCategory } from '@/constants/options';
import { colors } from '@/constants/theme';

type Props = {
  selectedCategories: TradeCategory[];
  serviceSelections: Partial<Record<TradeCategory, string[]>>;
  categoryLimit: number;
  categoryChangeAvailableAt?: string | null;
  onCategoriesChange: (categories: TradeCategory[]) => void;
  onServicesChange: (next: Partial<Record<TradeCategory, string[]>>) => void;
};

function futureDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now() ? null : date;
}

export function TradeCategorySelector({
  selectedCategories,
  serviceSelections,
  categoryLimit,
  categoryChangeAvailableAt,
  onCategoriesChange,
  onServicesChange,
}: Props) {
  const [expanded, setExpanded] = useState<TradeCategory | null>(selectedCategories[0] ?? null);
  const changeLockedUntil = useMemo(() => futureDate(categoryChangeAvailableAt), [categoryChangeAvailableAt]);
  const categoryChangesLocked = Boolean(changeLockedUntil);
  const maxReached = selectedCategories.length >= categoryLimit;

  function toggleCategory(category: TradeCategory) {
    if (categoryChangesLocked) return;
    const selected = selectedCategories.includes(category);
    if (!selected && maxReached) return;

    const nextCategories = selected
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];
    onCategoriesChange(nextCategories);

    if (selected) {
      const nextServices = { ...serviceSelections };
      delete nextServices[category];
      onServicesChange(nextServices);
    } else {
      setExpanded(category);
    }
  }

  function toggleService(category: TradeCategory, service: string) {
    if (!selectedCategories.includes(category)) return;
    const current = serviceSelections[category] ?? [];
    const selected = current.includes(service);
    const next = selected ? current.filter((item) => item !== service) : [...current, service];
    onServicesChange({ ...serviceSelections, [category]: next });
  }

  return <View style={styles.wrapper}>
    <View style={styles.summary}>
      <View style={styles.summaryText}>
        <Text variant="titleMedium" style={styles.summaryTitle}>{selectedCategories.length} of {categoryLimit} trade categories selected</Text>
        <Text style={styles.muted}>Categories use your plan allowance. Services inside each category do not.</Text>
      </View>
      <Chip icon="briefcase-outline">Starter 2 · Plus 4 · Pro 6</Chip>
    </View>

    {changeLockedUntil ? <View style={styles.lockNotice}>
      <Text variant="labelLarge" style={styles.lockTitle}>Main categories locked until {changeLockedUntil.toLocaleDateString('en-GB')}</Text>
      <Text style={styles.muted}>You can still add or remove services inside your existing categories. Main categories can be changed once every 14 days.</Text>
    </View> : null}

    <View style={styles.list}>
      {TRADE_CATEGORIES.map((category) => {
        const selected = selectedCategories.includes(category);
        const services = serviceSelections[category] ?? [];
        const open = expanded === category;
        const categoryDisabled = categoryChangesLocked || (!selected && maxReached);

        return <View key={category} style={[styles.card, selected && styles.cardSelected]}>
          <View style={styles.categoryRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={category}
              accessibilityState={{ checked: selected, disabled: categoryDisabled }}
              onPress={() => toggleCategory(category)}
              disabled={categoryDisabled}
              hitSlop={4}
              style={({ pressed }) => [styles.selectArea, pressed && !categoryDisabled ? styles.pressed : null]}
            >
              <View pointerEvents="none"><Checkbox status={selected ? 'checked' : 'unchecked'} disabled={categoryDisabled} /></View>
              <View style={styles.categoryText} pointerEvents="none">
                <Text variant="titleMedium" style={[styles.categoryTitle, categoryDisabled && !selected && styles.disabledText]}>{category}</Text>
                <Text style={styles.muted}>{selected ? `${services.length} service${services.length === 1 ? '' : 's'} selected` : categoryDisabled && maxReached ? 'Plan category limit reached' : 'Tap the box to add this trade'}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Hide' : 'Show'} ${category} services`} onPress={() => setExpanded(open ? null : category)} style={styles.expandButton}>
              <Text style={styles.expandText}>{open ? 'Hide ▲' : 'Services ▼'}</Text>
            </Pressable>
          </View>

          {open ? <View style={styles.servicesBlock}>
            {!selected ? <Text style={styles.serviceHint}>Select {category} first, then tick every service you genuinely offer.</Text> : null}
            <View style={styles.servicesGrid}>
              {SUB_SKILLS[category].map((service) => {
                const checked = services.includes(service);
                return <Pressable
                  key={service}
                  accessibilityRole="checkbox"
                  accessibilityLabel={service}
                  accessibilityState={{ checked, disabled: !selected }}
                  disabled={!selected}
                  onPress={() => toggleService(category, service)}
                  hitSlop={2}
                  style={({ pressed }) => [styles.service, checked && styles.serviceSelected, !selected && styles.serviceDisabled, pressed && selected ? styles.pressed : null]}
                >
                  <View pointerEvents="none"><Checkbox status={checked ? 'checked' : 'unchecked'} disabled={!selected} /></View>
                  <Text pointerEvents="none" style={[styles.serviceText, !selected && styles.disabledText]}>{service}</Text>
                </Pressable>;
              })}
            </View>
          </View> : null}
        </View>;
      })}
    </View>

    <View style={styles.verificationNote}>
      <Text variant="labelLarge" style={styles.verificationTitle}>Trade selection is not a verification badge</Text>
      <Text style={styles.muted}>Where a service needs registration or certification, BuildPair verification is handled separately. Selecting Gas, Electrical or another regulated service never falsely marks you as verified.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surfaceSoft },
  summaryText: { flex: 1, minWidth: 220, gap: 3 },
  summaryTitle: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  lockNotice: { padding: 13, gap: 3, borderRadius: 15, backgroundColor: '#FFF4EF', borderWidth: 1, borderColor: '#F4B08A' },
  lockTitle: { color: colors.primary, fontWeight: '900' },
  list: { gap: 8 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  cardSelected: { borderColor: colors.primary, backgroundColor: '#FFFBF8' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 7 },
  selectArea: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, borderRadius: 12 },
  pressed: { opacity: 0.72 },
  categoryText: { flex: 1, gap: 1 },
  categoryTitle: { color: colors.charcoal, fontWeight: '800' },
  expandButton: { paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12 },
  expandText: { color: colors.primary, fontWeight: '800' },
  disabledText: { color: '#9B9B9B' },
  servicesBlock: { borderTopWidth: 1, borderTopColor: colors.border, padding: 10, gap: 9, backgroundColor: colors.surfaceSoft },
  serviceHint: { color: colors.muted, lineHeight: 20, paddingHorizontal: 3 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  service: { flexDirection: 'row', alignItems: 'center', minWidth: 190, flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surfaceRaised, paddingRight: 10 },
  serviceSelected: { borderColor: colors.primary, backgroundColor: '#FFF4EF' },
  serviceDisabled: { opacity: 0.62 },
  serviceText: { flex: 1, color: colors.text, lineHeight: 19 },
  verificationNote: { gap: 3, padding: 13, borderRadius: 15, borderWidth: 1, borderColor: colors.border },
  verificationTitle: { color: colors.charcoal, fontWeight: '800' },
});
