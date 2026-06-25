import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { MockupCard, MockupSectionLabel, MockupTabs } from '@/src/components/mockup/MockupUI';
import { PriceAlertsPanel } from '@/src/components/priceWatch/PriceAlertsPanel';
import { PriceTrackerInsightsSections } from '@/src/components/PriceTrackerInsightsSections';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getFeatureLabel } from '@/src/services/featureGateService';
import { getEnabledRulesWithCurrentPrice } from '@/src/services/priceAlertService';
import {
  getCheapestStoreRecommendations,
  getCheapestStoreRecommendationsForFrequent,
  getFrequentPurchasedItems,
  getPriceRecommendations,
  type CheapestStoreRecommendation,
  type FrequentPurchasedItem,
  type PriceRecommendation,
} from '@/src/services/priceRecommendationService';
import { STARTER_SAMPLE_HINT } from '@/src/data/starterCommonGoods';
import {
  loadTrackedItems,
  stopTrackingItem,
  type TrackedItemEntry,
} from '@/src/services/priceTrackerService';
import { hasStarterTrackedItems } from '@/src/services/starterItemsLogic';
import { getReceiptItemsWithStore } from '@/src/services/storageService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import {
  buildPriceAlertsFormRequest,
  parsePriceWatchTab,
  type PriceAlertsFormRequest,
  type PriceWatchTab,
} from '@/src/utils/priceWatchTabParams';

function TrackedItemOptionsSheet({
  item,
  visible,
  onClose,
  onStopTracking,
  onSetAlert,
  onEditAlert,
}: {
  item: TrackedItemEntry | null;
  visible: boolean;
  onClose: () => void;
  onStopTracking: (item: TrackedItemEntry) => void;
  onSetAlert: (item: TrackedItemEntry) => void;
  onEditAlert: (item: TrackedItemEntry) => void;
}) {
  if (!item) return null;

  const hasAlerts = item.alertRuleIds.length > 0 || item.source === 'alert';
  const isStarter = item.source === 'starter';

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <View style={styles.optionsSheet}>
        <View style={styles.optionsHeader}>
          <ItemEmojiAvatar emoji={item.emoji} size="md" shape="square" />
          <View style={styles.optionsHeaderText}>
            <Text style={styles.optionsTitle}>{item.name}</Text>
            <Text style={styles.optionsSubtitle}>
              {hasAlerts
                ? 'Price alert active'
                : isStarter
                  ? 'Sample item'
                  : 'From your receipts'}
            </Text>
          </View>
        </View>

        {hasAlerts && item.alertRuleIds[0] ? (
          <Pressable
            style={({ pressed }) => [styles.optionsAction, pressed && styles.optionsActionPressed]}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onEditAlert(item);
            }}>
            <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} tintColor={SmartCartColors.primaryDark} size={18} />
            <Text style={styles.optionsActionText}>Edit alert</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.optionsAction, pressed && styles.optionsActionPressed]}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onSetAlert(item);
            }}>
            <SymbolView name={{ ios: 'bell.badge', android: 'notifications_active', web: 'notifications_active' }} tintColor={SmartCartColors.primaryDark} size={18} />
            <Text style={styles.optionsActionText}>Set price alert</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.optionsActionDanger, pressed && styles.optionsActionDangerPressed]}
          accessibilityRole="button"
          onPress={() => {
            onClose();
            onStopTracking(item);
          }}>
          <SymbolView name={{ ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }} tintColor={SmartCartColors.danger} size={18} />
          <Text style={styles.optionsActionDangerText}>Stop tracking</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.optionsCancel, pressed && styles.optionsCancelPressed]}
          accessibilityRole="button"
          onPress={onClose}>
          <Text style={styles.optionsCancelText}>Cancel</Text>
        </Pressable>
      </View>
    </AppBottomSheetModal>
  );
}

