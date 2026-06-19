import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

export type CategoryPill = { label: string; count?: number };

type Props = {
  categories: CategoryPill[];
  selected: string;
  onSelect: (label: string) => void;
};

export function CategoryPills({ categories, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((cat) => {
        const active = selected === cat.label;
        const label = cat.count != null ? `${cat.label} (${cat.count})` : cat.label;
        return (
          <Pressable
            key={cat.label}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onSelect(cat.label)}>
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  pillActive: { backgroundColor: SmartCartColors.primary, borderColor: SmartCartColors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  pillTextActive: { color: '#fff' },
});
