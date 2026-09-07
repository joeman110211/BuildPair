import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

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
        <Button mode="text" onPress={() => setOpen(false)}>Cancel</Button>
      </Modal>
    </Portal>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { color: colors.charcoalSoft, fontWeight: '700' },
  select: { minHeight: 54, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, borderRadius: 14, paddingLeft: 14, paddingRight: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectPressed: { backgroundColor: colors.surfaceSoft, borderColor: '#CFC5BC' },
  value: { color: colors.text, flex: 1 },
  placeholder: { color: colors.muted, flex: 1 },
  chevron: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  chevronText: { color: colors.charcoalSoft, fontSize: 18, marginTop: -3 },
  modal: { backgroundColor: colors.surfaceRaised, borderRadius: 24, padding: 18, width: '90%', maxWidth: 540, maxHeight: '78%', alignSelf: 'center', borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontWeight: '900', color: colors.charcoal, marginBottom: 10 },
  option: { minHeight: 50, paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selected: { backgroundColor: colors.primarySoft },
  optionText: { color: colors.charcoalSoft, flex: 1 },
  optionTextSelected: { color: colors.primaryDark, fontWeight: '800' },
  check: { color: colors.primary, fontWeight: '900' },
});
