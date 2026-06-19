import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  message: string;
  emoji?: string;
  variant?: 'success' | 'warning';
};

export function StatusBanner({ message, emoji = '🌱', variant = 'success' }: Props) {
  const isWarning = variant === 'warning';
  return (
    <View style={[styles.banner, isWarning && styles.bannerWarning]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.message, isWarning && styles.messageWarning]}>{message}</Text>
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
    marginBottom: 16,
  },
  bannerWarning: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  emoji: { fontSize: 28 },
  message: { flex: 1, fontSize: 14, fontWeight: '600', color: SmartCartColors.primaryDark, lineHeight: 20 },
  messageWarning: { color: SmartCartColors.accentOrange },
});
