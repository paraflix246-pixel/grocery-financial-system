import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import { ComparisonStoreUpgradeCard } from '@/src/components/ComparisonStoreUpgradeCard';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { FoodItemImageAvatar } from '@/src/components/FoodItemImageAvatar';
import type { RotatingItemComparison } from '@/src/services/priceComparisonService';
import {
  applyCartComparisonStoreRowLimit,
  shouldShowStoreComparisonUpgradeCard,
} from '@/src/services/cartComparisonLimitLogic';
import {
  buildDisplayStoreRows,
  getItemPriceSpreadSavings,
} from '@/src/services/priceComparisonLogic';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

export const HOME_COMPARISON_SLOT_GAP = 12;
export const HOME_COMPARISON_SLOT_GAP_COMPACT = 8;
export const HOME_COMPARISON_SLOT_MIN_HEIGHT = 236;
export const HOME_COMPARISON_SLOT_MIN_HEIGHT_COMPACT = 196;
export const HOME_COMPARISON_COMPARISON_FLEX = 2;
export const HOME_COMPARISON_UPGRADE_FLEX = 1;

const MAX_STORE_ROWS_FULL = 3;
const MAX_STORE_ROWS_COMPACT = 2;

const fadeOut = Platform.OS === 'web' ? undefined : FadeOut.duration(200);

type Props = {
  comparison: RotatingItemComparison;
  width?: number;
  compact?: boolean;
  flexWeight?: number;
  rotationKey?: number;
  itemIndex?: number;
  itemCount?: number;
  maxStoreRows?: number;
  hasFullCartComparisonAccess?: boolean;
};

