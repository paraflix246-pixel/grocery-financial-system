import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { getReceiptById } from '@/src/services/storageService';
import { useScanStore } from '@/src/store/useScanStore';
import { mapToSpendingCategory, CATEGORY_COLORS, SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import type { Receipt, ReceiptItem } from '@/src/models/types';
import { formatCurrency } from '@/src/utils/priceParser';
import { formatDisplayDate } from '@/src/utils/dateParser';

function categoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (/banana|apple|fruit|berry|produce|lettuce|tomato/.test(lower)) return '🍌';
  if (/milk|dairy|cheese|egg/.test(lower)) return '🥛';
  if (/bread|bakery/.test(lower)) return '🍞';
  if (/chicken|meat|beef/.test(lower)) return '🍗';
  if (/soda|juice|drink|beverage/.test(lower)) return '🥤';
  return '🛒';
}

function ReceiptLineItem({ item }: { item: ReceiptItem }) {
  const category = mapToSpendingCategory(item.name);
  const color = CATEGORY_COLORS[category] ?? SmartCartColors.primary;
  const lineTotal = item.price * item.quantity;

  return (
    <View style={styles.lineItem}>
      <View style={[styles.catIcon, { backgroundColor: `${color}20` }]}>
        <Text style={styles.catEmoji}>{categoryEmoji(item.name)}</Text>
      </View>
      <View style={styles.lineInfo}>
        <Text style={styles.lineName}>{item.name}</Text>
        <Text style={styles.lineMeta}>
          {item.quantity > 1 ? `${item.quantity} × ` : ''}
          {formatCurrency(item.price)}
          {item.quantity > 1 ? '/ea' : ''}
        </Text>
      </View>
      <Text style={styles.lineTotal}>{formatCurrency(lineTotal)}</Text>
    </View>
  );
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const r = await getReceiptById(id);
    setReceipt(r);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.center}>
        <Text>Receipt not found</Text>
      </View>
    );
  }

  const items = receipt.items ?? [];
  const subtotal = receipt.subtotal ?? items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = receipt.tax ?? Math.max(receipt.total - subtotal, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={SmartCartColors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Receipt Details</Text>
        <Pressable
          onPress={() => {
            useScanStore.getState().loadReceiptForEdit(receipt);
            router.push({ pathname: '/receipt/edit', params: { id: receipt.id } });
          }}>
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.storeHeader}>
          <View style={styles.storeLeft}>
            <StoreBrandAvatar store={receipt.storeName} size={48} />
            <View>
              <Text style={styles.storeName}>{receipt.storeName}</Text>
              <Text style={styles.date}>{formatDisplayDate(receipt.date)}</Text>
            </View>
          </View>
          {receipt.imageUri ? (
            <Image source={{ uri: receipt.imageUri }} style={styles.thumb} resizeMode="cover" />
          ) : null}
        </View>

        <Text style={styles.bigTotal}>{formatCurrency(receipt.total)}</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(receipt.total)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Itemized</Text>
        {items.map((item) => (
          <ReceiptLineItem key={item.id} item={item} />
        ))}
      </ScrollView>
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
  editLink: { fontSize: 16, fontWeight: '600', color: SmartCartColors.primary },
  content: { padding: 16, paddingBottom: 40 },
  storeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  storeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  storeName: { fontSize: 22, fontWeight: '800', color: SmartCartColors.text },
  date: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 2 },
  thumb: { width: 64, height: 80, borderRadius: SmartCartRadius.sm, backgroundColor: SmartCartColors.border },
  bigTotal: { fontSize: 36, fontWeight: '800', color: SmartCartColors.text, marginBottom: 20, letterSpacing: -0.5 },
  summaryCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 24,
    ...SmartCartShadow.card,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: SmartCartColors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: SmartCartColors.border, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: SmartCartColors.primary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text, marginBottom: 12 },
  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SmartCartColors.border },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 20 },
  lineInfo: { flex: 1 },
  lineName: { fontSize: 15, fontWeight: '600', color: SmartCartColors.text },
  lineMeta: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  lineTotal: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
});
