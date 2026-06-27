import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useAppTheme } from '@/src/theme/AppThemeProvider';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { getPromoBodyText, getPromoIconBorder, withAlpha } from '@/src/theme/themeColorUtils';

type Props = {
  message: string;
  emoji?: string;
  variant?: 'success' | 'warning';
};

export function StatusBanner({ message, emoji = '🌱', variant = 'success' }: Props) {
  const { theme } = useAppTheme();
  const isWarning = variant === 'warning';

  const successStyles = useMemo(
    () => ({
      banner: {
        backgroundColor: withAlpha(theme.primary, 0.07),
        borderColor: getPromoIconBorder(theme),
      },
      message: {
        color: getPromoBodyText(theme),
      },
    }),
    [theme]
  );

  return (
    <View style={[styles.banner, !isWarning && successStyles.banner, isWarning && styles.bannerWarning]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.message, !isWarning && successStyles.message, isWarning && styles.messageWarning]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerWarning: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  emoji: { fontSize: 28 },
  message: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  messageWarning: { color: SmartCartColors.accentOrange },
});
