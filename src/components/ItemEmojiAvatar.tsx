import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  emoji: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  style?: ViewStyle;
};

const SIZES = {
  sm: { outer: 32, font: 16 },
  md: { outer: 44, font: 22 },
  lg: { outer: 56, font: 28 },
} as const;

export function ItemEmojiAvatar({ emoji, size = 'md', active = false, style }: Props) {
  const dims = SIZES[size];
  return (
    <View
      style={[
        styles.circle,
        {
          width: dims.outer,
          height: dims.outer,
          borderRadius: dims.outer / 2,
        },
        active && styles.circleActive,
        style,
      ]}>
      <Text style={[styles.emoji, { fontSize: dims.font, lineHeight: dims.font * 1.15 }]}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SmartCartColors.badge,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  circleActive: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.primaryMuted,
  },
  emoji: {
    textAlign: 'center',
  },
});
