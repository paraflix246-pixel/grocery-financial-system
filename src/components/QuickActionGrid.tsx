import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { NotificationCountBadge } from '@/src/components/NotificationCountBadge';
import { useNotificationCenterStore } from '@/src/store/useNotificationCenterStore';
import { useListStore } from '@/src/store/useListStore';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import {
  getPromoBorder,
  getPromoBodyText,
  getPromoIconBorder,
  getPromoMutedText,
  getPromoSurfaceGradient,
} from '@/src/theme/themeColorUtils';
import { skipOpenLastListOnNextFocus } from '@/src/utils/listNavigationPrefs';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type Action = {
  id: string;
  labelKey: string;
  icon: SymbolName;
  color: string;
  bgLight: string;
  bgDark: string;
  route: string;
};

const SECONDARY_ACTIONS: Action[] = [
  {
    id: 'track-alerts',
    labelKey: 'quickActions.trackAlerts',
    icon: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
    color: SmartCartColors.accentOrange,
    bgLight: '#FFF7ED',
    bgDark: '#FED7AA',
    route: '/price-tracker',
  },
  {
    id: 'pantry',
    labelKey: 'quickActions.pantry',
    icon: { ios: 'refrigerator.fill', android: 'kitchen', web: 'kitchen' },
    color: '#9333EA',
    bgLight: '#F3E8FF',
    bgDark: '#E9D5FF',
    route: '/pantry',
  },
  {
    id: 'stores',
    labelKey: 'quickActions.stores',
    icon: { ios: 'storefront.fill', android: 'store', web: 'store' },
    color: SmartCartColors.accentBlue,
    bgLight: '#EFF6FF',
    bgDark: '#BFDBFE',
    route: '/stores',
  },
];

function SecondaryActionCard({
  label,
  action,
  badgeCount,
  onPress,
}: {
  label: string;
  action: Action;
  badgeCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const accessibilityLabel =
    badgeCount > 0 ? t('home.badgeA11y', { label, count: badgeCount }) : label;

  return (
    <Pressable
      style={({ pressed }) => [styles.secondaryCard, pressed && styles.secondaryCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}>
      <LinearGradient
        colors={[action.bgLight, action.bgDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.secondaryIconCircle}
        pointerEvents="none">
        <SymbolView name={action.icon} tintColor={action.color} size={20} />
        {badgeCount > 0 ? <NotificationCountBadge count={badgeCount} /> : null}
      </LinearGradient>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export const QuickActionGrid = memo(function QuickActionGrid() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useAppTheme();
  const listCount = useListStore((s) => s.lists.length);
  const shoppingListsBadgeCount = useNotificationCenterStore((s) => s.shoppingListsBadgeCount);
  const pantryBadgeCount = useNotificationCenterStore((s) => s.pantryBadgeCount);
  const storesBadgeCount = useNotificationCenterStore((s) => s.storesBadgeCount);

  const secondaryBadgeCounts: Record<string, number> = {
    pantry: pantryBadgeCount,
    stores: storesBadgeCount,
  };

  useEffect(() => {
    if (listCount === 0) {
      void useListStore.getState().loadLists();
    }
  }, [listCount]);

  const listsSubtitle = useMemo(() => {
    if (listCount === 0) return t('quickActions.listsSubtitleEmpty');
    return t('quickActions.listsSubtitle', { count: listCount });
  }, [listCount, t]);

  const promoGradient = useMemo(() => getPromoSurfaceGradient(theme), [theme]);
  const promoBorder = useMemo(() => getPromoBorder(theme), [theme]);
  const promoIconBorder = useMemo(() => getPromoIconBorder(theme), [theme]);
  const featuredStyles = useMemo(
    () => ({
      card: {
        shadowColor: theme.primary,
      },
      gradient: {
        borderColor: promoBorder,
      },
      icon: {
        borderColor: promoIconBorder,
      },
      countBadge: {
        backgroundColor: theme.primary,
      },
      label: {
        color: getPromoBodyText(theme),
      },
      subtitle: {
        color: getPromoMutedText(theme),
      },
    }),
    [theme, promoBorder, promoIconBorder]
  );

  function handleOpenShoppingLists() {
    skipOpenLastListOnNextFocus();
    router.push('/(tabs)/shopping-lists?browse=1' as never);
  }

  const shoppingListsLabel = t('quickActions.shoppingLists');
  const shoppingListsAccessibilityLabel =
    shoppingListsBadgeCount > 0
      ? t('home.badgeA11y', {
          label: `${shoppingListsLabel}. ${listsSubtitle}`,
          count: shoppingListsBadgeCount,
        })
      : `${shoppingListsLabel}. ${listsSubtitle}`;

  return (
    <View style={styles.grid}>
      <Pressable
        style={({ pressed }) => [
          styles.featuredCard,
          featuredStyles.card,
          pressed && styles.featuredCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={shoppingListsAccessibilityLabel}
        onPress={handleOpenShoppingLists}>
        <LinearGradient
          colors={promoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.featuredGradient, featuredStyles.gradient]}>
          <View style={[styles.featuredIcon, featuredStyles.icon]}>
            <SymbolView
              name={{ ios: 'list.bullet.clipboard.fill', android: 'checklist', web: 'checklist' }}
              tintColor={theme.primary}
              size={24}
            />
            {shoppingListsBadgeCount > 0 ? (
              <NotificationCountBadge count={shoppingListsBadgeCount} />
            ) : null}
          </View>
          <View style={styles.featuredCopy}>
            <Text style={[styles.featuredLabel, featuredStyles.label]}>{shoppingListsLabel}</Text>
            <Text style={[styles.featuredSubtitle, featuredStyles.subtitle]} numberOfLines={2}>
              {listsSubtitle}
            </Text>
          </View>
          {listCount > 0 ? (
            <View style={[styles.countBadge, featuredStyles.countBadge]}>
              <Text style={styles.countBadgeText}>{listCount}</Text>
            </View>
          ) : (
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={theme.primary}
              size={18}
            />
          )}
        </LinearGradient>
      </Pressable>
      <View style={styles.secondaryRow}>
        {SECONDARY_ACTIONS.map((action) => (
          <SecondaryActionCard
            key={action.id}
            label={t(action.labelKey)}
            action={action}
            badgeCount={secondaryBadgeCounts[action.id] ?? 0}
            onPress={() => router.push(action.route as never)}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    gap: 10,
    marginBottom: 20,
  },
  featuredCard: {
    borderRadius: SmartCartRadius.lg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  featuredCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  featuredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: SmartCartRadius.lg,
    borderWidth: 1.5,
    minHeight: 80,
  },
  featuredIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
    position: 'relative',
    overflow: 'visible',
  },
  featuredCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  featuredLabel: {
    fontSize: 17,
    lineHeight: 22,
    ...SmartCartTypography.title,
  },
  featuredSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  secondaryCardPressed: {
    borderColor: SmartCartColors.textMuted,
    backgroundColor: SmartCartColors.background,
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  secondaryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
    overflow: 'visible',
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});
