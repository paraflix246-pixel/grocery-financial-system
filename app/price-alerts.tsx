import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { getPriceAlerts, type PriceAlert } from '@/src/services/analyticsService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

function PriceAlertRow({ alert }: { alert: PriceAlert }) {
  return (
    <View style={styles.alertRow}>
      <Text style={styles.alertEmoji}>{alert.emoji}</Text>
      <View style={styles.alertInfo}>
        <Text style={styles.alertName}>{alert.itemName}</Text>
        <Text style={styles.alertStore}>{alert.store}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.oldPrice}>{formatCurrency(alert.oldPrice)}</Text>
          <SymbolView
            name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
            tintColor={SmartCartColors.textMuted}
            size={12}
          />
          <Text style={styles.newPrice}>{formatCurrency(alert.newPrice)}</Text>
          <View style={styles.dropBadge}>
            <Text style={styles.dropText}>↓ {Math.round(alert.percentDrop)}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function PriceAlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAlerts(await getPriceAlerts(50));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={SmartCartColors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Price Alerts</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.lead}>
            Price drops detected from your receipt history — same item at the same store, compared to recent purchases.
          </Text>

          {alerts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptyBody}>
                Scan receipts for the same items at the same store over time. When prices drop by 3% or more, they appear here.
              </Text>
              <Pressable style={styles.ctaBtn} onPress={() => router.push('/(tabs)/scan')}>
                <Text style={styles.ctaText}>Scan a receipt</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.listCard}>
              {alerts.map((alert, index) => (
                <View key={`${alert.itemName}-${alert.store}-${index}`}>
                  {index > 0 && <View style={styles.divider} />}
                  <PriceAlertRow alert={alert} />
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.historyLink} onPress={() => router.push('/(tabs)/receipts')}>
            <SymbolView name={{ ios: 'doc.text', android: 'receipt_long', web: 'receipt_long' }} tintColor={SmartCartColors.primary} size={18} />
            <Text style={styles.historyLinkText}>View receipt history</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', color: SmartCartColors.text },
  headerSpacer: { width: 22 },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 16 },
  listCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 4,
    ...SmartCartShadow.card,
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 },
  alertEmoji: { fontSize: 28, marginTop: 2 },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  alertStore: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  oldPrice: { fontSize: 13, color: SmartCartColors.textMuted, textDecorationLine: 'line-through' },
  newPrice: { fontSize: 16, fontWeight: '800', color: SmartCartColors.primaryMid },
  dropBadge: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dropText: { fontSize: 11, fontWeight: '700', color: SmartCartColors.primaryMid },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: SmartCartColors.border, marginHorizontal: 12 },
  emptyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 24,
    alignItems: 'center',
    ...SmartCartShadow.card,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  emptyBody: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  ctaBtn: {
    marginTop: 20,
    backgroundColor: SmartCartColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
  },
  historyLinkText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
});
