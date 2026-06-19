import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import type { Receipt } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  receipts: Receipt[];
};

export function RecentReceiptsCard({ receipts }: Props) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recent Receipts</Text>
        <Pressable onPress={() => router.push('/(tabs)/receipts')}>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      </View>

      {receipts.length === 0 ? (
        <Text style={styles.empty}>No receipts yet</Text>
      ) : (
        receipts.slice(0, 4).map((receipt, i, arr) => (
          <Pressable
            key={receipt.id}
            style={[styles.row, i === arr.length - 1 && styles.rowLast]}
            onPress={() => router.push(`/receipt/${receipt.id}`)}>
            <StoreBrandAvatar store={receipt.storeName} variant="card" size={40} />
            <View style={styles.rowBody}>
              <Text style={styles.storeName} numberOfLines={1}>
                {receipt.storeName}
              </Text>
              <Text style={styles.date}>{formatDisplayDate(receipt.date)}</Text>
            </View>
            <Text style={styles.total}>{formatCurrency(receipt.total)}</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  seeAll: { fontSize: 12, fontWeight: '600', color: SmartCartColors.primaryMid },
  empty: { fontSize: 12, color: SmartCartColors.textSecondary, textAlign: 'center', paddingVertical: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  rowBody: { flex: 1, minWidth: 0 },
  storeName: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, letterSpacing: -0.1 },
  date: { fontSize: 11, color: SmartCartColors.textSecondary, marginTop: 2 },
  total: {
    minWidth: 68,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: SmartCartColors.text,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
});
