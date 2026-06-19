import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import type { CheapestOption } from '@/src/services/priceComparisonService';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  loading?: boolean;
  cheapest: CheapestOption | null;
  hasHistory?: boolean;
};

export function CheapestBadge({ loading, cheapest, hasHistory }: Props) {
  if (loading) {
    return (
      <View style={styles.badge}>
        <ActivityIndicator size="small" color="#2E7D32" />
        <Text style={styles.loadingText}>Finding cheapest…</Text>
      </View>
    );
  }

  if (!cheapest) {
    return (
      <View style={[styles.badge, styles.mutedBadge]}>
        <Text style={styles.mutedText}>Scan receipts to unlock price comparisons</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.emoji}>💰</Text>
      <Text style={styles.label}>
        Cheapest: {formatCurrency(cheapest.price)} at {cheapest.store}
      </Text>
      {!hasHistory && cheapest.source === 'estimate' && (
        <Text style={styles.hint}>estimate</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  mutedBadge: { backgroundColor: '#f3f4f6' },
  emoji: { fontSize: 14 },
  label: { color: '#2E7D32', fontWeight: '700', fontSize: 13 },
  hint: { color: '#6b7280', fontSize: 11, fontStyle: 'italic' },
  mutedText: { color: '#6b7280', fontSize: 12 },
  loadingText: { color: '#2E7D32', fontSize: 12 },
});
