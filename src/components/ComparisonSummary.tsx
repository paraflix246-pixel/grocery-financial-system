import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import type { ComparisonResult } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

type ComparisonSummaryProps = {
  comparison: ComparisonResult | {
    plannedTotal: number;
    actualTotal: number;
    variance: number;
    items?: ComparisonResult['items'];
  };
  compact?: boolean;
};

export function ComparisonSummary({ comparison, compact }: ComparisonSummaryProps) {
  const direction = comparison.variance >= 0 ? 'Over' : 'Under';
  const varianceAbs = Math.abs(comparison.variance);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan vs Actual</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Planned</Text>
        <Text style={styles.value}>{formatCurrency(comparison.plannedTotal)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Actual</Text>
        <Text style={styles.value}>{formatCurrency(comparison.actualTotal)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, styles.bold]}>{direction} plan</Text>
        <Text style={[styles.value, comparison.variance >= 0 ? styles.over : styles.under]}>
          {formatCurrency(varianceAbs)}
        </Text>
      </View>
      {!compact && comparison.items && comparison.items.length > 0 && (
        <View style={styles.items}>
          {comparison.items.slice(0, 5).map((item, i) => (
            <View key={`${item.name}-${i}`} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.matchType === 'missing' ? '✗ ' : item.matchType === 'extra' ? '+ ' : '✓ '}
                {item.name}
              </Text>
              {item.variance != null && (
                <Text style={item.variance >= 0 ? styles.over : styles.under}>
                  {item.variance >= 0 ? '+' : ''}
                  {formatCurrency(item.variance)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: SmartCartColors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, color: SmartCartColors.textSecondary },
  bold: { fontWeight: '600', color: SmartCartColors.text },
  value: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text },
  over: { color: SmartCartColors.danger },
  under: { color: SmartCartColors.success },
  items: { marginTop: 12, borderTopWidth: 1, borderTopColor: SmartCartColors.border, paddingTop: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { flex: 1, fontSize: 13, marginRight: 8, color: SmartCartColors.text },
});
