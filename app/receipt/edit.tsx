import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import { ReceiptScanWarnings } from '@/src/components/ReceiptScanWarnings';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import {
  findDuplicateReceipt,
  getReceiptById,
  saveReceipt,
  updateReceipt,
} from '@/src/services/storageService';
import { checkPriceAlertsAfterReceiptSave } from '@/src/services/priceAlertService';
import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { generateId } from '@/src/utils/id';
import { formatCurrency } from '@/src/utils/priceParser';
import { normalizeReceiptTotalsForSave } from '@/src/utils/receiptTotals';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';

async function confirmDuplicateSave(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return window.confirm(message);
  }
  return new Promise((resolve) => {
    Alert.alert('Possible duplicate receipt', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Save anyway', onPress: () => resolve(true) },
    ]);
  });
}

export default function EditReceiptScreen() {
  const router = useRouter();
  const { id: routeId } = useLocalSearchParams<{ id?: string }>();
  const {
    draft,
    imageUri,
    editingReceiptId,
    updateDraft,
    updateDraftItem,
    addDraftItem,
    removeDraftItem,
    loadReceiptForEdit,
    reset,
    ocrSource,
    ocrConfidence,
  } = useScanStore();
  const [saving, setSaving] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const receiptId = editingReceiptId ?? routeId ?? null;
  const isEditingSaved = Boolean(receiptId);
  const isManualEntry = !isEditingSaved && !imageUri;

  const warnings = useMemo(
    () =>
      draft
        ? validateParsedReceipt(draft, { ocrSource: ocrSource ?? undefined, ocrConfidence: ocrConfidence ?? undefined })
        : [],
    [draft, ocrConfidence, ocrSource]
  );

  const loadSavedReceipt = useCallback(async () => {
    if (!routeId || draft) return;
    setLoadingReceipt(true);
    try {
      const receipt = await getReceiptById(routeId);
      if (receipt) loadReceiptForEdit(receipt);
    } finally {
      setLoadingReceipt(false);
    }
  }, [routeId, draft, loadReceiptForEdit]);

  useEffect(() => {
    loadSavedReceipt();
  }, [loadSavedReceipt]);

  if (loadingReceipt) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={styles.center}>
        <Text>No receipt to edit.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    const totals = normalizeReceiptTotalsForSave(
      draft.items,
      draft.tax,
      draft.total,
      draft.subtotal
    );
    const duplicate = await findDuplicateReceipt(
      draft.storeName,
      draft.date,
      totals.total,
      receiptId ?? undefined
    );
    if (duplicate) {
      const proceed = await confirmDuplicateSave(
        `A receipt from ${duplicate.storeName} on ${formatDisplayDate(duplicate.date)} for ${formatCurrency(duplicate.total)} already exists. Save anyway?`
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const items = draft.items.map((item) => ({
        id: generateId(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      if (isEditingSaved && receiptId) {
        await updateReceipt(receiptId, {
          storeName: draft.storeName,
          date: draft.date,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          imageUri: imageUri ?? '',
          userCorrected: true,
          items,
        });
        await checkPriceAlertsAfterReceiptSave(items, draft.storeName);
        reset();
        router.replace(`/receipt/${receiptId}`);
        return;
      }

      const receipt = await saveReceipt({
        id: generateId(),
        storeName: draft.storeName,
        date: draft.date,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        imageUri: imageUri ?? '',
        userCorrected: true,
        items,
      });
      await checkPriceAlertsAfterReceiptSave(items, draft.storeName);
      reset();
      router.replace({ pathname: '/receipt/link', params: { receiptId: receipt.id } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>
          {isEditingSaved ? 'Edit Receipt' : isManualEntry ? 'Add Receipt' : 'Review Receipt'}
        </Text>
        <Pressable onPress={handleSave} disabled={saving}>
          <Text style={styles.saveLink}>{saving ? '...' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!isEditingSaved && <ReceiptScanWarnings warnings={warnings} />}

        <View style={styles.storeRow}>
          <StoreBrandAvatar store={draft.storeName} size={44} />
          <View style={styles.storeFields}>
            <TextInput
              style={styles.storeInput}
              value={draft.storeName}
              onChangeText={(v) => updateDraft({ storeName: v })}
            />
            <TextInput
              style={styles.dateInput}
              value={draft.date}
              onChangeText={(v) => updateDraft({ date: v })}
              placeholder="YYYY-MM-DD"
            />
            <Text style={styles.dateHint}>{formatDisplayDate(draft.date)}</Text>
          </View>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <TextInput
            style={styles.totalInput}
            value={String(draft.total)}
            onChangeText={(v) => updateDraft({ total: parseFloat(v) || 0 })}
            keyboardType="decimal-pad"
          />
          <Text style={styles.itemCount}>{draft.items.length} items</Text>
        </View>

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>ITEMS ({draft.items.length})</Text>
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
              value={item.price > 0 ? item.price.toFixed(2) : ''}
              onChangeText={(v) => updateDraftItem(index, { price: parseFloat(v) || 0 })}
              keyboardType="decimal-pad"
            />
            <Pressable onPress={() => removeDraftItem(index)} hitSlop={8}>
              <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} tintColor={SmartCartColors.textMuted} size={20} />
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addItemLink} onPress={addDraftItem}>
          <Text style={styles.addItemText}>+ Add Item</Text>
        </Pressable>

        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal</Text>
            <TextInput
              style={styles.breakdownInput}
              value={draft.subtotal != null ? String(draft.subtotal) : ''}
              onChangeText={(v) => updateDraft({ subtotal: parseFloat(v) || undefined })}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Tax</Text>
            <TextInput
              style={styles.breakdownInput}
              value={draft.tax != null ? String(draft.tax) : ''}
              onChangeText={(v) => updateDraft({ tax: parseFloat(v) || undefined })}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Receipt</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backLink: { color: SmartCartColors.primary, marginTop: 12, fontWeight: '600' },
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
  storeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  storeFields: { flex: 1 },
  storeInput: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text, padding: 0 },
  dateInput: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4, padding: 0 },
  dateHint: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 2 },
  totalSection: { marginBottom: 24 },
  totalLabel: { fontSize: 14, color: SmartCartColors.textSecondary },
  totalInput: { fontSize: 36, fontWeight: '800', color: SmartCartColors.text, padding: 0, marginTop: 4 },
  itemCount: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4 },
  itemsHeader: { marginBottom: 8 },
  itemsTitle: { fontSize: 13, fontWeight: '700', color: SmartCartColors.textSecondary, letterSpacing: 0.5 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmartCartColors.border,
  },
  itemName: { flex: 1, fontSize: 16, color: SmartCartColors.text, padding: 0 },
  itemPrice: { width: 72, fontSize: 16, fontWeight: '600', textAlign: 'right', padding: 0, color: SmartCartColors.text },
  addItemLink: { marginTop: 16, marginBottom: 20 },
  addItemText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
  breakdown: { marginBottom: 24, gap: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: 14, color: SmartCartColors.textSecondary },
  breakdownInput: { width: 100, fontSize: 14, fontWeight: '600', textAlign: 'right', padding: 0, color: SmartCartColors.text },
  saveBtn: {
    backgroundColor: SmartCartColors.primary,
    padding: 18,
    borderRadius: SmartCartRadius.md,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
