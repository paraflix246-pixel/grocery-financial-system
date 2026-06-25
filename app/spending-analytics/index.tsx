import { useFocusEffect } from 'expo-router';

import { useCallback, useRef, useState } from 'react';

import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import Svg, { Circle, Polyline, Line as SvgLine, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/Themed';

import { CategoryAvatar } from '@/src/components/CategoryAvatar';

import { DonutChart } from '@/src/components/DonutChart';

import { SpendingAnalyticsCard } from '@/src/components/SpendingAnalyticsCard';

import { MockupCard } from '@/src/components/mockup/MockupUI';

import { ScreenHeader } from '@/src/components/ScreenHeader';

import { getMonthlySpendAnalytics } from '@/src/services/analyticsService';

import type { MonthlySpendAnalytics } from '@/src/services/analyticsService';

import type { Receipt } from '@/src/models/types';

import { getReceipts } from '@/src/services/storageService';

import { getPriceTrend, type PriceTrendPoint } from '@/src/services/communityPricingService';
import { filterByPriceHistoryTier, getMaxPriceHistoryDays } from '@/src/services/tierLimits';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { getFeatureLabel } from '@/src/services/featureGateService';

import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

import { formatCurrency } from '@/src/utils/priceParser';



const CHART_W = 280;
const CHART_H = 80;
const CHART_PAD_X = 4;
const CHART_PAD_Y = 6;

function buildPctChange(
  trend: PriceTrendPoint[],
  monthsAgo: number
): string | null {
  if (trend.length < 2) return null;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsAgo);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const past = trend.filter((p) => p.date <= cutoffStr);
  if (past.length === 0) return null;
  const pastPrice = past[past.length - 1].avgPrice;
  const nowPrice = trend[trend.length - 1].avgPrice;
  const pct = ((nowPrice - pastPrice) / pastPrice) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function PriceTrendMiniChart({ trend }: { trend: PriceTrendPoint[] }) {
  if (trend.length < 2) return null;
  const prices = trend.map((p) => p.avgPrice);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const pts = trend
    .map((point, i) => {
      const x =
        CHART_PAD_X +
        (i / (trend.length - 1)) * (CHART_W - CHART_PAD_X * 2);
      const y =
        CHART_PAD_Y +
        (1 - (point.avgPrice - minP) / range) * (CHART_H - CHART_PAD_Y * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastIdx = trend.length - 1;
  const lastX =
    CHART_PAD_X +
    (lastIdx / (trend.length - 1)) * (CHART_W - CHART_PAD_X * 2);
  const lastY =
    CHART_PAD_Y +
    (1 - (trend[lastIdx].avgPrice - minP) / range) * (CHART_H - CHART_PAD_Y * 2);

  return (
    <Svg width={CHART_W} height={CHART_H} style={trendStyles.chart}>
      <SvgLine
        x1={CHART_PAD_X}
        y1={CHART_H - CHART_PAD_Y}
        x2={CHART_W - CHART_PAD_X}
        y2={CHART_H - CHART_PAD_Y}
        stroke={SmartCartColors.border}
        strokeWidth={1}
      />
      <Polyline
        points={pts}
        fill="none"
        stroke={SmartCartColors.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={lastX}
        cy={lastY}
        r={4}
        fill={SmartCartColors.primary}
      />
      <SvgText
        x={CHART_PAD_X}
        y={CHART_PAD_Y + 4}
        fontSize={9}
        fill={SmartCartColors.textMuted}
      >
        {formatCurrency(maxP)}
      </SvgText>
      <SvgText
        x={CHART_PAD_X}
        y={CHART_H - CHART_PAD_Y - 2}
        fontSize={9}
        fill={SmartCartColors.textMuted}
      >
        {formatCurrency(minP)}
      </SvgText>
    </Svg>
  );
}

function ItemPriceTrendCard() {
  const { unlocked: fullHistoryUnlocked } = useFeatureGate('usage_analytics');
  const maxHistoryDays = getMaxPriceHistoryDays();
  const [query, setQuery] = useState('');
  const [activeItem, setActiveItem] = useState('');
  const [trend, setTrend] = useState<PriceTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (itemName: string) => {
    const trimmed = itemName.trim();
    if (trimmed.length < 2) {
      setTrend([]);
      setActiveItem('');
      return;
    }
    setLoading(true);
    try {
      const result = await getPriceTrend(trimmed, 12);
      setTrend(filterByPriceHistoryTier(result));
      setActiveItem(trimmed);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void search(text);
      }, 600);
    },
    [search]
  );

  const pct3mo = buildPctChange(trend, 3);
  const pct6mo = buildPctChange(trend, 6);
  const pct1yr = buildPctChange(trend, 12);

  const hasTrend = trend.length >= 2;
  const latestPrice = hasTrend ? trend[trend.length - 1].avgPrice : null;

  return (
    <MockupCard>
      <Text style={trendStyles.title}>Community Price Trends</Text>
      <Text style={trendStyles.subtitle}>
        Based on anonymized community receipt scans
        {maxHistoryDays ? ` · Free plan shows last ${maxHistoryDays} days` : ''}
      </Text>
      {!fullHistoryUnlocked && (
        <ProUpgradeBanner featureName={getFeatureLabel('usage_analytics')} />
      )}
      <TextInput
        style={trendStyles.input}
        value={query}
        onChangeText={handleChange}
        placeholder='Search an item (e.g. "eggs")'
        placeholderTextColor={SmartCartColors.textMuted}
        returnKeyType="search"
        onSubmitEditing={() => void search(query)}
      />
      {loading ? (
        <ActivityIndicator
          size="small"
          color={SmartCartColors.primary}
          style={trendStyles.loader}
        />
      ) : hasTrend ? (
        <View>
          <View style={trendStyles.priceRow}>
            <Text style={trendStyles.currentPrice}>
              {formatCurrency(latestPrice!)}
            </Text>
            <Text style={trendStyles.currentLabel}>avg now</Text>
          </View>
          <PriceTrendMiniChart trend={trend} />
          <View style={trendStyles.pctRow}>
            {pct3mo ? (
              <View style={trendStyles.pctBadge}>
                <Text
                  style={[
                    trendStyles.pctValue,
                    pct3mo.startsWith('+')
                      ? trendStyles.pctUp
                      : trendStyles.pctDown,
                  ]}
                >
                  {pct3mo}
                </Text>
                <Text style={trendStyles.pctPeriod}>3mo</Text>
              </View>
            ) : null}
            {pct6mo ? (
              <View style={trendStyles.pctBadge}>
                <Text
                  style={[
                    trendStyles.pctValue,
                    pct6mo.startsWith('+')
                      ? trendStyles.pctUp
                      : trendStyles.pctDown,
                  ]}
                >
                  {pct6mo}
                </Text>
                <Text style={trendStyles.pctPeriod}>6mo</Text>
              </View>
            ) : null}
            {pct1yr ? (
              <View style={trendStyles.pctBadge}>
                <Text
                  style={[
                    trendStyles.pctValue,
                    pct1yr.startsWith('+')
                      ? trendStyles.pctUp
                      : trendStyles.pctDown,
                  ]}
                >
                  {pct1yr}
                </Text>
                <Text style={trendStyles.pctPeriod}>1yr</Text>
              </View>
            ) : null}
          </View>
          <Text style={trendStyles.sampleNote}>
            {trend.reduce((s, p) => s + p.sampleCount, 0)} price observations
            for &quot;{activeItem}&quot;
          </Text>
        </View>
      ) : activeItem.length >= 2 ? (
        <Text style={trendStyles.empty}>
          No data yet — scan more receipts to see trends for &quot;{activeItem}&quot;
        </Text>
      ) : (
        <Text style={trendStyles.empty}>
          No data yet — scan more receipts to see trends
        </Text>
      )}
    </MockupCard>
  );
}

export default function SpendingAnalyticsScreen() {

  const { unlocked: breakdownUnlocked, requestAccess } = useFeatureGate('insights_pro');
  const [loading, setLoading] = useState(true);

  const [analytics, setAnalytics] = useState<MonthlySpendAnalytics | null>(null);

  const [receipts, setReceipts] = useState<Receipt[]>([]);



  const load = useCallback(async () => {

    setLoading(true);

    try {

      const [monthly, allReceipts] = await Promise.all([getMonthlySpendAnalytics(), getReceipts()]);

      setAnalytics(monthly);

      setReceipts(allReceipts);

    } finally {

      setLoading(false);

    }

  }, []);



  useFocusEffect(useCallback(() => { load(); }, [load]));



  const resolved = analytics ?? {

    monthlyTotal: 0,

    percentChange: 0,

    chartPoints: [],

    dailyPoints: [],

    spendingTrend: [],

    categoryBreakdown: [],

  };

  const categoryDonut = resolved.categoryBreakdown.slice(0, 6).map((c) => ({

    label: c.category,

    value: c.amount,

    color: c.color,

  }));

  const total = resolved.categoryBreakdown.reduce((s, c) => s + c.amount, 0);



  return (

    <View style={styles.container}>

      <ScreenHeader title="Spending Analytics" />

      {loading ? (

        <View style={styles.center}>

          <ActivityIndicator size="large" color={SmartCartColors.primary} />

        </View>

      ) : (

        <ScrollView contentContainerStyle={styles.content}>

          {!breakdownUnlocked && (
            <ProUpgradeBanner featureName={getFeatureLabel('insights_pro')} />
          )}

          <SpendingAnalyticsCard receipts={receipts} fullBleed />

          <Text style={styles.sectionTitle}>Community Price Trends</Text>

          <ItemPriceTrendCard />

          <Text style={styles.sectionTitle}>Spending by Category</Text>

          {breakdownUnlocked ? (
          <MockupCard>

            <DonutChart data={categoryDonut} radius={72} innerRadius={48} />

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

            {categoryDonut.length === 0 ? (

              <Text style={styles.empty}>Scan receipts to see category breakdown.</Text>

            ) : null}

          </MockupCard>
          ) : (
            <MockupCard>
              <Text style={styles.empty}>
                Upgrade to Pro for spending breakdowns by category and store.
              </Text>
              <TouchableOpacity onPress={() => requestAccess()}>
                <Text style={styles.upgradeLink}>View Pro plans</Text>
              </TouchableOpacity>
            </MockupCard>
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

  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },

  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },

  catLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  catLabel: { fontSize: 14, color: SmartCartColors.text },

  catValue: { fontSize: 14, fontWeight: '600', color: SmartCartColors.textSecondary },

  empty: { fontSize: 14, color: SmartCartColors.textMuted, textAlign: 'center', paddingVertical: 12 },
  upgradeLink: {
    fontSize: 14,
    fontWeight: '700',
    color: SmartCartColors.primary,
    textAlign: 'center',
    marginTop: 8,
  },

});

const trendStyles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text, marginBottom: 4 },
  subtitle: { fontSize: 12, color: SmartCartColors.textMuted, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.background,
    marginBottom: 12,
  },
  loader: { marginVertical: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  currentPrice: { fontSize: 24, fontWeight: '800', color: SmartCartColors.text },
  currentLabel: { fontSize: 12, color: SmartCartColors.textMuted },
  chart: { marginBottom: 10, alignSelf: 'center' },
  pctRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  pctBadge: { alignItems: 'center' },
  pctValue: { fontSize: 14, fontWeight: '700' },
  pctUp: { color: SmartCartColors.accentOrange },
  pctDown: { color: '#22c55e' },
  pctPeriod: { fontSize: 11, color: SmartCartColors.textMuted },
  sampleNote: { fontSize: 11, color: SmartCartColors.textMuted, marginTop: 4 },
  empty: { fontSize: 13, color: SmartCartColors.textMuted, textAlign: 'center', paddingVertical: 16, lineHeight: 20 },
});


