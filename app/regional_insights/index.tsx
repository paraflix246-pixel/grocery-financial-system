import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getFeatureLabel } from '@/src/services/featureGateService';
import {
  getItemRegionalPriceComparisons,
  getRegionalComparisonHighlights,
  getRegionalInsights,
  type ItemRegionalPriceComparison,
  type RegionalComparisonHighlight,
  type RegionalInsightRow,
} from '@/src/services/analyticsService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

function RegionInsightCard({ row }: { row: RegionalInsightRow }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.regionChip}>
          <Text style={styles.regionChipText}>{row.region}</Text>
        </View>
        <Text style={styles.receiptCount}>
          {row.receiptCount} receipt{row.receiptCount === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Avg receipt</Text>
          <Text style={styles.metricValue}>{formatCurrency(row.avgReceiptTotal)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Inflation index</Text>
          <Text style={styles.metricValue}>
            {row.hasInflationData ? row.inflationIndex : '—'}
          </Text>
        </View>
      </View>
      {!row.hasInflationData ? (
        <Text style={styles.metricHint}>Need more overlapping items in this region</Text>
      ) : null}
    </View>
  );
}

export default function RegionalInsightsScreen() {
  const { unlocked } = useFeatureGate('inflation_tracker');
  const [rows, setRows] = useState<RegionalInsightRow[]>([]);
  const [highlights, setHighlights] = useState<RegionalComparisonHighlight[]>([]);
  const [itemComparisons, setItemComparisons] = useState<ItemRegionalPriceComparison[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insights, comparisonHighlights, items] = await Promise.all([
        getRegionalInsights(6),
        getRegionalComparisonHighlights(6),
        getItemRegionalPriceComparisons(2, 8),
      ]);
      setRows(insights);
      setHighlights(comparisonHighlights);
      setItemComparisons(items.filter((entry) => entry.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={styles.container}>
      <ScreenHeader title="Regional Insights" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!unlocked && <ProUpgradeBanner featureName={getFeatureLabel('inflation_tracker')} />}

          <Text style={styles.lead}>
            Compare average spend and personal inflation across states and provinces from your receipt history.
          </Text>

          {rows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyTitle}>No regions yet</Text>
              <Text style={styles.emptyBody}>
                Add or scan store addresses on receipts to unlock regional comparisons. Edit a receipt and fill in
                city and state/province if auto-detection missed it.
              </Text>
            </View>
          ) : (
            <>
              {itemComparisons.length > 0 ? (
                <View style={styles.itemSection}>
                  <Text style={styles.sectionTitle}>Item price differences</Text>
                  {itemComparisons.map((entry) => (
                    <View key={entry.itemName} style={styles.highlightCard}>
                      <Text style={styles.highlightText}>{entry.message}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {highlights.map((highlight) => (
                <View key={`${highlight.regionA}-${highlight.regionB}-${highlight.message}`} style={styles.highlightCard}>
                  <Text style={styles.highlightText}>{highlight.message}</Text>
                </View>
              ))}
              {rows.map((row) => (
                <RegionInsightCard key={row.region} row={row} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 8 },
  highlightCard: {
    backgroundColor: SmartCartColors.primaryMuted,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  highlightText: { fontSize: 14, color: SmartCartColors.text, lineHeight: 20, fontWeight: '600' },
  itemSection: { gap: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text, marginBottom: 4 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 32,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  emptyBody: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  regionChip: {
    backgroundColor: SmartCartColors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: SmartCartRadius.pill,
  },
  regionChipText: { fontSize: 14, fontWeight: '700', color: SmartCartColors.primary },
  receiptCount: { fontSize: 13, color: SmartCartColors.textSecondary },
  metricsRow: { flexDirection: 'row', gap: 16 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 12, color: SmartCartColors.textMuted, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  metricHint: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 10 },
});
