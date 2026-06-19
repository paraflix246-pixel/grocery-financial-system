import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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

export function DonutChart({ data, radius = 64, innerRadius = 42 }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = radius * 2;
  const cx = radius;
  const cy = radius;
  const strokeW = radius - innerRadius;

  let offset = 0;
  const segments = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const seg = { ...d, fraction, offset };
    offset += fraction;
    return seg;
  });

  const r = radius - strokeW / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={styles.row}>
      <View style={[styles.chartWrap, { width: size }]}>
        <Svg width={size} height={size}>
          {total === 0 ? (
            <Circle cx={cx} cy={cy} r={r} stroke={SmartCartColors.border} strokeWidth={strokeW} fill="none" />
          ) : (
            segments.map((seg) => (
              <Circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={r}
                stroke={seg.color}
                strokeWidth={strokeW}
                fill="none"
                strokeDasharray={`${seg.fraction * circumference} ${circumference}`}
                strokeDashoffset={-seg.offset * circumference}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            ))
          )}
        </Svg>
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
}

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
