import { StyleSheet, Text, View } from 'react-native';

type BarDatum = { value: number; label: string; frontColor?: string };

type Props = {
  data: BarDatum[];
  maxValue?: number;
  height?: number;
};

export function WeeklyBarChart({ data, maxValue, height = 160 }: Props) {
  const peak = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.bars}>
        {data.map((item) => {
          const barHeight = peak > 0 ? (item.value / peak) * (height - 28) : 0;
          return (
            <View key={item.label} style={styles.column}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, item.value > 0 ? 4 : 0),
                      backgroundColor: item.frontColor ?? '#2E7D32',
                    },
                  ]}
                />
              </View>
              <Text style={styles.label}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  column: { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, justifyContent: 'flex-end', width: '70%' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  label: { fontSize: 11, marginTop: 6, opacity: 0.7 },
});
