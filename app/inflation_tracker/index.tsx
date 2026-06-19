import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getPersonalInflation, type PersonalInflation } from '@/src/services/analyticsService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

export default function InflationTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unlocked } = useFeatureGate('inflation_tracker');
  const [data, setData] = useState<PersonalInflation | null>(null);
  const [loading, setLoading] = useState(true);
  const chartWidth = Dimensions.get('window').width - 64;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getPersonalInflation(6));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chartData =
    data?.points.map((p) => ({
      value: p.index,
      label: p.label,
      dataPointText: String(p.index),
    })) ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Inflation Tracker" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!unlocked && <ProUpgradeBanner featureName="Personal Inflation Tracker" />}

          <Text style={styles.lead}>
            Your personal grocery price index — computed from repeat items across receipt history. Base month = 100.
          </Text>

          {!data?.hasEnoughData ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyTitle}>Not enough data yet</Text>
              <Text style={styles.emptyBody}>
                Scan at least 2 receipts with overlapping items across different months to build your inflation index.
              </Text>
              <Text style={styles.emptyMeta}>Tracking {data?.trackedItems ?? 0} unique items</Text>
            </View>
          ) : (
            <>
              <View style={styles.indexCard}>
                <Text style={styles.indexLabel}>Current index</Text>
                <Text style={styles.indexValue}>{data.currentIndex}</Text>
                <Text
                  style={[
                    styles.indexChange,
                    { color: data.changePercent > 0 ? SmartCartColors.danger : SmartCartColors.primary },
                  ]}>
                  {data.changePercent > 0 ? '+' : ''}
                  {data.changePercent.toFixed(1)}% since first month
                </Text>
                <Text style={styles.indexMeta}>{data.trackedItems} items tracked</Text>
              </View>

              {unlocked && chartData.length > 0 && (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Price index over time</Text>
                  <LineChart
                    data={chartData}
                    width={chartWidth}
                    height={180}
                    color={SmartCartColors.primary}
                    thickness={3}
                    hideRules
                    yAxisTextStyle={{ color: SmartCartColors.textMuted, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: SmartCartColors.textMuted, fontSize: 10 }}
                    spacing={chartWidth / Math.max(chartData.length, 1)}
                    initialSpacing={10}
                    endSpacing={10}
                    noOfSections={4}
                    maxValue={Math.max(...chartData.map((d) => d.value), 110)}
                    yAxisOffset={Math.min(...chartData.map((d) => d.value), 90)}
                  />
                </View>
              )}

              {!unlocked && (
                <View style={styles.lockedChart}>
                  <Text style={styles.lockedText}>Upgrade to Pro to view your inflation chart</Text>
                </View>
              )}
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
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 20 },
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
  emptyMeta: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 16 },
  indexCard: {
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  indexLabel: { fontSize: 13, color: SmartCartColors.textSecondary, fontWeight: '600' },
  indexValue: { fontSize: 48, fontWeight: '800', color: SmartCartColors.text, marginVertical: 4 },
  indexChange: { fontSize: 15, fontWeight: '700' },
  indexMeta: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 8 },
  chartCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    overflow: 'hidden',
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  lockedChart: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderStyle: 'dashed',
  },
  lockedText: { fontSize: 14, color: SmartCartColors.textSecondary },
});
