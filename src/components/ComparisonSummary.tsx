import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import type { ComparisonResult } from '@/src/models/types';
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
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, opacity: 0.7 },
  bold: { fontWeight: '600', opacity: 1 },
  value: { fontSize: 14, fontWeight: '600' },
  over: { color: '#F44336' },
  under: { color: '#4CAF50' },
  items: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { flex: 1, fontSize: 13, marginRight: 8 },
});
