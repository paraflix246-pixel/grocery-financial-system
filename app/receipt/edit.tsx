import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { saveReceipt } from '@/src/services/storageService';
import { useScanStore } from '@/src/store/useScanStore';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { generateId } from '@/src/utils/id';

export default function EditReceiptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, imageUri, updateDraft, updateDraftItem, addDraftItem, removeDraftItem } =
    useScanStore();
  const [saving, setSaving] = useState(false);

  if (!draft) {
    return (
      <View style={styles.center}>
        <Text>No draft to edit.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const receipt = await saveReceipt({
        id: generateId(),
        storeName: draft.storeName,
        date: draft.date,
        subtotal: draft.subtotal,
        tax: draft.tax,
        total: draft.total,
        imageUri: imageUri ?? '',
        userCorrected: true,
        items: draft.items.map((item) => ({
          id: generateId(),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      router.replace({ pathname: '/receipt/link', params: { receiptId: receipt.id } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={SmartCartColors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Review Receipt</Text>
        <Pressable onPress={handleSave} disabled={saving}>
          <Text style={styles.saveLink}>{saving ? '...' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
              value={String(item.price)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', color: SmartCartColors.text },
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
