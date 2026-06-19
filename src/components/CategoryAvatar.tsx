import { Text } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_COLORS, SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  category: string;
  size?: number;
};

const CATEGORY_EMOJIS: Record<string, string> = {
  Groceries: '🛍️',
  Household: '🏠',
  Snacks: '🍿',
  Beverages: '🥤',
};

export function CategoryAvatar({ category, size = 36 }: Props) {
  const color = CATEGORY_COLORS[category] ?? SmartCartColors.primary;
  const radius = size / 2;
  const emoji = CATEGORY_EMOJIS[category] ?? '🛒';

  return (
    <View
      accessibilityLabel={`${category} category`}
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: `${color}18`,
        },
      ]}>
      <Text style={[styles.emoji, { fontSize: size * 0.52, lineHeight: size * 0.7 }]}>{emoji}</Text>
      <View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: radius, borderColor: `${color}40`, pointerEvents: 'none' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  emoji: {
    textAlign: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1.5,
  },
});
