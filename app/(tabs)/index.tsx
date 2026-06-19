import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { AppHeader } from '@/src/components/AppHeader';
import { CheapestCartComparison } from '@/src/components/CheapestCartComparison';
import { DonutChart } from '@/src/components/DonutChart';
import { PriceAlertCard } from '@/src/components/PriceAlertCard';
import { HeroScanCard } from '@/src/components/HeroScanCard';
import { QuickActionGrid } from '@/src/components/QuickActionGrid';
import { RecentReceiptsCard } from '@/src/components/RecentReceiptsCard';
import { SpendingAnalyticsCard } from '@/src/components/SpendingAnalyticsCard';
import { StatusBanner } from '@/src/components/StatusBanner';
import type { Receipt } from '@/src/models/types';
import type { MonthlySpendAnalytics, PriceAlert } from '@/src/services/analyticsService';
import {
  buildHomeInsight,
  getDashboardCategoryBreakdown,
  getMonthlySpendAnalytics,
  getPriceAlerts,
} from '@/src/services/analyticsService';
import type { StoreCartTotal } from '@/src/services/priceComparisonService';
import { getMaxCartSavings, getStoreCartTotals } from '@/src/services/priceComparisonService';
import { getActiveList, getListItems, getReceipts } from '@/src/services/storageService';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { getTimeGreeting, SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const weeklyBudgetSetting = useBudgetStore((s) => s.settings?.weeklyBudget ?? 200);
  const alertThresholdSetting = useBudgetStore((s) => s.settings?.alertThreshold ?? 0.9);
  const [loading, setLoading] = useState(true);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [weeklySpend, setWeeklySpend] = useState(0);
  const [weeklyBudget, setWeeklyBudget] = useState(200);
  const [categoryData, setCategoryData] = useState<{ label: string; value: number; color: string }[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [storeTotals, setStoreTotals] = useState<StoreCartTotal[]>([]);
  const [maxSavings, setMaxSavings] = useState(0);
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<MonthlySpendAnalytics | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const budget = weeklyBudgetSetting;
      const threshold = alertThresholdSetting;

      const activeList = await getActiveList();
      const listItems = activeList ? await getListItems(activeList.id) : [];

      const [homeInsight, receipts, categories, alerts, cartTotals, analytics] = await Promise.all([
        buildHomeInsight(budget, threshold),
        getReceipts(),
        getDashboardCategoryBreakdown(),
        getPriceAlerts(),
        getStoreCartTotals(listItems),
        getMonthlySpendAnalytics(),
      ]);

      setRecentReceipts(receipts.slice(0, 4));
      setWeeklySpend(homeInsight.weeklySpend);
      setWeeklyBudget(homeInsight.weeklyBudget);
      setCategoryData(categories.map((c) => ({ label: c.category, value: c.amount, color: c.color })));
      setPriceAlerts(alerts);
      setStoreTotals(cartTotals);
      setMaxSavings(getMaxCartSavings(cartTotals));
      setMonthlyAnalytics(analytics);
    } catch (error) {
      console.error('Home screen load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [weeklyBudgetSetting, alertThresholdSetting]);

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

  const analytics = monthlyAnalytics ?? {
    monthlyTotal: 0,
    percentChange: 0,
    chartPoints: [],
    dailyPoints: [],
    spendingTrend: [],
    categoryBreakdown: [],
  };

  const underBudget = Math.max(weeklyBudget - weeklySpend, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <AppHeader notificationCount={priceAlerts.length} />

      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{getTimeGreeting()}, Alex 👋</Text>
        <Text style={styles.greetingSub}>Here's your smart shopping overview</Text>
      </View>

      <HeroScanCard />

      <QuickActionGrid />

      <View style={[styles.analyticsRow, isWide && styles.analyticsRowWide]}>
        <View style={[styles.sectionCard, isWide && styles.analyticsHalf]}>
          <Text style={styles.sectionTitle}>Spending Overview</Text>
          <DonutChart data={categoryData} />
        </View>
        {underBudget > 0 && weeklySpend > 0 && (
          <View style={[isWide && styles.analyticsHalf, styles.statusWrap]}>
            <StatusBanner
              message={`You're doing great! You're ${formatCurrency(underBudget)} under budget`}
              emoji="🌿"
            />
          </View>
        )}
      </View>

      <CheapestCartComparison stores={storeTotals} maxSavings={maxSavings} />

      <View style={[styles.twoCol, isWide && styles.twoColRow]}>
        <PriceAlertCard alerts={priceAlerts} />
        <RecentReceiptsCard receipts={recentReceipts} />
      </View>

      <SpendingAnalyticsCard analytics={analytics} />

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SmartCartColors.background,
    maxHeight: '100%',
  },
  greetingBlock: { marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.5 },
  greetingSub: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4 },
  analyticsRow: { gap: 16, marginBottom: 16 },
  analyticsRowWide: { flexDirection: 'row', alignItems: 'stretch' },
  analyticsHalf: { flex: 1 },
  statusWrap: { justifyContent: 'center' },
  sectionCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    ...SmartCartShadow.card,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  twoCol: { gap: 12, marginBottom: 16 },
  twoColRow: { flexDirection: 'row', alignItems: 'stretch' },
});
