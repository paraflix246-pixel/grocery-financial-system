import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useAppTheme } from '@/src/theme/AppThemeProvider';

type ReceiptItemRowProps = {
  name: string;
  price: number;
  quantity: number;
  onChangeName: (v: string) => void;
  onChangePrice: (v: string) => void;
  onChangeQuantity: (v: string) => void;
  onDelete: () => void;
};

export function ReceiptItemRow({
  name,
  price,
  quantity,
  onChangeName,
  onChangePrice,
  onChangeQuantity,
  onDelete,
}: ReceiptItemRowProps) {
  const { theme } = useAppTheme();
  const inputStyle = [
    styles.input,
    {
      borderColor: theme.border,
      backgroundColor: theme.surface,
      color: theme.text,
    },
  ];

  return (
    <View style={styles.row}>
      <TextInput
        style={[inputStyle, styles.nameInput]}
        value={name}
        onChangeText={onChangeName}
        placeholder="Item"
        placeholderTextColor={theme.textMuted}
      />
      <TextInput
        style={inputStyle}
        value={String(price)}
        onChangeText={onChangePrice}
        keyboardType="decimal-pad"
        placeholder="Price"
        placeholderTextColor={theme.textMuted}
      />
      <TextInput
        style={inputStyle}
        value={String(quantity)}
        onChangeText={onChangeQuantity}
        keyboardType="decimal-pad"
        placeholder="Qty"
        placeholderTextColor={theme.textMuted}
      />
      <Text style={styles.delete} onPress={onDelete}>
        ✕
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minWidth: 60,
  },
  nameInput: { flex: 1 },
  delete: { fontSize: 18, color: '#F44336', padding: 8 },
});
