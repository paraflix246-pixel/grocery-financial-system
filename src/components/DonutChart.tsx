import { memo, useMemo } from 'react';
import { PieChart } from 'react-native-gifted-charts';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { CategoryAvatar } from '@/src/components/CategoryAvatar';
import { SmartCartColors } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

export type DonutDatum = { label: string; value: number; color: string };

type Props = {
  data: DonutDatum[];
  radius?: number;
  innerRadius?: number;
};

export const DonutChart = memo(function DonutChart({ data, radius = 64, innerRadius = 42 }: Props) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const size = radius * 2;
  const pieData = useMemo(
    () =>
      total > 0
        ? data.map((d) => ({ value: d.value, color: d.color }))
        : [{ value: 1, color: SmartCartColors.border }],
    [data, total]
  );

  return (
    <View style={[styles.row, { pointerEvents: 'box-none' }]}>
      <View style={[styles.chartWrap, { width: size, pointerEvents: 'none' }]}>
        <PieChart data={pieData} donut radius={radius} innerRadius={innerRadius} showText={false} />
      </View>
      <View style={styles.legend}>
        {data.map((d) => (
          <View key={d.label} style={styles.legendRow}>
            <CategoryAvatar category={d.label} size={28} />
            <View style={[styles.colorDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={styles.legendValue} numberOfLines={1}>
              {formatCurrency(d.value)}
            </Text>
          </View>
        ))}
        {total === 0 && <Text style={styles.empty}>No spending data</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chartWrap: { alignItems: 'center', justifyContent: 'center' },
  legend: { flex: 1, gap: 7 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  colorDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: SmartCartColors.text },
  legendValue: { minWidth: 58, textAlign: 'right', fontSize: 13, fontWeight: '700', color: SmartCartColors.text },
  empty: { marginTop: 2, fontSize: 12, color: SmartCartColors.textSecondary },
});
