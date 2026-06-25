import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import type { ParsedReceiptDraft, ReceiptLineKind } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Item = ParsedReceiptDraft['items'][number];

type Props = {
  visible: boolean;
  item: Item | null;
  onClose: () => void;
  onSave: (partial: Pick<Item, 'name' | 'price' | 'lineKind'>) => void;
};

const LINE_KIND_OPTIONS: Array<{ value: ReceiptLineKind; label: string }> = [
  { value: 'merchandise', label: 'Product' },
  { value: 'other', label: 'Promo / footer' },
  { value: 'fee', label: 'Fee' },
];

export function ReceiptLineEditSheet({ visible, item, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [lineKind, setLineKind] = useState<ReceiptLineKind>('other');

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setPriceText(item.price > 0 ? item.price.toFixed(2) : '');
    setLineKind(item.lineKind ?? 'other');
  }, [item]);

  const handleSave = () => {
    const price = parseFloat(priceText) || 0;
    onSave({
      name: name.trim() || item?.name || '',
      price,
      lineKind,
    });
    onClose();
  };

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      footer={
        <View style={styles.footerRow}>
          <Pressable style={styles.cancelBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={handleSave} accessibilityRole="button">
            <Text style={styles.saveBtnText}>Save line</Text>
          </Pressable>
        </View>
      }>
      <Text style={styles.title}>Edit line</Text>
      <Text style={styles.hint}>Fix a misread name or price, or change how this line is counted.</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Item name"
        placeholderTextColor={SmartCartColors.textMuted}
        autoFocus
      />

      <Text style={styles.label}>Price</Text>
      <TextInput
        style={styles.input}
        value={priceText}
        onChangeText={setPriceText}
        placeholder="0.00"
        placeholderTextColor={SmartCartColors.textMuted}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Line type</Text>
      <View style={styles.kindRow}>
        {LINE_KIND_OPTIONS.map((option) => {
          const selected = lineKind === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.kindChip, selected && styles.kindChipSelected]}
              onPress={() => setLineKind(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}>
              <Text style={[styles.kindChipText, selected && styles.kindChipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text, marginBottom: 4 },
  hint: { fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 18, marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: SmartCartColors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    fontSize: 16,
    color: SmartCartColors.text,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SmartCartColors.card,
  },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  kindChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.background,
  },
  kindChipSelected: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.badgeGreen,
  },
  kindChipText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  kindChipTextSelected: { color: SmartCartColors.primaryDark },
  footerRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: SmartCartColors.textSecondary },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.md,
    alignItems: 'center',
    backgroundColor: SmartCartColors.primary,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
