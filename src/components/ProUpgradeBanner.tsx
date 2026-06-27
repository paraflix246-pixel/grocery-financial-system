import { Pressable, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';

import { PRO_UPGRADE_HOOK } from '@/src/constants/proPricing';

import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { getPromoIconBorder, withAlpha } from '@/src/theme/themeColorUtils';

type Props = {
  featureName?: string;
  hook?: string;
  variant?: 'default' | 'compact';
  /** Single-line copy for compact variant (e.g. home screen). */
  message?: string;
};

export function ProUpgradeBanner({
  featureName,
  hook,
  variant = 'default',
  message,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useAppTheme();
  const planName = t('common.pro');
  const isCompact = variant === 'compact';

  const compactStyles = useMemo(
    () => ({
      banner: {
        backgroundColor: withAlpha(theme.primary, 0.07),
        borderColor: getPromoIconBorder(theme),
      },
      iconWrap: {
        backgroundColor: withAlpha(theme.primary, 0.12),
      },
      message: {
        color: theme.primary,
      },
    }),
    [theme]
  );

  return (
    <Pressable
      style={({ pressed }) => [
        isCompact ? [styles.bannerCompact, compactStyles.banner] : styles.banner,
        pressed && styles.bannerPressed,
      ]}
      onPress={() => router.push('/paywall' as never)}
      accessibilityRole="button"
      accessibilityLabel={
        isCompact
          ? message
          : t('common.unlockWith', { feature: featureName, plan: planName })
      }>
      <View style={isCompact ? [styles.iconWrapCompact, compactStyles.iconWrap] : styles.iconWrap}>
        <SymbolView
          name={{ ios: 'star.fill', android: 'star', web: 'star' }}
          tintColor={isCompact ? theme.primary : SmartCartColors.accentPurple}
          size={isCompact ? 14 : 20}
        />
      </View>
      {isCompact ? (
        <Text style={[styles.compactMessage, compactStyles.message]} numberOfLines={2}>
          {message}
        </Text>
      ) : (
        <View style={styles.textCol}>
          <Text style={styles.title}>
            {t('common.unlockWith', { feature: featureName, plan: planName })}
          </Text>
          <Text style={styles.sub}>{hook ?? PRO_UPGRADE_HOOK}</Text>
        </View>
      )}
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={isCompact ? theme.primary : SmartCartColors.primary}
        size={isCompact ? 14 : 16}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    ...SmartCartShadow.cardSoft,
  },
  bannerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: SmartCartRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    ...SmartCartShadow.cardSoft,
  },
  bannerPressed: { opacity: 0.9 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  sub: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2, lineHeight: 17 },
  compactMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
