import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import { CartPriceSourceBadge } from '@/src/components/CartPriceSourceBadge';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { limitStoreRowsForTier } from '@/src/services/tierLimits';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import { getGroceryItemByCanonical, getGroceryTypicalPrice } from '@/src/data/groceryCatalog';
import {
  getDisplayedPriceSpread,
  getSavingsSubtitleForStoreRows,
} from '@/src/services/priceComparisonLogic';
import type { RotatingItemComparison } from '@/src/services/priceComparisonService';
import { invalidatePriceComparisonCache } from '@/src/services/priceComparisonService';
import { trackItemPriceAlert } from '@/src/services/priceAlertService';
import { resolveStore } from '@/src/services/storeService';
import { createListItem, updateListItem } from '@/src/services/storageService';
import { useListStore } from '@/src/store/useListStore';
import { inferPantryCategory } from '@/src/utils/pantryCategory';
import { findDedicatedStoreBoundList } from '@/src/utils/storeListUtils';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';
import { showChoiceAlert, showInfoAlert } from '@/src/utils/platformAlert';

const cartSavingsHero = require('../../assets/images/cart-savings-hero.png');

type Props = {
  current: RotatingItemComparison;
  comparisons: RotatingItemComparison[];
  currentIndex: number;
  rotationKey: number;
  onNextItem: () => void;
  variant?: 'home' | 'full';
  maxCartSavings?: number;
  embedded?: boolean;
  onStorePreferenceChange?: () => void;
};

type StoreMenuTarget = {
  store: string;
  unitPrice: number;
};

const fadeOut = Platform.OS === 'web' ? undefined : FadeOut.duration(250);
const slideOutLeft = Platform.OS === 'web' ? undefined : SlideOutLeft.duration(200);

const STORE_CARD_WIDTH = 128;
const STORE_CARD_GAP = 10;
const STORE_CARD_SNAP_INTERVAL = STORE_CARD_WIDTH + STORE_CARD_GAP;

const PRICE_SOURCE_BADGE_INFO =
  'Live — current store prices from connected retailers.\n' +
  'Receipt — from your scanned receipts.\n' +
  'Community — crowd prices from Open Food Facts and other local sources.\n' +
  'Est. — estimated when live data is not available.';

const ESTIMATED_PRICE_INFO =
  'These prices are based on typical regional pricing and may not match what is on the shelf today.\n\n' +
  'Scan receipts to use your actual paid prices, or set your ZIP code to enable live retailer data where available.';

