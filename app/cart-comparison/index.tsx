import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ItemPicker } from '@/src/components/ItemPicker';
import { SingleItemStoreComparison } from '@/src/components/SingleItemStoreComparison';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { MockupCard, MockupScreenTitle } from '@/src/components/mockup/MockupUI';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useRotatingItemComparison } from '@/src/hooks/useRotatingItemComparison';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { getFeatureLabel } from '@/src/services/featureGateService';
import { STARTER_SAMPLE_HINT } from '@/src/data/starterCommonGoods';
import type { ListItem } from '@/src/models/types';
import { buildSearchComparisonItem } from '@/src/services/comparisonFallbackLogic';
import { resolveComparisonList } from '@/src/services/listComparisonService';
import type { ItemPickerSelection } from '@/src/services/itemPickerService';
import {
  getMaxCartSavings,
  getStoreCartTotals,
} from '@/src/services/priceComparisonService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

function selectionFromListItem(item: ListItem): ItemPickerSelection {
  return { itemName: item.name };
}

export default function CartComparisonScreen() {
  const { unlocked: multiStoreUnlocked } = useFeatureGate('community_pricing');
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

  const { comparisons, current, currentIndex, loading, rotationKey, goToNext, reload } =
    useRotatingItemComparison(comparisonItems);
  const [maxCartSavings, setMaxCartSavings] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);

  const pickerSelection = useMemo(() => {
    if (focusedListItem) return selectionFromListItem(focusedListItem);
    return searchSelection;
  }, [focusedListItem, searchSelection]);

  const loadComparisonItems = useCallback(async () => {
    setResolving(true);
    try {
      const comparison = await resolveComparisonList();
      setListItems(comparison?.items ?? []);
      setIsStarterSample(comparison?.source === 'starter');
    } finally {
      setResolving(false);
    }
  }, []);

  const loadCartSavings = useCallback(async () => {
    if (isSingleItemMode || listItems.length === 0) {
      setMaxCartSavings(0);
      setCartLoading(false);
      return;
    }
    setCartLoading(true);
    try {
      const totals = await getStoreCartTotals(listItems);
      setMaxCartSavings(getMaxCartSavings(totals));
    } finally {
      setCartLoading(false);
    }
  }, [isSingleItemMode, listItems]);

  const clearFocusedItem = useCallback(() => {
    setFocusedListItem(null);
    setSearchSelection(null);
  }, []);

  const handlePickerSelect = useCallback((selection: ItemPickerSelection) => {
    setFocusedListItem(null);
    setSearchSelection(selection);
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
    if (comparisonItems.length === 0 || loading) {
      return;
    }
    void loadCartSavings();
  }, [comparisonItems.length, loading, loadCartSavings]);

  const isRefreshing = !isSingleItemMode && cartLoading;

  const subtitle = isStarterSample
    ? STARTER_SAMPLE_HINT
    : isSingleItemMode
      ? 'Compare prices for your item at every store'
      : 'Search any item below, or auto-rotate through your list';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Cart Comparison" />
      {resolving ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <MockupScreenTitle title="Cheapest Cart Comparison" subtitle={subtitle} />

          {!multiStoreUnlocked && (
            <ProUpgradeBanner featureName={getFeatureLabel('community_pricing')} />
          )}

          <MockupCard style={styles.searchCard}>
            <ItemPicker
              selection={pickerSelection}
              onSelect={handlePickerSelect}
              onClear={clearFocusedItem}
            />
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
});
