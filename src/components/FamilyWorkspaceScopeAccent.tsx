import { StyleSheet, View } from 'react-native';

import { useFamilyWorkspaceScope } from '@/src/hooks/useFamilyWorkspaceScope';
import { FamilyWorkspaceTheme } from '@/src/theme/familyWorkspaceTheme';

type Props = {
  /** Thin top accent line — use at the top of tab screens when in Family scope. */
  variant?: 'strip' | 'tint' | 'both';
};

/** Subtle scoped accent so Family workspace mode is visually distinct from Personal. */
export function FamilyWorkspaceScopeAccent({ variant = 'strip' }: Props) {
  const isFamilyScope = useFamilyWorkspaceScope();

  if (!isFamilyScope) return null;

  const showStrip = variant === 'strip' || variant === 'both';
  const showTint = variant === 'tint' || variant === 'both';

  return (
    <View style={styles.wrap} pointerEvents="none">
      {showTint ? <View style={styles.tint} /> : null}
      {showStrip ? <View style={styles.strip} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -16,
    marginBottom: 8,
    overflow: 'hidden',
    borderRadius: 12,
  },
  tint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: FamilyWorkspaceTheme.headerTint,
    borderRadius: 12,
    minHeight: 48,
  },
  strip: {
    height: 3,
    backgroundColor: FamilyWorkspaceTheme.accentStrip,
    borderRadius: 2,
  },
});
