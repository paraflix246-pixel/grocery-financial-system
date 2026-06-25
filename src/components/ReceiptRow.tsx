import { Pressable, StyleSheet, View } from 'react-native';

import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { SmartCartColors } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  storeName: string;
  date: string;
  total: number;
  onPress?: () => void;
  onLongPress?: () => void;
  isLast?: boolean;
  selectMode?: boolean;
  selected?: boolean;
};

export function ReceiptRow({
  storeName,
  date,
  total,
  onPress,
  onLongPress,
  isLast,
  selectMode,
  selected,
}: Props) {
  return (
    <Pressable
      style={[styles.row, isLast && styles.rowLast, selected && styles.rowSelected]}
      onPress={onPress}
      onLongPress={onLongPress}>
      {selectMode ? (
        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
          {selected ? (
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} tintColor="#fff" size={14} />
          ) : null}
        </View>
      ) : (
        <StoreBrandAvatar store={storeName} variant="card" size={42} />
      )}
      <View style={styles.body}>
        <Text style={styles.store} numberOfLines={1}>
          {storeName}
        </Text>
        <Text style={styles.date}>{formatDisplayDate(date)}</Text>
      </View>
      <Text style={styles.total}>{formatCurrency(total)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowSelected: { backgroundColor: SmartCartColors.badge },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SmartCartColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: SmartCartColors.primary, borderColor: SmartCartColors.primary },
  body: { flex: 1, minWidth: 0 },
  store: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  date: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  total: {
    minWidth: 72,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: SmartCartColors.text,
    textAlign: 'right',
  },
});
