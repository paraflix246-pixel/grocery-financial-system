import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { FoodItemImageAvatar } from '@/src/components/FoodItemImageAvatar';
import { ItemPicker } from '@/src/components/ItemPicker';
import { SingleItemStoreComparison } from '@/src/components/SingleItemStoreComparison';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { MockupCard, MockupScreenTitle } from '@/src/components/mockup/MockupUI';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useRotatingItemComparison } from '@/src/hooks/useRotatingItemComparison';
import { useCartComparisonAccess } from '@/src/hooks/useCartComparisonAccess';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { getFeatureLabel } from '@/src/services/featureGateService';
import {
  applyCartComparisonItemLimit,
  shouldShowCartComparisonUpgradeBanner,
} from '@/src/services/cartComparisonLimitLogic';
import { STARTER_SAMPLE_HINT } from '@/src/data/starterCommonGoods';
import type { ListItem } from '@/src/models/types';
import { buildSearchComparisonItem } from '@/src/services/comparisonFallbackLogic';
import { resolveComparisonList } from '@/src/services/listComparisonService';
import { isLivePriceEstimatesEnabled } from '@/src/services/livePriceEstimatesPreferenceLogic';
import { loadReceiptsForScope } from '@/src/services/scopedReceiptService';
import type { ItemPickerSelection } from '@/src/services/itemPickerService';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import {
  getMaxCartSavings,
  getStoreCartTotals,
} from '@/src/services/priceComparisonService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

const QUICK_SEARCH_ITEMS = ['Milk', 'Eggs', 'Bread'] as const;

function selectionFromListItem(item: ListItem): ItemPickerSelection {
  return { itemName: item.name };
}