export default function PriceTrackerIndexScreen() {
  const router = useRouter();
  const { unlocked: cheapestUnlocked } = useFeatureGate('cheapest_basket');
  const { unlocked: autoAlertsUnlocked } = useFeatureGate('price_drop_alerts');
  const params = useLocalSearchParams<{
    tab?: string;
    action?: string;
    editRuleId?: string;
    itemName?: string;
  }>();

  const activeTab = parsePriceWatchTab(params.tab);
  const [formRequest, setFormRequest] = useState<PriceAlertsFormRequest | null>(() =>
    buildPriceAlertsFormRequest(params)
  );
  const [items, setItems] = useState<TrackedItemEntry[]>([]);
  const [frequentItems, setFrequentItems] = useState<FrequentPurchasedItem[]>([]);
  const [cheapestDeals, setCheapestDeals] = useState<CheapestStoreRecommendation[]>([]);
  const [personalRecommendations, setPersonalRecommendations] = useState<PriceRecommendation[]>([]);
  const [communityRecommendations, setCommunityRecommendations] = useState<PriceRecommendation[]>([]);
  const [hasExternalProviders, setHasExternalProviders] = useState(false);
  const [hasReceiptHistory, setHasReceiptHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [optionsItem, setOptionsItem] = useState<TrackedItemEntry | null>(null);

  useEffect(() => {
    const request = buildPriceAlertsFormRequest(params);
    if (request) setFormRequest(request);
  }, [params.action, params.editRuleId, params.itemName]);

  const navigateToItem = useCallback(
    (itemName: string) => {
      router.push(`/price-tracker/${encodeURIComponent(itemName.trim())}` as never);
    },
    [router]
  );

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesResult, receiptItemsResult, frequentResult, recommendationsResult, cheapestResult] =
        await Promise.allSettled([
          getEnabledRulesWithCurrentPrice(),
          getReceiptItemsWithStore(),
          getFrequentPurchasedItems(10),
          getPriceRecommendations(5),
          getCheapestStoreRecommendationsForFrequent(8),
        ]);

      const rules = rulesResult.status === 'fulfilled' ? rulesResult.value : [];
      const receiptItems = receiptItemsResult.status === 'fulfilled' ? receiptItemsResult.value : [];
      const frequent = frequentResult.status === 'fulfilled' ? frequentResult.value : [];
      const recommendations =
        recommendationsResult.status === 'fulfilled'
          ? recommendationsResult.value
          : { personal: [], community: [], hasExternalProviders: false };
      let cheapest = cheapestResult.status === 'fulfilled' ? cheapestResult.value : [];

      const tracked = await loadTrackedItems(rules, receiptItems);

      if (cheapest.length === 0 && tracked.length > 0) {
        try {
          cheapest = await getCheapestStoreRecommendations(
            tracked.map((item) => item.name),
            8
          );
        } catch (error) {
          console.error('Price tracker cheapest fallback load failed:', error);
        }
      }

      setItems(tracked);
      setFrequentItems(frequent);
      setCheapestDeals(cheapest);
      setPersonalRecommendations(recommendations.personal);
      setCommunityRecommendations(recommendations.community);
      setHasExternalProviders(recommendations.hasExternalProviders);
      setHasReceiptHistory(receiptItems.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [loadWatchlist])
  );

  const clearFormParams = useCallback(() => {
    router.setParams({ action: undefined, editRuleId: undefined, itemName: undefined });
  }, [router]);

  const switchTab = useCallback(
    (tab: PriceWatchTab) => {
      setFormRequest(null);
      clearFormParams();
      router.setParams({ tab: tab === 'watchlist' ? undefined : tab });
    },
    [clearFormParams, router]
  );

  const goToAlerts = useCallback(
    (request: PriceAlertsFormRequest) => {
      setFormRequest(request);
      router.setParams({ tab: 'alerts' });
    },
    [router]
  );

  const confirmStopTracking = useCallback(
    (item: TrackedItemEntry) => {
      const hasAlerts = item.alertRuleIds.length > 0 || item.source === 'alert';
      const alertNote = hasAlerts
        ? ' Your price alert will be turned off.'
        : item.source === 'starter'
          ? ' Sample items will stop showing once you remove them all.'
          : ' It will stay hidden even if it appears on future receipts.';

      confirmDestructiveAction({
        title: 'Stop tracking?',
        message: `Remove "${item.name}" from your tracker?${alertNote}`,
        confirmLabel: 'Stop tracking',
        onConfirm: async () => {
          await stopTrackingItem(item.name);
          await loadWatchlist();
        },
      });
    },
    [loadWatchlist]
  );

  const handleFormRequestHandled = useCallback(() => {
    setFormRequest(null);
    clearFormParams();
  }, [clearFormParams]);

  const topTabs = useMemo(
    () => [
      { id: 'watchlist', label: 'Watchlist' },
      { id: 'alerts', label: 'Alerts' },
    ],
    []
  );

  const showingStarterItems = hasStarterTrackedItems(items);

  const watchlistSection = (
    <View style={styles.watchlistBlock}>
      <MockupSectionLabel>Watchlist</MockupSectionLabel>
      {items.length === 0 ? (
        <MockupCard>
          <Text style={styles.empty}>
            Add price alerts or scan receipts to start tracking items.
          </Text>
        </MockupCard>
      ) : (
        <>
          {showingStarterItems ? (
            <Text style={styles.starterHint}>{STARTER_SAMPLE_HINT}</Text>
          ) : null}
          {items.map((item) => (
          <View key={item.slug} style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
              onPress={() => navigateToItem(item.name)}
              accessibilityRole="button"
              accessibilityLabel={`View price history for ${item.name}`}>
              <ItemEmojiAvatar emoji={item.emoji} size="md" shape="square" />
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.optionsBtn, pressed && styles.optionsBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Options for ${item.name}`}
              hitSlop={8}
              onPress={() => setOptionsItem(item)}>
              <SymbolView
                name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
                tintColor={SmartCartColors.textMuted}
                size={18}
              />
            </Pressable>
          </View>
        ))}
        </>
      )}
    </View>
  );

  const insightsProps = {
    frequentItems,
    cheapestDeals: cheapestUnlocked ? cheapestDeals : [],
    personalRecommendations: autoAlertsUnlocked ? personalRecommendations : [],
    communityRecommendations: autoAlertsUnlocked ? communityRecommendations : [],
    hasExternalProviders,
    hasReceiptHistory,
    onItemPress: navigateToItem,
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Track & Alerts" />

      <View style={styles.tabBarWrap}>
        <MockupTabs tabs={topTabs} active={activeTab} onChange={(tab) => switchTab(tab as PriceWatchTab)} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : activeTab === 'watchlist' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {!cheapestUnlocked && (
            <ProUpgradeBanner featureName={getFeatureLabel('cheapest_basket')} requiredTier="household" />
          )}
          <PriceTrackerInsightsSections {...insightsProps} sections={['bestPrice']} showingStarterSample={showingStarterItems} />
          {watchlistSection}
          {!autoAlertsUnlocked && (
            <ProUpgradeBanner featureName={getFeatureLabel('price_drop_alerts')} />
          )}
          <PriceTrackerInsightsSections
            {...insightsProps}
            sections={['frequent', 'recommendations']}
          />
        </ScrollView>
      ) : (
        <PriceAlertsPanel
          formRequest={formRequest}
          onFormRequestHandled={handleFormRequestHandled}
          onRulesChanged={loadWatchlist}
        />
      )}

      <TrackedItemOptionsSheet
        item={optionsItem}
        visible={optionsItem != null}
        onClose={() => setOptionsItem(null)}
        onStopTracking={confirmStopTracking}
        onSetAlert={(item) => goToAlerts({ type: 'new', itemName: item.name })}
        onEditAlert={(item) => {
          const ruleId = item.alertRuleIds[0];
          if (ruleId) goToAlerts({ type: 'edit', ruleId });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  watchlistBlock: { marginTop: 8, marginBottom: 8 },
  tabBarWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 4,
  },
  rowPressed: { backgroundColor: SmartCartColors.badge },
  optionsBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    borderRadius: SmartCartRadius.md,
  },
  optionsBtnPressed: { backgroundColor: SmartCartColors.badge },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  chevron: { fontSize: 22, color: SmartCartColors.textMuted, fontWeight: '300' },
  empty: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center' },
  starterHint: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    marginBottom: 10,
    lineHeight: 17,
  },
  optionsSheet: { gap: 8 },
  optionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  optionsHeaderText: { flex: 1 },
  optionsTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text },
  optionsSubtitle: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 2 },
  optionsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.badgeGreen,
    borderWidth: 1,
    borderColor: SmartCartColors.primaryMuted,
  },
  optionsActionPressed: { backgroundColor: SmartCartColors.badge },
  optionsActionText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primaryDark },
  optionsActionDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: SmartCartRadius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  optionsActionDangerPressed: { backgroundColor: '#FEE2E2' },
  optionsActionDangerText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.danger },
  optionsCancel: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: SmartCartRadius.md,
  },
  optionsCancelPressed: { backgroundColor: SmartCartColors.badge },
  optionsCancelText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.textSecondary },
});
