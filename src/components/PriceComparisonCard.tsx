import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import type { StorePrice } from '@/src/services/priceComparisonService';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  prices: StorePrice[];
  onUseCheapest?: () => void;
  showUseButton?: boolean;
};

export function PriceComparisonCard({ prices, onUseCheapest, showUseButton = true }: Props) {
  if (prices.length === 0) return null;

  const cheapestStore = prices[0]?.store;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Store price comparison</Text>
        {showUseButton && onUseCheapest && (
          <Pressable style={styles.useButton} onPress={onUseCheapest}>
            <Text style={styles.useButtonText}>Use cheapest</Text>
          </Pressable>
        )}
      </View>

      {prices.map((entry, index) => {
        const isCheapest = entry.store === cheapestStore;
        return (
          <View
            key={`${entry.store}-${index}`}
            style={[styles.row, isCheapest && styles.cheapestRow]}
          >
            <View style={styles.rankCol}>
              <Text style={[styles.rank, isCheapest && styles.cheapestText]}>{index + 1}</Text>
            </View>
            <View style={styles.storeCol}>
              <Text style={[styles.storeName, isCheapest && styles.cheapestText]}>
                {entry.store}
                {isCheapest ? ' ✓' : ''}
              </Text>
              {entry.source === 'estimate' && (
                <Text style={styles.estimateTag}>estimated</Text>
              )}
              {entry.source === 'history' && entry.sampleCount != null && (
                <Text style={styles.historyTag}>{entry.sampleCount} purchases</Text>
              )}
            </View>
            <Text style={[styles.price, isCheapest && styles.cheapestText]}>
              {formatCurrency(entry.price)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 14, fontWeight: '700' },
  useButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  useButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  cheapestRow: { backgroundColor: '#E8F5E9' },
  rankCol: { width: 24 },
  rank: { fontWeight: '600', color: '#6b7280' },
  storeCol: { flex: 1 },
  storeName: { fontSize: 14, fontWeight: '600' },
  price: { fontSize: 14, fontWeight: '700' },
  cheapestText: { color: '#2E7D32' },
  estimateTag: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },
  historyTag: { fontSize: 11, color: '#6b7280' },
});
