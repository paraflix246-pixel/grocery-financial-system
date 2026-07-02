import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { ProUpgradeBanner } from '@/src/components/ProUpgradeBanner';
import { HomeItemComparisonCard } from '@/src/components/HomeItemComparisonCard';
import { useCartComparisonAccess } from '@/src/hooks/useCartComparisonAccess';
import { useRotatingItemComparison } from '@/src/hooks/useRotatingItemComparison';
import type { ListItem } from '@/src/models/types';
import { getSavingsSubtitleForStoreRows } from '@/src/services/priceComparisonLogic';
import {
  COMPARISON_FALLBACK_LIST_ID,
  COMPARISON_STARTER_LIST_ID,
} from '@/src/services/comparisonFallbackLogic';
import {
  applyCartComparisonItemLimit,
  shouldShowCartComparisonUpgradeBanner,
  shouldShowLimitedComparisonMeta,
} from '@/src/services/cartComparisonLimitLogic';
import { useListStore } from '@/src/store/useListStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { SmartCartColors, SmartCartTypography } from '@/src/theme/smartCart';

type Props = {
  listItems: ListItem[];
  isStarterSample?: boolean;
};

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

type ComparisonSectionHeaderProps = {
  title: string;
  metaLabel?: string | null;
  subtitle?: string | null;
  onHide: () => void;
  onViewAll?: () => void;
  showViewAll?: boolean;
};

