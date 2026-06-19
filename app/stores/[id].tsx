import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ReceiptRow } from '@/src/components/ReceiptRow';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { getStoreById } from '@/src/services/storeService';
import { getReceipts } from '@/src/services/storageService';
import type { Receipt } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

export default function StoreReceiptsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [storeName, setStoreName] = useState('');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const store = await getStoreById(id);
      const name = store?.name ?? id;
      setStoreName(name);
      setReceipts(await getReceipts({ storeName: name }));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.total, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={SmartCartColors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {storeName || 'Store'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <StoreBrandAvatar store={storeName} size={52} />
            <View style={styles.summaryInfo}>
              <Text style={styles.storeName}>{storeName}</Text>
              <Text style={styles.summaryMeta}>
                {receipts.length} receipt{receipts.length === 1 ? '' : 's'}
                {totalSpent > 0 ? ` · ${formatCurrency(totalSpent)} total` : ''}
              </Text>
            </View>
          </View>

          {receipts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No receipts for this store</Text>
              <Text style={styles.emptyBody}>Scan or add a receipt from {storeName} to see it here.</Text>
              <Pressable style={styles.ctaBtn} onPress={() => router.push('/receipt/manual')}>
                <Text style={styles.ctaText}>Add receipt manually</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.listCard}>
              {receipts.map((receipt, index) => (
                <ReceiptRow
                  key={receipt.id}
                  storeName={receipt.storeName}
                  date={receipt.date}
                  total={receipt.total}
                  isLast={index === receipts.length - 1}
                  onPress={() => router.push(`/receipt/${receipt.id}`)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', color: SmartCartColors.text },
  headerSpacer: { width: 22 },
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 16,
    ...SmartCartShadow.card,
  },
  summaryInfo: { flex: 1 },
  storeName: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  summaryMeta: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 4 },
  listCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 8,
    ...SmartCartShadow.card,
  },
  emptyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 24,
    alignItems: 'center',
    ...SmartCartShadow.card,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  emptyBody: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  ctaBtn: {
    marginTop: 20,
    backgroundColor: SmartCartColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
