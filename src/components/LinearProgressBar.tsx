import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  percent: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
};

export function LinearProgressBar({
  percent,
  color = SmartCartColors.primary,
  height = 8,
  showLabel = false,
}: Props) {
  const clamped = Math.min(Math.max(percent, 0), 1);

  return (
    <View>
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            { width: `${clamped * 100}%`, backgroundColor: color, borderRadius: height / 2 },
          ]}
        />
      </View>
      {showLabel && <Text style={styles.label}>{Math.round(clamped * 100)}%</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: SmartCartColors.border, overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
  label: { fontSize: 12, fontWeight: '700', color: SmartCartColors.textSecondary, marginTop: 4, textAlign: 'right' },
});
