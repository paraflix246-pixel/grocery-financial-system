import { useRouter } from 'expo-router';
import { memo, useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { ComparisonUpgradeSlotCard } from '@/src/components/ComparisonUpgradeSlotCard';
import {
  HOME_COMPARISON_COMPARISON_FLEX,
  HOME_COMPARISON_SLOT_GAP,
  HOME_COMPARISON_SLOT_GAP_COMPACT,
  HOME_COMPARISON_UPGRADE_FLEX,
  HomeItemComparisonCard,
} from '@/src/components/HomeItemComparisonCard';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useRotatingItemComparison } from '@/src/hooks/useRotatingItemComparison';
import type { ListItem } from '@/src/models/types';
import { getSavingsSubtitleForStoreRows } from '@/src/services/priceComparisonLogic';
import {
  COMPARISON_FALLBACK_LIST_ID,
  COMPARISON_STARTER_LIST_ID,
  ensureHomeComparisonItems,
  HOME_CART_COMPARISON_PREVIEW_COUNT,
} from '@/src/services/comparisonFallbackLogic';
import { getFeatureLabelI18n } from '@/src/i18n/helpers';
import { useListStore } from '@/src/store/useListStore';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { SmartCartColors, SmartCartTypography } from '@/src/theme/smartCart';

type Props = {
  listItems: ListItem[];
  isStarterSample?: boolean;
};

const SECTION_HORIZONTAL_PADDING = 32;
/** Below this width, side-by-side cards are too narrow — fall back to horizontal scroll. */
const COMPACT_ROW_MIN_WIDTH = 300;

function getCarouselSlotWidth(screenWidth: number): number {
  const peek = 28;
  return Math.min(280, Math.max(220, screenWidth - SECTION_HORIZONTAL_PADDING - peek));
}

const SWIPE_THRESHOLD = 40;

type CarouselSwipeProps = {
  enabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function ComparisonCarouselSwipe({
  enabled,
  onPrevious,
  onNext,
  children,
  style,
}: CarouselSwipeProps) {
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX([-15, 15])
        .failOffsetY([-20, 20])
        .onEnd((event) => {
          if (event.translationX <= -SWIPE_THRESHOLD) {
            runOnJS(onNext)();
          } else if (event.translationX >= SWIPE_THRESHOLD) {
            runOnJS(onPrevious)();
          }
        }),
    [enabled, onNext, onPrevious]
  );

  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={style}>{children}</View>
    </GestureDetector>
  );
}

