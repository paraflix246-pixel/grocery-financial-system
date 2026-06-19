import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type InsightCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'warning' | 'success';
};

export function InsightCard({ title, value, subtitle, variant = 'default' }: InsightCardProps) {
  const borderColor =
    variant === 'warning'
      ? SmartCartColors.accentOrange
      : variant === 'success'
        ? SmartCartColors.primary
        : SmartCartColors.border;

  return (
    <View style={[styles.card, { borderColor }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    minWidth: 140,
    ...SmartCartShadow.cardSoft,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  value: { fontSize: 18, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 6, lineHeight: 17 },
});
