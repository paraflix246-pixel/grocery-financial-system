import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { MockupCard } from '@/src/components/mockup/MockupUI';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import type {
  CheapestStoreRecommendation,
  FrequentPurchasedItem,
  PriceRecommendation,
} from '@/src/services/priceRecommendationService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

type InsightSection = 'frequent' | 'bestPrice' | 'recommendations';

type Props = {
  frequentItems: FrequentPurchasedItem[];
  cheapestDeals: CheapestStoreRecommendation[];
  personalRecommendations: PriceRecommendation[];
  communityRecommendations: PriceRecommendation[];
  hasExternalProviders: boolean;
  hasReceiptHistory: boolean;
  onItemPress: (itemName: string) => void;
  /** Which sections to render and in what order. Defaults to best price first. */
  sections?: InsightSection[];
  /** When true, best-price section shows sample starter pricing. */
  showingStarterSample?: boolean;
};

function sourceLabel(source: CheapestStoreRecommendation['cheapestSource']): string {
  if (source === 'receipt') return 'your receipts';
  if (source === 'community') return 'community';
  if (source === 'api') return 'external';
  return 'estimate';
}

export function PriceTrackerInsightsSections({
  frequentItems,
  cheapestDeals,
  personalRecommendations,
  communityRecommendations,
  hasExternalProviders,
  hasReceiptHistory,
  onItemPress,
  sections = ['bestPrice', 'frequent', 'recommendations'],
  showingStarterSample = false,
}: Props) {
  const showFrequent = frequentItems.length > 0;
  const showCheapest = cheapestDeals.length > 0;
  const showPersonal = personalRecommendations.length > 0;
  const showCommunity = communityRecommendations.length > 0;

  const frequentSection = (
    <View key="frequent" style={styles.section}>
      <Text style={styles.sectionTitle}>Your most purchased items</Text>
      <Text style={styles.sectionSubtitle}>From your receipt history</Text>
      {showFrequent ? (
        frequentItems.map((item) => (
          <Pressable
            key={item.canonicalName}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => onItemPress(item.canonicalName)}>
            <ItemEmojiAvatar
              emoji={getItemEmoji(item.canonicalName, item.name)}
              size="md"
              shape="square"
            />
            <View style={styles.rowBody}>
              <Text style={styles.name}>{item.canonicalName}</Text>
              <Text style={styles.meta}>
                {item.purchaseCount} purchase{item.purchaseCount === 1 ? '' : 's'} ·{' '}
                {formatCurrency(item.totalSpend)} total
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      ) : (
        <MockupCard>
          <Text style={styles.emptyBody}>
            {hasReceiptHistory
              ? 'Keep scanning receipts to build your purchase history.'
              : 'Scan receipts to see your top items'}
          </Text>
        </MockupCard>
      )}
    </View>
  );

  const bestPriceSection = (
    <View key="bestPrice" style={styles.section}>
      <Text style={styles.sectionTitle}>Best price near you</Text>
      <Text style={styles.sectionSubtitle}>
        {showingStarterSample
          ? 'Sample prices across nearby stores'
          : 'Cheapest store vs your last paid price'}
      </Text>
      {showingStarterSample && !showCheapest ? (
        <Text style={styles.starterHint}>Sample prices</Text>
      ) : null}
      {showCheapest ? (
        cheapestDeals.map((deal) => (
          <Pressable
            key={deal.itemName}
            style={({ pressed }) => [styles.dealCard, pressed && styles.rowPressed]}
            onPress={() => onItemPress(deal.itemName)}>
            <View style={styles.dealHeader}>
              <ItemEmojiAvatar
                emoji={getItemEmoji(deal.itemName, deal.itemName)}
                size="sm"
                shape="square"
              />
              <Text style={styles.dealItemName}>{deal.itemName}</Text>
            </View>
            <View style={styles.dealRow}>
              <StoreBrandAvatar store={deal.cheapestStore} variant="card" size={36} />
              <View style={styles.dealBody}>
                <Text style={styles.dealStore}>{deal.cheapestStore}</Text>
                <Text style={styles.dealSource}>via {sourceLabel(deal.cheapestSource)}</Text>
              </View>
              <Text style={styles.dealPrice}>{formatCurrency(deal.cheapestPrice)}</Text>
            </View>
            {deal.lastPaidPrice != null ? (
              <Text style={styles.dealCompare}>
                You last paid {formatCurrency(deal.lastPaidPrice)}
                {deal.lastPaidStore ? ` at ${deal.lastPaidStore}` : ''}
                {deal.savingsVsLastPaid != null && deal.savingsVsLastPaid > 0
                  ? ` · save ${formatCurrency(deal.savingsVsLastPaid)}`
                  : ''}
              </Text>
            ) : null}
          </Pressable>
        ))
      ) : (
        <MockupCard>
          <Text style={styles.emptyBody}>
            {showingStarterSample
              ? 'Loading sample prices for common groceries…'
              : hasReceiptHistory
                ? 'Price comparisons will appear once we have store data for your items.'
                : 'Scan receipts to compare prices across stores.'}
          </Text>
        </MockupCard>
      )}
    </View>
  );

  const recommendationsSection = (
    <View key="recommendations" style={styles.section}>
      <Text style={styles.sectionTitle}>Recommendations</Text>
      {showPersonal ? (
        <>
          <Text style={styles.sectionSubtitle}>Based on your shopping patterns</Text>
          {personalRecommendations.map((rec) => (
            <Pressable
              key={`${rec.itemName}-${rec.storeName}-${rec.date}`}
              style={({ pressed }) => [styles.recCard, pressed && styles.rowPressed]}
              onPress={() => onItemPress(rec.itemName)}>
              <Text style={styles.recMessage}>{rec.message}</Text>
              <Text style={styles.recMeta}>
                {formatDisplayDate(rec.date)}
                {rec.savingsVsLastPaid != null && rec.savingsVsLastPaid > 0
                  ? ` · save ${formatCurrency(rec.savingsVsLastPaid)}`
                  : ''}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}

      <Text style={[styles.sectionSubtitle, showPersonal && styles.sectionSubtitleSpaced]}>
        Community deals
      </Text>
      {showCommunity ? (
        communityRecommendations.map((rec) => (
          <Pressable
            key={`community-${rec.itemName}-${rec.storeName}`}
            style={({ pressed }) => [styles.recCard, pressed && styles.rowPressed]}
            onPress={() => onItemPress(rec.itemName)}>
            <Text style={styles.recMessage}>{rec.message}</Text>
            <Text style={styles.recMeta}>
              {formatDisplayDate(rec.date)}
              {rec.savingsVsLastPaid != null && rec.savingsVsLastPaid > 0
                ? ` · save ${formatCurrency(rec.savingsVsLastPaid)}`
                : ''}
            </Text>
          </Pressable>
        ))
      ) : (
        <MockupCard>
          <Text style={styles.emptyTitle}>More stores coming soon</Text>
          <Text style={styles.emptyBody}>
            {hasExternalProviders
              ? 'External price feeds are registered but no community deals matched your items yet.'
              : 'Crowdsourced prices from other shoppers and external APIs will appear here as more data is connected.'}
          </Text>
        </MockupCard>
      )}
    </View>
  );

  const sectionMap: Record<InsightSection, ReactNode> = {
    frequent: frequentSection,
    bestPrice: bestPriceSection,
    recommendations: recommendationsSection,
  };

  return <>{sections.map((section) => sectionMap[section])}</>;
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: SmartCartColors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: SmartCartColors.textSecondary,
    marginBottom: 12,
  },
  sectionSubtitleSpaced: { marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  rowPressed: { backgroundColor: SmartCartColors.badge },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  meta: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: SmartCartColors.textMuted, fontWeight: '300' },
  dealCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  dealHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dealItemName: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  dealRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dealBody: { flex: 1 },
  dealStore: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text },
  dealSource: { fontSize: 11, color: SmartCartColors.textMuted, marginTop: 2 },
  dealPrice: { fontSize: 16, fontWeight: '800', color: SmartCartColors.primaryMid },
  dealCompare: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 8 },
  recCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  recMessage: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text, lineHeight: 20 },
  recMeta: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 6 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: SmartCartColors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyBody: { fontSize: 13, color: SmartCartColors.textSecondary, textAlign: 'center', lineHeight: 19 },
  starterHint: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    marginBottom: 10,
    lineHeight: 17,
  },
});
