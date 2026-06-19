import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import type { PriceAlert } from '@/src/services/analyticsService';
import { getProductImageUrl } from '@/src/theme/productImages';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  alerts: PriceAlert[];
};

export function PriceAlertCard({ alerts }: Props) {
  const [index, setIndex] = useState(0);

  if (alerts.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.title}>Price Alerts</Text>
        <Text style={styles.emptyText}>Scan receipts to track price drops</Text>
      </View>
    );
  }

  const alert = alerts[index % alerts.length];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Price Alerts</Text>
      <View style={styles.alertBody}>
        <View style={styles.thumbWrap}>
          <Image
            source={{ uri: getProductImageUrl(alert.itemName) }}
            style={styles.thumb}
            contentFit="cover"
          />
        </View>
        <View style={styles.alertInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {alert.itemName}
          </Text>
          <Text style={styles.storeName}>{alert.store}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.oldPrice}>{formatCurrency(alert.oldPrice)}</Text>
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
              tintColor={SmartCartColors.textMuted}
              size={12}
            />
            <Text style={styles.newPrice}>{formatCurrency(alert.newPrice)}</Text>
            <View style={styles.dropBadge}>
              <SymbolView
                name={{ ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' }}
                tintColor={SmartCartColors.primaryMid}
                size={10}
              />
              <Text style={styles.dropText}>{Math.round(alert.percentDrop)}%</Text>
            </View>
          </View>
        </View>
      </View>
      {alerts.length > 1 && (
        <View style={styles.dots}>
          {alerts.slice(0, 4).map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)}>
              <View style={[styles.dot, i === index % alerts.length && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  emptyCard: { minHeight: 140, justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  emptyText: { fontSize: 12, color: SmartCartColors.textSecondary },
  alertBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  thumb: { width: '100%', height: '100%' },
  alertInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text, letterSpacing: -0.2 },
  storeName: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4, flexWrap: 'wrap' },
  oldPrice: {
    fontSize: 12,
    color: SmartCartColors.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  newPrice: { fontSize: 15, fontWeight: '800', color: SmartCartColors.primaryMid, letterSpacing: -0.3 },
  dropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dropText: { fontSize: 10, fontWeight: '700', color: SmartCartColors.primaryMid },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SmartCartColors.border,
  },
  dotActive: { backgroundColor: SmartCartColors.primaryMid, width: 16 },
});
