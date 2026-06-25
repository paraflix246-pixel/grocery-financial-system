import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import type { ParsedReceiptDraft } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { isHiddenItemName } from '@/src/utils/receiptDraftNormalizer';
import {
  getEditableItemName,
  UNSCANNED_ITEM_HINT,
  UNSCANNED_ITEM_HINT_DETAIL,
  UNSCANNED_ITEM_LABEL,
} from '@/src/utils/receiptItemLabels';
import { formatCurrency } from '@/src/utils/priceParser';

type Item = ParsedReceiptDraft['items'][number];

type Props = {
  item: Item;
  onNameChange: (name: string) => void;
  onPriceChange: (price: number) => void;
  onRemove?: () => void;
  editable?: boolean;
  /** Preview: label only. Edit: label + name field. */
  variant?: 'preview' | 'edit';
  /** Show Edit action for promo/footer lines. */
  showReviewActions?: boolean;
  onEditPress?: () => void;
};

export function ReceiptDraftItemRow({
  item,
  onNameChange,
  onPriceChange,
  onRemove,
  editable = true,
  variant = 'edit',
  showReviewActions = false,
  onEditPress,
}: Props) {
  const unscanned = isHiddenItemName(item.name);
  const lineKind = item.lineKind ?? 'merchandise';
  const useReviewRow = showReviewActions && lineKind === 'other';

  if (useReviewRow) {
    return (
      <View style={styles.reviewRow}>
        <Pressable
          style={styles.reviewContent}
          onPress={onEditPress}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${formatCurrency(item.price)}`}>
          <Text style={styles.reviewLineText} numberOfLines={2}>
            <Text style={styles.reviewName}>{item.name}</Text>
            <Text style={styles.reviewDot}> · </Text>
            <Text style={styles.reviewPrice}>{formatCurrency(item.price)}</Text>
          </Text>
        </Pressable>
        <Pressable
          style={styles.editPill}
          onPress={onEditPress}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}>
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            tintColor={SmartCartColors.primaryDark}
            size={12}
          />
          <Text style={styles.editPillText}>Edit</Text>
        </Pressable>
      </View>
    );
  }

  if (unscanned) {
    return (
      <View style={[styles.itemRow, styles.itemRowUnscanned]}>
        <SymbolView
          name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
          tintColor={SmartCartColors.accentOrange}
          size={18}
        />
        <View style={styles.unscannedNameSlot}>
          <View style={styles.unscannedTitleRow}>
            <Text style={styles.unscannedLabel}>{UNSCANNED_ITEM_LABEL}</Text>
            {variant === 'preview' ? (
              <Text style={styles.unscannedHint}> · {UNSCANNED_ITEM_HINT}</Text>
            ) : null}
          </View>
          {variant === 'edit' ? (
            <Text style={styles.unscannedHintDetail}>{UNSCANNED_ITEM_HINT_DETAIL}</Text>
          ) : null}
          {variant === 'edit' && editable ? (
            <TextInput
              style={styles.unscannedInput}
              value={getEditableItemName(item.name)}
              onChangeText={onNameChange}
              placeholder="Add item name"
              placeholderTextColor={SmartCartColors.textMuted}
            />
          ) : null}
        </View>
        {onRemove ? (
          <Pressable onPress={onRemove} hitSlop={8}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              tintColor={SmartCartColors.textMuted}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.itemRow}>
      {lineKind === 'fee' ? (
        <View style={styles.badgeFee}>
          <Text style={styles.badgeFeeText}>Fee</Text>
        </View>
      ) : null}
      <TextInput
        style={styles.itemName}
        value={item.name}
        onChangeText={onNameChange}
        editable={editable}
        placeholder="Item name"
        placeholderTextColor={SmartCartColors.textMuted}
      />
      <TextInput
        style={styles.itemPrice}
        value={item.price > 0 ? item.price.toFixed(2) : ''}
        onChangeText={(value) => onPriceChange(parseFloat(value) || 0)}
        editable={editable}
        keyboardType="decimal-pad"
      />
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8}>
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
            tintColor={SmartCartColors.textMuted}
            size={20}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  reviewContent: { flex: 1, minWidth: 0 },
  reviewLineText: { fontSize: 15, lineHeight: 20 },
  reviewName: { color: SmartCartColors.text },
  reviewDot: { color: SmartCartColors.textMuted },
  reviewPrice: { fontWeight: '600', color: SmartCartColors.text },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.primaryMuted,
    flexShrink: 0,
  },
  editPillText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.primaryDark },
  badgeFee: {
    backgroundColor: '#EEF2FF',
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeFeeText: { fontSize: 10, fontWeight: '700', color: '#4338CA' },
  itemRowUnscanned: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: SmartCartRadius.sm,
  },
  unscannedNameSlot: { flex: 1 },
  unscannedTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  itemName: { flex: 1, fontSize: 16, color: SmartCartColors.text, padding: 0 },
  itemPrice: {
    width: 80,
    fontSize: 16,
    fontWeight: '600',
    color: SmartCartColors.text,
    textAlign: 'right',
    padding: 0,
  },
  unscannedLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    color: SmartCartColors.accentOrange,
  },
  unscannedHint: {
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    flexShrink: 1,
  },
  unscannedHintDetail: {
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  unscannedInput: {
    fontSize: 15,
    color: SmartCartColors.text,
    padding: 0,
    marginTop: 6,
  },
});
