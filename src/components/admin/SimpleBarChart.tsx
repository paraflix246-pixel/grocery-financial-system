import { StyleSheet, Text, View } from 'react-native';

import { formatShortDate } from '@/src/components/admin/utils';
import { AdminColors, AdminRadius } from '@/src/theme/adminTheme';

type BarChartProps = {
  title: string;
  data: Array<{ date: string; count: number }>;
  color?: string;
  emptyLabel?: string;
};

export function SimpleBarChart({
  title,
  data,
  color = AdminColors.primary,
  emptyLabel = 'No data yet',
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {data.every((d) => d.count === 0) ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        <View style={styles.chartRow}>
          {data.map((point) => {
            const heightPct = Math.max(4, Math.round((point.count / max) * 100));
            return (
              <View key={point.date} style={styles.barCol}>
                <Text style={styles.barValue}>{point.count > 0 ? point.count : ''}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${heightPct}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {formatShortDate(point.date)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AdminColors.surface,
    borderRadius: AdminRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.text,
  },
  empty: {
    fontSize: 14,
    color: AdminColors.textMuted,
    paddingVertical: 24,
    textAlign: 'center',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 140,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: AdminColors.textMuted,
    height: 14,
  },
  barTrack: {
    width: '100%',
    maxWidth: 28,
    height: 96,
    backgroundColor: AdminColors.surfaceMuted,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    color: AdminColors.textMuted,
    textAlign: 'center',
  },
});
