import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/src/theme/AppThemeProvider';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Theme-aware screen wrapper with a subtle top wash and corner accent glow.
 * One gradient stack per screen — minimal perf impact.
 */
export function PremiumScreenBackground({ children, style }: Props) {
  const { theme } = useAppTheme();
  const glowOpacity = theme.isPremium ? 1 : 0.55;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }, style]}>
      <LinearGradient
        colors={[theme.backgroundGradientTop, 'transparent']}
        style={styles.topWash}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[theme.accentGlow, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cornerGlowLeft, { opacity: glowOpacity }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[theme.accentGlow, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.cornerGlowRight, { opacity: glowOpacity }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  cornerGlowLeft: {
    position: 'absolute',
    top: -48,
    left: -72,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  cornerGlowRight: {
    position: 'absolute',
    top: -32,
    right: -64,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
});
