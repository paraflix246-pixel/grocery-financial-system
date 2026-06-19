import { StyleSheet, View } from 'react-native';

type BudgetBarProps = {
  spent: number;
  budget: number;
  threshold: number;
};

export function BudgetBar({ spent, budget, threshold }: BudgetBarProps) {
  const percent = budget > 0 ? Math.min(spent / budget, 1.2) : 0;
  const thresholdPercent = threshold * 100;
  const fillPercent = Math.min(percent * 100, 100);

  let color = '#4CAF50';
  if (percent >= 1) color = '#F44336';
  else if (percent >= threshold) color = '#FF9800';

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fillPercent}%`, backgroundColor: color }]} />
        <View style={[styles.threshold, { left: `${thresholdPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  track: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: { height: '100%', borderRadius: 6 },
  threshold: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#666',
  },
});
