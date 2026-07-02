import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  count: number;
  size?: 'sm' | 'md';
};

export function NotificationCountBadge({ count, size = 'sm' }: Props) {
  if (count <= 0) return null;

  const isMd = size === 'md';
  return (
    <View style={[styles.badge, isMd && styles.badgeMd]}>
      <Text style={[styles.badgeText, isMd && styles.badgeTextMd]}>
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: SmartCartColors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: SmartCartColors.background,
  },
  badgeMd: {
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  badgeTextMd: { fontSize: 11 },
});
