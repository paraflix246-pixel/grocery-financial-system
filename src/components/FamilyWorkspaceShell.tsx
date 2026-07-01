import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useFamilyWorkspaceScreenTheme } from '@/src/hooks/useFamilyWorkspaceScreenTheme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override scope detection — e.g. receipt save picker when workspace is selected. */
  active?: boolean;
};

/**
 * Scope-aware screen shell: warm cream background + honey wash when in Family workspace.
 * Personal scope passes through with the app theme background only.
 */
export function FamilyWorkspaceShell({ children, style, active }: Props) {
  const fw = useFamilyWorkspaceScreenTheme({ active });
  const glowOpacity = fw.isFamilyScope ? 0.85 : 0.55;

  return (
    <View style={[styles.root, fw.screen, style]}>
      {fw.isFamilyScope ? (
        <>
          <LinearGradient
            colors={[fw.backgroundGradientTop, 'transparent']}
            style={styles.topWash}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[fw.accentGlow, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cornerGlowLeft, { opacity: glowOpacity }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[fw.accentGlow, 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.cornerGlowRight, { opacity: glowOpacity }]}
            pointerEvents="none"
          />
        </>
      ) : null}
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
