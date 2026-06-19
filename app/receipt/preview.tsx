import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';

export default function ReceiptPreviewScreen() {
  const router = useRouter();
  const { draft, updateDraftItem } = useScanStore();

  if (!draft) {
    return (
      <View style={styles.center}>
        <Text>No receipt draft. Go scan a receipt first.</Text>
      </View>
    );
  }

  const displayDate = draft.date
    ? formatDisplayDate(draft.date)
    : formatDisplayDate(new Date().toISOString().split('T')[0]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Review Receipt</Text>
        <Pressable onPress={() => router.push('/receipt/edit')}>
          <Text style={styles.saveLink}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.storeRow}>
          <StoreBrandAvatar store={draft.storeName} size={44} />
          <View>
            <Text style={styles.storeName}>{draft.storeName}</Text>
            <Text style={styles.storeDate}>{displayDate}</Text>
          </View>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(draft.total)}</Text>
          <Text style={styles.itemCount}>{draft.items.length} items</Text>
        </View>

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>ITEMS ({draft.items.length})</Text>
          <Pressable onPress={() => router.push('/receipt/edit')}>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        </View>

        {draft.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <TextInput
              style={styles.itemName}
              value={item.name}
              onChangeText={(v) => updateDraftItem(index, { name: v })}
            />
            <TextInput
              style={styles.itemPrice}
              value={String(item.price)}
              onChangeText={(v) => updateDraftItem(index, { price: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
            />
          </View>
        ))}

        <Pressable style={styles.addItemLink} onPress={() => router.push('/receipt/edit')}>
          <Text style={styles.addItemText}>+ Add Item</Text>
        </Pressable>

        <Pressable style={styles.saveBtn} onPress={() => router.push('/receipt/edit')}>
          <Text style={styles.saveBtnText}>Save Receipt</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  link: { color: SmartCartColors.primary, marginTop: 12, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', color: SmartCartColors.text },
  headerSpacer: { width: 72 },
  saveLink: { fontSize: 16, fontWeight: '700', color: SmartCartColors.primary },
  content: { padding: 16, paddingBottom: 40 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  storeName: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  storeDate: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 2 },
  totalSection: { marginBottom: 24 },
  totalLabel: { fontSize: 14, color: SmartCartColors.textSecondary, fontWeight: '500' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: SmartCartColors.text, marginTop: 4, letterSpacing: -0.5 },
  itemCount: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemsTitle: { fontSize: 13, fontWeight: '700', color: SmartCartColors.textSecondary, letterSpacing: 0.5 },
  editLink: { fontSize: 14, fontWeight: '600', color: SmartCartColors.primary },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  itemName: { flex: 1, fontSize: 16, color: SmartCartColors.text, padding: 0 },
  itemPrice: {
    width: 80,
    fontSize: 16,
    fontWeight: '600',
    color: SmartCartColors.text,
    textAlign: 'right',
    padding: 0,
  },
  addItemLink: { marginTop: 16, marginBottom: 24 },
  addItemText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
  saveBtn: {
    backgroundColor: SmartCartColors.primary,
    padding: 18,
    borderRadius: SmartCartRadius.md,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
