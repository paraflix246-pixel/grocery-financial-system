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
import {
  CheapestCartComparison,
  LivePriceEstimatesCollapsedHeader,
} from '@/src/components/CheapestCartComparison';
import { DeferredMount } from '@/src/components/DeferredMount';
import { DonutChart } from '@/src/components/DonutChart';
import { ForgottenItemsCard } from '@/src/components/ForgottenItemsCard';
import { HeroScanCard } from '@/src/components/HeroScanCard';
import { HomeScreenSkeleton } from '@/src/components/HomeScreenSkeleton';
import { InsightCard } from '@/src/components/InsightCard';
import { NotificationCountBadge } from '@/src/components/NotificationCountBadge';
import { PantryInsightCards } from '@/src/components/PantryInsightCards';
import { PlanComparisonModal } from '@/src/components/PlanComparisonModal';
import { ReceiptProcessingBanner } from '@/src/components/ReceiptProcessingBanner';
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
  hasReceiptsOutsideSpendingPeriod,
} from '@/src/utils/spendingOverview';
import type { SpendingPeriod } from '@/src/utils/spendingPeriodAnalytics';
import {
  getAllPriceAlerts,
  getAllRulesWithCurrentPrice,
  type RuleWithCurrentPrice,
} from '@/src/services/priceAlertService';
import { resolveComparisonList } from '@/src/services/listComparisonService';
import type { ResolvedComparisonList } from '@/src/services/listComparisonService';
import { isLivePriceEstimatesEnabled } from '@/src/services/livePriceEstimatesPreferenceLogic';
import { WorkspaceScopeBar } from '@/src/components/WorkspaceScopeBar';
import { FamilyWorkspaceScopeAccent } from '@/src/components/FamilyWorkspaceScopeAccent';
import { loadReceiptsForScope } from '@/src/services/scopedReceiptService';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { getActiveList, createListItem } from '@/src/services/storageService';
import { useFocusReload } from '@/src/hooks/useFocusReload';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { useListStore } from '@/src/store/useListStore';
import { useNotificationCenterStore } from '@/src/store/useNotificationCenterStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { getForgottenItemNudges } from '@/src/services/forgottenItemsService';
import { buildPantryInsights } from '@/src/services/pantryInsightService';
import type { PantryInsightCard } from '@/src/services/pantryInsightService';
import { loadPantryItems } from '@/src/services/pantryService';
import { formatProMonthlyPrice } from '@/src/constants/proPricing';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { formatHomeGreetingI18n, getGreetingFirstName, SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { PremiumScreenBackground } from '@/src/components/PremiumScreenBackground';
import { getAppAvatar } from '@/src/components/avatars/appAvatars';
import { useAvatar } from '@/src/components/avatars/AvatarProvider';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import { translateCategory } from '@/src/i18n/helpers';
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
  const { avatarId } = useAvatar();
  const { unlocked: hasProAvatars } = useFeatureGate('custom_avatars');
  const notifyBudgetAlerts = useSettingsStore((s) => s.settings?.notifyBudgetAlerts ?? true);
  const showLivePriceEstimates = useSettingsStore((s) =>
    isLivePriceEstimatesEnabled(s.settings)
  );
  const subscriptionTier = useSubscriptionStore((s) => s.tier);
  const { isAdmin } = useAdminStatus();
  const spendingBadgeCount = useNotificationCenterStore((s) => s.spendingBadgeCount);
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const isWorkspaceView = activeScope === 'workspace';
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
  const [pantryInsights, setPantryInsights] = useState<PantryInsightCard[]>([]);
  const [planComparisonVisible, setPlanComparisonVisible] = useState(false);
  const comparisonLoadedRef = useRef(false);
  const comparisonScopeRef = useRef<string | null>(null);
  const receiptsCacheRef = useRef<{ key: string; receipts: Receipt[]; at: number } | null>(null);

  const comparisonScopeKey = isWorkspaceView
    ? `workspace:${currentWorkspaceId ?? 'none'}`
    : 'personal';

  const load = useCallback(async () => {
    try {
      if (comparisonScopeRef.current !== comparisonScopeKey) {
        comparisonLoadedRef.current = false;
        comparisonScopeRef.current = comparisonScopeKey;
      }

      const budget = weeklyBudgetSetting;
      const threshold = alertThresholdSetting;

      const scopeKey = `${activeScope}:${currentWorkspaceId ?? 'none'}`;
      const cached = receiptsCacheRef.current;
      let receipts: Receipt[];
      if (cached && cached.key === scopeKey && Date.now() - cached.at < 5_000) {
        receipts = cached.receipts;
      } else {
        receipts = await loadReceiptsForScope(activeScope, currentWorkspaceId);
        receiptsCacheRef.current = { key: scopeKey, receipts, at: Date.now() };
      }
      const weekReceipts = getWeekReceipts(receipts);
      const insight = await buildHomeInsight(budget, threshold, weekReceipts);

      setRecentReceipts(receipts.slice(0, 12));
      setAllReceipts(receipts);
      setHomeInsight(insight);

      if (!isWorkspaceView) {
        const pantryItems = await loadPantryItems();
        setPantryInsights(buildPantryInsights({ pantryItems, receipts }));
      } else {
        setPantryInsights([]);
      }

      if (!isWorkspaceView && (insight.isOverBudget || insight.isOverThreshold)) {
        const { scheduleBudgetAlertNotification } = await import('@/src/services/notificationService');
        await scheduleBudgetAlertNotification(insight.weeklySpend, insight.weeklyBudget, threshold);
      }

      const comparisonPromise = resolveComparisonList({
        forceRefresh: !comparisonLoadedRef.current,
        scopeKey: comparisonScopeKey,
        scopedReceipts: receipts,
      });

      if (isWorkspaceView) {
        setPriceAlerts([]);
        setPriceAlertRules([]);
        setForgottenItems([]);
        void comparisonPromise
          .then((comparison) => {
            const comparisonItems = comparison?.items ?? [];
            setListItems(comparisonItems);
            setComparisonSource(comparison?.source ?? null);
            comparisonLoadedRef.current = true;
            if (comparison?.source === 'list') {
              void useListStore.getState().loadListItems(comparison.list.id);
            }
          })
          .catch((error) => {
            console.error('Home screen workspace comparison load failed:', error);
          })
          .finally(() => {
            setComparisonResolved(true);
          });
        return;
      }

      void Promise.all([
        comparisonPromise,
        getAllPriceAlerts(),
        getAllRulesWithCurrentPrice(),
        getForgottenItemNudges(3),
      ])
        .then(([comparison, alerts, alertRules, forgotten]) => {
          const comparisonItems = comparison?.items ?? [];
          setListItems(comparisonItems);
          setComparisonSource(comparison?.source ?? null);
          comparisonLoadedRef.current = true;
          if (comparison?.source === 'list') {
            void useListStore.getState().loadListItems(comparison.list.id);
          }
          setPriceAlerts(alerts);
          setPriceAlertRules(alertRules);
          setForgottenItems(forgotten);
        })
        .catch((error) => {
          console.error('Home screen secondary load failed:', error);
        })
        .finally(() => {
          setComparisonResolved(true);
        });
    } catch (error) {
      console.error('Home screen load failed:', error);
      setComparisonResolved(true);
    }
  }, [
    weeklyBudgetSetting,
    alertThresholdSetting,
    activeScope,
    currentWorkspaceId,
    isWorkspaceView,
    comparisonScopeKey,
  ]);

  const categoryData = useMemo(() => {
    const { receipts } = getSpendingOverviewReceipts(allReceipts, spendingPeriod);
    return buildSpendingOverviewBreakdown(receipts).map((entry) => ({
      label: translateCategory(t, entry.category),
      value: entry.amount,
      color: entry.color,
    }));
  }, [allReceipts, spendingPeriod, t]);

  const spendingOutsidePeriod = useMemo(
    () => hasReceiptsOutsideSpendingPeriod(allReceipts, spendingPeriod),
    [allReceipts, spendingPeriod]
  );

  const greetingText = useMemo(() => {
    const base = formatHomeGreetingI18n(displayName, t);
    const firstName = getGreetingFirstName(displayName);
    if (!firstName) return base;
    if (hasProAvatars) {
      return `${base} ${getAppAvatar(avatarId).emoji}`;
    }
    return `${base} 👋`;
  }, [displayName, t, hasProAvatars, avatarId]);

  const { blocking } = useFocusReload(load, { minRefocusMs: 5_000 });

  if (blocking) {
    return <HomeScreenSkeleton />;
  }

  const weeklyBudget = homeInsight?.weeklyBudget ?? weeklyBudgetSetting;
  const weeklySpend = homeInsight?.weeklySpend ?? 0;
  const underBudget = Math.max(weeklyBudget - weeklySpend, 0);
  const budgetPercentLabel = t('home.percentOfWeeklyBudget', {
    percent: Math.round((homeInsight?.budgetPercent ?? 0) * 100),
  });

  return (
    <PremiumScreenBackground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Platform.OS === 'web' ? 0 : getTabScreenScrollBottomPadding(insets.bottom),
        },
      ]}>
      <AppHeader showBack={false} />

      <FamilyWorkspaceScopeAccent variant="both" />

      <WorkspaceScopeBar />

      <ReceiptProcessingBanner />

      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{greetingText}</Text>
        <Text style={styles.greetingSub} muted>
          {isWorkspaceView ? t('home.greetingSubFamily') : t('home.greetingSub')}
        </Text>
      </View>

      {subscriptionTier === 'free' && !isAdmin && !isWorkspaceView ? (
        <ProUpgradeBanner
          variant="compact"
          message={t('home.proBannerCompact', { price: formatProMonthlyPrice() })}
        />
      ) : null}

      {homeInsight && notifyBudgetAlerts && homeInsight.isOverBudget && (
        <StatusBanner
          message={t('home.budgetExceeded', {
            amount: formatCurrency(Math.max(homeInsight.weeklySpend - homeInsight.weeklyBudget, 0)),
          })}
          emoji="⚠️"
          variant="warning"
        />
      )}

      {homeInsight && notifyBudgetAlerts && !homeInsight.isOverBudget && homeInsight.isOverThreshold && (
        <StatusBanner
          message={t('home.budgetThreshold', {
            percent: Math.round(homeInsight.budgetPercent * 100),
          })}
          emoji="📊"
          variant="warning"
        />
      )}

      {homeInsight && (
        <View style={[styles.insightRow, isWide && styles.insightRowWide]}>
          <InsightCard
            title={t('home.thisWeek')}
            value={`${formatCurrency(homeInsight.weeklySpend)} / ${formatCurrency(homeInsight.weeklyBudget)}`}
            subtitle={
              homeInsight.isOverBudget
                ? t('home.overWeeklyBudget')
                : homeInsight.isOverThreshold
                  ? t('home.approachingBudgetLimit')
                  : budgetPercentLabel
            }
            variant={
              homeInsight.isOverBudget ? 'warning' : homeInsight.isOverThreshold ? 'warning' : 'default'
            }
            actionHint={t('home.editBudget')}
            onPress={() => router.push('/settings/budget?edit=1')}
            expand={isWide}
          />
          {homeInsight.comparisonSummary ? (
            <InsightCard
              title={t('home.planVsActual')}
              value={homeInsight.comparisonSummary}
              subtitle={
                homeInsight.topInsight &&
                homeInsight.topInsight !== homeInsight.comparisonSummary
                  ? homeInsight.topInsight
                  : undefined
              }
              variant={homeInsight.comparisonSummary.startsWith('Over') ? 'warning' : 'success'}
              actionHint={t('home.details')}
              onPress={() => setPlanComparisonVisible(true)}
              expand={isWide}
            />
          ) : homeInsight.mostExpensiveStore ? (
            <InsightCard
              title={t('home.topStore')}
              value={homeInsight.mostExpensiveStore}
              subtitle={
                homeInsight.avgReceiptValue > 0
                  ? t('home.avgReceipt', { amount: formatCurrency(homeInsight.avgReceiptValue) })
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

      {!isWorkspaceView && pantryInsights.length > 0 ? (
        <PantryInsightCards
          insights={pantryInsights}
          onPressPantry={() => router.push('/pantry' as never)}
        />
      ) : null}

      <HeroScanCard />

      <QuickActionGrid />

      <View style={[styles.analyticsRow, isWide && styles.analyticsRowWide]}>
        <View style={[styles.sectionCard, isWide && styles.analyticsHalf]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleBadgeWrap}>
              <Text style={styles.sectionTitle}>{t('home.spendingOverview')}</Text>
              {spendingBadgeCount > 0 ? (
                <NotificationCountBadge count={spendingBadgeCount} size="md" />
              ) : null}
            </View>
            <SpendingPeriodSelector period={spendingPeriod} onPeriodChange={setSpendingPeriod} />
          </View>
          <Text style={styles.sectionSubtitle} muted>
            {t('home.spendingOverviewSub')}
          </Text>
          <DonutChart data={categoryData} />
          {spendingOutsidePeriod ? (
            <Text style={styles.spendingPeriodHint} muted>
              {t('home.spendingOutsidePeriodHint')}
            </Text>
          ) : null}
        </View>
        {underBudget > 0 && weeklySpend > 0 && (
          <View style={[isWide && styles.analyticsHalf, styles.statusWrap]}>
            <StatusBanner
              message={t('home.underBudget', { amount: formatCurrency(underBudget) })}
              emoji="🌿"
            />
          </View>
        )}
      </View>

      {comparisonResolved && listItems.length > 0 ? (
        showLivePriceEstimates ? (
          <CheapestCartComparison
            listItems={listItems}
            isStarterSample={comparisonSource === 'starter'}
          />
        ) : (
          <LivePriceEstimatesCollapsedHeader />
        )
      ) : null}

      <View style={[styles.dashboardRow, isWide && styles.dashboardRowWide]}>
        <View style={[styles.dashboardCol, isWide && styles.dashboardColWide]}>
          <PriceAlertCard rules={priceAlertRules} />
        </View>
        <View style={[styles.dashboardCol, isWide && styles.dashboardColWide]}>
          <RecentReceiptsCard
            receipts={recentReceipts}
            receiptScope={isWorkspaceView ? 'workspace' : 'personal'}
          />
        </View>
      </View>

      <DeferredMount delayMs={16}>
        <SpendingAnalyticsCard receipts={allReceipts} fullBleed style={styles.dashboardChart} />
      </DeferredMount>

      {homeInsight?.planComparison ? (
        <PlanComparisonModal
          visible={planComparisonVisible}
          onClose={() => setPlanComparisonVisible(false)}
          comparison={homeInsight.planComparison}
        />
      ) : null}
    </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16 },
  greetingBlock: { marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  greetingSub: { fontSize: 14, marginTop: 4 },
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
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionTitleBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    position: 'relative',
    overflow: 'visible',
    paddingRight: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 12, marginBottom: 12 },
  spendingPeriodHint: { fontSize: 12, marginTop: 10 },
  dashboardRow: { gap: 12, marginBottom: 16, width: '100%' },
  dashboardRowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  dashboardCol: { width: '100%', minWidth: 0, alignSelf: 'stretch', flexShrink: 0 },
  dashboardColWide: { flex: 1 },
  dashboardChart: { marginBottom: 8 },
});
