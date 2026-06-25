import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import { limitStoreRowsForTier } from '@/src/services/tierLimits';
import type { RotatingItemComparison } from '@/src/services/priceComparisonService';
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
}: Props) {
  const router = useRouter();
  const { unlocked: multiStoreUnlocked } = useFeatureGate('community_pricing');

  const rowLimit = compact ? MAX_STORE_ROWS_COMPACT : maxStoreRows ?? MAX_STORE_ROWS_FULL;

  const displayRows = useMemo(() => {
    if (compact) {
      return comparison.storeRows.slice(0, rowLimit);
    }
    return limitStoreRowsForTier(comparison.storeRows, multiStoreUnlocked).slice(0, rowLimit);
  }, [compact, comparison.storeRows, multiStoreUnlocked, rowLimit]);

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

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        compact ? styles.cardCompact : null,
        flexStyle,
        Platform.OS === 'web' && pressed ? styles.cardPressed : null,
      ]}
      onPress={() => router.push('/cart-comparison' as never)}
      accessibilityRole="button"
      accessibilityLabel={`Compare ${comparison.itemName}, save ${formatCurrency(comparison.itemSavings)}`}>
      {compact ? (
        <Animated.View
          key={`compact-item-${rotationKey}`}
          entering={FadeIn.duration(300)}
          exiting={fadeOut}
          style={styles.compactContent}>
          <View style={styles.compactFoodTop}>
            <Text style={styles.itemEmojiCentered}>
              {getItemEmoji(comparison.itemName, comparison.itemName)}
            </Text>
            <Text style={[styles.itemName, styles.itemNameCompactCentered]} numberOfLines={2}>
              {itemLabel}
            </Text>
            <View style={[styles.savingsPill, styles.savingsPillCompactCentered]}>
              <Text style={[styles.savingsText, styles.savingsTextCompact]}>
                Save{' '}
                <Text style={[styles.savingsAmount, styles.savingsAmountCompact]}>
                  {formatCurrency(comparison.itemSavings)}
                </Text>
              </Text>
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
            <Text style={styles.itemEmoji}>
              {getItemEmoji(comparison.itemName, comparison.itemName)}
            </Text>
            <Text style={styles.itemName} numberOfLines={2}>
              {itemLabel}
            </Text>
          </Animated.View>

          <View style={styles.savingsPill}>
            <Text style={styles.savingsText}>
              Save{' '}
              <Text style={styles.savingsAmount}>{formatCurrency(comparison.itemSavings)}</Text>
            </Text>
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

      <Animated.View
        key={`stores-${rotationKey}`}
        entering={FadeIn.duration(350)}
        exiting={fadeOut}
        style={[styles.storeList, compact ? styles.storeListCompactHorizontal : null]}>
        {displayRows.map((row) =>
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
        )}
      </Animated.View>
    </Pressable>
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
  itemEmojiCentered: { fontSize: 36, lineHeight: 40 },
  itemEmoji: { fontSize: 24, lineHeight: 28 },
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
