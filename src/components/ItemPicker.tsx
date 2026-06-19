import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import {
  getChipSuggestions,
  getQuickPriceButtons,
  loadItemPickerOptions,
  optionToSelection,
  searchItemPickerOptions,
  type ItemPickerOption,
  type ItemPickerSelection,
} from '@/src/services/itemPickerService';
import { getMatchExamples } from '@/src/services/itemNormalizationService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { getProductImageUrl } from '@/src/theme/productImages';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  selection: ItemPickerSelection | null;
  onSelect: (selection: ItemPickerSelection) => void;
  onClear?: () => void;
};

export function ItemPicker({ selection, onSelect, onClear }: Props) {
  const [query, setQuery] = useState(selection?.itemName ?? '');
  const [options, setOptions] = useState<ItemPickerOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void loadItemPickerOptions().then((loaded) => {
      if (active) {
        setOptions(loaded);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setQuery(selection?.itemName ?? '');
  }, [selection?.itemName]);

  const filtered = useMemo(() => searchItemPickerOptions(options, query), [options, query]);
  const chips = useMemo(() => getChipSuggestions(options), [options]);
  const matchExamples = useMemo(
    () => getMatchExamples(selection?.canonicalName, selection?.itemName),
    [selection?.canonicalName, selection?.itemName]
  );
  const showResults = query.trim().length > 0 && !selection;

  const handleSelectOption = (option: ItemPickerOption) => {
    const next = optionToSelection(option);
    setQuery(next.itemName);
    onSelect(next);
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (selection && text.trim() !== selection.itemName.trim()) {
      onClear?.();
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Item</Text>
      <TextInput
        style={styles.input}
        placeholder="Search milk, eggs, bread…"
        placeholderTextColor={SmartCartColors.textMuted}
        value={query}
        onChangeText={handleChangeText}
        autoCapitalize="words"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {chips.map((chip) => (
          <Pressable
            key={chip.canonicalName}
            style={[styles.chip, selection?.canonicalName === chip.canonicalName && styles.chipActive]}
            onPress={() => handleSelectOption(chip)}>
            <Text style={styles.chipEmoji}>{chip.emoji}</Text>
            <Text
              style={[
                styles.chipText,
                selection?.canonicalName === chip.canonicalName && styles.chipTextActive,
              ]}>
              {chip.canonicalName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selection?.lastSeen && (
        <View style={styles.lastSeenCard}>
          <Text style={styles.lastSeenText}>
            Last seen: {formatCurrency(selection.lastSeen.price)} at {selection.lastSeen.storeName} on{' '}
            {formatDisplayDate(selection.lastSeen.receiptDate)}
          </Text>
        </View>
      )}

      {selection && matchExamples.length > 0 && (
        <Text style={styles.matchHint}>
          We&apos;ll match similar names like &apos;{matchExamples.join("', '")}&apos;
        </Text>
      )}

      {showResults && (
        <View style={styles.results}>
          {loading ? (
            <Text style={styles.emptyResults}>Loading items…</Text>
          ) : filtered.length === 0 ? (
            <Text style={styles.emptyResults}>No matches — try Milk, Eggs, or Bread</Text>
          ) : (
            filtered.map((option) => (
              <Pressable key={`${option.source}-${option.canonicalName}`} style={styles.resultRow} onPress={() => handleSelectOption(option)}>
                <Image source={{ uri: getProductImageUrl(option.canonicalName) }} style={styles.resultImage} />
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
                  <Text style={styles.sourceBadgeText}>
                    {option.source === 'both' ? 'Yours' : option.source === 'history' ? 'Receipt' : 'Catalog'}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
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
  chipRow: { gap: 8, paddingBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: SmartCartColors.primary, backgroundColor: SmartCartColors.primaryMuted },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.primaryDark },
  chipTextActive: { color: SmartCartColors.primaryDark },
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
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  resultImage: { width: 36, height: 36, borderRadius: 8 },
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
