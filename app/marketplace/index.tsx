import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { fetchMarketplaceDeals } from '@/src/services/marketplace/marketplaceClient';
import type { MarketplaceDeal } from '@/src/services/marketplace/marketplaceTypes';
import { getEffectiveKrogerZipCode } from '@/src/utils/regionPreference';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

function sourceBadgeLabel(source: MarketplaceDeal['source']): string | null {
  if (source === 'kroger-api') return 'Live · Kroger';
  if (source === 'serpapi') return 'Live · Web';
  return null;
}

export default function MarketplaceScreen() {
  const [deals, setDeals] = useState<MarketplaceDeal[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const zipCode = await getEffectiveKrogerZipCode();
      const result = await fetchMarketplaceDeals({ zipCode, limit: 12 });
      setDeals(result.deals);
      setStatusMessage(result.statusMessage);
      if (result.error && result.deals.length === 0) {
        setError(result.error);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load deals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDeals();
    }, [loadDeals])
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Marketplace" />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
          <Text style={styles.loadingText}>Loading deals…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDeals(true)}
              tintColor={SmartCartColors.primary}
            />
          }>
          <Text style={styles.lead}>
            Grocery deals from live price APIs when configured, plus official store weekly-ad pages.
            Tap any card to open the real store link in your browser.
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <SymbolView
                name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
                tintColor={SmartCartColors.accentOrange}
                size={16}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {deals.map((deal) => {
            const badge = sourceBadgeLabel(deal.source);
            return (
              <Pressable
                key={deal.id}
                style={({ pressed }) => [styles.dealCard, pressed && styles.dealPressed]}
                onPress={() => WebBrowser.openBrowserAsync(deal.url)}
                accessibilityRole="link"
                accessibilityLabel={`${deal.title} at ${deal.store}`}>
                <Text style={styles.dealEmoji}>{deal.emoji}</Text>
                <View style={styles.dealInfo}>
                  <Text style={styles.dealTitle}>{deal.title}</Text>
                  <Text style={styles.dealStore}>
                    {deal.store} · {deal.category}
                  </Text>
                  {badge ? <Text style={styles.liveBadge}>{badge}</Text> : null}
                  {deal.source === 'store-weekly-ad' ? (
                    <Text style={styles.weeklyAdHint}>Official store weekly ad</Text>
                  ) : null}
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{deal.discountLabel}</Text>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.note}>
            <SymbolView
              name={{ ios: 'info.circle', android: 'info', web: 'info' }}
              tintColor={SmartCartColors.textMuted}
              size={16}
            />
            <Text style={styles.noteText}>{statusMessage}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: SmartCartColors.textSecondary },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 20 },
  errorBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  errorText: { flex: 1, fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 18 },
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  dealPressed: { borderColor: SmartCartColors.primary, backgroundColor: SmartCartColors.badge },
  dealEmoji: { fontSize: 32 },
  dealInfo: { flex: 1 },
  dealTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  dealStore: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  liveBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: SmartCartColors.primaryDark,
    marginTop: 4,
  },
  weeklyAdHint: { fontSize: 11, color: SmartCartColors.textMuted, marginTop: 4 },
  discountBadge: {
    backgroundColor: SmartCartColors.badge,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SmartCartRadius.pill,
  },
  discountText: { fontSize: 12, fontWeight: '800', color: SmartCartColors.primaryDark },
  note: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 12, color: SmartCartColors.textMuted, lineHeight: 17 },
});
