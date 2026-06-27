import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AdminColors, AdminRadius, AdminShadow } from '@/src/theme/adminTheme';

export function StatCard({
  label,
  value,
  accent,
  subtitle,
  style,
}: {
  label: string;
  value: string | number;
  accent?: string;
  subtitle?: string;
  style?: ViewStyle;
}) {
  const display =
    typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value;

  return (
    <View style={[styles.card, style]}>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{display}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    gap: 4,
    minWidth: 120,
    flexGrow: 1,
    ...AdminShadow.cardSoft,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: AdminColors.text,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
});
