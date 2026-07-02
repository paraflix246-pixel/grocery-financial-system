import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/Themed';

import { PRO_UPGRADE_HOOK } from '@/src/constants/proPricing';

import { useShouldShowProUpgradeBanner } from '@/src/hooks/useFeatureGate';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import {
  getProBannerBorder,
  getProBannerGradient,
  getProBannerIconSurface,
  PRO_BANNER_ACCENT,
} from '@/src/theme/themeColorUtils';

type Props = {
  featureName?: string;
  /** Overrides the default "Stop wasting on …" title when set. */
  title?: string;
  hook?: string;
  variant?: 'default' | 'compact';
  /** Single-line copy for compact variant (e.g. home screen). */
  message?: string;
  /** Show banner for admin accounts (DEV free-tier cart preview). */
  ignoreAdminBypass?: boolean;
};

const PRO_ICON = {
  ios: 'sparkles',
  android: 'auto_awesome',
  web: 'auto_awesome',
} as const;

export function ProUpgradeBanner({
  featureName,
  title,
  hook,
  variant = 'default',
  message,
  ignoreAdminBypass = false,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const showUpgradeBanner = useShouldShowProUpgradeBanner();
  const planName = t('common.pro');
  const isCompact = variant === 'compact';
  const bannerTitle =
    title ?? (featureName ? t('common.unlockWith', { feature: featureName, plan: planName }) : undefined);
  const bannerSub = hook ?? (title ? undefined : PRO_UPGRADE_HOOK);

  const proGradient = useMemo(() => getProBannerGradient(), []);
  const proBorder = useMemo(() => getProBannerBorder(), []);
  const proIconSurface = useMemo(() => getProBannerIconSurface(), []);

  if (!showUpgradeBanner && !ignoreAdminBypass) return null;

  return (
    <Pressable
      style={({ pressed }) => [
        isCompact ? styles.pressableCompact : styles.pressableDefault,
        pressed && styles.bannerPressed,
      ]}
      onPress={() => router.push('/paywall' as never)}
      accessibilityRole="button"
      accessibilityLabel={isCompact ? message : (bannerTitle ?? planName)}>
      <LinearGradient
        colors={proGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          isCompact ? styles.bannerCompact : styles.banner,
          { borderColor: proBorder, shadowColor: PRO_BANNER_ACCENT },
        ]}>
        <View
          style={[
            isCompact ? styles.iconWrapCompact : styles.iconWrap,
            { backgroundColor: proIconSurface, borderColor: proBorder },
          ]}>
          <SymbolView
            name={PRO_ICON}
            tintColor={PRO_BANNER_ACCENT}
            size={isCompact ? 15 : 20}
          />
        </View>
        {isCompact ? (
          <Text style={styles.compactMessage} numberOfLines={2}>
            {message}
          </Text>
        ) : (
          <View style={styles.textCol}>
            {bannerTitle ? <Text style={styles.title}>{bannerTitle}</Text> : null}
            {bannerSub ? <Text style={styles.sub}>{bannerSub}</Text> : null}
          </View>
        )}
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={PRO_BANNER_ACCENT}
          size={isCompact ? 14 : 16}
        />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableDefault: {
    marginBottom: 16,
  },
  pressableCompact: {
    marginBottom: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    ...SmartCartShadow.cardSoft,
  },
  bannerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    ...SmartCartShadow.cardSoft,
  },
  bannerPressed: { opacity: 0.92 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, lineHeight: 20 },
  sub: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 3, lineHeight: 17 },
  compactMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    color: SmartCartColors.text,
    letterSpacing: -0.1,
  },
});
