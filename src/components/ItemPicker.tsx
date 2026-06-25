import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import { getEmojiForUserDefinedItem } from '@/src/utils/itemEmojiResolver';
import {
  getChipSuggestions,
  getQuickPriceButtons,
  GROCERY_CATALOG_LABEL,
  loadItemPickerOptions,
  optionToSelection,
  buildCustomItemSelection,
  searchItemPickerOptions,
  type ItemPickerOption,
  type ItemPickerSelection,
} from '@/src/services/itemPickerService';
import { getMatchExamples } from '@/src/services/itemNormalizationService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  selection: ItemPickerSelection | null;
  onSelect: (selection: ItemPickerSelection) => void;
  onClear?: () => void;
  onQueryChange?: (query: string) => void;
  /** Bump to reload catalog + custom items from storage. */
  refreshKey?: number;
  categoryHint?: string;
};

function sourceLabel(source: ItemPickerOption['source']): string {
  if (source === 'both') return 'Yours';
  if (source === 'history') return 'Receipt';
  if (source === 'custom') return 'Custom';
  return 'Common';
}

export function ItemPicker({
  selection,
  onSelect,
  onClear,
  onQueryChange,
  refreshKey = 0,
  categoryHint,
}: Props) {
  const [query, setQuery] = useState(selection?.itemName ?? '');
  const [options, setOptions] = useState<ItemPickerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadItemPickerOptions().then((loaded) => {
      if (active) {
        setOptions(loaded);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    setQuery(selection?.itemName ?? '');
  }, [selection?.itemName]);

  const filtered = useMemo(() => searchItemPickerOptions(options, query), [options, query]);
  const chips = useMemo(() => getChipSuggestions(options), [options]);
  const matchExamples = useMemo(
    () => getMatchExamples(selection?.canonicalName, selection?.itemName),
    [selection?.canonicalName, selection?.itemName]
  );
  const showTypeahead = !selection && query.trim().length > 0;

  const selectionEmoji =
    selection?.emoji ??
    (selection?.isUserDefined
      ? getEmojiForUserDefinedItem()
      : getItemEmoji(selection?.canonicalName, selection?.itemName));

  const handleSelectOption = (option: ItemPickerOption) => {
    const next = optionToSelection(option);
    setQuery(next.itemName);
    setInputFocused(false);
    onSelect(next);
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    onQueryChange?.(text);
    if (selection && text.trim() !== selection.itemName.trim()) {
      onClear?.();
    }
  };

  const handleUseCustomName = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const next = buildCustomItemSelection(trimmed, categoryHint);
    setQuery(next.itemName);
    setInputFocused(false);
    onSelect(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Item</Text>

      {selection && (
        <View style={styles.selectionPreview}>
          <ItemEmojiAvatar emoji={selectionEmoji} size="lg" active />
          <View style={styles.selectionBody}>
            <Text style={styles.selectionName}>{selection.itemName}</Text>
            {selection.isUserDefined ? (
              <Text style={styles.selectionHint}>
                Custom item · {selection.category ?? 'Other'} category
              </Text>
            ) : (
              <Text style={styles.selectionHint}>Tap search to change item</Text>
            )}
          </View>
          {onClear && (
            <Pressable style={styles.clearBtn} onPress={onClear} accessibilityLabel="Clear selection">
              <Text style={styles.clearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
      )}

      {!selection && (
        <>
          <Text style={styles.catalogTitle}>{GROCERY_CATALOG_LABEL}</Text>
          <Text style={styles.catalogSubtitle}>Start typing to search groceries</Text>

          <HorizontalScrollRow contentContainerStyle={styles.chipRow}>
            {chips.map((chip) => (
              <Pressable key={chip.canonicalName} style={styles.chip} onPress={() => handleSelectOption(chip)}>
                <ItemEmojiAvatar emoji={chip.emoji} size="sm" />
                <Text style={styles.chipText}>{chip.canonicalName}</Text>
              </Pressable>
            ))}
          </HorizontalScrollRow>

          <TextInput
            style={styles.input}
            placeholder="Search milk, eggs, bread…"
            placeholderTextColor={SmartCartColors.textMuted}
            value={query}
            onChangeText={handleChangeText}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            autoCapitalize="words"
          />
        </>
      )}

      {selection?.lastSeen && (
        <View style={styles.lastSeenCard}>
          <Text style={styles.lastSeenText}>
            Last seen: {formatCurrency(selection.lastSeen.price)} at {selection.lastSeen.storeName} on{' '}
            {formatDisplayDate(selection.lastSeen.receiptDate)}
          </Text>
        </View>
      )}

      {selection && !selection.isUserDefined && matchExamples.length > 0 && (
        <Text style={styles.matchHint}>
          We&apos;ll match similar names like &apos;{matchExamples.join("', '")}&apos;
        </Text>
      )}

      {showTypeahead && (
        <View style={styles.results}>
          {loading ? (
            <Text style={styles.emptyResults}>Loading items…</Text>
          ) : filtered.length === 0 ? (
            query.trim().length > 0 ? (
              <Pressable style={styles.customAddRow} onPress={handleUseCustomName}>
                <Text style={styles.customAddTitle}>Add &quot;{query.trim()}&quot; as new item</Text>
                <Text style={styles.customAddHint}>
                  Saves to your catalog for future searches
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.emptyResults}>No matches — try Milk, Eggs, or Bread</Text>
            )
          ) : (
            filtered.map((option) => (
              <Pressable
                key={`${option.source}-${option.canonicalName}`}
                style={styles.resultRow}
                onPress={() => handleSelectOption(option)}>
                <ItemEmojiAvatar emoji={option.emoji} size="md" />
                <View style={styles.resultBody}>
                  <Text style={styles.resultName}>{option.displayName}</Text>
                  <Text style={styles.resultMeta}>
                    {option.lastPrice != null
                      ? `Last ${formatCurrency(option.lastPrice)}${option.storeName ? ` · ${option.storeName}` : ''}`
                      : option.catalogPrice != null
                        ? `Typical ${formatCurrency(option.catalogPrice)}`
                        : option.category ?? 'Grocery'}
                  </Text>
                </View>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>{sourceLabel(option.source)}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      )}

      {!selection && !showTypeahead && inputFocused && query.trim().length === 0 && (
        <Text style={styles.searchHint}>Type an item name to see matches</Text>
      )}
    </View>
  );
}

type TargetPricePickerProps = {
  value: string;
  suggestedPrice?: number;
  onChange: (value: string) => void;
};

export function TargetPricePicker({ value, suggestedPrice, onChange }: TargetPricePickerProps) {
  const quickButtons = useMemo(() => getQuickPriceButtons(suggestedPrice), [suggestedPrice]);
  const activePrice = parseFloat(value.replace(/[^0-9.]/g, ''));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Target price</Text>
      <View style={styles.priceInputRow}>
        <Text style={styles.currencyPrefix}>$</Text>
        <TextInput
          style={[styles.input, styles.priceInput]}
          placeholder="4.00"
          placeholderTextColor={SmartCartColors.textMuted}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
        />
      </View>
      {suggestedPrice != null && (
        <Text style={styles.suggestedHint}>
          Suggested: {formatCurrency(suggestedPrice)} (10% below last known price)
        </Text>
      )}
      <View style={styles.quickRow}>
        {quickButtons.map((price) => {
          const active = Number.isFinite(activePrice) && Math.abs(activePrice - price) < 0.01;
          return (
            <Pressable
              key={price}
              style={[styles.quickBtn, active && styles.quickBtnActive]}
              onPress={() => onChange(price.toFixed(2))}>
              <Text style={[styles.quickBtnText, active && styles.quickBtnTextActive]}>
                {formatCurrency(price)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.background,
    marginBottom: 10,
  },
  selectionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.primaryMuted,
  },
  selectionBody: { flex: 1 },
  selectionName: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  selectionHint: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 2 },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SmartCartColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 14, color: SmartCartColors.textMuted, fontWeight: '700' },
  catalogTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  catalogSubtitle: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 2, marginBottom: 10 },
  chipRow: { gap: 8, paddingBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.primaryDark },
  searchHint: { fontSize: 12, color: SmartCartColors.textMuted, marginBottom: 8 },
  lastSeenCard: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.sm,
    padding: 10,
    marginBottom: 8,
  },
  lastSeenText: { fontSize: 13, color: SmartCartColors.primaryDark, fontWeight: '600' },
  matchHint: { fontSize: 12, color: SmartCartColors.textMuted, marginBottom: 8, lineHeight: 18 },
  results: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    overflow: 'hidden',
    marginBottom: 8,
  },
  emptyResults: { padding: 12, fontSize: 13, color: SmartCartColors.textMuted },
  customAddRow: {
    padding: 14,
    backgroundColor: SmartCartColors.badge,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  customAddTitle: { fontSize: 14, fontWeight: '700', color: SmartCartColors.primaryDark },
  customAddHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 4 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  resultBody: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  resultMeta: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  sourceBadge: {
    backgroundColor: SmartCartColors.background,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: '700', color: SmartCartColors.textMuted },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  currencyPrefix: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text, marginRight: 6 },
  priceInput: { flex: 1, marginBottom: 0 },
  suggestedHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginBottom: 8 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.background,
  },
  quickBtnActive: {
    borderColor: SmartCartColors.primary,
    backgroundColor: SmartCartColors.badge,
  },
  quickBtnText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  quickBtnTextActive: { color: SmartCartColors.primaryDark },
});
