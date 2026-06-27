import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import type { ListItem } from '@/src/models/types';
import { useAppTheme } from '@/src/theme/AppThemeProvider';

type ListItemRowProps = {
  item: ListItem;
  onChange: (field: keyof ListItem, value: string) => void;
  onDelete: () => void;
};

export function ListItemRow({ item, onChange, onDelete }: ListItemRowProps) {
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
        value={item.name}
        onChangeText={(v) => onChange('name', v)}
        placeholder="Item name"
        placeholderTextColor={theme.textMuted}
      />
      <TextInput
        style={inputStyle}
        value={String(item.expectedPrice)}
        onChangeText={(v) => onChange('expectedPrice', v)}
        keyboardType="decimal-pad"
        placeholder="Price"
        placeholderTextColor={theme.textMuted}
      />
      <TextInput
        style={inputStyle}
        value={String(item.quantity)}
        onChangeText={(v) => onChange('quantity', v)}
        keyboardType="decimal-pad"
        placeholder="Qty"
        placeholderTextColor={theme.textMuted}
      />
      <TextInput
        style={inputStyle}
        value={item.category}
        onChangeText={(v) => onChange('category', v)}
        placeholder="Category"
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
    flexWrap: 'wrap',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minWidth: 60,
  },
  nameInput: { flex: 1, minWidth: 100 },
  delete: { fontSize: 18, color: '#F44336', padding: 8 },
});
