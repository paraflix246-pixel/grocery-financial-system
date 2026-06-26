import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { HOME_COMPARISON_SLOT_MIN_HEIGHT, HOME_COMPARISON_SLOT_MIN_HEIGHT_COMPACT } from '@/src/components/HomeItemComparisonCard';
import { PRO_UPGRADE_HOOK } from '@/src/constants/proPricing';
import { SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { promptUpgrade } from '@/src/utils/promptUpgrade';

const GRADIENT = ['#0F1F14', '#14532D', '#166534'] as const;

type Props = {
  featureName: string;
  hook?: string;
  width?: number;
  compact?: boolean;
  flexWeight?: number;
};

export function ComparisonUpgradeSlotCard({
  featureName,
  hook,
  width,
  compact = false,
  flexWeight,
}: Props) {
  const router = useRouter();
  const planName = 'Pro';
  const subtitle = hook ?? PRO_UPGRADE_HOOK;

  const handlePress = () => {
    promptUpgrade({
      featureName,
      onUpgrade: () => router.push('/paywall' as never),
    });
  };

  const flexStyle =
    flexWeight != null
      ? { flex: flexWeight, minWidth: 0 }
      : width != null
        ? { width }
        : styles.pressableFlex;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pressable,
        compact ? styles.pressableCompact : null,
        flexStyle,
        pressed && styles.pressablePressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Unlock ${featureName} with ${planName}`}>
      <LinearGradient
        colors={[...GRADIENT]}
        style={[styles.card, compact && styles.cardCompact]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
          <SymbolView
            name={{ ios: 'star.fill', android: 'star', web: 'star' }}
            tintColor="#86EFAC"
            size={compact ? 18 : 22}
          />
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
          Unlock {featureName}
        </Text>
        <Text style={[styles.planLabel, compact && styles.planLabelCompact]}>with {planName}</Text>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={compact ? 3 : 4}>
          {subtitle}
        </Text>
        <View style={[styles.ctaRow, compact && styles.ctaRowCompact]}>
          <Text style={[styles.ctaText, compact && styles.ctaTextCompact]}>View plans</Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor="#86EFAC"
            size={compact ? 13 : 14}
          />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: HOME_COMPARISON_SLOT_MIN_HEIGHT,
    borderRadius: SmartCartRadius.lg,
    overflow: 'hidden',
    ...SmartCartShadow.card,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  pressableCompact: { minHeight: HOME_COMPARISON_SLOT_MIN_HEIGHT_COMPACT },
  pressableFlex: { flex: 1, minWidth: 0 },
  pressablePressed: { opacity: 0.94 },
  card: {
    flex: 1,
    minHeight: HOME_COMPARISON_SLOT_MIN_HEIGHT,
    padding: 16,
    borderRadius: SmartCartRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.35)',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardCompact: {
    minHeight: HOME_COMPARISON_SLOT_MIN_HEIGHT_COMPACT,
    padding: 9,
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapCompact: { width: 32, height: 32, borderRadius: 16, marginBottom: 2 },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  titleCompact: { fontSize: 13, lineHeight: 16, letterSpacing: -0.2, fontWeight: '800' },
  planLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#86EFAC',
    marginTop: -4,
  },
  planLabelCompact: { fontSize: 11, marginTop: -2, fontWeight: '700' },
  subtitle: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 4,
  },
  subtitleCompact: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  ctaRowCompact: { marginTop: 6 },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#86EFAC',
  },
  ctaTextCompact: { fontSize: 12, fontWeight: '800' },
});
