import { useLocalSearchParams } from 'expo-router';

import { useCallback, useMemo, useState } from 'react';

import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { LineChart } from 'react-native-gifted-charts';

import { useFocusEffect } from 'expo-router';



import { Text } from '@/components/Themed';

import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';

import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';

import { MockupCard, MockupSectionLabel } from '@/src/components/mockup/MockupUI';

import { ScreenHeader } from '@/src/components/ScreenHeader';

import { getItemEmoji } from '@/src/data/commonGroceryItems';

import { getStorePricesForItem } from '@/src/services/priceComparisonService';
import { limitStoreRowsForTier, filterReceiptDatesByTier } from '@/src/services/tierLimits';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { getReceiptItemsWithStore } from '@/src/services/storageService';

import { resolveCanonicalName } from '@/src/services/itemNormalizationService';

import { mapToSpendingCategory, SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';

import { formatDisplayDate, normalizeReceiptDate } from '@/src/utils/dateParser';

import { formatCurrency } from '@/src/utils/priceParser';



export default function PriceTrackerItemScreen() {

  const { item: itemParam } = useLocalSearchParams<{ item: string }>();
  const { unlocked: multiStoreUnlocked } = useFeatureGate('community_pricing');

  const itemName = decodeURIComponent(itemParam ?? '');

  const [loading, setLoading] = useState(true);

  const [history, setHistory] = useState<{ date: string; price: number; store: string }[]>([]);

  const [storePrices, setStorePrices] = useState<{ store: string; price: number }[]>([]);



  const load = useCallback(async () => {

    if (!itemName) return;

    setLoading(true);

    try {

      const [receiptItems, prices] = await Promise.all([

        getReceiptItemsWithStore(),

        getStorePricesForItem(itemName),

      ]);



      const target = resolveCanonicalName(itemName) ?? itemName;
      const matching = filterReceiptDatesByTier(
        receiptItems.filter((row) => {
          const canonical = resolveCanonicalName(row.name);
          if (canonical && target && canonical.toLowerCase() === target.toLowerCase()) return true;
          return row.name.toLowerCase().includes(itemName.toLowerCase());
        })
      ).sort((a, b) => normalizeReceiptDate(a.receiptDate).localeCompare(normalizeReceiptDate(b.receiptDate)));

      setHistory(
        matching.map((row) => ({
          date: row.receiptDate,
          price: row.price,
          store: row.storeName,
        }))
      );

      setStorePrices(
        limitStoreRowsForTier(
          prices.map((p) => ({ store: p.store, price: p.price })),
          multiStoreUnlocked
        )
      );

    } finally {

      setLoading(false);

    }

  }, [itemName, multiStoreUnlocked]);



  useFocusEffect(useCallback(() => { load(); }, [load]));



  const emoji = getItemEmoji(itemName, itemName);

  const category = mapToSpendingCategory(itemName);

  const currentPrice = history.length > 0 ? history[history.length - 1].price : storePrices[0]?.price ?? 0;



  const chartData = useMemo(

    () =>

      history.map((point, index) => ({

        value: point.price,

        label: new Date(`${normalizeReceiptDate(point.date)}T12:00:00`).toLocaleDateString(undefined, {

          month: 'short',

          day: 'numeric',

        }),

        dataPointColor: SmartCartColors.primaryMid,

        dataPointRadius: history.length > 8 ? 0 : 4,

        index,

      })),

    [history]

  );



  return (

    <View style={styles.container}>

      <ScreenHeader title="Track & Alerts" />

      {loading ? (

        <View style={styles.center}>

          <ActivityIndicator size="large" color={SmartCartColors.primary} />

        </View>

      ) : (

        <ScrollView contentContainerStyle={styles.content}>

          <View style={styles.hero}>

            <ItemEmojiAvatar emoji={emoji} size="lg" shape="square" />

            <View style={styles.heroText}>

              <Text style={styles.itemName}>{itemName}</Text>

              <View style={styles.categoryTag}>

                <Text style={styles.categoryText}>{category}</Text>

              </View>

            </View>

          </View>



          <MockupCard>

            <Text style={styles.priceLabel}>Current Price</Text>

            <Text style={styles.currentPrice}>{formatCurrency(currentPrice)}</Text>

            {history.length > 0 ? (

              <Text style={styles.priceMeta}>

                Last seen at {history[history.length - 1].store} ·{' '}

                {formatDisplayDate(history[history.length - 1].date)}

              </Text>

            ) : null}

          </MockupCard>



          {chartData.length > 1 ? (

            <MockupCard>

              <MockupSectionLabel>Price History</MockupSectionLabel>

              <View style={{ pointerEvents: 'none' }}>

                <LineChart

                  data={chartData}

                  height={120}

                  spacing={chartData.length > 6 ? 36 : 48}

                  initialSpacing={12}

                  endSpacing={12}

                  color={SmartCartColors.primaryMid}

                  thickness={2.5}

                  hideRules

                  hideYAxisText

                  yAxisThickness={0}

                  xAxisThickness={0}

                  curved

                  areaChart

                  startFillColor={SmartCartColors.primaryLight}

                  endFillColor={SmartCartColors.background}

                  startOpacity={0.35}

                  endOpacity={0.02}

                  maxValue={Math.max(...chartData.map((d) => d.value), 1) * 1.1}

                />

              </View>

            </MockupCard>

          ) : null}



          <Text style={styles.sectionTitle}>Store Comparison</Text>

          {storePrices.length === 0 ? (

            <MockupCard>

              <Text style={styles.empty}>No store prices available yet.</Text>

            </MockupCard>

          ) : (

            storePrices.map((entry, index) => (

              <View

                key={entry.store}

                style={[styles.storeRow, index < storePrices.length - 1 && styles.storeRowBorder]}>

                <StoreBrandAvatar store={entry.store} variant="card" size={40} />

                <Text style={styles.storeName}>{entry.store}</Text>

                <Text style={[styles.storePrice, index === 0 && styles.storePriceBest]}>

                  {formatCurrency(entry.price)}

                </Text>

              </View>

            ))

          )}

        </ScrollView>

      )}

    </View>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: SmartCartColors.background },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  content: { padding: 16, paddingBottom: 40 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },

  heroText: { flex: 1 },

  itemName: { fontSize: 24, fontWeight: '800', color: SmartCartColors.text, letterSpacing: -0.5 },

  categoryTag: {

    alignSelf: 'flex-start',

    backgroundColor: SmartCartColors.badge,

    borderRadius: SmartCartRadius.pill,

    paddingHorizontal: 10,

    paddingVertical: 4,

    marginTop: 6,

  },

  categoryText: { fontSize: 12, fontWeight: '700', color: SmartCartColors.primaryDark },

  priceLabel: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary, textTransform: 'uppercase' },

  currentPrice: { fontSize: 32, fontWeight: '800', color: SmartCartColors.text, marginTop: 4 },

  priceMeta: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 6 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12, marginTop: 8 },

  storeRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

    backgroundColor: SmartCartColors.card,

    borderRadius: SmartCartRadius.lg,

    padding: 14,

    marginBottom: 8,

    borderWidth: 1,

    borderColor: SmartCartColors.border,

  },

  storeRowBorder: {},

  storeName: { flex: 1, fontSize: 15, fontWeight: '600', color: SmartCartColors.text },

  storePrice: { fontSize: 16, fontWeight: '800', color: SmartCartColors.text },

  storePriceBest: { color: SmartCartColors.primaryMid },

  empty: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center' },

});


