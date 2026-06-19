import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { InsightCard } from '@/src/components/InsightCard';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getUsageStats, type UsageStats } from '@/src/services/analyticsService';
import { getCommunityPriceStats } from '@/src/services/crowdsourcedPricingService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';
import { formatDisplayDate } from '@/src/utils/dateParser';

export default function UsageTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unlocked } = useFeatureGate('usage_analytics');
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [community, setCommunity] = useState({ totalPoints: 0, uniqueItems: 0, uniqueStores: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usage, comm] = await Promise.all([getUsageStats(), getCommunityPriceStats()]);
      setStats(usage);
      setCommunity(comm);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Usage Stats" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!unlocked && <ProUpgradeBanner featureName="Advanced Usage Analytics" />}

          <Text style={styles.lead}>Computed from your local SmartCart data — no cloud sync required.</Text>

          <View style={styles.grid}>
            <InsightCard title="Receipts" value={String(stats?.receiptCount ?? 0)} subtitle="Total scanned" />
            <InsightCard title="Lists" value={String(stats?.listCount ?? 0)} subtitle="Shopping lists" />
          </View>
          <View style={styles.grid}>
            <InsightCard title="Line items" value={String(stats?.itemLineCount ?? 0)} subtitle="Across all receipts" />
            <InsightCard title="Comparisons" value={String(stats?.comparisonCount ?? 0)} subtitle="Plan vs actual" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Spending summary</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total spent</Text>
              <Text style={styles.statValue}>{formatCurrency(stats?.totalSpent ?? 0)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Avg receipt</Text>
              <Text style={styles.statValue}>{formatCurrency(stats?.avgReceiptTotal ?? 0)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Stores visited</Text>
              <Text style={styles.statValue}>{stats?.storesVisited ?? 0}</Text>
            </View>
            {stats?.firstReceiptDate && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Tracking since</Text>
                <Text style={styles.statValue}>{formatDisplayDate(stats.firstReceiptDate)}</Text>
              </View>
            )}
          </View>

          {unlocked && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Community contributions</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Price points shared</Text>
                <Text style={styles.statValue}>{community.totalPoints}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Unique items</Text>
                <Text style={styles.statValue}>{community.uniqueItems}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Stores in index</Text>
                <Text style={styles.statValue}>{community.uniqueStores}</Text>
              </View>
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
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, marginBottom: 16, lineHeight: 20 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SmartCartColors.border },
  statLabel: { fontSize: 14, color: SmartCartColors.textSecondary },
  statValue: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
});
