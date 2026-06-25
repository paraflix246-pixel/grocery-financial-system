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
import { Text } from '@/components/Themed';
import { ReceiptRow } from '@/src/components/ReceiptRow';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import type { StoreDefinition } from '@/src/data/stores';
import type { Receipt } from '@/src/models/types';
import { getStoreMemoryStats, type StoreMemoryStats } from '@/src/services/storeMemoryService';
import { getReceipts } from '@/src/services/storageService';
import { getStoreById, removeStoreFromList } from '@/src/services/storeService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

export default function StoreReceiptsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [store, setStore] = useState<StoreDefinition | null>(null);
  const [memory, setMemory] = useState<StoreMemoryStats | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const store = await getStoreById(id);
      const name = store?.name ?? id;
      setStore(store);
      setStoreName(name);
      const [storeReceipts, stats] = await Promise.all([
        getReceipts({ storeName: name }),
        getStoreMemoryStats(name),
      ]);
      setReceipts(storeReceipts);
      setMemory(stats);
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

  function confirmRemoveStore() {
    if (!store) return;
    const receiptNote =
      receipts.length > 0
        ? ` Your ${receipts.length} receipt${receipts.length === 1 ? '' : 's'} from ${store.name} will stay in history.`
        : '';
    confirmDestructiveAction({
      title: `Remove ${store.name}?`,
      message: `Remove this store from your list.${receiptNote}`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        await removeStoreFromList(store);
        router.replace('/stores');
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {storeName || 'Store'}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${storeName}`}
          onPress={confirmRemoveStore}>
          <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={SmartCartColors.danger} size={20} />
        </Pressable>
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

          {memory && memory.visitCount > 0 ? (
            <View style={styles.memoryCard}>
              <Text style={styles.memoryTitle}>Store memory</Text>
              <Text style={styles.memoryStat}>
                Avg trip {formatCurrency(memory.averageTripTotal)} · {memory.visitsThisYear} visits this year
              </Text>
              {memory.lastVisitDate ? (
                <Text style={styles.memoryMeta}>Last visit {formatDisplayDate(memory.lastVisitDate)}</Text>
              ) : null}
              {memory.favoriteItems.length > 0 ? (
                <>
                  <Text style={styles.favoritesTitle}>Favorite items</Text>
                  {memory.favoriteItems.map((item) => (
                    <Text key={item.name} style={styles.favoriteRow}>
                      {item.name} · bought {item.purchaseCount}x
                    </Text>
                  ))}
                </>
              ) : null}
            </View>
          ) : null}

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

          {store ? (
            <Pressable
              style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
              accessibilityRole="button"
              onPress={confirmRemoveStore}>
              <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={SmartCartColors.danger} size={18} />
              <Text style={styles.removeBtnText}>Remove store from list</Text>
            </Pressable>
          ) : null}
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
  headerSpacer: { width: 36 },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: SmartCartRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionPressed: { opacity: 0.7 },
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
  memoryCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...SmartCartShadow.cardSoft,
  },
  memoryTitle: { fontSize: 15, fontWeight: '800', color: SmartCartColors.text },
  memoryStat: { fontSize: 13, fontWeight: '600', color: SmartCartColors.primaryDark, marginTop: 6 },
  memoryMeta: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 4 },
  favoritesTitle: { fontSize: 13, fontWeight: '700', color: SmartCartColors.text, marginTop: 12, marginBottom: 6 },
  favoriteRow: { fontSize: 13, color: SmartCartColors.textSecondary, marginBottom: 4 },
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
  removeBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: SmartCartColors.card,
  },
  removeBtnPressed: { opacity: 0.85 },
  removeBtnText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.danger },
});
