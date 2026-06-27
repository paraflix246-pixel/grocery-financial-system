import { StyleSheet, Text, View } from 'react-native';

import type { HealthStatus } from '@/src/services/admin/admin.server';
import { AdminColors } from '@/src/theme/adminTheme';

const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: AdminColors.success,
  degraded: AdminColors.warning,
  down: AdminColors.danger,
  unknown: AdminColors.textMuted,
};

const STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  unknown: 'Unknown',
};

export function HealthStatusDot({ status }: { status: HealthStatus }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
      <Text style={styles.label}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  label: { fontSize: 13, fontWeight: '700', color: AdminColors.text },
});