function ComparisonSectionHeader({
  title,
  metaLabel,
  subtitle,
  onHide,
  onViewAll,
  showViewAll = false,
}: ComparisonSectionHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.headerRow}>
      <View style={styles.headerTitleCol}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {metaLabel ? <Text style={styles.itemCountLabel}>{metaLabel}</Text> : null}
        {subtitle ? <Text style={styles.sourceHint}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerActions}>
        <Pressable
          style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
          onPress={onHide}
          accessibilityRole="button"
          accessibilityLabel={t('comparison.hideSection')}
          hitSlop={8}>
          <SymbolView
            name={{ ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }}
            tintColor={SmartCartColors.textMuted}
            size={18}
          />
        </Pressable>
        {showViewAll && onViewAll ? (
          <Pressable onPress={onViewAll}>
            <Text style={styles.seeAll}>{t('common.viewAll')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function LivePriceEstimatesCollapsedHeader() {
  const { t } = useTranslation();
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  const handleShowSection = useCallback(() => {
    void saveSettings({ showLivePriceEstimates: true });
  }, [saveSettings]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.sectionTitle}>{t('comparison.title')}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
            onPress={handleShowSection}
            accessibilityRole="button"
            accessibilityLabel={t('comparison.showSection')}
            hitSlop={8}>
            <SymbolView
              name={{ ios: 'eye', android: 'visibility', web: 'visibility' }}
              tintColor={SmartCartColors.primaryMid}
              size={18}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ComparisonUpgradeBanner({
  ignoreAdminBypass,
}: {
  ignoreAdminBypass?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <ProUpgradeBanner
      title={t('upgrade.proComparisonHook')}
      ignoreAdminBypass={ignoreAdminBypass}
    />
  );
}

export const CheapestCartComparison = memo(function CheapestCartComparison({
  listItems,
  isStarterSample: isStarterSampleProp,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  const handleHideSection = useCallback(() => {
    void saveSettings({ showLivePriceEstimates: false });
  }, [saveSettings]);

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

  const cartAccess = useCartComparisonAccess();
  const hasFullCartComparisonAccess = cartAccess.hasFullAccess;

  const { itemsForComparison: previewListItems, totalListItemCount, comparisonLimit } = useMemo(
    () => applyCartComparisonItemLimit(effectiveListItems, hasFullCartComparisonAccess),
    [effectiveListItems, hasFullCartComparisonAccess]
  );

  const { comparisons, current, currentIndex, loading, rotationKey, goToNext, goToPrevious } =
    useRotatingItemComparison(previewListItems);

  useEffect(() => {
    if (!__DEV__) return;
    console.warn('[CheapestCartComparison] access', {
      tier: cartAccess.tier,
      isAdmin: cartAccess.isAdmin,
      hasFullAccess: cartAccess.hasFullAccess,
      accessReason: cartAccess.accessReason,
      forceFreePreview: cartAccess.forceFreePreview,
      itemCount: effectiveListItems.length,
      limitedCount: previewListItems.length,
      comparisonsCount: comparisons.length,
    });
  }, [
    cartAccess.accessReason,
    cartAccess.forceFreePreview,
    cartAccess.hasFullAccess,
    cartAccess.isAdmin,
    cartAccess.tier,
    comparisons.length,
    effectiveListItems.length,
    previewListItems.length,
  ]);

  const showLimitedComparisonMeta = shouldShowLimitedComparisonMeta(
    hasFullCartComparisonAccess,
    comparisonLimit,
    totalListItemCount
  );

  const showComparisonUpgradeBanner = shouldShowCartComparisonUpgradeBanner({
    hasFullAccess: hasFullCartComparisonAccess,
    comparisonLimit,
    totalListItemCount,
    comparisonsCount: comparisons.length,
  });

  const showStarterHint =
    isStarterSample || (effectiveListItems.length === 0 && previewListItems.length > 0);

  const subtitle = useMemo(() => {
    if (showStarterHint) return t('common.samplePrices');
    if (!current) return null;
    return getSavingsSubtitleForStoreRows(current.storeRows);
  }, [showStarterHint, current, t]);

  const comparisonMetaLabel = useMemo(() => {
    if (showLimitedComparisonMeta && comparisonLimit != null) {
      return t('comparison.limitedMetaLine', {
        shown: comparisonLimit,
        total: totalListItemCount,
      });
    }
    const previewItemCount = hasFullCartComparisonAccess
      ? effectiveListItems.length
      : totalListItemCount;
    const itemsLabel = t('common.items', { count: previewItemCount });
    if (hasFullCartComparisonAccess) {
      return `${itemsLabel}${t('comparison.comparisonsMeta', { count: comparisons.length })}`;
    }
    return `${itemsLabel}${t('comparison.previewMeta', {
      current: currentIndex + 1,
      total: comparisons.length,
    })}`;
  }, [
    comparisonLimit,
    comparisons.length,
    currentIndex,
    effectiveListItems.length,
    hasFullCartComparisonAccess,
    showLimitedComparisonMeta,
    t,
    totalListItemCount,
  ]);

  const upgradeBanner =
    showComparisonUpgradeBanner ? (
      <ComparisonUpgradeBanner
        ignoreAdminBypass={cartAccess.forceFreePreview || !hasFullCartComparisonAccess}
      />
    ) : null;

  if (previewListItems.length === 0) {
    return null;
  }

  if (loading) {
    const loadingMetaLabel =
      totalListItemCount > 0
        ? showLimitedComparisonMeta && comparisonLimit != null
          ? t('comparison.limitedMetaLine', {
              shown: comparisonLimit,
              total: totalListItemCount,
            })
          : t('common.items', { count: totalListItemCount })
        : showStarterHint
          ? t('common.samplePrices')
          : null;

    return (
      <View style={styles.section}>
        <ComparisonSectionHeader
          title={t('comparison.title')}
          metaLabel={loadingMetaLabel}
          onHide={handleHideSection}
        />
        {upgradeBanner}
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={SmartCartColors.primary} />
          <Text style={styles.loadingHint}>{t('comparison.loadingPrices')}</Text>
        </View>
      </View>
    );
  }

  if (!current || comparisons.length === 0) {
    const emptyMetaLabel =
      showLimitedComparisonMeta && comparisonLimit != null
        ? t('comparison.limitedMetaLine', { shown: comparisonLimit, total: totalListItemCount })
        : showStarterHint
          ? t('common.samplePrices')
          : t('common.items', {
              count: hasFullCartComparisonAccess ? effectiveListItems.length : totalListItemCount,
            });

    return (
      <View style={styles.section}>
        <ComparisonSectionHeader
          title={t('comparison.title')}
          metaLabel={emptyMetaLabel}
          onHide={handleHideSection}
        />
        {upgradeBanner}
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('comparison.emptyNoPricesTitle')}</Text>
          <Text style={styles.emptyBody}>{t('comparison.emptyNoPricesBody')}</Text>
        </View>
      </View>
    );
  }

  const showItemNav = comparisons.length > 1;

  const comparisonCard = (
    <HomeItemComparisonCard
      comparison={current}
      rotationKey={rotationKey}
      itemIndex={currentIndex}
      itemCount={comparisons.length}
      hasFullCartComparisonAccess={hasFullCartComparisonAccess}
      {...(hasFullCartComparisonAccess ? { maxStoreRows: 3 } : { compact: true })}
    />
  );

  return (
    <View style={styles.section}>
      <ComparisonSectionHeader
        title={t('comparison.title')}
        metaLabel={comparisonMetaLabel}
        subtitle={subtitle}
        onHide={handleHideSection}
        onViewAll={() => router.push('/cart-comparison' as never)}
        showViewAll
      />

      {upgradeBanner}

      <ComparisonCarouselSwipe
        enabled={showItemNav}
        onPrevious={goToPrevious}
        onNext={goToNext}>
        {comparisonCard}
      </ComparisonCarouselSwipe>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  headerIconBtnPressed: { opacity: 0.7 },
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
  emptyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: SmartCartColors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    color: SmartCartColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
