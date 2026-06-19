import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { AppHeader } from '@/src/components/AppHeader';
import { DonutChart } from '@/src/components/DonutChart';
import { CategoryAvatar } from '@/src/components/CategoryAvatar';
import { ReceiptRow } from '@/src/components/ReceiptRow';
import { SpendingAnalyticsCard } from '@/src/components/SpendingAnalyticsCard';
import { getMonthlySpendAnalytics } from '@/src/services/analyticsService';
import { getReceipts } from '@/src/services/storageService';
import type { Receipt } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';
import { getReceiptDisplayTotal } from '@/src/utils/receiptTotals';

export default function ReceiptsScreen() {
  const router = useRouter();
  const { store: storeFilter } = useLocalSearchParams<{ store?: string }>();
  const insets = useSafeAreaInsets();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getMonthlySpendAnalytics>> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = storeFilter ? { storeName: storeFilter } : undefined;
      const [data, monthly] = await Promise.all([getReceipts(filters), getMonthlySpendAnalytics()]);
      setReceipts(data);
      setAnalytics(monthly);
    } catch (error) {
      console.error('Receipts screen load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [storeFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  const resolvedAnalytics = analytics ?? {
    monthlyTotal: 0,
    percentChange: 0,
    chartPoints: [],
    dailyPoints: [],
    spendingTrend: [],
    categoryBreakdown: [],
  };
  const categoryDonut = resolvedAnalytics.categoryBreakdown.slice(0, 5).map((c) => ({
    label: c.category,
    value: c.amount,
    color: c.color,
  }));
  const total = resolvedAnalytics.categoryBreakdown.reduce((s, c) => s + c.amount, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <AppHeader />

      <Text style={styles.pageTitle}>Receipts</Text>
      <Text style={styles.pageSub}>
        {storeFilter ? `Showing receipts from ${storeFilter}` : 'All scanned receipts and spending trends'}
      </Text>

      <Pressable
        style={({ pressed }) => [styles.manualBtn, pressed && styles.manualBtnPressed]}
        onPress={() => router.push('/receipt/manual')}>
        <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }} tintColor={SmartCartColors.primary} size={20} />
        <Text style={styles.manualBtnText}>Add receipt manually</Text>
      </Pressable>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Receipts</Text>
          <Text style={styles.count}>{receipts.length}</Text>
        </View>
        {receipts.length === 0 ? (
          <Text style={styles.empty}>No receipts yet. Scan one to get started.</Text>
        ) : (
          receipts.map((item, i) => (
            <ReceiptRow
              key={item.id}
              storeName={item.storeName}
              date={item.date}
              total={getReceiptDisplayTotal(item)}
              isLast={i === receipts.length - 1}
              onPress={() => router.push(`/receipt/${item.id}`)}
            />
          ))
        )}
      </View>

      <SpendingAnalyticsCard analytics={resolvedAnalytics} />

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        <DonutChart data={categoryDonut} />
        {categoryDonut.map((c) => (
          <View key={c.label} style={styles.catRow}>
            <View style={styles.catLabelRow}>
              <CategoryAvatar category={c.label} size={28} />
              <Text style={styles.catLabel}>{c.label}</Text>
            </View>
            <Text style={styles.catValue}>
              {formatCurrency(c.value)} ({total > 0 ? Math.round((c.value / total) * 100) : 0}%)
            </Text>
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SmartCartColors.background },
  pageTitle: { fontSize: 28, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.5 },
  pageSub: { fontSize: 14, color: SmartCartColors.textSecondary, marginBottom: 20, marginTop: 4 },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.primary,
    ...SmartCartShadow.cardSoft,
  },
  manualBtnPressed: { backgroundColor: SmartCartColors.badge },
  manualBtnText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.primaryDark },
  sectionCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 16,
    ...SmartCartShadow.card,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  count: { fontSize: 14, fontWeight: '600', color: SmartCartColors.textSecondary },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  catLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catLabel: { fontSize: 14, color: SmartCartColors.text },
  catValue: { fontSize: 14, fontWeight: '600', color: SmartCartColors.textSecondary },
  empty: { textAlign: 'center', color: SmartCartColors.textSecondary, paddingVertical: 16 },
});