export default function CartComparisonScreen() {
  const { t } = useTranslation();
  const { unlocked: multiStoreUnlocked } = useFeatureGate('community_pricing');
  const cartAccess = useCartComparisonAccess();
  const fullCartComparison = cartAccess.hasFullAccess;
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const isWorkspaceView = activeScope === 'workspace';
  const showLivePriceEstimates = useSettingsStore((s) =>
    isLivePriceEstimatesEnabled(s.settings)
  );
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const comparisonScopeKey = isWorkspaceView
    ? `workspace:${currentWorkspaceId ?? 'none'}`
    : 'personal';
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [isStarterSample, setIsStarterSample] = useState(false);
  const [resolving, setResolving] = useState(true);
  const [searchSelection, setSearchSelection] = useState<ItemPickerSelection | null>(null);
  const [focusedListItem, setFocusedListItem] = useState<ListItem | null>(null);

  const comparisonItems = useMemo(() => {
    if (focusedListItem) return [focusedListItem];
    if (searchSelection) {
      return [
        buildSearchComparisonItem({
          itemName: searchSelection.itemName,
          canonicalName: searchSelection.canonicalName,
          category: searchSelection.category,
        }),
      ];
    }
    return listItems;
  }, [focusedListItem, listItems, searchSelection]);

  const isSingleItemMode = focusedListItem != null || searchSelection != null;

  const {
    itemsForComparison: limitedComparisonItems,
    totalListItemCount,
    comparisonLimit,
  } = useMemo(
    () =>
      isSingleItemMode
        ? {
            itemsForComparison: comparisonItems,
            totalListItemCount: comparisonItems.length,
            comparisonLimit: null as number | null,
          }
        : applyCartComparisonItemLimit(comparisonItems, fullCartComparison),
    [comparisonItems, fullCartComparison, isSingleItemMode]
  );

  const showLimitedListHint =
    !isSingleItemMode &&
    !fullCartComparison &&
    comparisonLimit != null &&
    totalListItemCount > comparisonLimit;

  const showCartComparisonBanner = shouldShowCartComparisonUpgradeBanner({
    hasFullAccess: fullCartComparison,
    comparisonLimit,
    totalListItemCount,
    comparisonsCount: limitedComparisonItems.length,
  });

  const { comparisons, current, currentIndex, loading, rotationKey, goToNext, reload } =
    useRotatingItemComparison(limitedComparisonItems, { forceRefresh: true });
  const [maxCartSavings, setMaxCartSavings] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);

  const pickerSelection = useMemo(() => {
    if (focusedListItem) return selectionFromListItem(focusedListItem);
    return searchSelection;
  }, [focusedListItem, searchSelection]);

  const loadComparisonItems = useCallback(async () => {
    setResolving(true);
    try {
      const scopedReceipts = await loadReceiptsForScope(activeScope, currentWorkspaceId);
      const comparison = await resolveComparisonList({
        forceRefresh: true,
        scopeKey: comparisonScopeKey,
        scopedReceipts,
      });
      setListItems(comparison?.items ?? []);
      setIsStarterSample(comparison?.source === 'starter');
    } finally {
      setResolving(false);
    }
  }, [activeScope, comparisonScopeKey, currentWorkspaceId]);

  const loadCartSavings = useCallback(async () => {
    if (isSingleItemMode || limitedComparisonItems.length === 0) {
      setMaxCartSavings(0);
      setCartLoading(false);
      return;
    }
    setCartLoading(true);
    try {
      const totals = await getStoreCartTotals(limitedComparisonItems);
      setMaxCartSavings(getMaxCartSavings(totals));
    } finally {
      setCartLoading(false);
    }
  }, [isSingleItemMode, limitedComparisonItems]);

  const clearFocusedItem = useCallback(() => {
    setFocusedListItem(null);
    setSearchSelection(null);
  }, []);

  const handlePickerSelect = useCallback((selection: ItemPickerSelection) => {
    setFocusedListItem(null);
    setSearchSelection(selection);
  }, []);

  const handleQuickSearchPress = useCallback((itemName: string) => {
    setFocusedListItem(null);
    setSearchSelection({ itemName });
  }, []);

  const handleListChipPress = useCallback((item: ListItem) => {
    setSearchSelection(null);
    setFocusedListItem(item);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadComparisonItems();
      // Bust in-memory comparison cache and refetch live ScraperAPI quotes on each visit.
      reload();
    }, [loadComparisonItems, reload])
  );

  useEffect(() => {
    if (limitedComparisonItems.length === 0 || loading) {
      return;
    }
    void loadCartSavings();
  }, [limitedComparisonItems.length, loading, loadCartSavings]);

  const isRefreshing = !isSingleItemMode && cartLoading;

  const subtitle = isStarterSample
    ? STARTER_SAMPLE_HINT
    : isSingleItemMode
      ? 'Compare prices for your item at every store'
      : 'Search any item below, or auto-rotate through your list';

  if (!showLivePriceEstimates) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('comparison.screenTitle')} />
        <View style={styles.content}>
          <MockupScreenTitle title={t('comparison.hiddenTitle')} subtitle={t('comparison.hiddenBody')} />
          <MockupCard style={styles.hiddenCard}>
            <Pressable
              style={({ pressed }) => [styles.showAgainBtn, pressed && styles.showAgainBtnPressed]}
              onPress={() => void saveSettings({ showLivePriceEstimates: true })}
              accessibilityRole="button"
              accessibilityLabel={t('comparison.showSection')}>
              <Text style={styles.showAgainBtnText}>{t('comparison.showSection')}</Text>
            </Pressable>
          </MockupCard>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('comparison.screenTitle')} />
      {resolving ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <MockupScreenTitle title={t('comparison.screenTitle')} subtitle={subtitle} />

          {!multiStoreUnlocked && (
            <ProUpgradeBanner featureName={getFeatureLabel('community_pricing')} />
          )}

          {showCartComparisonBanner ? (
            <ProUpgradeBanner
              featureName={getFeatureLabel('cheapest_basket')}
              hook={
                showLimitedListHint
                  ? t('comparison.limitedMetaLine', {
                      shown: comparisonLimit,
                      total: totalListItemCount,
                    })
                  : t('upgrade.proComparisonHook')
              }
              ignoreAdminBypass={cartAccess.forceFreePreview || !fullCartComparison}
            />
          ) : null}

          <MockupCard style={styles.searchCard}>
            <ItemPicker
              selection={pickerSelection}
              onSelect={handlePickerSelect}
              onClear={clearFocusedItem}
            />
            {!isSingleItemMode ? (
              <View style={styles.quickSearchSection}>
                <Text style={styles.listChipLabel}>Try an example</Text>
                <HorizontalScrollRow contentContainerStyle={styles.quickSearchRow}>
                  {QUICK_SEARCH_ITEMS.map((itemName) => (
                    <Pressable
                      key={itemName}
                      style={styles.quickSearchChip}
                      accessibilityRole="button"
                      onPress={() => handleQuickSearchPress(itemName)}>
                      <FoodItemImageAvatar itemName={itemName} size="sm" />
                      <Text style={styles.quickSearchChipText}>{itemName}</Text>
                    </Pressable>
                  ))}
                </HorizontalScrollRow>
              </View>
            ) : null}
            {isSingleItemMode ? (
              <Pressable
                style={styles.browseListBtn}
                accessibilityRole="button"
                onPress={clearFocusedItem}>
                <Text style={styles.browseListBtnText}>
                  {listItems.length > 0 ? 'Browse all list items' : 'Clear search'}
                </Text>
              </Pressable>
            ) : null}
            {!isSingleItemMode && listItems.length > 0 ? (
              <View style={styles.listChipSection}>
                <Text style={styles.listChipLabel}>From your list</Text>
                <HorizontalScrollRow contentContainerStyle={styles.listChipRow}>
                  {listItems.map((item) => {
                    const active = false;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.listChip, active && styles.listChipActive]}
                        accessibilityRole="button"
                        onPress={() => handleListChipPress(item)}>
                        <Text style={[styles.listChipText, active && styles.listChipTextActive]}>
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HorizontalScrollRow>
              </View>
            ) : null}
          </MockupCard>

          {isRefreshing ? (
            <View style={styles.refreshingRow}>
              <ActivityIndicator size="small" color={SmartCartColors.primary} />
            </View>
          ) : null}

          {loading && comparisonItems.length > 0 ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={SmartCartColors.primary} />
              <Text style={styles.loadingHint}>Loading store prices…</Text>
            </View>
          ) : comparisons.length === 0 || !current ? (
            <MockupCard>
              <Text style={styles.emptyTitle}>
                {comparisonItems.length === 0 ? 'Search an item to compare' : 'No prices found'}
              </Text>
              <Text style={styles.emptyBody}>
                {comparisonItems.length === 0
                  ? 'Type milk, eggs, chicken, or any grocery item above to compare prices at every store.'
                  : 'Try another item name or set your ZIP code for live retailer prices.'}
              </Text>
            </MockupCard>
          ) : (
            <MockupCard style={styles.comparisonCard}>
              <SingleItemStoreComparison
                current={current}
                comparisons={comparisons}
                currentIndex={currentIndex}
                rotationKey={rotationKey}
                onNextItem={goToNext}
                onStorePreferenceChange={reload}
                variant="full"
                maxCartSavings={isSingleItemMode ? 0 : maxCartSavings}
                hasFullCartComparisonAccess={fullCartComparison}
                embedded
              />
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
  searchCard: { marginBottom: 12, paddingBottom: 4 },
  browseListBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.badge,
  },
  browseListBtnText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.primaryDark },
  listChipSection: { marginTop: 4 },
  listChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
    marginBottom: 8,
  },
  listChipRow: { gap: 8, paddingBottom: 4 },
  listChip: {
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  listChipActive: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.badge,
  },
  listChipText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  listChipTextActive: { color: SmartCartColors.primaryDark },
  quickSearchSection: { marginTop: 8 },
  quickSearchRow: { gap: 8, paddingBottom: 4 },
  quickSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  quickSearchChipText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  refreshingRow: { alignItems: 'center', paddingBottom: 8 },
  loadingCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    gap: 8,
  },
  loadingHint: { fontSize: 12, color: SmartCartColors.textMuted },
  comparisonCard: { paddingBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text, textAlign: 'center' },
  emptyBody: {
    fontSize: 14,
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  hiddenCard: { padding: 20, alignItems: 'center' },
  showAgainBtn: {
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: SmartCartColors.primary,
  },
  showAgainBtnPressed: { opacity: 0.85 },
  showAgainBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