export const CheapestCartComparison = memo(function CheapestCartComparison({
  listItems,
  isStarterSample: isStarterSampleProp,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const comparisonListId = listItems[0]?.listId ?? null;
  const isSyntheticList =
    comparisonListId === COMPARISON_FALLBACK_LIST_ID || comparisonListId === COMPARISON_STARTER_LIST_ID;
  const isStarterSample =
    isStarterSampleProp ?? comparisonListId === COMPARISON_STARTER_LIST_ID;
  const storeItems = useListStore((s) =>
    !isSyntheticList && comparisonListId ? s.itemsByList[comparisonListId] : undefined
  );
  const effectiveListItems = useMemo(() => {
    if (!isSyntheticList && comparisonListId && storeItems !== undefined && storeItems.length > 0) {
      return storeItems;
    }
    return listItems;
  }, [comparisonListId, isSyntheticList, listItems, storeItems]);

  const subscriptionTier = useSubscriptionStore((s) => s.tier);
  const { unlocked: fullBasketUnlocked } = useFeatureGate('cheapest_basket');

  const previewListItems = useMemo(() => {
    if (fullBasketUnlocked) return effectiveListItems;
    return ensureHomeComparisonItems(effectiveListItems, HOME_CART_COMPARISON_PREVIEW_COUNT).slice(
      0,
      HOME_CART_COMPARISON_PREVIEW_COUNT
    );
  }, [effectiveListItems, fullBasketUnlocked]);

  const { comparisons, current, currentIndex, loading, rotationKey, goToNext, goToPrevious } =
    useRotatingItemComparison(previewListItems);

  const showStarterHint =
    isStarterSample || (effectiveListItems.length === 0 && previewListItems.length > 0);

  const subtitle = useMemo(() => {
    if (showStarterHint) return t('common.samplePrices');
    if (!current) return null;
    return getSavingsSubtitleForStoreRows(current.storeRows);
  }, [showStarterHint, current, t]);

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('comparison.title')}</Text>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={SmartCartColors.primary} />
        </View>
      </View>
    );
  }

  const previewItemCount = fullBasketUnlocked
    ? effectiveListItems.length
    : HOME_CART_COMPARISON_PREVIEW_COUNT;

  if (!current || comparisons.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.sectionTitle}>{t('comparison.title')}</Text>
            <Text style={styles.itemCountLabel}>
              {t('common.items', { count: previewItemCount })}
            </Text>
            {showStarterHint ? <Text style={styles.sourceHint}>{t('common.samplePrices')}</Text> : null}
          </View>
        </View>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={SmartCartColors.primary} />
          <Text style={styles.loadingHint}>{t('comparison.loadingPrices')}</Text>
        </View>
      </View>
    );
  }

  const showUpgradeSlot = !fullBasketUnlocked;
  const upgradeFeatureName =
    subscriptionTier === 'free'
      ? getFeatureLabelI18n(t, 'community_pricing')
      : getFeatureLabelI18n(t, 'cheapest_basket');
  const upgradeHook =
    subscriptionTier === 'free'
      ? t('upgrade.proComparisonHook')
      : undefined;

  const useSideBySide = showUpgradeSlot && screenWidth >= COMPACT_ROW_MIN_WIDTH;
  const rowGap = useSideBySide ? HOME_COMPARISON_SLOT_GAP_COMPACT : HOME_COMPARISON_SLOT_GAP;
  const carouselSlotWidth = getCarouselSlotWidth(screenWidth);
  const snapInterval = carouselSlotWidth + HOME_COMPARISON_SLOT_GAP;

  const showItemNav = comparisons.length > 1;

  const comparisonCardProps = {
    comparison: current,
    rotationKey,
    itemIndex: currentIndex,
    itemCount: comparisons.length,
    ...(fullBasketUnlocked ? { maxStoreRows: 3 } : {}),
  };

  const comparisonCard = fullBasketUnlocked ? (
    <HomeItemComparisonCard {...comparisonCardProps} />
  ) : useSideBySide ? (
    <HomeItemComparisonCard {...comparisonCardProps} compact flexWeight={HOME_COMPARISON_COMPARISON_FLEX} />
  ) : (
    <HomeItemComparisonCard {...comparisonCardProps} compact width={carouselSlotWidth} />
  );

  const upgradeCard = showUpgradeSlot ? (
    useSideBySide ? (
      <ComparisonUpgradeSlotCard
        featureName={upgradeFeatureName}
        hook={upgradeHook}
        compact
        flexWeight={HOME_COMPARISON_UPGRADE_FLEX}
      />
    ) : (
      <ComparisonUpgradeSlotCard
        featureName={upgradeFeatureName}
        hook={upgradeHook}
        compact
        width={carouselSlotWidth}
      />
    )
  ) : null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.sectionTitle}>{t('comparison.title')}</Text>
          <Text style={styles.itemCountLabel}>
            {t('common.items', { count: previewItemCount })}
            {fullBasketUnlocked
              ? t('comparison.comparisonsMeta', { count: comparisons.length })
              : `${t('common.preview')} · ${t('common.itemOf', { current: currentIndex + 1, total: comparisons.length })}`}
          </Text>
          {subtitle ? <Text style={styles.sourceHint}>{subtitle}</Text> : null}
        </View>
        <Pressable onPress={() => router.push('/cart-comparison' as never)}>
          <Text style={styles.seeAll}>{t('common.viewAll')}</Text>
        </Pressable>
      </View>

      {useSideBySide ? (
        <View style={[styles.compactRow, { gap: rowGap }]}>
          <ComparisonCarouselSwipe
            enabled={showItemNav}
            onPrevious={goToPrevious}
            onNext={goToNext}
            style={styles.comparisonSwipeSlot}>
            {comparisonCard}
          </ComparisonCarouselSwipe>
          {upgradeCard}
        </View>
      ) : fullBasketUnlocked ? (
        <ComparisonCarouselSwipe
          enabled={showItemNav}
          onPrevious={goToPrevious}
          onNext={goToNext}>
          {comparisonCard}
        </ComparisonCarouselSwipe>
      ) : (
        <HorizontalScrollRow
          contentContainerStyle={[styles.carouselRow, { gap: rowGap }]}
          snapToInterval={snapInterval}
          showsHorizontalScrollIndicator={false}>
          <ComparisonCarouselSwipe
            enabled={showItemNav}
            onPrevious={goToPrevious}
            onNext={goToNext}>
            {comparisonCard}
          </ComparisonCarouselSwipe>
          {upgradeCard}
        </HorizontalScrollRow>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  headerTitleCol: { flex: 1, gap: 2 },
  sectionTitle: {
    fontSize: 17,
    color: SmartCartColors.text,
    ...SmartCartTypography.title,
  },
  itemCountLabel: { fontSize: 12, color: SmartCartColors.textSecondary },
  sourceHint: { fontSize: 11, color: SmartCartColors.textMuted, marginTop: 2 },
  seeAll: { fontSize: 14, fontWeight: '600', color: SmartCartColors.primaryMid },
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
  compactRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  carouselRow: {
    paddingVertical: 2,
    paddingRight: 4,
  },
  comparisonSwipeSlot: {
    flex: HOME_COMPARISON_COMPARISON_FLEX,
    minWidth: 0,
  },
});
