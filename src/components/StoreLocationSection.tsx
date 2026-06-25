import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import type { StoreLocation } from '@/src/models/types';
import { isGeocodeSearchAvailable, searchGeocodeAddresses } from '@/src/services/geocode/geocodeClient';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatStoreLocationForCopy, inferStoreCountry } from '@/src/utils/storeLocationParser';
import { hasReceiptPrintedAddress } from '@/src/utils/storeLocationUtils';

type Props = {
  location: StoreLocation;
  editable?: boolean;
  onChange?: (partial: Partial<StoreLocation>) => void;
};

export function StoreLocationSection({ location, editable = false, onChange }: Props) {
  const [addressQuery, setAddressQuery] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<StoreLocation & { label: string }>
  >([]);
  const [addressFocused, setAddressFocused] = useState(false);
  const debouncedAddressQuery = useDebouncedValue(addressQuery, 400);
  const geocodeAvailable = isGeocodeSearchAvailable();

  const copyText = formatStoreLocationForCopy(location);
  const addressOnReceipt = hasReceiptPrintedAddress(location);
  const inferredCountry = inferStoreCountry(location);
  const countryOptions =
    inferredCountry != null ? ([inferredCountry] as const) : (['US', 'CA'] as const);
  const regionPlaceholder = inferredCountry === 'CA' ? 'Prov' : 'ST';
  const hasLocation = Boolean(
    addressOnReceipt || location.storeCity || location.storeRegion || location.storePostalCode
  );

  useEffect(() => {
    if (!editable || !geocodeAvailable) {
      setAddressSuggestions([]);
      return;
    }

    const query = debouncedAddressQuery.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    let cancelled = false;
    setAddressLoading(true);

    void searchGeocodeAddresses({ query, limit: 5 }).then((response) => {
      if (cancelled) return;
      setAddressSuggestions(response.results);
      setAddressLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedAddressQuery, editable, geocodeAvailable]);

  const handleCopy = async () => {
    if (!copyText) {
      Alert.alert('No address', 'Add a store address in Edit to copy it.');
      return;
    }
    await Clipboard.setStringAsync(copyText);
    if (Platform.OS === 'web') {
      window.alert('Address copied to clipboard.');
    } else {
      Alert.alert('Copied', 'Store address copied to clipboard.');
    }
  };

  const handleSelectAddress = (suggestion: StoreLocation & { label: string }) => {
    onChange?.({
      storeAddress: suggestion.storeAddress,
      storeCity: suggestion.storeCity,
      storeRegion: suggestion.storeRegion,
      storePostalCode: suggestion.storePostalCode,
      storeCountry: suggestion.storeCountry,
    });
    setAddressQuery('');
    setAddressSuggestions([]);
    setAddressFocused(false);
  };

  if (!editable && !addressOnReceipt) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Store location</Text>
        <Text style={styles.emptyHintText}>
          No store address printed on this receipt — add city or state in Edit for regional pricing.
        </Text>
      </View>
    );
  }

  if (!editable && !hasLocation) {
    return (
      <Pressable onPress={() => onChange?.({})} style={styles.emptyHint}>
        <Text style={styles.emptyHintText}>Add store address in Edit for regional price tracking</Text>
      </Pressable>
    );
  }

  const showAddressSuggestions =
    editable && addressFocused && (addressLoading || addressSuggestions.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Store location</Text>
        {copyText ? (
          <Pressable onPress={handleCopy} style={styles.copyButton} accessibilityLabel="Copy store address">
            <SymbolView
              name={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
              tintColor={SmartCartColors.primary}
              size={16}
            />
            <Text style={styles.copyText}>Copy</Text>
          </Pressable>
        ) : null}
      </View>

      {editable && !hasLocation ? (
        <Text style={styles.sectionHint}>
          Optional — search an address or enter manually for regional price tracking.
        </Text>
      ) : null}

      {location.storeRegion ? (
        <View style={styles.regionChip}>
          <Text style={styles.regionChipText}>{location.storeRegion}</Text>
        </View>
      ) : null}

      {editable ? (
        <>
          {geocodeAvailable ? (
            <View style={styles.addressSearchWrap}>
              <View style={styles.addressSearchRow}>
                <SymbolView
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                  tintColor={SmartCartColors.textMuted}
                  size={16}
                />
                <TextInput
                  style={styles.addressSearchInput}
                  value={addressQuery}
                  onChangeText={setAddressQuery}
                  placeholder="Search address"
                  placeholderTextColor={SmartCartColors.textMuted}
                  onFocus={() => setAddressFocused(true)}
                  onBlur={() => {
                    setTimeout(() => setAddressFocused(false), 150);
                  }}
                />
                {addressLoading ? (
                  <ActivityIndicator size="small" color={SmartCartColors.primary} />
                ) : null}
              </View>

              {showAddressSuggestions ? (
                <View style={styles.suggestionList}>
                  {addressSuggestions.map((suggestion, index) => (
                    <Pressable
                      key={`${suggestion.label}-${index}`}
                      style={styles.suggestionRow}
                      onPress={() => handleSelectAddress(suggestion)}>
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {suggestion.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            value={location.storeAddress ?? ''}
            onChangeText={(storeAddress) => onChange?.({ storeAddress })}
            placeholder="Street address"
            placeholderTextColor={SmartCartColors.textMuted}
            multiline
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              value={location.storeCity ?? ''}
              onChangeText={(storeCity) => onChange?.({ storeCity })}
              placeholder="City"
              placeholderTextColor={SmartCartColors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.regionInput]}
              value={location.storeRegion ?? ''}
              onChangeText={(storeRegion) => onChange?.({ storeRegion: storeRegion.toUpperCase() })}
              placeholder={regionPlaceholder}
              placeholderTextColor={SmartCartColors.textMuted}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          <TextInput
            style={styles.input}
            value={location.storePostalCode ?? ''}
            onChangeText={(storePostalCode) => onChange?.({ storePostalCode })}
            placeholder="ZIP / postal code"
            placeholderTextColor={SmartCartColors.textMuted}
            autoCapitalize="characters"
          />
          <View style={styles.countryRow}>
            {countryOptions.map((code) => {
              const active = (location.storeCountry ?? inferredCountry ?? '').toUpperCase() === code;
              return (
                <Pressable
                  key={code}
                  style={[styles.countryChip, active && styles.countryChipActive]}
                  onPress={() => onChange?.({ storeCountry: code })}>
                  <Text style={[styles.countryChipText, active && styles.countryChipTextActive]}>
                    {code}
                  </Text>
                </Pressable>
              );
            })}
            {inferredCountry != null ? (
              <Text style={styles.countryHint}>
                {inferredCountry === 'CA' ? 'Canada' : 'United States'}
              </Text>
            ) : (
              <Text style={styles.countryHint}>Select country</Text>
            )}
          </View>
        </>
      ) : copyText ? (
        <Text style={styles.addressText}>{copyText}</Text>
      ) : (
        <Text style={styles.emptyHintText}>No address detected — tap Edit to add one</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHint: {
    fontSize: 13,
    color: SmartCartColors.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  copyText: {
    fontSize: 14,
    color: SmartCartColors.primary,
    fontWeight: '600',
  },
  regionChip: {
    alignSelf: 'flex-start',
    backgroundColor: SmartCartColors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SmartCartRadius.pill,
    marginBottom: 8,
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: SmartCartColors.primary,
  },
  addressSearchWrap: {
    marginBottom: 8,
    position: 'relative',
    zIndex: 10,
  },
  addressSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SmartCartColors.background,
  },
  addressSearchInput: {
    flex: 1,
    fontSize: 15,
    color: SmartCartColors.text,
    padding: 0,
  },
  suggestionList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.card,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  suggestionText: {
    fontSize: 13,
    color: SmartCartColors.text,
    lineHeight: 18,
  },
  addressText: {
    fontSize: 14,
    color: SmartCartColors.text,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.background,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  regionInput: { width: 64, textAlign: 'center' },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  countryHint: { fontSize: 12, color: SmartCartColors.textMuted },
  countryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.background,
  },
  countryChipActive: {
    backgroundColor: SmartCartColors.primary,
    borderColor: SmartCartColors.primary,
  },
  countryChipText: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  countryChipTextActive: { color: '#fff' },
  emptyHint: { marginBottom: 12 },
  emptyHintText: {
    fontSize: 13,
    color: SmartCartColors.textMuted,
    lineHeight: 18,
  },
});
