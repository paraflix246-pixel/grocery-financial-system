import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Themed';
import { ReceiptDraftLinesList, formatReceiptLineCountSummary } from '@/src/components/ReceiptDraftLinesList';
import { ReceiptSaveReviewHint } from '@/src/components/ReceiptSaveReviewHint';
import {
  ReceiptStorageChoicePanel,
  useReceiptStorageValidation,
} from '@/src/components/receipt/ReceiptStorageChoicePanel';
import { ReceiptImageViewer } from '@/src/components/receipt/ReceiptImageViewer';
import { ReceiptScanWarnings } from '@/src/components/ReceiptScanWarnings';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { StoreLocationSection } from '@/src/components/StoreLocationSection';
import { LocationBackfillBanner } from '@/src/components/LocationBackfillBanner';
import { useAutoBackfillStoreRegion } from '@/src/hooks/useAutoBackfillStoreRegion';
import { useUnscannedRescanPrompt } from '@/src/hooks/useUnscannedRescanPrompt';
import { useScanStore } from '@/src/store/useScanStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import {
  resolveSavedReceiptStorageChoice,
  shouldAskReceiptStorageChoice,
  toPersistedReceiptImagePreference,
} from '@/src/services/privacyPreferencesService';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency } from '@/src/utils/priceParser';
import { formatTaxSummary } from '@/src/utils/taxRateUtils';
import { buildReceiptQualitySummary } from '@/src/utils/receiptQualityScore';
import { formatItemsSubtotalGapDetail } from '@/src/utils/receiptItemLabels';
import { validateParsedReceipt, getReceiptBannerWarnings, shouldShowInlineSubtotalGap } from '@/src/utils/receiptValidation';