export function HomeItemComparisonCard({
  comparison,
  width,
  compact = false,
  flexWeight,
  rotationKey = 0,
  itemIndex = 0,
  itemCount = 1,
  maxStoreRows,
  hasFullCartComparisonAccess = true,
}: Props) {
  const router = useRouter();

  const rowLimit = compact ? MAX_STORE_ROWS_COMPACT : maxStoreRows ?? MAX_STORE_ROWS_FULL;

  const eligibleStoreRows = useMemo(
    () =>
      buildDisplayStoreRows(comparison.storeRows, {
        visibleStoreNames: comparison.visibleStoreNames,
        // Count all comparable stores; cart tier cap is applied separately below.
        multiStoreUnlocked: true,
      }),
    [comparison.storeRows, comparison.visibleStoreNames]
  );

  const displayRows = useMemo(() => {
    const limitedRows = applyCartComparisonStoreRowLimit(
      eligibleStoreRows,
      hasFullCartComparisonAccess
    );
    if (rowLimit > 0 && limitedRows.length > rowLimit) {
      return limitedRows.slice(0, rowLimit);
    }
    return limitedRows;
  }, [eligibleStoreRows, hasFullCartComparisonAccess, rowLimit]);

  const totalStoreCount = eligibleStoreRows.length;
  const showStoreUpgradeCard = shouldShowStoreComparisonUpgradeCard(
    hasFullCartComparisonAccess,
    totalStoreCount,
    displayRows.length
  );
  const hiddenStoreCount = Math.max(0, totalStoreCount - displayRows.length);

  const displayedItemSavings = useMemo(
    () => getItemPriceSpreadSavings(displayRows, comparison.quantity),
    [displayRows, comparison.quantity]
  );

  const showItemSavings = displayRows.length >= 2 && displayedItemSavings > 0;

  const itemLabel =
    comparison.quantity > 1
      ? `${comparison.itemName} × ${comparison.quantity}`
      : comparison.itemName;

  const avatarSize = compact ? 30 : 28;
  const flexStyle =
    flexWeight != null
      ? { flex: flexWeight, minWidth: 0 }
      : width != null
        ? { width }
        : styles.cardFlex;

  const cardAccessibilityLabel =
    showItemSavings
      ? `Compare ${comparison.itemName}, save ${formatCurrency(displayedItemSavings)}`
      : `Compare ${comparison.itemName}`;

  const navigateToComparison = () => router.push('/cart-comparison' as never);

  const storeRows = displayRows.map((row) =>
    compact ? (
      <View
        key={row.store}
        style={[
          styles.storeColumnCompact,
          row.isCheapest && styles.storeColumnCheapest,
        ]}>
        {row.isCheapest ? (
          <View style={styles.cheapestColumnBanner}>
            <Text style={styles.cheapestColumnBannerText}>Cheapest</Text>
          </View>
        ) : null}
        <StoreBrandAvatar store={row.store} variant="card" size={avatarSize} />
        <Text
          style={[
            styles.storeNameCompactColumn,
            row.isCheapest && styles.storeNameCheapest,
          ]}
          numberOfLines={2}>
          {row.store}
        </Text>
        <Text
          style={[
            styles.storePriceCompactColumn,
            row.isCheapest && styles.storePriceCheapest,
          ]}>
          {formatCurrency(row.price)}
        </Text>
      </View>
    ) : (
      <View
        key={row.store}
        style={[styles.storeRow, row.isCheapest && styles.storeRowCheapest]}>
        <StoreBrandAvatar store={row.store} variant="card" size={avatarSize} />
        <Text
          style={[styles.storeName, row.isCheapest && styles.storeNameCheapest]}
          numberOfLines={1}>
          {row.store}
        </Text>
        <Text style={[styles.storePrice, row.isCheapest && styles.storePriceCheapest]}>
          {formatCurrency(row.price)}
        </Text>
      </View>
    )
  );

  const storeListInsideCardPress =
    !showStoreUpgradeCard || !compact ? (
      <Animated.View
        key={`stores-${rotationKey}`}
        entering={FadeIn.duration(350)}
        exiting={fadeOut}
        style={[styles.storeList, compact ? styles.storeListCompactHorizontal : null]}>
        {storeRows}
      </Animated.View>
    ) : null;

  const compactStoreRowWithUpgrade =
    showStoreUpgradeCard && compact ? (
      <Animated.View
        key={`stores-${rotationKey}`}
        entering={FadeIn.duration(350)}
        exiting={fadeOut}
        style={[styles.storeList, styles.storeListCompactHorizontal]}>
        <Pressable
          style={({ pressed }) => [
            styles.compactStorePressArea,
            Platform.OS === 'web' && pressed ? styles.cardPressed : null,
          ]}
          onPress={navigateToComparison}
          accessibilityRole="button"
          accessibilityLabel={cardAccessibilityLabel}>
          {storeRows}
        </Pressable>
        <ComparisonStoreUpgradeCard
          hiddenStoreCount={hiddenStoreCount}
          variant="compact-column"
        />
      </Animated.View>
    ) : null;

  const fullStoreUpgradeCard =
    showStoreUpgradeCard && !compact ? (
      <ComparisonStoreUpgradeCard hiddenStoreCount={hiddenStoreCount} variant="store-row" />
    ) : null;

  return (
    <View style={[styles.card, compact ? styles.cardCompact : null, flexStyle]}>
      <Pressable
        style={({ pressed }) => [
          styles.cardPressable,
          compact ? styles.cardPressableCompact : null,
          Platform.OS === 'web' && pressed ? styles.cardPressed : null,
        ]}
        onPress={navigateToComparison}
        accessibilityRole="button"
        accessibilityLabel={cardAccessibilityLabel}>
        {compact ? (
          <Animated.View
            key={`compact-item-${rotationKey}`}
            entering={FadeIn.duration(300)}
            exiting={fadeOut}
            style={styles.compactContent}>
            <View style={styles.compactFoodTop}>
              <FoodItemImageAvatar itemName={comparison.itemName} size="lg" />
              <Text style={[styles.itemName, styles.itemNameCompactCentered]} numberOfLines={2}>
                {itemLabel}
              </Text>
              <View style={[styles.savingsPill, styles.savingsPillCompactCentered]}>
                {showItemSavings ? (
                  <Text style={[styles.savingsText, styles.savingsTextCompact]}>
                    Save{' '}
                    <Text style={[styles.savingsAmount, styles.savingsAmountCompact]}>
                      {formatCurrency(displayedItemSavings)}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.savingsText, styles.savingsTextCompact]}>
                    {displayRows.length === 1
                      ? `At ${displayRows[0]!.store}`
                      : 'Compare prices'}
                  </Text>
                )}
              </View>
            </View>

            {itemCount > 1 ? (
              <View style={styles.dotsRow}>
                {Array.from({ length: itemCount }, (_, index) => (
                  <View
                    key={index}
                    style={[styles.dot, index === itemIndex && styles.dotActive]}
                    accessibilityLabel={`Item ${index + 1} of ${itemCount}`}
                  />
                ))}
              </View>
            ) : null}
          </Animated.View>
        ) : (
          <>
            <Animated.View
              key={`item-header-${rotationKey}`}
              entering={FadeIn.duration(300)}
              exiting={fadeOut}
              style={styles.itemHeader}>
              <FoodItemImageAvatar itemName={comparison.itemName} size="md" style={styles.itemAvatar} />
              <Text style={styles.itemName} numberOfLines={2}>
                {itemLabel}
              </Text>
            </Animated.View>

            <View style={styles.savingsPill}>
              {showItemSavings ? (
                <Text style={styles.savingsText}>
                  Save{' '}
                  <Text style={styles.savingsAmount}>{formatCurrency(displayedItemSavings)}</Text>
                </Text>
              ) : (
                <Text style={styles.savingsText}>
                  {displayRows.length === 1 ? `At ${displayRows[0]!.store}` : 'Compare prices'}
                </Text>
              )}
            </View>

            {itemCount > 1 ? (
              <View style={styles.dotsRow}>
                {Array.from({ length: itemCount }, (_, index) => (
                  <View
                    key={index}
                    style={[styles.dot, index === itemIndex && styles.dotActive]}
                    accessibilityLabel={`Item ${index + 1} of ${itemCount}`}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}

        {storeListInsideCardPress}
      </Pressable>

      {compactStoreRowWithUpgrade}
      {fullStoreUpgradeCard}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: HOME_COMPARISON_SLOT_MIN_HEIGHT,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    gap: 10,
    ...SmartCartShadow.card,
  },
  cardPressable: {
    flex: 1,
    gap: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  cardPressableCompact: { gap: 6 },
  compactStorePressArea: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  cardCompact: {
    minHeight: HOME_COMPARISON_SLOT_MIN_HEIGHT_COMPACT,
    padding: 9,
    gap: 6,
  },
  cardFlex: { flex: 1, minWidth: 0 },
  cardPressed: { opacity: 0.92 },
  compactContent: { gap: 4 },
  compactFoodTop: {
    alignItems: 'center',
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minHeight: 44,
  },
  itemAvatar: { flexShrink: 0 },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: SmartCartColors.text,
    ...SmartCartTypography.title,
  },
  itemNameCompactCentered: {
    flex: 0,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  savingsPill: {
    alignSelf: 'flex-start',
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: SmartCartColors.badge,
    borderWidth: 1,
    borderColor: '#C8E6D4',
  },
  savingsPillCompactCentered: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savingsText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.text },
  savingsTextCompact: { fontSize: 11, fontWeight: '700' },
  savingsAmount: { fontSize: 13, fontWeight: '800', color: SmartCartColors.primaryMid },
  savingsAmountCompact: { fontSize: 12, fontWeight: '800' },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: SmartCartColors.border,
  },
  dotActive: { backgroundColor: SmartCartColors.primaryMid, width: 14 },
  storeList: { gap: 6, marginTop: 'auto' as const },
  storeListCompactHorizontal: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 0,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: SmartCartRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  storeRowCheapest: {
    backgroundColor: SmartCartColors.badgeGreen,
    borderColor: SmartCartColors.primaryMuted,
  },
  storeColumnCompact: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 3,
    borderRadius: SmartCartRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  storeColumnCheapest: {
    backgroundColor: SmartCartColors.badgeGreen,
    borderColor: SmartCartColors.primaryMuted,
    paddingTop: 0,
    overflow: 'hidden',
  },
  cheapestColumnBanner: {
    alignSelf: 'stretch',
    backgroundColor: SmartCartColors.primaryMid,
    paddingVertical: 3,
    alignItems: 'center',
    marginBottom: 4,
  },
  cheapestColumnBannerText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  storeName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
  },
  storeNameCompactColumn: {
    fontSize: 10,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  storeNameCheapest: { color: SmartCartColors.primaryDark, fontWeight: '700' },
  storePrice: { fontSize: 13, fontWeight: '700', color: SmartCartColors.text },
  storePriceCompactColumn: {
    fontSize: 12,
    fontWeight: '800',
    color: SmartCartColors.text,
    textAlign: 'center',
  },
  storePriceCheapest: { color: SmartCartColors.primaryMid, fontWeight: '800' },
});
