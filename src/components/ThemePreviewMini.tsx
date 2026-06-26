import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { AppThemeTokens } from '@/src/theme/appThemes';
import { SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  preset: AppThemeTokens;
  size?: 'sm' | 'md';
  selected?: boolean;
};

/** Mini swatch with corner glow — used in settings picker and paywall. */
export function ThemePreviewMini({ preset, size = 'md', selected = false }: Props) {
  const isSm = size === 'sm';
  const glowOpacity = preset.isPremium ? 1 : 0.6;

  return (
    <View
      style={[
        styles.wrap,
        isSm ? styles.wrapSm : styles.wrapMd,
        { backgroundColor: preset.background, borderColor: selected ? preset.primary : preset.border },
        selected && { borderWidth: 2 },
      ]}>
      <LinearGradient
        colors={[preset.backgroundGradientTop, 'transparent']}
        style={styles.topWash}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[preset.accentGlow, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cornerGlow, { opacity: glowOpacity }]}
        pointerEvents="none"
      />
      <View style={[styles.surface, { backgroundColor: preset.surface, borderColor: preset.border }]}>
        <View style={[styles.accentBar, { backgroundColor: preset.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 6,
  },
  wrapSm: {
    width: 56,
    height: 40,
  },
  wrapMd: {
    width: '100%',
    height: '100%',
  },
  topWash: {
    ...StyleSheet.absoluteFill,
  },
  cornerGlow: {
    position: 'absolute',
    top: -16,
    left: -20,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  surface: {
    height: 14,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    paddingBottom: 3,
  },
  accentBar: {
    width: 18,
    height: 4,
    borderRadius: 2,
  },
});