export function SingleItemStoreComparison({
  current,
  comparisons,
  currentIndex,
  rotationKey,
  onNextItem,
  variant = 'home',
  maxCartSavings,
  embedded = false,
  onStorePreferenceChange,
}: Props) {
  const router = useRouter();
  const { unlocked: multiStoreUnlocked } = useFeatureGate('community_pricing');
  const lists = useListStore((s) => s.lists);
  const loadLists = useListStore((s) => s.loadLists);
  const addList = useListStore((s) => s.addList);
  const activateList = useListStore((s) => s.activateList);
  const refreshItems = useListStore((s) => s.refreshItems);
  const loadListItems = useListStore((s) => s.loadListItems);
  const [storeMenu, setStoreMenu] = useState<StoreMenuTarget | null>(null);
  const [priceInfoVisible, setPriceInfoVisible] = useState(false);
  const [trackFeedback, setTrackFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const showTrackFeedback = useCallback((message: string) => {
    setTrackFeedback(message);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setTrackFeedback(null), 4000);
  }, []);

  const handleShopHere = useCallback(
    (store: string) => {
      void (async () => {
        await updateListItem(current.itemId, { storePreference: store });
        await refreshItems(current.listId);
        invalidatePriceComparisonCache();
        onStorePreferenceChange?.();
      })();
    },
    [current.itemId, current.listId, onStorePreferenceChange, refreshItems]
  );

  const closeStoreMenu = useCallback(() => {
    setStoreMenu(null);
  }, []);

  const openPriceInfo = useCallback(() => {
    setPriceInfoVisible(true);
  }, []);

  const closePriceInfo = useCallback(() => {
    setPriceInfoVisible(false);
  }, []);

  const trackStorePrice = useCallback(
    async (store: string, unitPrice: number) => {
      try {
        const { created } = await trackItemPriceAlert(current.itemName, unitPrice);
        const message = created
          ? `Tracking ${current.itemName} at ${store} · ${formatCurrency(unitPrice)}`
          : `Already tracking ${current.itemName} at ${formatCurrency(unitPrice)}`;
        if (Platform.OS !== 'web') {
          showInfoAlert(created ? 'Price alert set' : 'Already tracking', message);
        } else {
          showTrackFeedback(message);
        }
        router.push('/price-tracker?tab=alerts&action=new' as never);
      } catch {
        showTrackFeedback('Could not set price alert');
      }
    },
    [current.itemName, router, showTrackFeedback]
  );

  const addItemToListAtStore = useCallback(
    async (store: string) => {
      try {
        const storeDef = await resolveStore(store);
        await loadLists();
        const freshLists = useListStore.getState().lists;
        let storeBoundList = findDedicatedStoreBoundList(freshLists, storeDef, {
          excludeListId: current.listId,
        });

        if (!storeBoundList) {
          storeBoundList = await addList(`${storeDef.name} list`, {
            storeId: storeDef.id,
            storeName: storeDef.name,
            layoutMode: 'store',
            setActive: true,
          });
        }

        const targetListId = storeBoundList.id;
        const listItems = await loadListItems(targetListId);
        const existingItem = listItems.find(
          (item) => item.name.toLowerCase() === current.itemName.toLowerCase()
        );

        if (existingItem) {
          if (existingItem.storePreference?.toLowerCase() !== store.toLowerCase()) {
            await updateListItem(existingItem.id, { storePreference: store });
          }
        } else {
          const catalog = getGroceryItemByCanonical(current.itemName);
          await createListItem(targetListId, {
            name: current.itemName,
            expectedPrice: catalog ? getGroceryTypicalPrice(catalog) : 0,
            quantity: current.quantity,
            category: inferPantryCategory(current.itemName),
            storePreference: store,
          });
        }

        if (current.storePreference?.toLowerCase() !== store.toLowerCase()) {
          await updateListItem(current.itemId, { storePreference: store });
        }

        await refreshItems(targetListId);
        if (current.listId !== targetListId) {
          await refreshItems(current.listId);
        }
        invalidatePriceComparisonCache();
        onStorePreferenceChange?.();
        await activateList(targetListId);
        router.push(`/list/${targetListId}` as never);
      } catch {
        showTrackFeedback('Could not update list');
      }
    },
    [
      activateList,
      addList,
      current.itemId,
      current.itemName,
      current.listId,
      current.quantity,
      current.storePreference,
      loadListItems,
      loadLists,
      onStorePreferenceChange,
      refreshItems,
      router,
      showTrackFeedback,
    ]
  );

  const viewStore = useCallback(
    (store: string) => {
      void (async () => {
        const storeDef = await resolveStore(store);
        router.push(`/stores/${storeDef.id}` as never);
      })();
    },
    [router]
  );

  const openStoreMenu = useCallback((store: string, unitPrice: number) => {
    if (Platform.OS === 'web') {
      setStoreMenu({ store, unitPrice });
      return;
    }

    const quantityLabel = current.quantity > 1 ? ` × ${current.quantity}` : '';
    const buttons: Parameters<typeof showChoiceAlert>[2] = [
      { text: 'Add item to list at this store', onPress: () => void addItemToListAtStore(store) },
      { text: 'Track price', onPress: () => void trackStorePrice(store, unitPrice) },
      { text: 'View store', onPress: () => viewStore(store) },
      { text: 'Cancel', style: 'cancel' },
    ];
    showChoiceAlert(store, `${current.itemName}${quantityLabel}`, buttons);
  }, [addItemToListAtStore, current.itemName, current.quantity, trackStorePrice, viewStore]);

  const runStoreMenuAction = useCallback(
    (action: () => void | Promise<void>) => {
      closeStoreMenu();
      void action();
    },
    [closeStoreMenu]
  );

  const handleStorePress = useCallback(
    (store: string, unitPrice: number) => {
      openStoreMenu(store, unitPrice);
    },
    [openStoreMenu]
  );

  const itemLabel = current.quantity > 1 ? `${current.itemName} × ${current.quantity}` : current.itemName;
  const showCartSavings = variant === 'full' && maxCartSavings != null && maxCartSavings > 0;

  const displayRows = useMemo(
    () => limitStoreRowsForTier(current.storeRows, multiStoreUnlocked),
    [current.storeRows, multiStoreUnlocked]
  );

  const savingsSubtitle = getSavingsSubtitleForStoreRows(displayRows);
  const allEstimated = displayRows.every((row) => row.source === 'estimate');
  const priceSpread = getDisplayedPriceSpread(displayRows);
  const cheapestRow = displayRows.find((row) => row.isCheapest) ?? displayRows[0];

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]} pointerEvents="box-none">
      {trackFeedback ? (
        <View style={styles.trackFeedbackBar} accessibilityRole="alert">
          <Text style={styles.trackFeedbackText}>{trackFeedback}</Text>
        </View>
      ) : null}
      <Animated.View
        key={`banner-${rotationKey}`}
        entering={FadeIn.duration(350)}
        exiting={fadeOut}
        style={styles.savingsBanner}
        pointerEvents="box-none">
        <View style={styles.savingsTextCol}>
          <Text style={styles.savingsLabel}>
            Save{' '}
            <Text style={styles.savingsAmountInline}>{formatCurrency(current.itemSavings)}</Text>
            {' '}on {current.itemName}
          </Text>
          {priceSpread ? (
            <Text style={styles.savingsBreakdown}>
              {priceSpread.cheapestStore} {formatCurrency(priceSpread.cheapestPrice)} vs{' '}
              {priceSpread.priciestStore} {formatCurrency(priceSpread.priciestPrice)}
            </Text>
          ) : null}
          <View style={styles.savingsSubRow}>
            <Text style={styles.savingsSub}>{savingsSubtitle}</Text>
            <Pressable
              onPress={openPriceInfo}
              hitSlop={12}
              style={styles.infoPressable}
              accessibilityRole="button"
              accessibilityLabel="Learn about price estimates and data sources">
              <View style={styles.infoCircle}>
                <Text style={styles.infoIcon}>ⓘ</Text>
              </View>
            </Pressable>
          </View>
          {showCartSavings ? (
            <Text style={styles.cartSavingsHint}>
              Full cart savings up to {formatCurrency(maxCartSavings)} across all {comparisons.length}{' '}
              {comparisons.length === 1 ? 'item' : 'items'}
            </Text>
          ) : null}
        </View>
        <View style={styles.savingsImageWrap} pointerEvents="none">
          <Image
            source={cartSavingsHero}
            style={styles.savingsImage}
            contentFit="contain"
            accessibilityLabel="Grocery basket"
            accessibilityIgnoresInvertColors
          />
        </View>
      </Animated.View>

      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderMain}>
          <Text style={styles.itemEmoji}>{getItemEmoji(current.itemName, current.itemName)}</Text>
          <View style={styles.itemHeaderText}>
            <Animated.Text
              key={`name-${rotationKey}`}
              entering={SlideInRight.duration(300)}
              exiting={slideOutLeft}
              style={styles.itemName}
              numberOfLines={2}>
              {itemLabel}
            </Animated.Text>
            <Text style={styles.itemMeta}>
              {displayRows.length} store{displayRows.length === 1 ? '' : 's'} · item {currentIndex + 1} of {comparisons.length}
            </Text>
          </View>
        </View>
        {comparisons.length > 1 ? (
          <Pressable
            onPress={onNextItem}
            style={styles.nextButton}
            accessibilityRole="button"
            accessibilityLabel="Show next item">
            <Text style={styles.nextButtonText}>Next</Text>
          </Pressable>
        ) : null}
      </View>

      {comparisons.length > 1 ? (
        <View style={styles.dotsRow}>
          {comparisons.map((entry, index) => (
            <View
              key={entry.itemId}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
              accessibilityLabel={`Item ${index + 1} of ${comparisons.length}`}
            />
          ))}
        </View>
      ) : null}

      {cheapestRow ? (
        <Pressable
          onPress={() => handleShopHere(cheapestRow.store)}
          style={styles.shopCheapestButton}
          accessibilityRole="button"
          accessibilityLabel={`Shop at ${cheapestRow.store}, ${formatCurrency(cheapestRow.price)}`}>
          <Text style={styles.shopCheapestButtonText}>
            Shop at {cheapestRow.store} · {formatCurrency(cheapestRow.price)}
          </Text>
        </Pressable>
      ) : null}

      <Animated.View
        key={`stores-${rotationKey}`}
        entering={FadeIn.duration(400)}
        exiting={fadeOut}
        style={styles.storeScrollWrap}
        pointerEvents="box-none">
        <HorizontalScrollRow
          contentContainerStyle={styles.storeRowScroll}
          snapToInterval={STORE_CARD_SNAP_INTERVAL}
          showsHorizontalScrollIndicator={Platform.OS !== 'web'}>
          {displayRows.map((entry) => {
            const isPreferred =
              current.storePreference?.toLowerCase() === entry.store.toLowerCase();

            return (
              <Pressable
                key={entry.store}
                unstable_pressDelay={80}
                onPress={() => handleStorePress(entry.store, entry.price)}
                onLongPress={() => handleStorePress(entry.store, entry.price)}
                style={({ pressed }) => [
                  styles.storeCard,
                  entry.isCheapest && styles.storeCardCheapest,
                  isPreferred && !entry.isCheapest && styles.storeCardPreferred,
                  Platform.OS === 'web' && pressed ? styles.storeCardPressed : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${entry.store}, ${formatCurrency(entry.price)}${entry.isCheapest ? ', cheapest' : ''}`}>
                {entry.isCheapest ? (
                  <View style={styles.cheapestPill}>
                    <Text style={styles.cheapestPillText}>Cheapest</Text>
                  </View>
                ) : null}
                <StoreBrandAvatar store={entry.store} variant="card" size={44} />
                <Text style={[styles.storeName, entry.isCheapest && styles.storeNameCheapest]} numberOfLines={2}>
                  {entry.store}
                </Text>
                <Text style={[styles.storePrice, entry.isCheapest && styles.storePriceCheapest]}>
                  {formatCurrency(entry.price)}
                  {current.quantity > 1 ? (
                    <Text style={styles.storePriceUnit}> ea</Text>
                  ) : null}
                </Text>
                <CartPriceSourceBadge source={entry.source} />
                {isPreferred ? (
                  <View style={styles.preferredPill}>
                    <Text style={styles.preferredPillText}>Your pick</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </HorizontalScrollRow>
      </Animated.View>

      <AppBottomSheetModal visible={priceInfoVisible} onClose={closePriceInfo}>
        <View style={styles.priceInfoContent}>
          <Text style={styles.storeMenuTitle}>About these prices</Text>
          <Text style={styles.priceInfoSubtitle}>{savingsSubtitle}</Text>
          {allEstimated ? (
            <Text style={styles.priceInfoBody}>{ESTIMATED_PRICE_INFO}</Text>
          ) : (
            <Text style={styles.priceInfoBody}>
              Prices combine your receipts, Open Food Facts crowd prices, community data, and
              estimates depending on what is available for each store.
            </Text>
          )}
          <Text style={styles.priceInfoSectionTitle}>Store card badges</Text>
          <Text style={styles.priceInfoBody}>{PRICE_SOURCE_BADGE_INFO}</Text>
          <Pressable
            style={styles.storeMenuCancel}
            accessibilityRole="button"
            onPress={closePriceInfo}>
            <Text style={styles.storeMenuCancelText}>Got it</Text>
          </Pressable>
        </View>
      </AppBottomSheetModal>

      <AppBottomSheetModal visible={storeMenu != null} onClose={closeStoreMenu}>
        {storeMenu ? (
          <View style={styles.storeMenuContent}>
            <Text style={styles.storeMenuTitle}>{storeMenu.store}</Text>
            <Text style={styles.storeMenuSubtitle}>{itemLabel}</Text>
            <Pressable
              style={styles.storeMenuAction}
              accessibilityRole="button"
              onPress={() => runStoreMenuAction(() => addItemToListAtStore(storeMenu.store))}>
              <Text style={styles.storeMenuActionText}>Add item to list at this store</Text>
            </Pressable>
            <Pressable
              style={styles.storeMenuAction}
              accessibilityRole="button"
              onPress={() =>
                runStoreMenuAction(() => trackStorePrice(storeMenu.store, storeMenu.unitPrice))
              }>
              <Text style={styles.storeMenuActionText}>Track price</Text>
            </Pressable>
            <Pressable
              style={styles.storeMenuAction}
              accessibilityRole="button"
              onPress={() => runStoreMenuAction(() => viewStore(storeMenu.store))}>
              <Text style={styles.storeMenuActionText}>View store</Text>
            </Pressable>
            <Pressable
              style={styles.storeMenuCancel}
              accessibilityRole="button"
              onPress={closeStoreMenu}>
              <Text style={styles.storeMenuCancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}
      </AppBottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  cardEmbedded: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  trackFeedbackBar: {
    marginBottom: 12,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: SmartCartColors.badgeGreen,
    borderWidth: 1,
    borderColor: '#C8E6D4',
  },
  trackFeedbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.primaryDark,
    textAlign: 'center',
  },
  savingsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    padding: 14,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.badge,
    borderWidth: 1,
    borderColor: '#C8E6D4',
  },
  savingsTextCol: { flex: 1 },
  savingsLabel: {
    fontSize: 14,
    color: SmartCartColors.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  savingsAmountInline: {
    fontSize: 18,
    fontWeight: '800',
    color: SmartCartColors.primaryMid,
  },
  savingsBreakdown: {
    fontSize: 11,
    color: SmartCartColors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  savingsSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  savingsSub: { fontSize: 12, color: SmartCartColors.textSecondary },
  cartSavingsHint: {
    fontSize: 11,
    color: SmartCartColors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SmartCartColors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPressable: {
    zIndex: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  infoIcon: { fontSize: 10, fontWeight: '700', color: SmartCartColors.textMuted },
  shopCheapestButton: {
    alignSelf: 'stretch',
    marginBottom: 12,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: SmartCartColors.primaryMid,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const, zIndex: 1 } : null),
  },
  shopCheapestButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  savingsImageWrap: {
    width: 88,
    height: 72,
    flexShrink: 0,
    borderRadius: SmartCartRadius.sm,
    overflow: 'hidden',
  },
  savingsImage: { width: '100%', height: '100%' },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  itemHeaderMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemEmoji: { fontSize: 28, lineHeight: 32 },
  itemHeaderText: { flex: 1, gap: 2 },
  itemName: {
    fontSize: 16,
    color: SmartCartColors.text,
    ...SmartCartTypography.title,
  },
  itemMeta: { fontSize: 11, color: SmartCartColors.textSecondary },
  nextButton: {
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  nextButtonText: { fontSize: 12, fontWeight: '700', color: SmartCartColors.primaryMid },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SmartCartColors.border,
  },
  dotActive: { backgroundColor: SmartCartColors.primaryMid, width: 16 },
  storeScrollWrap: {
    alignSelf: 'stretch',
    minWidth: 0,
    marginHorizontal: -2,
  },
  storeRowScroll: {
    gap: STORE_CARD_GAP,
    paddingVertical: 4,
    paddingLeft: 2,
    paddingRight: 24,
  },
  storeCard: {
    width: STORE_CARD_WIDTH,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  storeCardPressed: { opacity: 0.85 },
  storeCardCheapest: {
    backgroundColor: SmartCartColors.badge,
    borderWidth: 2,
    borderColor: SmartCartColors.primaryMid,
    ...SmartCartShadow.pill,
  },
  storeCardPreferred: {
    borderColor: SmartCartColors.primaryMuted,
    backgroundColor: SmartCartColors.badgeGreen,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.text,
    letterSpacing: -0.2,
    textAlign: 'center',
    minHeight: 34,
  },
  storeNameCheapest: { color: SmartCartColors.primaryDark },
  cheapestPill: {
    backgroundColor: SmartCartColors.primaryMid,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  cheapestPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  preferredPill: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  preferredPillText: { color: SmartCartColors.textSecondary, fontSize: 10, fontWeight: '700' },
  storePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: SmartCartColors.text,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  storePriceCheapest: { color: SmartCartColors.primaryMid },
  storePriceUnit: { fontSize: 11, fontWeight: '600', color: SmartCartColors.textSecondary },
  priceInfoContent: { gap: 10 },
  priceInfoSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SmartCartColors.primaryMid,
    lineHeight: 20,
  },
  priceInfoBody: {
    fontSize: 14,
    color: SmartCartColors.textSecondary,
    lineHeight: 21,
  },
  priceInfoSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: SmartCartColors.text,
    marginTop: 4,
  },
  storeMenuContent: { gap: 8 },
  storeMenuTitle: { fontSize: 18, fontWeight: '800', color: SmartCartColors.text },
  storeMenuSubtitle: { fontSize: 14, color: SmartCartColors.textSecondary, marginBottom: 8 },
  storeMenuAction: {
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  storeMenuActionText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text, textAlign: 'center' },
  storeMenuCancel: {
    marginTop: 4,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  storeMenuCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
  },
});
