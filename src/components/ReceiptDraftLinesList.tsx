import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { ReceiptDraftItemRow } from '@/src/components/ReceiptDraftItemRow';
import { ReceiptLineEditSheet } from '@/src/components/ReceiptLineEditSheet';
import type { ParsedReceiptDraft } from '@/src/models/types';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { countLinesByKind } from '@/src/utils/receiptTotals';
import { resolveReceiptLineKind } from '@/src/utils/receiptMerchandiseFilter';

type Item = ParsedReceiptDraft['items'][number];

type Props = {
  items: Item[];
  variant?: 'preview' | 'edit';
  editable?: boolean;
  onNameChange: (index: number, name: string) => void;
  onPriceChange: (index: number, price: number) => void;
  onItemChange?: (index: number, partial: Partial<Item>) => void;
  onRemove?: (index: number) => void;
};

function groupItems(items: Item[]): {
  merchandise: Array<{ item: Item; index: number }>;
  fees: Array<{ item: Item; index: number }>;
  other: Array<{ item: Item; index: number }>;
} {
  const merchandise: Array<{ item: Item; index: number }> = [];
  const fees: Array<{ item: Item; index: number }> = [];
  const other: Array<{ item: Item; index: number }> = [];

  items.forEach((item, index) => {
    const kind = resolveReceiptLineKind(item);
    if (kind === 'fee') fees.push({ item, index });
    else if (kind === 'other') other.push({ item, index });
    else merchandise.push({ item, index });
  });

  return { merchandise, fees, other };
}

export function formatReceiptLineCountSummary(items: Item[]): string {
  const counts = countLinesByKind(items);
  const parts: string[] = [];
  if (counts.merchandise > 0) parts.push(`${counts.merchandise} product${counts.merchandise === 1 ? '' : 's'}`);
  if (counts.fee > 0) parts.push(`${counts.fee} fee${counts.fee === 1 ? '' : 's'}`);
  if (counts.other > 0) parts.push(`${counts.other} to review`);
  return parts.join(' · ');
}

function ReviewLinesSection({
  rows,
  variant,
  editable,
  onNameChange,
  onPriceChange,
  onEditLine,
}: {
  rows: Array<{ item: Item; index: number }>;
  variant: 'preview' | 'edit';
  editable: boolean;
  onNameChange: (index: number, name: string) => void;
  onPriceChange: (index: number, price: number) => void;
  onEditLine: (index: number) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <View style={styles.reviewSection}>
      <View style={styles.reviewHeader}>
        <SymbolView
          name={{ ios: 'doc.text.magnifyingglass', android: 'search', web: 'search' }}
          tintColor={SmartCartColors.primaryDark}
          size={18}
        />
        <View style={styles.reviewHeaderText}>
          <Text style={styles.reviewTitle}>Review these lines ({rows.length})</Text>
          <Text style={styles.reviewHint}>Promo or footer lines — tap Edit to fix a misread.</Text>
        </View>
      </View>
      {rows.map(({ item, index }) => (
        <ReceiptDraftItemRow
          key={index}
          item={item}
          variant={variant}
          editable={editable}
          showReviewActions
          onNameChange={(name) => onNameChange(index, name)}
          onPriceChange={(price) => onPriceChange(index, price)}
          onEditPress={() => onEditLine(index)}
        />
      ))}
    </View>
  );
}

export function ReceiptDraftLinesList({
  items,
  variant = 'preview',
  editable = true,
  onNameChange,
  onPriceChange,
  onItemChange,
  onRemove,
}: Props) {
  const { merchandise, fees, other } = groupItems(items);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const editingItem = editingIndex != null ? items[editingIndex] ?? null : null;

  return (
    <View>
      {merchandise.map(({ item, index }) => (
        <ReceiptDraftItemRow
          key={index}
          item={item}
          variant={variant}
          editable={editable}
          onNameChange={(name) => onNameChange(index, name)}
          onPriceChange={(price) => onPriceChange(index, price)}
          onRemove={onRemove ? () => onRemove(index) : undefined}
        />
      ))}

      {fees.length > 0 ? (
        <View style={styles.feesSection}>
          <Text style={styles.sectionLabel}>FEES & ADJUSTMENTS ({fees.length})</Text>
          {fees.map(({ item, index }) => (
            <ReceiptDraftItemRow
              key={index}
              item={item}
              variant={variant}
              editable={editable}
              onNameChange={(name) => onNameChange(index, name)}
              onPriceChange={(price) => onPriceChange(index, price)}
              onRemove={onRemove ? () => onRemove(index) : undefined}
            />
          ))}
        </View>
      ) : null}

      <ReviewLinesSection
        rows={other}
        variant={variant}
        editable={editable}
        onNameChange={onNameChange}
        onPriceChange={onPriceChange}
        onEditLine={setEditingIndex}
      />

      <ReceiptLineEditSheet
        visible={editingIndex != null}
        item={editingItem}
        onClose={() => setEditingIndex(null)}
        onSave={(partial) => {
          if (editingIndex == null) return;
          onItemChange?.(editingIndex, partial);
          if (partial.name != null) onNameChange(editingIndex, partial.name);
          if (partial.price != null) onPriceChange(editingIndex, partial.price);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feesSection: { marginTop: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: SmartCartColors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  reviewSection: {
    marginTop: 12,
    backgroundColor: SmartCartColors.badgeGreen,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.primaryMuted,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  reviewHeaderText: { flex: 1 },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SmartCartColors.primaryDark,
  },
  reviewHint: {
    fontSize: 12,
    color: SmartCartColors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
