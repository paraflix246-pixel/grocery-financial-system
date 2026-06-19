import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  message: string;
  emoji?: string;
};

export function StatusBanner({ message, emoji = '🌱' }: Props) {
  return (
    <View style={styles.banner}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.bannerGreen,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  emoji: { fontSize: 28 },
  message: { flex: 1, fontSize: 14, fontWeight: '600', color: SmartCartColors.primaryDark, lineHeight: 20 },
});
