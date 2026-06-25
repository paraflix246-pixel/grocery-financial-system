import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import type { ComparisonResult } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import {
  buildComparisonNarrative,
  formatPlannedTotalLabel,
  formatVarianceLabel,
  groupComparisonItems,
  type ComparisonItemLike,
} from '@/src/utils/comparisonSummaryText';
import { formatCurrency } from '@/src/utils/priceParser';

type ComparisonSummaryProps = {
  comparison: ComparisonResult | {
    plannedTotal: number;
    actualTotal: number;
    variance: number;
    items?: ComparisonResult['items'];
  };
  compact?: boolean;
};

const SECTION_COPY = {
  missing: {
    title: 'On your list but not bought',
    empty: null,
    badge: 'Not purchased',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
  },
  extra: {
    title: 'Bought but not on list',
    empty: null,
    badge: 'Extra purchase',
    badgeBg: '#DBEAFE',
    badgeText: '#1D4ED8',
  },
  matched: {
    title: 'Matched items',
    empty: null,
    badge: 'Matched',
    badgeBg: SmartCartColors.badge,
    badgeText: SmartCartColors.primaryDark,
  },
} as const;

function ItemBadge({
  label,
  backgroundColor,
  color,
}: {
  label: string;
  backgroundColor: string;
  color: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function ComparisonItemRow({
  item,
  section,
}: {
  item: ComparisonItemLike;
  section: keyof typeof SECTION_COPY;
}) {
  const copy = SECTION_COPY[section];
  let priceLabel: string | null = null;

  if (section === 'extra') {
    const actual = item.actualPrice ?? 0;
    if (actual > 0) priceLabel = formatCurrency(actual);
  } else if (section === 'missing') {
    const planned = item.plannedPrice ?? 0;
    if (planned > 0) priceLabel = `Planned ${formatCurrency(planned)}`;
  } else if (section === 'matched') {
    const actual = item.actualPrice ?? 0;
    const planned = item.plannedPrice ?? 0;
    if (actual > 0) priceLabel = formatCurrency(actual);
    if (planned > 0 && item.variance != null && Math.abs(item.variance) >= 0.01) {
      const diff = item.variance;
      priceLabel = `${formatCurrency(actual)} (${diff >= 0 ? '+' : ''}${formatCurrency(diff)} vs plan)`;
    }
  }

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemMain}>
        <ItemBadge label={copy.badge} backgroundColor={copy.badgeBg} color={copy.badgeText} />
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
      {priceLabel ? <Text style={styles.itemPrice}>{priceLabel}</Text> : null}
    </View>
  );
}

function ComparisonSection({
  section,
  items,
}: {
  section: keyof typeof SECTION_COPY;
  items: ComparisonItemLike[];
}) {
  if (items.length === 0) return null;
  const copy = SECTION_COPY[section];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {copy.title} ({items.length})
      </Text>
      {items.map((item, i) => (
        <ComparisonItemRow key={`${section}-${item.name}-${i}`} item={item} section={section} />
      ))}
    </View>
  );
}

export function ComparisonSummary({ comparison, compact }: ComparisonSummaryProps) {
  const items = comparison.items ?? [];
  const grouped = groupComparisonItems(items);
  const narrative = buildComparisonNarrative(comparison);
  const plannedLabel = formatPlannedTotalLabel(comparison.plannedTotal, items);
  const varianceRow = formatVarianceLabel(comparison.variance, comparison.plannedTotal);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan vs actual</Text>

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
            <Text
              style={[
                styles.value,
                comparison.variance >= 0 ? styles.over : styles.under,
              ]}>
              {varianceRow.value}
            </Text>
          </View>
        ) : null}
      </View>

      {!compact && items.length > 0 ? (
        <View style={styles.sections}>
          <ComparisonSection section="missing" items={grouped.missing} />
          <ComparisonSection section="extra" items={grouped.extra} />
          <ComparisonSection section="matched" items={grouped.matched} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
    marginTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: SmartCartColors.text,
  },
  narrativeCard: {
    backgroundColor: SmartCartColors.bannerGreen,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    marginBottom: 12,
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
    marginBottom: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, color: SmartCartColors.textSecondary },
  bold: { fontWeight: '600', color: SmartCartColors.text },
  value: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text },
  mutedValue: { color: SmartCartColors.textSecondary, fontStyle: 'italic' },
  over: { color: SmartCartColors.danger },
  under: { color: SmartCartColors.success },
  sections: { marginTop: 8 },
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SmartCartColors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  itemMain: { flex: 1, gap: 6 },
  itemName: { fontSize: 14, color: SmartCartColors.text, lineHeight: 19 },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
    textAlign: 'right',
    maxWidth: '42%',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