export default function ReceiptPreviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    draft,
    updateDraft,
    updateDraftItem,
    ocrSource,
    ocrConfidence,
    parseMethod,
    locationNeedsReview,
    setLocationNeedsReview,
    receiptStorageChoice,
    rememberStorageChoice,
    setReceiptStorageChoice,
    setRememberStorageChoice,
    imageUri,
  } = useScanStore();
  const { settings, loadSettings, saveSettings } = useSettingsStore();
  const validateStorageChoice = useReceiptStorageValidation();
  const [storageChoiceError, setStorageChoiceError] = useState<string | null>(null);
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const hasWorkspaceMembership = useWorkspaceStore((s) => s.isCurrentMember && Boolean(s.currentWorkspaceId));
  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const isFamilySaveScope =
    hasWorkspaceMembership && hasActiveWorkspaceSub && activeScope === 'workspace';
  const reviewSaveLabel = isFamilySaveScope
    ? t('workspace.reviewAndSaveToFamily')
    : t('workspace.reviewAndSaveToPersonal');

  const handleLocationBackfill = useCallback(
    (partial: Parameters<typeof updateDraft>[0]) => {
      updateDraft(partial);
      if (partial.storeRegion?.trim()) {
        setLocationNeedsReview(false);
      }
    },
    [setLocationNeedsReview, updateDraft]
  );

  const { detecting, detectError, detectRegion } = useAutoBackfillStoreRegion(
    draft ?? undefined,
    handleLocationBackfill,
    Boolean(draft && !draft.storeRegion?.trim())
  );

  const renormLocationRef = useRef(false);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!settings || receiptStorageChoice) return;
    const saved = resolveSavedReceiptStorageChoice(settings);
    if (saved) setReceiptStorageChoice(saved);
  }, [settings, receiptStorageChoice, setReceiptStorageChoice]);

  const showStorageChoice = Boolean(imageUri) && (settings ? shouldAskReceiptStorageChoice(settings) : true);

  useEffect(() => {
    if (!draft || draft.storeRegion?.trim() || renormLocationRef.current) return;
    renormLocationRef.current = true;
    updateDraft({
      storeAddress: draft.storeAddress,
      storeCity: draft.storeCity,
      storePostalCode: draft.storePostalCode,
      storeCountry: draft.storeCountry,
      storeNumber: draft.storeNumber,
    });
  }, [draft, updateDraft]);

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
  const quality = useMemo(
    () => (draft ? buildReceiptQualitySummary(draft, warnings) : null),
    [draft, warnings]
  );
  const taxSummary = useMemo(() => (draft ? formatTaxSummary(draft) : null), [draft]);
  const itemsGapDetail = useMemo(
    () =>
      draft && shouldShowInlineSubtotalGap(warnings)
        ? formatItemsSubtotalGapDetail(draft)
        : null,
    [draft, warnings]
  );

  useUnscannedRescanPrompt(Boolean(draft?.items.length));

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

  const handleContinueToSave = async () => {
    if (showStorageChoice) {
      const error = validateStorageChoice(receiptStorageChoice);
      if (error) {
        setStorageChoiceError(error);
        if (Platform.OS === 'web') {
          window.alert(error);
        } else {
          Alert.alert(t('privacy.receiptStorage.title'), error);
        }
        return;
      }
      setStorageChoiceError(null);
      if (rememberStorageChoice && receiptStorageChoice && settings) {
        await saveSettings({
          rememberReceiptImageChoice: true,
          receiptImageStorage: toPersistedReceiptImagePreference(receiptStorageChoice),
        });
      }
    }
    goToEdit();
  };

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
        <ReceiptScanWarnings warnings={bannerWarnings} draft={draft} onEdit={goToEdit} />
        <View style={styles.storeRow}>
          <View style={styles.storeLeft}>
            <StoreBrandAvatar store={draft.storeName} size={44} />
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{draft.storeName}</Text>
              {draft.storeNumber ? (
                <Text style={styles.storeMeta}>Store #{draft.storeNumber}</Text>
              ) : null}
              <Pressable onPress={goToEdit}>
                <Text style={styles.storeEditHint}>Tap Edit to fix store or date</Text>
              </Pressable>
              <Text style={styles.storeDate}>{displayDate}</Text>
            </View>
          </View>
          {imageUri ? <ReceiptImageViewer imageUri={imageUri} /> : null}
        </View>

        <StoreLocationSection location={draft} editable={false} onChange={() => goToEdit()} />

        {(locationNeedsReview || !draft.storeRegion) && (
          <LocationBackfillBanner
            location={draft}
            onPress={goToEdit}
            onDetect={() => void detectRegion()}
            detecting={detecting}
            detectError={detectError}
          />
        )}

        {locationNeedsReview ? (
          <View style={styles.reviewBanner}>
            <Text style={styles.reviewBannerText}>
              Store location may need review — confirm address and state/province in Edit.
            </Text>
          </View>
        ) : null}

        {quality ? (
          <View style={styles.qualityCard}>
            <Text style={styles.qualityTitle}>{quality.headline}</Text>
            <Text style={styles.qualityDetails}>{quality.details.join(' · ')}</Text>
          </View>
        ) : null}

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(draft.total)}</Text>
          <Text style={styles.itemCount}>{formatReceiptLineCountSummary(draft.items)}</Text>
          {draft.subtotal != null && draft.tax != null && draft.tax > 0 && (
            <Text style={styles.breakdownHint}>
              Subtotal {formatCurrency(draft.subtotal)} · Tax {formatCurrency(draft.tax)}
            </Text>
          )}
          {taxSummary ? (
            <Text style={styles.taxHint}>{taxSummary}</Text>
          ) : null}
          {itemsGapDetail ? (
            <Text style={styles.gapHint}>{itemsGapDetail}</Text>
          ) : null}
        </View>

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>LINES ({draft.items.length})</Text>
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
          <ReceiptDraftLinesList
            items={draft.items}
            variant="preview"
            editable
            onNameChange={(index, name) => updateDraftItem(index, { name })}
            onPriceChange={(index, price) => updateDraftItem(index, { price })}
            onItemChange={(index, partial) => updateDraftItem(index, partial)}
          />
        )}

        <Pressable style={styles.addItemLink} onPress={goToEdit}>
          <Text style={styles.addItemText}>+ Add or remove items</Text>
        </Pressable>

        <ReceiptSaveReviewHint visible={bannerWarnings.length === 0} />

        {showStorageChoice ? (
          <>
            <ReceiptStorageChoicePanel
              choice={receiptStorageChoice}
              onChoiceChange={(choice) => {
                setReceiptStorageChoice(choice);
                setStorageChoiceError(null);
              }}
              rememberChoice={rememberStorageChoice}
              onRememberChange={setRememberStorageChoice}
            />
            {storageChoiceError ? (
              <Text style={styles.storageError}>{storageChoiceError}</Text>
            ) : null}
          </>
        ) : null}

        <Pressable style={styles.saveBtn} onPress={() => void handleContinueToSave()}>
          <Text style={styles.saveBtnText}>{reviewSaveLabel}</Text>
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
  refiningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    padding: 12,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.badgeGreen,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  refiningText: { flex: 1, fontSize: 13, color: SmartCartColors.text, fontWeight: '600' },
  reviewHint: { fontSize: 13, color: SmartCartColors.textSecondary, marginBottom: 12, lineHeight: 18 },
  storeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  storeLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  storeMeta: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 2 },
  storeEditHint: { fontSize: 12, color: SmartCartColors.primary, fontWeight: '600', marginTop: 2 },
  storeDate: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 2 },
  qualityCard: {
    marginBottom: 16,
    padding: 12,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  qualityTitle: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  qualityDetails: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 4, lineHeight: 18 },
  reviewBanner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.primaryMuted,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  reviewBannerText: { fontSize: 13, color: SmartCartColors.text, lineHeight: 18 },
  totalSection: { marginBottom: 24 },
  totalLabel: { fontSize: 14, color: SmartCartColors.textSecondary, fontWeight: '500' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: SmartCartColors.text, marginTop: 4, letterSpacing: -0.5 },
  itemCount: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 4 },
  breakdownHint: { fontSize: 13, color: SmartCartColors.textMuted, marginTop: 4 },
  taxHint: { fontSize: 13, color: SmartCartColors.textMuted, marginTop: 2 },
  gapHint: { fontSize: 13, color: SmartCartColors.accentOrange, marginTop: 4, lineHeight: 18 },
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
  addItemLink: { marginTop: 16, marginBottom: 24 },
  addItemText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.primary },
  saveBtn: {
    backgroundColor: SmartCartColors.primary,
    padding: 18,
    borderRadius: SmartCartRadius.md,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  storageError: {
    fontSize: 13,
    color: SmartCartColors.accentOrange,
    marginBottom: 12,
    lineHeight: 18,
  },
});
