import { useFocusEffect, useRouter } from 'expo-router';
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
import { BackButton } from '@/src/components/BackButton';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { getReceipts } from '@/src/services/storageService';
import { getAllStores } from '@/src/services/storeService';
import type { StoreDefinition } from '@/src/data/stores';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

type StoreSummary = StoreDefinition & {
  receiptCount: number;
  totalSpent: number;
};

export default function StoresScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allStores, receipts] = await Promise.all([getAllStores(), getReceipts()]);
      const stats = new Map<string, { count: number; total: number }>();

      for (const receipt of receipts) {
        const key = receipt.storeName.trim().toLowerCase();
        const entry = stats.get(key) ?? { count: 0, total: 0 };
        entry.count += 1;
        entry.total += receipt.total;
        stats.set(key, entry);
      }

      setStores(
        allStores.map((store) => {
          const entry = stats.get(store.name.trim().toLowerCase());
          return {
            ...store,
            receiptCount: entry?.count ?? 0,
            totalSpent: entry?.total ?? 0,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton fallbackHref="/settings" />
        <Text style={styles.headerTitle}>Stores</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.lead}>
            Stores from your receipt history and catalog. Tap a store to filter receipts.
          </Text>

          {stores.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No stores yet</Text>
              <Text style={styles.emptyBody}>Scan a receipt to register your first store.</Text>
            </View>
          ) : (
            stores.map((store) => (
              <Pressable
                key={store.id}
                style={({ pressed }) => [styles.storeRow, pressed && styles.storeRowPressed]}
                onPress={() => router.push(`/stores/${store.id}` as never)}>
                <StoreBrandAvatar store={store.name} size={44} />
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeMeta}>
                    {store.receiptCount} receipt{store.receiptCount === 1 ? '' : 's'}
                    {store.totalSpent > 0 ? ` · ${formatCurrency(store.totalSpent)} total` : ''}
                  </Text>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={SmartCartColors.textMuted}
                  size={16}
                />
              </Pressable>
            ))
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
  headerSpacer: { width: 72 },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 16 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  storeRowPressed: { backgroundColor: SmartCartColors.badge, borderColor: SmartCartColors.primary },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  storeMeta: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 3 },
  emptyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 24,
    alignItems: 'center',
    ...SmartCartShadow.card,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  emptyBody: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center', marginTop: 8 },
});
