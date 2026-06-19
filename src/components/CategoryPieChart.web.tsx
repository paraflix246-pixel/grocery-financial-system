import { StyleSheet, Text, View } from 'react-native';

type PieDatum = { value: number; text: string; color: string };

type Props = {
  data: PieDatum[];
};

export function CategoryPieChart({ data }: Props) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View style={styles.container}>
      {data.map((item) => (
        <View key={item.text} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text style={styles.label}>{item.text}</Text>
          <Text style={styles.value}>
            {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  label: { flex: 1, fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600', opacity: 0.7 },
});
