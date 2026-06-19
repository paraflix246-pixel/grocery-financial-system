import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';

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
  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.nameInput]}
        value={name}
        onChangeText={onChangeName}
        placeholder="Item"
      />
      <TextInput
        style={styles.input}
        value={String(price)}
        onChangeText={onChangePrice}
        keyboardType="decimal-pad"
        placeholder="Price"
      />
      <TextInput
        style={styles.input}
        value={String(quantity)}
        onChangeText={onChangeQuantity}
        keyboardType="decimal-pad"
        placeholder="Qty"
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
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minWidth: 60,
    backgroundColor: '#fff',
    color: '#000',
  },
  nameInput: { flex: 1 },
  delete: { fontSize: 18, color: '#F44336', padding: 8 },
});
