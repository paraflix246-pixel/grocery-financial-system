import { Pressable, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';

import { PRO_UPGRADE_HOOK } from '@/src/constants/proPricing';

import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type Props = {
  featureName?: string;
  hook?: string;
  requiredTier?: 'pro' | 'household';
  variant?: 'default' | 'compact';
  /** Single-line copy for compact variant (e.g. home screen). */
  message?: string;
};

export function ProUpgradeBanner({
  featureName,
  hook,
  requiredTier = 'pro',
  variant = 'default',
  message,
}: Props) {
  const router = useRouter();
  const planName = requiredTier === 'household' ? 'Household' : 'Pro';
  const isCompact = variant === 'compact';

  return (
    <Pressable
      style={({ pressed }) => [
        isCompact ? styles.bannerCompact : styles.banner,
        pressed && styles.bannerPressed,
      ]}
      onPress={() => router.push('/paywall' as never)}
      accessibilityRole="button"
      accessibilityLabel={isCompact ? message : `Unlock ${featureName} with ${planName}`}>
      <View style={isCompact ? styles.iconWrapCompact : styles.iconWrap}>
        <SymbolView
          name={{ ios: 'star.fill', android: 'star', web: 'star' }}
          tintColor={isCompact ? SmartCartColors.primaryDark : SmartCartColors.accentPurple}
          size={isCompact ? 14 : 20}
        />
      </View>
      {isCompact ? (
        <Text style={styles.compactMessage} numberOfLines={2}>
          {message}
        </Text>
      ) : (
        <View style={styles.textCol}>
          <Text style={styles.title}>Unlock {featureName} with {planName}</Text>
          <Text style={styles.sub}>{hook ?? PRO_UPGRADE_HOOK}</Text>
        </View>
      )}
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={SmartCartColors.primary}
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
    backgroundColor: SmartCartColors.bannerGreen,
    borderRadius: SmartCartRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
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
    backgroundColor: SmartCartColors.badgeGreen,
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
    color: SmartCartColors.primaryDark,
    lineHeight: 18,
  },
});
