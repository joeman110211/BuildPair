import { useAuth } from '@clerk/expo';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, radii, spacing } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { traderWorkTypeLimit } from '@/lib/subscription';

type PlanSnapshot = {
  subscriptionTier?: 'free' | 'basic' | 'featured' | null;
};

export function PillSelector({
  options,
  values,
  onChange,
  maxSelections,
}: {
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  maxSelections?: number;
}) {
  const { getToken } = useAuth();
  const [remotePlanLimit, setRemotePlanLimit] = useState(2);

  useEffect(() => {
    if (maxSelections != null) return;
    let active = true;
    void apiFetch<PlanSnapshot>('/api/me/profile', {}, getToken)
      .then((profile) => {
        if (active) setRemotePlanLimit(traderWorkTypeLimit(profile));
      })
      .catch(() => {
        // A new trader has no profile yet, so Starter's two-category limit applies.
      });
    return () => { active = false; };
  }, [getToken, maxSelections]);

  const planLimit = maxSelections ?? remotePlanLimit;
  const selected = useMemo(() => new Set(values), [values]);
  const limitReached = values.length >= planLimit;

  function toggle(option: string) {
    const isSelected = values.includes(option);
    if (!isSelected && values.length >= planLimit) return;
    const next = isSelected
      ? values.filter((item) => item !== option)
      : [...new Set([...values, option])];
    onChange(next);
  }

  const webTouchStyle = Platform.OS === 'web' ? ({ touchAction: 'manipulation' } as never) : undefined;

  return <View style={styles.block}>
    <View style={styles.row}>{options.map((option) => {
      const active = selected.has(option);
      const disabled = !active && limitReached;
      return <Pressable
        key={option}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: active, disabled }}
        accessibilityLabel={option}
        disabled={disabled}
        hitSlop={4}
        onPress={() => toggle(option)}
        style={[styles.pill, webTouchStyle, active && styles.active, disabled && styles.disabled]}
      >
        <View style={[styles.box, active && styles.boxActive]}>{active ? <Text style={styles.check}>✓</Text> : null}</View>
        <Text style={active ? styles.activeText : disabled ? styles.disabledText : styles.optionText}>{option}</Text>
      </Pressable>;
    })}</View>
    <Text style={styles.limitText}>Selected {values.length} of {planLimit} · Starter 2 · Plus 4 · Pro 6</Text>
    {limitReached ? <Text style={styles.limitReached}>You’ve reached your current category limit. Remove one to choose another.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { opacity: 0.45 },
  optionText: { color: colors.charcoalSoft },
  activeText: { color: '#FFFFFF', fontWeight: '700' },
  disabledText: { color: colors.muted },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.16)' },
  check: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, lineHeight: 15 },
  limitText: { color: colors.muted, lineHeight: 20 },
  limitReached: { color: colors.warning, fontWeight: '700', lineHeight: 20 },
});
