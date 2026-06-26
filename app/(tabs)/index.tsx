import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { AppHeader } from '@/src/components/AppHeader';
import { CheapestCartComparison } from '@/src/components/CheapestCartComparison';
import { DonutChart } from '@/src/components/DonutChart';
import { ForgottenItemsCard } from '@/src/components/ForgottenItemsCard';
import { HeroScanCard } from '@/src/components/HeroScanCard';
import { HomeScreenSkeleton } from '@/src/components/HomeScreenSkeleton';
import { InsightCard } from '@/src/components/InsightCard';
import { PlanComparisonModal } from '@/src/components/PlanComparisonModal';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { PriceAlertCard } from '@/src/components/PriceAlertCard';
import { QuickActionGrid } from '@/src/components/QuickActionGrid';
import { RecentReceiptsCard } from '@/src/components/RecentReceiptsCard';
import { SpendingAnalyticsCard } from '@/src/components/SpendingAnalyticsCard';
import { SpendingPeriodSelector } from '@/src/components/SpendingPeriodSelector';
import { StatusBanner } from '@/src/components/StatusBanner';
import type { ListItem, Receipt } from '@/src/models/types';
import type { HomeInsight, PriceAlert } from '@/src/services/analyticsService';
import {
  buildHomeInsight,
  getWeekReceipts,
} from '@/src/services/analyticsService';
import {
  buildSpendingOverviewBreakdown,
  getSpendingOverviewReceipts,
} from '@/src/utils/spendingOverview';
import type { SpendingPeriod } from '@/src/utils/spendingPeriodAnalytics';
import {
  getAllPriceAlerts,
  getAllRulesWithCurrentPrice,
  type RuleWithCurrentPrice,
} from '@/src/services/priceAlertService';
import { resolveComparisonList } from '@/src/services/listComparisonService';
import type { ResolvedComparisonList } from '@/src/services/listComparisonService';
import { getActiveList, getReceipts, createListItem } from '@/src/services/storageService';
import { useFocusReload } from '@/src/hooks/useFocusReload';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { useListStore } from '@/src/store/useListStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { getForgottenItemNudges } from '@/src/services/forgottenItemsService';
import { PRO_MONTHLY_PRICE } from '@/src/constants/proPricing';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { formatHomeGreetingI18n, SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { getTabScreenScrollBottomPadding } from '@/src/utils/safeAreaLayout';
import { formatCurrency } from '@/src/utils/priceParser';
import type { RepurchaseCadence } from '@/src/utils/repurchaseCadence';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const weeklyBudgetSetting = useBudgetStore((s) => s.settings?.weeklyBudget ?? 200);
  const alertThresholdSetting = useBudgetStore((s) => s.settings?.alertThreshold ?? 0.9);
  const displayName = useSettingsStore((s) => s.settings?.displayName ?? '');
  const notifyBudgetAlerts = useSettingsStore((s) => s.settings?.notifyBudgetAlerts ?? true);
  const subscriptionTier = useSubscriptionStore((s) => s.tier);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [homeInsight, setHomeInsight] = useState<HomeInsight | null>(null);
  const [spendingPeriod, setSpendingPeriod] = useState<SpendingPeriod>('month');
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [priceAlertRules, setPriceAlertRules] = useState<RuleWithCurrentPrice[]>([]);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [comparisonResolved, setComparisonResolved] = useState(false);
  const [comparisonSource, setComparisonSource] = useState<ResolvedComparisonList['source'] | null>(null);
  const [forgottenItems, setForgottenItems] = useState<RepurchaseCadence[]>([]);
  const [planComparisonVisible, setPlanComparisonVisible] = useState(false);
  const comparisonLoadedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const budget = weeklyBudgetSetting;
      const threshold = alertThresholdSetting;

      const receipts = await getReceipts();
      const weekReceipts = getWeekReceipts(receipts);

      const [insight, comparison] = await Promise.all([
        buildHomeInsight(budget, threshold, weekReceipts),
        resolveComparisonList({ forceRefresh: !comparisonLoadedRef.current }),
      ]);

      setRecentReceipts(receipts.slice(0, 12));
      setAllReceipts(receipts);
      setHomeInsight(insight);

      const comparisonItems = comparison?.items ?? [];
      setListItems(comparisonItems);
      setComparisonSource(comparison?.source ?? null);
      comparisonLoadedRef.current = true;
      if (comparison?.source === 'list') {
        void useListStore.getState().loadLists();
        void useListStore.getState().loadListItems(comparison.list.id);
      }

      const [alerts, alertRules, forgotten] = await Promise.all([
        getAllPriceAlerts(),
        getAllRulesWithCurrentPrice(),
        getForgottenItemNudges(3),
      ]);
      setPriceAlerts(alerts);
      setPriceAlertRules(alertRules);
      setForgottenItems(forgotten);
      void useSettingsStore.getState().loadSettings();
    } catch (error) {
      console.error('Home screen load failed:', error);
    } finally {
      setComparisonResolved(true);
    }
  }, [weeklyBudgetSetting, alertThresholdSetting]);

  const categoryData = useMemo(() => {
    const { receipts } = getSpendingOverviewReceipts(allReceipts, spendingPeriod);
    return buildSpendingOverviewBreakdown(receipts).map((entry) => ({
      label: entry.category,
      value: entry.amount,
      color: entry.color,
    }));
  }, [allReceipts, spendingPeriod]);

  const { blocking } = useFocusReload(load);

  if (blocking) {
    return <HomeScreenSkeleton />;
  }

  const weeklyBudget = homeInsight?.weeklyBudget ?? weeklyBudgetSetting;
  const weeklySpend = homeInsight?.weeklySpend ?? 0;
  const underBudget = Math.max(weeklyBudget - weeklySpend, 0);
  const budgetPercentLabel = `${Math.round((homeInsight?.budgetPercent ?? 0) * 100)}% of weekly budget`;
  const greetingText = formatHomeGreetingI18n(displayName, t);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Platform.OS === 'web' ? 0 : getTabScreenScrollBottomPadding(insets.bottom),
        },
      ]}>
      <AppHeader
        showBack={false}
        notificationCount={priceAlerts.length}
        onNotificationPress={() => router.push('/price-tracker?tab=alerts' as never)}
      />

      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{greetingText} 👋</Text>
        <Text style={styles.greetingSub}>Here's your smart shopping overview</Text>
      </View>

      {subscriptionTier === 'free' ? (
        <ProUpgradeBanner
          variant="compact"
          message={`Unlock price alerts & family lists — Pro from ${PRO_MONTHLY_PRICE}/mo`}
        />
      ) : null}

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
            actionHint="Edit budget"
            onPress={() => router.push('/settings/budget?edit=1')}
            expand={isWide}
          />
          {homeInsight.comparisonSummary ? (
            <InsightCard
              title="Plan vs Actual"
              value={homeInsight.comparisonSummary}
              subtitle={
                homeInsight.topInsight &&
                homeInsight.topInsight !== homeInsight.comparisonSummary
                  ? homeInsight.topInsight
                  : undefined
              }
              variant={homeInsight.comparisonSummary.startsWith('Over') ? 'warning' : 'success'}
              actionHint="Details"
              onPress={() => setPlanComparisonVisible(true)}
              expand={isWide}
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
              expand={isWide}
            />
          ) : null}
        </View>
      )}

      {forgottenItems.length > 0 ? (
        <ForgottenItemsCard
          items={forgottenItems}
          onAdd={async (item) => {
            const active = await getActiveList();
            if (!active) {
              router.push('/(tabs)/shopping-lists?browse=1' as never);
              return;
            }
            await createListItem(active.id, {
              name: item.displayName,
              expectedPrice: 0,
              quantity: 1,
              category: 'Produce',
            });
            setForgottenItems((prev) => prev.filter((entry) => entry.displayName !== item.displayName));
          }}
        />
      ) : null}

      <HeroScanCard />

      <QuickActionGrid />

      <View style={[styles.analyticsRow, isWide && styles.analyticsRowWide]}>
        <View style={[styles.sectionCard, isWide && styles.analyticsHalf]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Spending Overview</Text>
            <SpendingPeriodSelector period={spendingPeriod} onPeriodChange={setSpendingPeriod} />
          </View>
          <Text style={styles.sectionSubtitle}>Category breakdown from saved receipts</Text>
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

      {comparisonResolved ? (
        <CheapestCartComparison
          listItems={listItems}
          isStarterSample={comparisonSource === 'starter'}
        />
      ) : null}

      <View style={[styles.dashboardRow, isWide && styles.dashboardRowWide]}>
        <View style={[styles.dashboardCol, isWide && styles.dashboardColWide]}>
          <PriceAlertCard rules={priceAlertRules} />
        </View>
        <View style={[styles.dashboardCol, isWide && styles.dashboardColWide]}>
          <RecentReceiptsCard receipts={recentReceipts} />
        </View>
      </View>

      <SpendingAnalyticsCard receipts={allReceipts} fullBleed style={styles.dashboardChart} />

      {homeInsight?.planComparison ? (
        <PlanComparisonModal
          visible={planComparisonVisible}
          onClose={() => setPlanComparisonVisible(false)}
          comparison={homeInsight.planComparison}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { paddingHorizontal: 16 },
  greetingBlock: { marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.5 },
  greetingSub: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4 },
  insightRow: { gap: 10, marginBottom: 20, width: '100%' },
  insightRowWide: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' },
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
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 12, color: SmartCartColors.textSecondary, marginBottom: 12 },
  dashboardRow: { gap: 12, marginBottom: 16, width: '100%' },
  dashboardRowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  dashboardCol: { width: '100%', minWidth: 0, alignSelf: 'stretch', flexShrink: 0 },
  dashboardColWide: { flex: 1 },
  dashboardChart: { marginBottom: 8 },
});
