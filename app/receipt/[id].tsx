import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ReceiptImageViewer } from '@/src/components/receipt/ReceiptImageViewer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Themed';
import { UndoSnackbar } from '@/src/components/UndoSnackbar';
import { useUndoDelete } from '@/src/hooks/useUndoDelete';
import { ComparisonSummary } from '@/src/components/ComparisonSummary';
import { FamilyWorkspaceShell } from '@/src/components/FamilyWorkspaceShell';
import { StatusBanner } from '@/src/components/StatusBanner';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { StoreLocationSection } from '@/src/components/StoreLocationSection';
import { LocationBackfillBanner } from '@/src/components/LocationBackfillBanner';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useFamilyWorkspaceScreenTheme } from '@/src/hooks/useFamilyWorkspaceScreenTheme';
import { shareSingleReceiptExport } from '@/src/services/receiptExportService';
import { formatUnitPriceLabel } from '@/src/utils/unitPriceParser';
import { getComparisonForReceipt } from '@/src/services/analyticsService';
import { deleteReceipt, getReceiptById, saveReceipt } from '@/src/services/storageService';
import { getWorkspaceReceiptById } from '@/src/services/workspaceReceiptService';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { useScanStore } from '@/src/store/useScanStore';
import { generateId } from '@/src/utils/id';
import { mapToSpendingCategory, CATEGORY_COLORS, SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import type { Comparison, ComparisonItem, ComparisonResult, Receipt, ReceiptItem } from '@/src/models/types';
import { formatCurrency } from '@/src/utils/priceParser';
import { computeReceiptTotals } from '@/src/utils/receiptTotals';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import { getItemEmoji } from '@/src/data/commonGroceryItems';

function ReceiptLineItem({ item }: { item: ReceiptItem }) {
  const category = mapToSpendingCategory(item.name);
  const color = CATEGORY_COLORS[category] ?? SmartCartColors.primary;
  const lineTotal = item.price * item.quantity;

  return (
    <View style={styles.lineItem}>
      <View style={[styles.catIcon, { backgroundColor: `${color}20` }]}>
        <Text style={styles.catEmoji}>{getItemEmoji(undefined, item.name)}</Text>
      </View>
      <View style={styles.lineInfo}>
        <Text style={styles.lineName}>{item.name}</Text>
        <Text style={styles.lineMeta}>
          {item.quantity > 1 ? `${item.quantity} × ` : ''}
          {formatCurrency(item.price)}
          {item.quantity > 1 ? '/ea' : ''}
          {formatUnitPriceLabel(item.unitPrice, item.unit)
            ? ` · ${formatUnitPriceLabel(item.unitPrice, item.unit)}`
            : ''}
        </Text>
      </View>
      <Text style={styles.lineTotal}>{formatCurrency(lineTotal)}</Text>
    </View>
  );
}

export default function ReceiptDetailScreen() {
  const { t } = useTranslation();
  const { id, scope: scopeParam, fromSave } = useLocalSearchParams<{
    id: string;
    scope?: string;
    fromSave?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const isWorkspaceReceipt = scopeParam === 'workspace';
  const showGoHome = fromSave === '1';
  const fw = useFamilyWorkspaceScreenTheme({ active: isWorkspaceReceipt });
  const { unlocked: exportUnlocked, requestAccess: requestExportAccess } = useFeatureGate('export_advanced');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { pending: undoPending, scheduleUndo, undo } = useUndoDelete();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    let r: Receipt | null = null;
    if (isWorkspaceReceipt && currentWorkspaceId) {
      r = await getWorkspaceReceiptById(currentWorkspaceId, id);
    } else {
      r = await getReceiptById(id);
    }
    const comp = isWorkspaceReceipt ? null : await getComparisonForReceipt(id);
    setReceipt(r);
    if (comp) {
      setComparison({
        plannedTotal: comp.plannedTotal,
        actualTotal: comp.actualTotal,
        variance: comp.variance,
        items: comp.items.map((item: ComparisonItem) => ({
          name: item.name,
          matchType: item.matchType,
          plannedPrice: item.plannedPrice,
          actualPrice: item.actualPrice,
          variance: item.variance,
        })),
      });
    } else {
      setComparison(null);
    }
    setLoading(false);
  }, [id, isWorkspaceReceipt, currentWorkspaceId]);

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
      <View style={styles.container}>
        <View style={styles.center}>
          <Text>{undoPending ? 'Receipt deleted' : 'Receipt not found'}</Text>
        </View>
        <UndoSnackbar pending={undoPending} onUndo={() => void undo()} bottomInset={insets.bottom + 24} />
      </View>
    );
  }

  async function restoreReceipt(snapshot: Receipt) {
    const restored = await saveReceipt({
      id: generateId(),
      storeName: snapshot.storeName,
      date: snapshot.date,
      subtotal: snapshot.subtotal,
      tax: snapshot.tax,
      total: snapshot.total,
      imageUri: snapshot.imageUri,
      linkedListId: snapshot.linkedListId,
      userCorrected: snapshot.userCorrected,
      storeAddress: snapshot.storeAddress,
      storeCity: snapshot.storeCity,
      storeRegion: snapshot.storeRegion,
      storePostalCode: snapshot.storePostalCode,
      storeCountry: snapshot.storeCountry,
      items: (snapshot.items ?? []).map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.unit,
      })),
    });
    setReceipt(restored);
    await load();
  }

  const handleDelete = () => {
    const snapshot = { ...receipt, items: [...(receipt.items ?? [])] };
    confirmDestructiveAction({
      title: 'Delete receipt?',
      message:
        'This removes the receipt and any linked plan-vs-actual comparison. Are you sure?',
      onConfirm: async () => {
        if (!id) return;
        scheduleUndo(
          snapshot.storeName,
          async () => router.replace('/(tabs)/receipts'),
          async () => restoreReceipt(snapshot)
        );
        setDeleting(true);
        try {
          await deleteReceipt(id);
          setReceipt(null);
          setComparison(null);
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const items = receipt.items ?? [];
  const { subtotal, tax, total } = computeReceiptTotals({
    items,
    subtotal: receipt.subtotal,
    tax: receipt.tax,
    total: receipt.total,
  });

  const goHome = () => router.replace('/(tabs)');

  return (
    <FamilyWorkspaceShell active={isWorkspaceReceipt}>
    <View style={[styles.container, isWorkspaceReceipt && fw.screen]}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
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
        {showGoHome ? (
          <View style={styles.postSaveSection}>
            <StatusBanner message={t('receipt.savedSuccess')} emoji="✓" />
            <Pressable
              style={[styles.homeBtn, isWorkspaceReceipt && { backgroundColor: fw.primary }]}
              onPress={goHome}
              accessibilityRole="button">
              <SymbolView
                name={{ ios: 'house.fill', android: 'home', web: 'home' }}
                tintColor="#fff"
                size={18}
              />
              <Text style={styles.homeBtnText}>{t('receipt.goToHome')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.storeHeader}>
          <View style={styles.storeLeft}>
            <StoreBrandAvatar store={receipt.storeName} size={48} />
            <View>
              <Text style={styles.storeName}>{receipt.storeName}</Text>
              <Text style={styles.date}>{formatDisplayDate(receipt.date)}</Text>
            </View>
          </View>
          {receipt.imageUri ? (
            <ReceiptImageViewer
              imageUri={receipt.imageUri}
              thumbnailStyle={styles.thumb}
              accentColor={isWorkspaceReceipt ? fw.primary : undefined}
            />
          ) : null}
        </View>

        <StoreLocationSection location={receipt} editable={false} />

        <LocationBackfillBanner
          location={receipt}
          onPress={() => {
            useScanStore.getState().loadReceiptForEdit(receipt);
            router.push({ pathname: '/receipt/edit', params: { id: receipt.id } });
          }}
        />

        <View style={styles.exportRow}>
          <Pressable
            style={styles.exportBtn}
            onPress={() => {
              if (!exportUnlocked && !requestExportAccess()) return;
              void shareSingleReceiptExport(receipt, 'json');
            }}>
            <Text style={styles.exportBtnText}>Export JSON</Text>
          </Pressable>
          <Pressable
            style={styles.exportBtn}
            onPress={() => {
              if (!exportUnlocked && !requestExportAccess()) return;
              void shareSingleReceiptExport(receipt, 'csv');
            }}>
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </Pressable>
        </View>

        <Text style={styles.bigTotal}>{formatCurrency(total)}</Text>

        {comparison ? (
          <View style={styles.comparisonWrap}>
            <ComparisonSummary comparison={comparison} />
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {tax > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Itemized</Text>
        {items.map((item) => (
          <ReceiptLineItem key={item.id} item={item} />
        ))}

        <Pressable
          style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={deleting}>
          <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor="#fff" size={18} />
          <Text style={styles.deleteBtnText}>{deleting ? 'Deleting...' : 'Delete Receipt'}</Text>
        </Pressable>
      </ScrollView>

      <UndoSnackbar pending={undoPending} onUndo={() => void undo()} bottomInset={insets.bottom + 24} />
    </View>
    </FamilyWorkspaceShell>
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
  headerSpacer: { width: 72 },
  editLink: { fontSize: 16, fontWeight: '600', color: SmartCartColors.primary },
  content: { padding: 16, paddingBottom: 40 },
  postSaveSection: { marginBottom: 20, gap: 12 },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.md,
    padding: 16,
  },
  homeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  storeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  storeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  storeName: { fontSize: 22, fontWeight: '800', color: SmartCartColors.text },
  date: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 2 },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  exportBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.card,
  },
  exportBtnText: { fontSize: 13, fontWeight: '700', color: SmartCartColors.primary },
  thumb: { width: 64, height: 80, borderRadius: SmartCartRadius.sm, backgroundColor: SmartCartColors.border },
  bigTotal: { fontSize: 36, fontWeight: '800', color: SmartCartColors.text, marginBottom: 20, letterSpacing: -0.5 },
  comparisonWrap: { marginBottom: 16 },
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.danger,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginTop: 24,
  },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
