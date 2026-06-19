import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { InsightCard } from '@/src/components/InsightCard';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getProInsights, type ProInsights } from '@/src/services/analyticsService';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

export default function InsightsProScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unlocked, requestAccess } = useFeatureGate('insights_pro');
  const monthlyBudget = useBudgetStore((s) => (s.settings?.weeklyBudget ?? 200) * 4.33);
  const categoryLimits = useBudgetStore((s) => s.settings?.categoryLimits);
  const [insights, setInsights] = useState<ProInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInsights(await getProInsights(monthlyBudget, categoryLimits));
    } finally {
      setLoading(false);
    }
  }, [monthlyBudget, categoryLimits]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showGated = !unlocked;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="AI Insights Pro" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {showGated && <ProUpgradeBanner featureName="AI Insights Pro" />}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>🧠</Text>
            <Text style={styles.summaryText}>{insights?.summaryLine}</Text>
          </View>

          <Text style={styles.sectionTitle}>Shopping frequency</Text>
          <View style={styles.grid}>
            <InsightCard
              title="This month"
              value={`${insights?.frequency.tripsThisMonth ?? 0} trips`}
              subtitle={`Last month: ${insights?.frequency.tripsLastMonth ?? 0}`}
            />
            <InsightCard
              title="Avg gap"
              value={
                insights?.frequency.avgDaysBetweenTrips
                  ? `${Math.round(insights.frequency.avgDaysBetweenTrips)} days`
                  : '—'
              }
              subtitle={insights?.frequency.busiestDay ? `Busiest: ${insights.frequency.busiestDay}` : undefined}
            />
          </View>

          <Text style={styles.sectionTitle}>Top overspend categories</Text>
          {showGated ? (
            <Pressable style={styles.lockedBlock} onPress={() => requestAccess()}>
              <Text style={styles.lockedText}>🔒 Pro insight — tap to unlock</Text>
            </Pressable>
          ) : insights?.overspendCategories.length === 0 ? (
            <Text style={styles.empty}>No categories over budget this month. Nice work!</Text>
          ) : (
            insights?.overspendCategories.map((cat) => (
              <View key={cat.category} style={styles.overspendRow}>
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <View style={styles.overspendInfo}>
                  <Text style={styles.catName}>{cat.category}</Text>
                  <Text style={styles.catDetail}>
                    {formatCurrency(cat.spent)} of {formatCurrency(cat.limit)} ({Math.round(cat.percentOfLimit)}%)
                  </Text>
                </View>
                <Text style={styles.overAmount}>+{formatCurrency(cat.overAmount)}</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Store comparison trends</Text>
          {showGated ? (
            <Pressable style={styles.lockedBlock} onPress={() => requestAccess()}>
              <Text style={styles.lockedText}>🔒 Pro insight — tap to unlock</Text>
            </Pressable>
          ) : insights?.storeTrends.length === 0 ? (
            <Text style={styles.empty}>Scan receipts to see store spending trends.</Text>
          ) : (
            insights?.storeTrends.slice(0, 5).map((store) => (
              <View key={store.store} style={styles.storeRow}>
                <Text style={styles.storeName}>{store.store}</Text>
                <View style={styles.storeRight}>
                  <Text style={styles.storeAmount}>{formatCurrency(store.thisMonth)}</Text>
                  <Text
                    style={[
                      styles.storeChange,
                      { color: store.changePercent > 0 ? SmartCartColors.danger : SmartCartColors.primary },
                    ]}>
                    {store.changePercent > 0 ? '↑' : store.changePercent < 0 ? '↓' : '—'}
                    {Math.abs(Math.round(store.changePercent))}%
                  </Text>
                </View>
              </View>
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
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.bannerGreen,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  summaryEmoji: { fontSize: 28 },
  summaryText: { flex: 1, fontSize: 14, fontWeight: '600', color: SmartCartColors.primaryDark, lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  lockedBlock: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderStyle: 'dashed',
  },
  lockedText: { fontSize: 14, color: SmartCartColors.textSecondary },
  empty: { fontSize: 14, color: SmartCartColors.textMuted, marginBottom: 16 },
  overspendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  overspendInfo: { flex: 1 },
  catName: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  catDetail: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  overAmount: { fontSize: 14, fontWeight: '800', color: SmartCartColors.danger },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  storeName: { fontSize: 15, fontWeight: '600', color: SmartCartColors.text },
  storeRight: { alignItems: 'flex-end' },
  storeAmount: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  storeChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
