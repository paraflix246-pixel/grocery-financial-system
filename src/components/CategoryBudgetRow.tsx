import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { CategoryAvatar } from '@/src/components/CategoryAvatar';
import { LinearProgressBar } from '@/src/components/LinearProgressBar';
import { CATEGORY_COLORS, SmartCartColors } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  category: string;
  spent: number;
  limit: number;
};

export function CategoryBudgetRow({ category, spent, limit }: Props) {
  const percent = limit > 0 ? spent / limit : 0;
  const color = CATEGORY_COLORS[category] ?? SmartCartColors.primary;

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <CategoryAvatar category={category} size={36} />
        <View style={styles.info}>
          <Text style={styles.category}>{category}</Text>
          <Text style={styles.amounts}>
            {formatCurrency(spent)} of {formatCurrency(limit)}
          </Text>
        </View>
        <Text style={styles.percent}>{Math.round(percent * 100)}%</Text>
      </View>
      <LinearProgressBar percent={percent} color={color} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  info: { flex: 1 },
  category: { fontSize: 15, fontWeight: '600', color: SmartCartColors.text },
  amounts: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  percent: { fontSize: 13, fontWeight: '700', color: SmartCartColors.textSecondary },
});
