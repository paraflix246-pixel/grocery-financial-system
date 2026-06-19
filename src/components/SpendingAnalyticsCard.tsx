import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import type { MonthlySpendAnalytics } from '@/src/services/analyticsService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  analytics: MonthlySpendAnalytics;
};

export function SpendingAnalyticsCard({ analytics }: Props) {
  const isUp = analytics.percentChange >= 0;
  const trendPoints = analytics.spendingTrend ?? [];
  const chartData = trendPoints.map((p) => ({
    value: p.amount,
    label: p.label,
    dataPointColor: SmartCartColors.primaryMid,
    dataPointRadius: trendPoints.length > 14 ? 0 : 4,
    dataPointBorderColor: '#fff',
    dataPointBorderWidth: 2,
  }));
  const hasTrend = chartData.some((d) => d.value > 0);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Spending Analytics</Text>
        <View style={styles.periodPill}>
          <Text style={styles.periodText}>This Month</Text>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
            tintColor={SmartCartColors.textSecondary}
            size={14}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.total}>{formatCurrency(analytics.monthlyTotal)}</Text>
        <View style={styles.trendRow}>
          <Text style={[styles.trend, isUp ? styles.trendUp : styles.trendDown]}>
            {isUp ? '+' : ''}
            {analytics.percentChange.toFixed(1)}%
          </Text>
          <Text style={styles.trendLabel}> vs last month</Text>
        </View>

        {hasTrend ? (
          <View style={{ pointerEvents: 'none' }}>
            <LineChart
            data={chartData}
            height={130}
            spacing={chartData.length > 12 ? 22 : chartData.length > 8 ? 28 : 36}
            initialSpacing={12}
            endSpacing={12}
            color={SmartCartColors.primaryMid}
            thickness={2.5}
            hideRules
            hideYAxisText
            yAxisThickness={0}
            xAxisThickness={0}
            curved
            areaChart
            startFillColor={SmartCartColors.primaryLight}
            endFillColor={SmartCartColors.background}
            startOpacity={0.35}
            endOpacity={0.02}
            dataPointsColor={SmartCartColors.primaryMid}
            dataPointsRadius={trendPoints.length > 14 ? 0 : 4}
            xAxisLabelTextStyle={styles.chartLabel}
            maxValue={Math.max(...chartData.map((d) => d.value), 1) * 1.08}
          />
          </View>
        ) : (
          <Text style={styles.emptyChart}>No spending data this month</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    color: SmartCartColors.text,
    ...SmartCartTypography.title,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SmartCartColors.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  periodText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  total: {
    fontSize: 32,
    color: SmartCartColors.text,
    ...SmartCartTypography.display,
  },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 4 },
  trend: { fontSize: 14, fontWeight: '700' },
  trendUp: { color: SmartCartColors.danger },
  trendDown: { color: SmartCartColors.primary },
  trendLabel: { fontSize: 13, color: SmartCartColors.textSecondary },
  chartLabel: { fontSize: 10, color: SmartCartColors.textMuted, fontWeight: '500' },
  emptyChart: { fontSize: 13, color: SmartCartColors.textSecondary, textAlign: 'center', paddingVertical: 24 },
});
