import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import {
  loadStoreSearchData,
  searchStoreSuggestions,
  storeSearchSelectionToDraft,
  type StoreSearchResult,
} from '@/src/services/storeSearchService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSelectStore: (partial: ReturnType<typeof storeSearchSelectionToDraft>) => void;
  placeholder?: string;
};

export function StoreSearchField({
  value,
  onChangeText,
  onSelectStore,
  placeholder = 'Store name',
}: Props) {
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState<Awaited<ReturnType<typeof loadStoreSearchData>> | null>(
    null
  );
  const debouncedQuery = useDebouncedValue(value, 250);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setSearchData(await loadStoreSearchData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (focused && !searchData && !loading) {
      void loadData();
    }
  }, [focused, searchData, loading, loadData]);

  const suggestions = useMemo(() => {
    if (!searchData || !focused) return [];
    return searchStoreSuggestions({
      query: debouncedQuery,
      stores: searchData.stores,
      recentStores: searchData.recentStores,
    });
  }, [debouncedQuery, focused, searchData]);

  const showSuggestions = focused && (suggestions.length > 0 || loading);

  function handleSelect(result: StoreSearchResult) {
    onSelectStore(
      storeSearchSelectionToDraft({
        name: result.name,
        region: result.region,
        location: result.location,
      })
    );
    setFocused(false);
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={SmartCartColors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 150);
        }}
      />

      {showSuggestions ? (
        <View style={styles.dropdown}>
          {loading && suggestions.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={SmartCartColors.primary} />
              <Text style={styles.loadingText}>Loading stores…</Text>
            </View>
          ) : null}

          {suggestions.map((result) => (
            <Pressable
              key={result.key}
              style={styles.suggestionRow}
              onPress={() => handleSelect(result)}>
              <StoreBrandAvatar store={result.name} size={32} />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionName}>{result.name}</Text>
                {result.subtitle ? (
                  <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                    {result.subtitle}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.suggestionBadge}>
                {result.source === 'recent' ? 'Recent' : result.source === 'custom' ? 'Yours' : 'Catalog'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 20,
  },
  input: {
    fontSize: 20,
    fontWeight: '800',
    color: SmartCartColors.text,
    padding: 0,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    overflow: 'hidden',
    maxHeight: 260,
    zIndex: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 13,
    color: SmartCartColors.textMuted,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  suggestionText: {
    flex: 1,
    minWidth: 0,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    marginTop: 2,
  },
  suggestionBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: SmartCartColors.primary,
    textTransform: 'uppercase',
  },
});
