import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import type { ListItem } from '@/src/models/types';

type ListItemRowProps = {
  item: ListItem;
  onChange: (field: keyof ListItem, value: string) => void;
  onDelete: () => void;
};

export function ListItemRow({ item, onChange, onDelete }: ListItemRowProps) {
  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.nameInput]}
        value={item.name}
        onChangeText={(v) => onChange('name', v)}
        placeholder="Item name"
      />
      <TextInput
        style={styles.input}
        value={String(item.expectedPrice)}
        onChangeText={(v) => onChange('expectedPrice', v)}
        keyboardType="decimal-pad"
        placeholder="Price"
      />
      <TextInput
        style={styles.input}
        value={String(item.quantity)}
        onChangeText={(v) => onChange('quantity', v)}
        keyboardType="decimal-pad"
        placeholder="Qty"
      />
      <TextInput
        style={styles.input}
        value={item.category}
        onChangeText={(v) => onChange('category', v)}
        placeholder="Category"
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
    flexWrap: 'wrap',
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
  nameInput: { flex: 1, minWidth: 100 },
  delete: { fontSize: 18, color: '#F44336', padding: 8 },
});
