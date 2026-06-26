import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';
import { useListStore } from '@/src/store/useListStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
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
  onPress,
}: {
  label: string;
  action: Action;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.secondaryCard, pressed && styles.secondaryCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}>
      <LinearGradient
        colors={[action.bgLight, action.bgDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.secondaryIconCircle}
        pointerEvents="none">
        <SymbolView name={action.icon} tintColor={action.color} size={20} />
      </LinearGradient>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function QuickActionGrid() {
  const { t } = useTranslation();
  const router = useRouter();
  const listCount = useListStore((s) => s.lists.length);

  const loadLists = useCallback(() => {
    void useListStore.getState().loadLists();
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const listsSubtitle = useMemo(() => {
    if (listCount === 0) return t('quickActions.listsSubtitleEmpty');
    return t('quickActions.listsSubtitle', { count: listCount });
  }, [listCount, t]);

  function handleOpenShoppingLists() {
    skipOpenLastListOnNextFocus();
    router.push('/(tabs)/shopping-lists?browse=1' as never);
  }

  const shoppingListsLabel = t('quickActions.shoppingLists');

  return (
    <View style={styles.grid}>
      <Pressable
        style={({ pressed }) => [styles.featuredCard, pressed && styles.featuredCardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${shoppingListsLabel}. ${listsSubtitle}`}
        onPress={handleOpenShoppingLists}>
        <LinearGradient
          colors={['#ECFDF5', '#D1FAE5', '#BBF7D0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featuredGradient}>
          <View style={styles.featuredIcon}>
            <SymbolView
              name={{ ios: 'list.bullet.clipboard.fill', android: 'checklist', web: 'checklist' }}
              tintColor={SmartCartColors.primaryDark}
              size={24}
            />
          </View>
          <View style={styles.featuredCopy}>
            <Text style={styles.featuredLabel}>{shoppingListsLabel}</Text>
            <Text style={styles.featuredSubtitle} numberOfLines={2}>
              {listsSubtitle}
            </Text>
          </View>
          {listCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{listCount}</Text>
            </View>
          ) : (
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={SmartCartColors.primaryDark}
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
            onPress={() => router.push(action.route as never)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 10,
    marginBottom: 20,
  },
  featuredCard: {
    borderRadius: SmartCartRadius.lg,
    ...SmartCartShadow.glow,
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
    borderColor: '#86EFAC',
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
    borderColor: '#BBF7D0',
    flexShrink: 0,
  },
  featuredCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  featuredLabel: {
    fontSize: 17,
    lineHeight: 22,
    color: SmartCartColors.text,
    ...SmartCartTypography.title,
  },
  featuredSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: SmartCartColors.textSecondary,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SmartCartColors.primaryDark,
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
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});
