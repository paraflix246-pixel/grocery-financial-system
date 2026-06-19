import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors } from '@/src/theme/smartCart';

type Props = {
  percent: number;
  size?: number;
  strokeWidth?: number;
};

export function BudgetRing({ percent, size = 72, strokeWidth = 7 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 1);
  const strokeDashoffset = circumference * (1 - clamped);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={SmartCartColors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={SmartCartColors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.labelWrap}>
        <Text style={styles.label}>{Math.round(clamped * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  labelWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '800', color: SmartCartColors.text },
});
