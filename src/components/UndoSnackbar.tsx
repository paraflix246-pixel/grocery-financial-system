import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import type { UndoDeleteState } from '@/src/hooks/useUndoDelete';

type Props = {
  pending: UndoDeleteState | null;
  onUndo: () => void;
  bottomInset?: number;
};

export function UndoSnackbar({ pending, onUndo, bottomInset = 16 }: Props) {
  if (!pending) return null;

  return (
    <View style={[styles.wrap, { bottom: bottomInset }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <Text style={styles.label} numberOfLines={1}>
          {pending.label} deleted
        </Text>
        <Pressable onPress={onUndo} hitSlop={8}>
          <Text style={styles.undo}>Undo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SmartCartColors.text,
    borderRadius: SmartCartRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  label: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  undo: {
    color: SmartCartColors.primaryLight,
    fontSize: 15,
    fontWeight: '800',
  },
});
