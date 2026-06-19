import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import { ReceiptScanWarnings } from '@/src/components/ReceiptScanWarnings';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';
import { extractionLabel } from '@/src/utils/ocrLabels';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';

export default function ReceiptPreviewScreen() {
  const router = useRouter();
  const { draft, updateDraftItem, ocrSource, ocrConfidence, parseMethod, parseVerified } =
    useScanStore();

  const warnings = useMemo(
    () =>
      draft
        ? validateParsedReceipt(draft, { ocrSource: ocrSource ?? undefined, ocrConfidence: ocrConfidence ?? undefined })
        : [],
    [draft, ocrConfidence, ocrSource]
  );

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

  const goToEdit = () => router.push('/receipt/edit');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Review Receipt</Text>
        <Pressable onPress={goToEdit}>
          <Text style={styles.saveLink}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ReceiptScanWarnings warnings={warnings} onEdit={goToEdit} />
        {(parseMethod === 'openai' ||
          parseMethod === 'deepseek' ||
          (ocrSource && ocrSource !== 'empty')) && (
          <Text style={styles.ocrSource}>
            Extracted via {extractionLabel(ocrSource, parseMethod, parseVerified)}
          </Text>
        )}

        <View style={styles.storeRow}>
          <StoreBrandAvatar store={draft.storeName} size={44} />
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{draft.storeName}</Text>
            <Pressable onPress={goToEdit}>
              <Text style={styles.storeEditHint}>Tap Edit to fix store or date</Text>
            </Pressable>
            <Text style={styles.storeDate}>{displayDate}</Text>
          </View>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(draft.total)}</Text>
          <Text style={styles.itemCount}>{draft.items.length} items</Text>
          {draft.subtotal != null && draft.tax != null && (
            <Text style={styles.breakdownHint}>
              Subtotal {formatCurrency(draft.subtotal)} · Tax {formatCurrency(draft.tax)}
            </Text>
          )}
        </View>

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>ITEMS ({draft.items.length})</Text>
          <Pressable onPress={goToEdit}>
            <Text style={styles.editLink}>Full editor</Text>
          </Pressable>
        </View>

        {draft.items.length === 0 ? (
          <Pressable style={styles.emptyItems} onPress={goToEdit}>
            <SymbolView name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} tintColor={SmartCartColors.primary} size={22} />
            <Text style={styles.emptyItemsText}>No items detected — add them in the editor</Text>
          </Pressable>
        ) : (
          draft.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <TextInput
                style={styles.itemName}
                value={item.name}
                onChangeText={(v) => updateDraftItem(index, { name: v })}
                placeholder="Item name"
              />
              <TextInput
                style={styles.itemPrice}
                value={item.price > 0 ? item.price.toFixed(2) : ''}
                onChangeText={(v) => updateDraftItem(index, { price: parseFloat(v) || 0 })}
                keyboardType="decimal-pad"
              />
            </View>
          ))
        )}

        <Pressable style={styles.addItemLink} onPress={goToEdit}>
          <Text style={styles.addItemText}>+ Add or remove items</Text>
        </Pressable>

        <Pressable style={styles.saveBtn} onPress={goToEdit}>
          <Text style={styles.saveBtnText}>Review & Save</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  ocrSource: { fontSize: 12, color: SmartCartColors.textSecondary, marginBottom: 12 },
  storeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  storeEditHint: { fontSize: 12, color: SmartCartColors.primary, fontWeight: '600', marginTop: 2 },
  storeDate: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 2 },
  totalSection: { marginBottom: 24 },
  totalLabel: { fontSize: 14, color: SmartCartColors.textSecondary, fontWeight: '500' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: SmartCartColors.text, marginTop: 4, letterSpacing: -0.5 },
  itemCount: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4 },
  breakdownHint: { fontSize: 13, color: SmartCartColors.textMuted, marginTop: 4 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemsTitle: { fontSize: 13, fontWeight: '700', color: SmartCartColors.textSecondary, letterSpacing: 0.5 },
  editLink: { fontSize: 14, fontWeight: '600', color: SmartCartColors.primary },
  emptyItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    marginBottom: 8,
  },
  emptyItemsText: { flex: 1, fontSize: 14, color: SmartCartColors.textSecondary },
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
