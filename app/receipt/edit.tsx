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
import { ReceiptDraftLinesList, formatReceiptLineCountSummary } from '@/src/components/ReceiptDraftLinesList';
import { DataScopePicker } from '@/src/components/DataScopePicker';
import { ReceiptScanWarnings } from '@/src/components/ReceiptScanWarnings';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { StoreLocationSection } from '@/src/components/StoreLocationSection';
import { StoreSearchField } from '@/src/components/StoreSearchField';
import { useUnscannedRescanPrompt } from '@/src/hooks/useUnscannedRescanPrompt';
import {
  findDuplicateReceipt,
  getReceiptById,
  saveReceipt,
  updateReceipt,
} from '@/src/services/storageService';
import { checkPriceAlertsAfterReceiptSave } from '@/src/services/priceAlertService';
import { savePriceRecords } from '@/src/services/communityPricingService';
import { getScanLimitStatus } from '@/src/services/scanLimitService';
import { invalidatePrimaryStoreCache } from '@/src/services/tierLimits';
import { useScanStore } from '@/src/store/useScanStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import type { DataScope } from '@/src/models/workspace';
import { saveReceiptToWorkspace } from '@/src/services/workspaceReceiptService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { generateId } from '@/src/utils/id';
import { formatCurrency } from '@/src/utils/priceParser';
import { normalizeReceiptTotalsForSave } from '@/src/utils/receiptTotals';
import { formatTaxSummary } from '@/src/utils/taxRateUtils';
import { formatItemsSubtotalGapDetail } from '@/src/utils/receiptItemLabels';
import { canonicalizeItemName } from '@/src/utils/itemCanonicalizer';
import { getReceiptBannerWarnings, shouldShowInlineSubtotalGap, validateParsedReceipt } from '@/src/utils/receiptValidation';
import { ScanLimitError, StoreLimitError } from '@/src/services/tierLimits';
import { promptScanLimitReached } from '@/src/utils/promptScanLimit';
import { promptStoreLimitReached } from '@/src/utils/promptPantryLimit';

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
    parseMethod,
  } = useScanStore();
  const [saving, setSaving] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [saveScope, setSaveScope] = useState<DataScope>('personal');
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const hasWorkspaceMembership = useWorkspaceStore((s) => s.isCurrentMember && Boolean(s.currentWorkspaceId));
  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const workspaceScopeAvailable = hasWorkspaceMembership && hasActiveWorkspaceSub;

  const receiptId = editingReceiptId ?? routeId ?? null;
  const isEditingSaved = Boolean(receiptId);
  const isManualEntry = !isEditingSaved && !imageUri;

  const warnings = useMemo(
    () =>
      draft
        ? validateParsedReceipt(draft, {
            ocrSource: ocrSource ?? undefined,
            ocrConfidence: ocrConfidence ?? undefined,
            parseMethod,
          })
        : [],
    [draft, ocrConfidence, ocrSource, parseMethod]
  );
  const bannerWarnings = useMemo(() => getReceiptBannerWarnings(warnings), [warnings]);

  useUnscannedRescanPrompt(!isEditingSaved && Boolean(draft?.items.length));

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
      receiptId ?? undefined,
      draft.storeRegion
    );
    if (duplicate) {
      const proceed = await confirmDuplicateSave(
        `A receipt from ${duplicate.storeName} on ${formatDisplayDate(duplicate.date)} for ${formatCurrency(duplicate.total)} already exists. Save anyway?`
      );
      if (!proceed) return;
    }

    if (!isEditingSaved) {
      const scanLimit = await getScanLimitStatus();
      if (!scanLimit.allowed) {
        promptScanLimitReached(() => router.push('/paywall' as never));
        return;
      }
    }

    setSaving(true);
    try {
      const items = draft.items.map((item) => {
        const isMerch = (item.lineKind ?? 'merchandise') === 'merchandise';
        return {
          id: generateId(),
          name: isMerch ? canonicalizeItemName(item.name) : item.name,
          price: item.price,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
          lineKind: item.lineKind,
        };
      });
      const merchandiseForAlerts = items.filter((item) => (item.lineKind ?? 'merchandise') === 'merchandise');

      const locationFields = {
        storeAddress: draft.storeAddress,
        storeCity: draft.storeCity,
        storeRegion: draft.storeRegion,
        storePostalCode: draft.storePostalCode,
        storeCountry: draft.storeCountry,
      };

      if (isEditingSaved && receiptId) {
        await updateReceipt(receiptId, {
          storeName: draft.storeName,
          date: draft.date,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          imageUri: imageUri ?? '',
          userCorrected: true,
          ...locationFields,
          items,
        });
        await checkPriceAlertsAfterReceiptSave(merchandiseForAlerts, draft.storeName);
        invalidatePrimaryStoreCache();
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
        ...locationFields,
        items,
      });
      if (saveScope === 'workspace') {
        await saveReceiptToWorkspace(
          {
            id: receipt.id,
            storeName: draft.storeName,
            date: draft.date,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            imageUri: imageUri ?? '',
            ...locationFields,
            items,
          },
          'workspace'
        );
      }
      await checkPriceAlertsAfterReceiptSave(items, draft.storeName);
      void savePriceRecords(
        items.filter((item) => (item.lineKind ?? 'merchandise') === 'merchandise'),
        {
          storeName: draft.storeName,
          city: draft.storeCity ?? undefined,
          state: draft.storeRegion ?? undefined,
          zip: draft.storePostalCode ?? undefined,
        },
        draft.date
      );
      invalidatePrimaryStoreCache();
      reset();
      router.replace({ pathname: '/receipt/link', params: { receiptId: receipt.id } });
    } catch (error) {
      if (error instanceof ScanLimitError) {
        promptScanLimitReached(() => router.push('/paywall' as never));
        return;
      }
      if (error instanceof StoreLimitError) {
        promptStoreLimitReached(() => router.push('/paywall' as never));
        return;
      }
      throw error;
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
        {!isEditingSaved && <ReceiptScanWarnings warnings={bannerWarnings} draft={draft} />}

        {!isEditingSaved ? (
          <DataScopePicker
            scope={saveScope}
            workspaceName={currentWorkspace?.name}
            workspaceAvailable={workspaceScopeAvailable}
            onChange={setSaveScope}
          />
        ) : null}

        <View style={styles.storeRow}>
          <StoreBrandAvatar store={draft.storeName} size={44} />
          <View style={styles.storeFields}>
            <StoreSearchField
              value={draft.storeName}
              onChangeText={(storeName) => updateDraft({ storeName })}
              onSelectStore={(partial) => updateDraft(partial)}
              placeholder="Search or enter store name"
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

        <StoreLocationSection
          location={draft}
          editable
          onChange={(partial) => updateDraft(partial)}
        />

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <TextInput
            style={styles.totalInput}
            value={String(draft.total)}
            onChangeText={(v) => updateDraft({ total: parseFloat(v) || 0 })}
            keyboardType="decimal-pad"
          />
          <Text style={styles.itemCount}>{formatReceiptLineCountSummary(draft.items)}</Text>
          {formatTaxSummary(draft) ? (
            <Text style={styles.taxHint}>{formatTaxSummary(draft)}</Text>
          ) : null}
          {draft && shouldShowInlineSubtotalGap(warnings) && formatItemsSubtotalGapDetail(draft) ? (
            <Text style={styles.gapHint}>{formatItemsSubtotalGapDetail(draft)}</Text>
          ) : null}
        </View>

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>LINES ({draft.items.length})</Text>
        </View>

        <ReceiptDraftLinesList
          items={draft.items}
          variant="edit"
          editable
          onNameChange={(index, name) => updateDraftItem(index, { name })}
          onPriceChange={(index, price) => updateDraftItem(index, { price })}
          onItemChange={(index, partial) => updateDraftItem(index, partial)}
          onRemove={(index) => removeDraftItem(index)}
        />

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
  taxHint: { fontSize: 13, color: SmartCartColors.textMuted, marginTop: 4 },
  gapHint: { fontSize: 13, color: SmartCartColors.accentOrange, marginTop: 4, lineHeight: 18 },
  itemsHeader: { marginBottom: 8 },
  itemsTitle: { fontSize: 13, fontWeight: '700', color: SmartCartColors.textSecondary, letterSpacing: 0.5 },
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
