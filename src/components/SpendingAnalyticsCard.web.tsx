import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import type { MonthlySpendAnalytics } from '@/src/services/analyticsService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  analytics: MonthlySpendAnalytics;
};

function buildChartPaths(points: { value: number; label: string }[], width: number, height: number) {
  const peak = Math.max(...points.map((p) => p.value), 1);
  const paddingX = 16;
  const paddingY = 12;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const coords = points.map((p, i) => ({
    x: paddingX + (i / Math.max(points.length - 1, 1)) * chartW,
    y: paddingY + chartH - (p.value / peak) * chartH,
    label: p.label,
  }));

  if (coords.length < 2) return { linePath: '', areaPath: '', coords };

  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaPath =
    linePath +
    ` L ${coords[coords.length - 1].x} ${paddingY + chartH}` +
    ` L ${coords[0].x} ${paddingY + chartH} Z`;

  return { linePath, areaPath, coords };
}

export function SpendingAnalyticsCard({ analytics }: Props) {
  const isUp = analytics.percentChange >= 0;
  const trendPoints = analytics.spendingTrend ?? [];
  const chartWidth = 320;
  const chartHeight = 120;
  const { linePath, areaPath, coords } = buildChartPaths(
    trendPoints.map((p) => ({ value: p.amount, label: p.label })),
    chartWidth,
    chartHeight
  );
  const hasTrend = trendPoints.some((p) => p.amount > 0);

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
          <View style={styles.chartWrap}>
            <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              <Defs>
                <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={SmartCartColors.primaryLight} stopOpacity="0.35" />
                  <Stop offset="100%" stopColor={SmartCartColors.background} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>
              {areaPath ? <Path d={areaPath} fill="url(#areaFill)" /> : null}
              {linePath ? (
                <Path
                  d={linePath}
                  fill="none"
                  stroke={SmartCartColors.primaryMid}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              ) : null}
              {coords.map((c, i) => (
                <Path
                  key={`${c.label}-${i}`}
                  d={`M ${c.x - 5} ${c.y} a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0`}
                  fill="#fff"
                  stroke={SmartCartColors.primaryMid}
                  strokeWidth={2}
                />
              ))}
            </Svg>
            <View style={styles.labelRow}>
              {trendPoints.map((p, i) => {
                const step = trendPoints.length > 12 ? 5 : trendPoints.length > 8 ? 3 : 1;
                if (i % step !== 0 && i !== trendPoints.length - 1) return null;
                return (
                  <Text key={`${p.date}-${i}`} style={styles.chartLabel}>
                    {p.label}
                  </Text>
                );
              })}
            </View>
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
  trendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  trend: { fontSize: 14, fontWeight: '700' },
  trendUp: { color: SmartCartColors.danger },
  trendDown: { color: SmartCartColors.primary },
  trendLabel: { fontSize: 13, color: SmartCartColors.textSecondary },
  chartWrap: { marginTop: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 4 },
  chartLabel: { fontSize: 10, color: SmartCartColors.textMuted, fontWeight: '500' },
  emptyChart: { fontSize: 13, color: SmartCartColors.textSecondary, textAlign: 'center', paddingVertical: 24 },
});
