import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { getFeatureLabelI18n } from '@/src/i18n/helpers';
import { SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { promptUpgrade } from '@/src/utils/promptUpgrade';

const GRADIENT = ['#0F1F14', '#14532D', '#166534'] as const;

export const COMPARISON_STORE_CARD_WIDTH = 128;

type Props = {
  hiddenStoreCount: number;
  variant?: 'store-row' | 'compact-column';
  width?: number;
};

export function ComparisonStoreUpgradeCard({
  hiddenStoreCount,
  variant = 'store-row',
  width = COMPARISON_STORE_CARD_WIDTH,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const planName = t('common.pro');
  const featureName = getFeatureLabelI18n(t, 'cheapest_basket');
  const isCompactColumn = variant === 'compact-column';

  const title =
    hiddenStoreCount > 0
      ? t('comparison.unlockMoreStores', { count: hiddenStoreCount })
      : t('comparison.seeAllStoresPro');

  const handlePress = () => {
    promptUpgrade({
      featureName,
      onUpgrade: () => router.push('/paywall' as never),
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        isCompactColumn ? styles.pressableCompactColumn : styles.pressableStoreRow,
        !isCompactColumn ? { width } : null,
        pressed && styles.pressablePressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t('comparison.storeUpgradeA11y', { count: hiddenStoreCount })}>
      <LinearGradient
        colors={[...GRADIENT]}
        style={[
          styles.card,
          isCompactColumn ? styles.cardCompactColumn : styles.cardStoreRow,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View style={[styles.iconWrap, isCompactColumn && styles.iconWrapCompact]}>
          <SymbolView
            name={{ ios: 'star.fill', android: 'star', web: 'star' }}
            tintColor="#86EFAC"
            size={isCompactColumn ? 16 : 20}
          />
        </View>
        <Text
          style={[styles.title, isCompactColumn && styles.titleCompact]}
          numberOfLines={isCompactColumn ? 3 : 4}>
          {title}
        </Text>
        <Text style={[styles.planLabel, isCompactColumn && styles.planLabelCompact]}>
          {t('common.withPlan', { plan: planName })}
        </Text>
        <View style={[styles.ctaRow, isCompactColumn && styles.ctaRowCompact]}>
          <Text style={[styles.ctaText, isCompactColumn && styles.ctaTextCompact]}>
            {t('common.viewPlans')}
          </Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor="#86EFAC"
            size={isCompactColumn ? 11 : 12}
          />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableStoreRow: {
    borderRadius: SmartCartRadius.md,
    overflow: 'hidden',
    ...SmartCartShadow.card,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  pressableCompactColumn: {
    flex: 1,
    minWidth: 0,
    borderRadius: SmartCartRadius.sm,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  pressablePressed: { opacity: 0.94 },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.35)',
    gap: 4,
  },
  cardStoreRow: {
    minHeight: 168,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: SmartCartRadius.md,
  },
  cardCompactColumn: {
    minHeight: 108,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: SmartCartRadius.sm,
    gap: 3,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  titleCompact: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
  },
  planLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86EFAC',
    textAlign: 'center',
  },
  planLabelCompact: {
    fontSize: 8,
    fontWeight: '700',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  ctaRowCompact: {
    marginTop: 2,
  },
  ctaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86EFAC',
  },
  ctaTextCompact: {
    fontSize: 8,
    fontWeight: '800',
  },
});
