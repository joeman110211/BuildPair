import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';

export function FormSelect<T extends string>({ label, value, options, onChange, placeholder = 'Select an option' }: {
  label: string;
  value?: T;
  options: readonly T[];
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return <View style={styles.wrapper}>
    <Text variant="labelLarge" style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ?? placeholder}`} onPress={() => setOpen(true)} style={({ pressed }) => [styles.select, pressed && styles.selectPressed]}>
      <Text style={value ? styles.value : styles.placeholder}>{value ?? placeholder}</Text><View style={styles.chevron}><Text style={styles.chevronText}>⌄</Text></View>
    </Pressable>
    <Portal>
      <Modal visible={open} onDismiss={() => setOpen(false)} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.modalTitle}>{label}</Text>
        <FlatList data={[...options]} keyExtractor={(item) => item} renderItem={({ item }) => (
          <Pressable style={[styles.option, item === value && styles.selected]} onPress={() => { onChange(item); setOpen(false); }}>
            <Text style={[styles.optionText, item === value && styles.optionTextSelected]}>{item}</Text>{item === value ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        )} />
        <View style={styles.modalActions}><Button mode="outlined" contentStyle={styles.cancelButton} onPress={() => setOpen(false)}>Cancel</Button></View>
      </Modal>
    </Portal>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { color: colors.charcoalSoft, fontWeight: '700' },
  select: { minHeight: 50, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, borderRadius: radii.md, paddingLeft: spacing.md, paddingRight: spacing.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectPressed: { backgroundColor: colors.surfaceSoft, borderColor: '#CFC5BC' },
  value: { color: colors.text, flex: 1 },
  placeholder: { color: colors.muted, flex: 1 },
  chevron: { width: 30, height: 30, borderRadius: radii.sm, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  chevronText: { color: colors.charcoalSoft, fontSize: 18, marginTop: -3 },
  modal: { backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, padding: spacing.xl, width: '90%', maxWidth: 540, maxHeight: '78%', alignSelf: 'center', borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  modalTitle: { fontWeight: '900', color: colors.charcoal, marginBottom: spacing.xs },
  option: { minHeight: 50, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radii.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selected: { backgroundColor: colors.primarySoft },
  optionText: { color: colors.charcoalSoft, flex: 1 },
  optionTextSelected: { color: colors.primaryDark, fontWeight: '800' },
  check: { color: colors.primary, fontWeight: '900' },
  modalActions: { alignItems: 'flex-end', paddingTop: spacing.xs },
  cancelButton: { minHeight: controlHeights.standard },
});
