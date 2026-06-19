import { useFocusEffect, useRouter } from 'expo-router';
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
import { HeroScanCard } from '@/src/components/HeroScanCard';
import { InsightCard } from '@/src/components/InsightCard';
import { PriceAlertCard } from '@/src/components/PriceAlertCard';
import { QuickActionGrid } from '@/src/components/QuickActionGrid';
import { RecentReceiptsCard } from '@/src/components/RecentReceiptsCard';
import { SpendingAnalyticsCard } from '@/src/components/SpendingAnalyticsCard';
import { StatusBanner } from '@/src/components/StatusBanner';
import type { Receipt } from '@/src/models/types';
import type { HomeInsight, MonthlySpendAnalytics, PriceAlert } from '@/src/services/analyticsService';
import {
  buildHomeInsight,
  getDashboardCategoryBreakdown,
  getMonthlySpendAnalytics,
} from '@/src/services/analyticsService';
import { getAllPriceAlerts } from '@/src/services/priceAlertService';
import type { StoreCartTotal } from '@/src/services/priceComparisonService';
import { getMaxCartSavings, getCartComparisonSources, getStoreCartTotals } from '@/src/services/priceComparisonService';
import { getActiveList, getListItems, getReceipts } from '@/src/services/storageService';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { getTimeGreeting, SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const weeklyBudgetSetting = useBudgetStore((s) => s.settings?.weeklyBudget ?? 200);
  const alertThresholdSetting = useBudgetStore((s) => s.settings?.alertThreshold ?? 0.9);
  const displayName = useSettingsStore((s) => s.settings?.displayName ?? '');
  const notifyBudgetAlerts = useSettingsStore((s) => s.settings?.notifyBudgetAlerts ?? true);
  const [loading, setLoading] = useState(true);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [homeInsight, setHomeInsight] = useState<HomeInsight | null>(null);
  const [categoryData, setCategoryData] = useState<{ label: string; value: number; color: string }[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [storeTotals, setStoreTotals] = useState<StoreCartTotal[]>([]);
  const [maxSavings, setMaxSavings] = useState(0);
  const [cartHasHistory, setCartHasHistory] = useState(false);
  const [cartHasCommunity, setCartHasCommunity] = useState(false);
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<MonthlySpendAnalytics | null>(null);
  const [hasActiveList, setHasActiveList] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const budget = weeklyBudgetSetting;
      const threshold = alertThresholdSetting;

      const activeList = await getActiveList();
      const listItems = activeList ? await getListItems(activeList.id) : [];

      const [insight, receipts, categories, alerts, cartTotals, cartSources, analytics] = await Promise.all([
        buildHomeInsight(budget, threshold),
        getReceipts(),
        getDashboardCategoryBreakdown(),
        getAllPriceAlerts(),
        getStoreCartTotals(listItems),
        getCartComparisonSources(listItems),
        getMonthlySpendAnalytics(),
      ]);

      await useSettingsStore.getState().loadSettings();

      setRecentReceipts(receipts.slice(0, 4));
      setHomeInsight(insight);
      setCategoryData(categories.map((c) => ({ label: c.category, value: c.amount, color: c.color })));
      setPriceAlerts(alerts);
      setStoreTotals(cartTotals);
      setMaxSavings(getMaxCartSavings(cartTotals));
      setCartHasHistory(cartSources.hasHistory);
      setCartHasCommunity(cartSources.hasCommunity);
      setMonthlyAnalytics(analytics);
      setHasActiveList(listItems.length > 0);
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

  const weeklyBudget = homeInsight?.weeklyBudget ?? weeklyBudgetSetting;
  const weeklySpend = homeInsight?.weeklySpend ?? 0;
  const underBudget = Math.max(weeklyBudget - weeklySpend, 0);
  const budgetPercentLabel = `${Math.round((homeInsight?.budgetPercent ?? 0) * 100)}% of weekly budget`;
  const greetingName = displayName.trim();
  const greetingText = greetingName ? `${getTimeGreeting()}, ${greetingName}` : getTimeGreeting();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <AppHeader
        notificationCount={priceAlerts.length}
        onNotificationPress={() => router.push('/price-alerts')}
      />

      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{greetingText} 👋</Text>
        <Text style={styles.greetingSub}>Here's your smart shopping overview</Text>
      </View>

      {homeInsight && notifyBudgetAlerts && homeInsight.isOverBudget && (
        <StatusBanner
          message={`Weekly budget exceeded by ${formatCurrency(Math.max(homeInsight.weeklySpend - homeInsight.weeklyBudget, 0))}`}
          emoji="⚠️"
          variant="warning"
        />
      )}

      {homeInsight && notifyBudgetAlerts && !homeInsight.isOverBudget && homeInsight.isOverThreshold && (
        <StatusBanner
          message={`You've used ${Math.round(homeInsight.budgetPercent * 100)}% of your weekly budget — approaching your alert threshold`}
          emoji="📊"
          variant="warning"
        />
      )}

      {homeInsight && (
        <View style={[styles.insightRow, isWide && styles.insightRowWide]}>
          <InsightCard
            title="This Week"
            value={`${formatCurrency(homeInsight.weeklySpend)} / ${formatCurrency(homeInsight.weeklyBudget)}`}
            subtitle={
              homeInsight.isOverBudget
                ? 'Over weekly budget'
                : homeInsight.isOverThreshold
                  ? 'Approaching budget limit'
                  : budgetPercentLabel
            }
            variant={
              homeInsight.isOverBudget ? 'warning' : homeInsight.isOverThreshold ? 'warning' : 'default'
            }
          />
          {homeInsight.comparisonSummary ? (
            <InsightCard
              title="Plan vs Actual"
              value={homeInsight.comparisonSummary}
              subtitle={homeInsight.topInsight ?? undefined}
              variant={homeInsight.comparisonSummary.startsWith('Over') ? 'warning' : 'success'}
            />
          ) : homeInsight.mostExpensiveStore ? (
            <InsightCard
              title="Top Store"
              value={homeInsight.mostExpensiveStore}
              subtitle={
                homeInsight.avgReceiptValue > 0
                  ? `Avg receipt ${formatCurrency(homeInsight.avgReceiptValue)}`
                  : undefined
              }
            />
          ) : null}
        </View>
      )}

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

      {hasActiveList ? (
        <CheapestCartComparison
          stores={storeTotals}
          maxSavings={maxSavings}
          hasHistory={cartHasHistory}
          hasCommunity={cartHasCommunity}
        />
      ) : (
        <View style={styles.listHintCard}>
          <Text style={styles.listHintTitle}>Cart comparison</Text>
          <Text style={styles.listHintBody}>
            Create or open a shopping list to compare store totals for your planned items.
          </Text>
        </View>
      )}

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
  greetingBlock: { marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.5 },
  greetingSub: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4 },
  insightRow: { gap: 10, marginBottom: 20 },
  insightRowWide: { flexDirection: 'row', alignItems: 'stretch' },
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
  listHintCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  listHintTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text, marginBottom: 4 },
  listHintBody: { fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 18 },
  twoCol: { gap: 12, marginBottom: 16 },
  twoColRow: { flexDirection: 'row', alignItems: 'stretch' },
});
