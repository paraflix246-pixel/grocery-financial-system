import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import type { StoreCartTotal } from '@/src/services/priceComparisonService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

const cartSavingsHero = require('../../assets/images/cart-savings-hero.png');

type Props = {
  stores: StoreCartTotal[];
  maxSavings: number;
  hasHistory?: boolean;
  hasCommunity?: boolean;
};

export function CheapestCartComparison({ stores, maxSavings, hasHistory, hasCommunity }: Props) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(1);
  const cardWidth = 124;
  const cardGap = 10;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / (cardWidth + cardGap));
      setActiveIndex(Math.min(Math.max(index, 0), stores.length - 1));
    },
    [stores.length]
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setLayoutWidth(e.nativeEvent.layout.width);
  }, []);

  if (stores.length === 0) return null;

  const segmentCount = stores.length;
  const segmentWidth = layoutWidth / segmentCount;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Cheapest Cart Comparison</Text>
        <Pressable onPress={() => router.push('/(tabs)/shopping-lists')}>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.savingsRow}>
          <View style={styles.savingsTextCol}>
            <Text style={styles.savingsLabel}>You can save up to</Text>
            <Text style={styles.savingsAmount}>{formatCurrency(maxSavings)}</Text>
            <View style={styles.savingsSubRow}>
              <Text style={styles.savingsSub}>
                {hasHistory && hasCommunity
                  ? 'your history + community data'
                  : hasCommunity
                    ? 'community price data'
                    : hasHistory
                      ? 'from your receipt history'
                      : 'for similar items'}
              </Text>
              <View style={styles.infoCircle}>
                <Text style={styles.infoIcon}>i</Text>
              </View>
            </View>
          </View>
          <View style={styles.savingsImageWrap}>
            <Image
              source={cartSavingsHero}
              style={styles.savingsImage}
              contentFit="contain"
              accessibilityLabel="Grocery basket"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={onLayout}
          contentContainerStyle={styles.storeScroll}>
          {stores.map((entry) => (
            <View
              key={entry.store}
              style={[styles.storeCard, entry.isCheapest && styles.storeCardCheapest]}>
              <View style={styles.storeCardTop}>
                <StoreBrandAvatar store={entry.store} variant="card" size={56} />
                <View style={styles.storeTextBlock}>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {entry.store}
                  </Text>
                  {entry.isCheapest && (
                    <View style={styles.cheapestPill}>
                      <Text style={styles.cheapestPillText}>Cheapest</Text>
                    </View>
                  )}
                  {entry.primarySource === 'community' && (
                    <View style={styles.communityPill}>
                      <Text style={styles.communityPillText}>Community</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.storePriceRow}>
                {entry.isCheapest && (
                  <View style={styles.cheapestDot} />
                )}
                <Text style={[styles.storePrice, entry.isCheapest && styles.storePriceCheapest]}>
                  {formatCurrency(entry.total)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.segmentTrack}>
          {stores.map((entry, i) => (
            <View
              key={entry.store}
              style={[
                styles.segment,
                { width: segmentWidth - 4 },
                i === activeIndex && styles.segmentActive,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    color: SmartCartColors.text,
    ...SmartCartTypography.title,
  },
  seeAll: { fontSize: 14, fontWeight: '600', color: SmartCartColors.primaryMid },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 6,
  },
  savingsTextCol: { flex: 1, alignItems: 'flex-start' },
  savingsLabel: { fontSize: 13, color: SmartCartColors.textSecondary, letterSpacing: 0.1 },
  savingsAmount: {
    fontSize: 30,
    color: SmartCartColors.primaryMid,
    marginVertical: 2,
    ...SmartCartTypography.display,
  },
  savingsSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savingsSub: { fontSize: 12, color: SmartCartColors.textSecondary },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SmartCartColors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: { fontSize: 10, fontWeight: '700', color: SmartCartColors.textMuted },
  savingsImageWrap: {
    width: 136,
    height: 120,
    flexShrink: 0,
    borderRadius: SmartCartRadius.md,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  savingsImage: {
    width: '100%',
    height: '100%',
  },
  storeScroll: { gap: 10, paddingTop: 1, paddingBottom: 4 },
  storeCard: {
    width: 124,
    minHeight: 136,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  storeCardCheapest: {
    borderColor: SmartCartColors.primaryMid,
    backgroundColor: '#F7FEFA',
    shadowColor: SmartCartColors.primaryMid,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  storeCardTop: {
    gap: 8,
  },
  storeTextBlock: {
    alignItems: 'flex-start',
    gap: 5,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    color: SmartCartColors.text,
    letterSpacing: -0.2,
  },
  cheapestPill: {
    backgroundColor: SmartCartColors.primaryMid,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    ...SmartCartShadow.pill,
  },
  cheapestPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.1 },
  communityPill: {
    backgroundColor: SmartCartColors.accentBlue,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  communityPillText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  storePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  cheapestDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SmartCartColors.primaryMid,
  },
  storePrice: {
    fontSize: 23,
    fontWeight: '800',
    color: SmartCartColors.text,
    letterSpacing: -0.7,
  },
  storePriceCheapest: { color: SmartCartColors.primaryMid },
  segmentTrack: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  segment: {
    height: 4,
    borderRadius: 2,
    backgroundColor: SmartCartColors.border,
  },
  segmentActive: {
    backgroundColor: SmartCartColors.primaryMid,
  },
});
