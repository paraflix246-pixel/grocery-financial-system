import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import type { ComparisonResult } from '@/src/models/types';
import { getOverspendDrivers, getTopVarianceDriver } from '@/src/utils/comparisonSummaryText';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import {
  buildComparisonNarrative,
  formatPlannedTotalLabel,
  formatVarianceLabel,
} from '@/src/utils/comparisonSummaryText';
import { formatCurrency } from '@/src/utils/priceParser';

type PlanComparisonModalProps = {
  visible: boolean;
  onClose: () => void;
  comparison: ComparisonResult;
};

export function PlanComparisonModal({ visible, onClose, comparison }: PlanComparisonModalProps) {
  const isOver = comparison.variance >= 0;
  const varianceAmount = Math.abs(comparison.variance);
  const summaryLine = `${isOver ? 'Over' : 'Under'} plan by ${formatCurrency(varianceAmount)}`;
  const topDriver = getTopVarianceDriver(comparison);
  const insightLine = topDriver && isOver ? `${summaryLine} — ${topDriver}` : null;
  const overspendDrivers = isOver ? getOverspendDrivers(comparison.items) : [];
  const narrative = buildComparisonNarrative(comparison);
  const plannedLabel = formatPlannedTotalLabel(comparison.plannedTotal, comparison.items);
  const varianceRow = formatVarianceLabel(comparison.variance, comparison.plannedTotal);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Plan vs Actual</Text>

      <Text style={[styles.hero, isOver ? styles.heroOver : styles.heroUnder]}>{summaryLine}</Text>
      {insightLine ? <Text style={styles.insightLine}>{insightLine}</Text> : null}

      {isOver && overspendDrivers.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overspending</Text>
          {overspendDrivers.map((driver) => (
            <View key={`${driver.matchType}-${driver.name}`} style={styles.driverRow}>
              <Text style={styles.driverName} numberOfLines={2}>
                {driver.name}
              </Text>
              <Text style={styles.driverAmount}>+{formatCurrency(driver.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.narrativeCard}>
        <Text style={styles.narrative}>{narrative}</Text>
      </View>

      <View style={styles.totalsCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Receipt total</Text>
          <Text style={styles.value}>{formatCurrency(comparison.actualTotal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>List total</Text>
          <Text style={[styles.value, plannedLabel === 'Not estimated' && styles.mutedValue]}>
            {plannedLabel}
          </Text>
        </View>
        {varianceRow ? (
          <View style={styles.row}>
            <Text style={[styles.label, styles.bold]}>{varianceRow.label}</Text>
            <Text style={[styles.value, isOver ? styles.over : styles.under]}>{varianceRow.value}</Text>
          </View>
        ) : null}
      </View>
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  hero: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroOver: { color: SmartCartColors.danger },
  heroUnder: { color: SmartCartColors.success },
  insightLine: {
    fontSize: 14,
    lineHeight: 20,
    color: SmartCartColors.textSecondary,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
    padding: 12,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  driverName: {
    flex: 1,
    fontSize: 14,
    color: SmartCartColors.text,
    lineHeight: 19,
  },
  driverAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: SmartCartColors.danger,
  },
  narrativeCard: {
    backgroundColor: SmartCartColors.bannerGreen,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    marginBottom: 16,
  },
  narrative: {
    fontSize: 14,
    lineHeight: 20,
    color: SmartCartColors.text,
  },
  totalsCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SmartCartColors.border,
    paddingTop: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, color: SmartCartColors.textSecondary },
  bold: { fontWeight: '600', color: SmartCartColors.text },
  value: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text },
  mutedValue: { color: SmartCartColors.textSecondary, fontStyle: 'italic' },
  over: { color: SmartCartColors.danger },
  under: { color: SmartCartColors.success },
});
