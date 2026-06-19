import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';

type InsightCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export function InsightCard({ title, value, subtitle }: InsightCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 140,
    flex: 1,
  },
  title: { fontSize: 12, opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, opacity: 0.5, marginTop: 4 },
});
