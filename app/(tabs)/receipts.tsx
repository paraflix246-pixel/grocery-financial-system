import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCallback, useMemo, useState } from 'react';

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';

import { AppHeader } from '@/src/components/AppHeader';

import { ReceiptRow } from '@/src/components/ReceiptRow';

import {
  MockupFilterChips,
  MockupScreenTitle,
  MockupSearchBar,
  MockupSectionLabel,
} from '@/src/components/mockup/MockupUI';

import { useFeatureGate } from '@/src/hooks/useFeatureGate';

import { shareReceiptExport } from '@/src/services/receiptExportService';
import { getScanLimitStatus } from '@/src/services/scanLimitService';

import { useFocusReload } from '@/src/hooks/useFocusReload';
import { useUndoDelete } from '@/src/hooks/useUndoDelete';
import { UndoSnackbar } from '@/src/components/UndoSnackbar';
import { WorkspaceScopeBar } from '@/src/components/WorkspaceScopeBar';
import { invalidateScopedReceiptsCache, loadReceiptsForScope } from '@/src/services/scopedReceiptService';
import { deleteReceipts, saveReceipt } from '@/src/services/storageService';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

import type { Receipt } from '@/src/models/types';

import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import { generateId } from '@/src/utils/id';
import { promptScanLimitReached } from '@/src/utils/promptScanLimit';

import { normalizeReceiptDate } from '@/src/utils/dateParser';

import { getReceiptDisplayTotal } from '@/src/utils/receiptTotals';
import { getTabBarHeight } from '@/src/utils/safeAreaLayout';

function groupReceiptsByMonth(receipts: Receipt[]): { label: string; items: Receipt[] }[] {
  const groups = new Map<string, Receipt[]>();
  const sorted = [...receipts].sort((a, b) =>
    normalizeReceiptDate(b.date).localeCompare(normalizeReceiptDate(a.date))
  );

  for (const receipt of sorted) {
    const date = new Date(`${normalizeReceiptDate(receipt.date)}T12:00:00`);
    const label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const bucket = groups.get(label) ?? [];
    bucket.push(receipt);
    groups.set(label, bucket);
  }

  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

function topStoresFromReceipts(receipts: Receipt[], limit = 4): string[] {
  const counts = new Map<string, number>();
  for (const receipt of receipts) {
    const store = receipt.storeName.trim();
    if (!store) continue;
    counts.set(store, (counts.get(store) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([store]) => store);
}

export default function ReceiptsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { unlocked: exportUnlocked, requestAccess: requestExportAccess } = useFeatureGate('export_advanced');
  const { store: storeFilterParam } = useLocalSearchParams<{ store?: string }>();
  const insets = useSafeAreaInsets();
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const { pending: undoPending, scheduleUndo, undo } = useUndoDelete();
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const isWorkspaceView = activeScope === 'workspace';

  const load = useCallback(async () => {
    try {
      const data = await loadReceiptsForScope(activeScope, currentWorkspaceId);
      setAllReceipts(data);
      if (storeFilterParam) {
        setSelectedStore(storeFilterParam);
      }
    } catch (error) {
      console.error('Receipts screen load failed:', error);
    }
  }, [storeFilterParam, activeScope, currentWorkspaceId]);

  const { blocking, reload } = useFocusReload(load);

  const topStores = useMemo(() => topStoresFromReceipts(allReceipts), [allReceipts]);
  const storeChips = useMemo(
    () => [{ id: 'all', label: t('common.all') }, ...topStores.map((store) => ({ id: store, label: store }))],
    [topStores, t]
  );

  const filteredReceipts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allReceipts.filter((receipt) => {
      if (selectedStore !== 'all' && receipt.storeName !== selectedStore) return false;
      if (!query) return true;
      return (
        receipt.storeName.toLowerCase().includes(query) ||
        receipt.date.includes(query) ||
        (receipt.items?.some((item) => item.name.toLowerCase().includes(query)) ?? false)
      );
    });
  }, [allReceipts, searchQuery, selectedStore]);

  const grouped = useMemo(() => groupReceiptsByMonth(filteredReceipts), [filteredReceipts]);

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function enterSelectMode(receiptId?: string) {
    setSelectMode(true);
    setSelectedIds(receiptId ? new Set([receiptId]) : new Set());
  }

  function toggleSelection(receiptId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(receiptId)) next.delete(receiptId);
      else next.add(receiptId);
      return next;
    });
  }

  function handleRowPress(receipt: Receipt) {
    if (selectMode) {
      toggleSelection(receipt.id);
      return;
    }
    router.push(
      isWorkspaceView
        ? { pathname: '/receipt/[id]', params: { id: receipt.id, scope: 'workspace' } }
        : `/receipt/${receipt.id}`
    );
  }

  function handleRowLongPress(receipt: Receipt) {
    if (selectMode) return;
    enterSelectMode(receipt.id);
  }

  async function restoreReceipt(snapshot: Receipt) {
    const scanLimit = await getScanLimitStatus();
    if (!scanLimit.allowed) {
      promptScanLimitReached(() => router.push('/paywall' as never));
      return;
    }
    await saveReceipt({
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
    invalidateScopedReceiptsCache(activeScope, currentWorkspaceId);
    await reload();
  }

  function confirmBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    confirmDestructiveAction({
      title: t('receipts.deleteTitle', { count }),
      message: t('receipts.deleteMessage', { count }),
      onConfirm: async () => {
        setDeleting(true);
        const snapshots = allReceipts.filter((receipt) => selectedIds.has(receipt.id));
        try {
          scheduleUndo(
            `${count} receipt${count === 1 ? '' : 's'}`,
            async () => {},
            async () => {
              for (const snapshot of snapshots) {
                await restoreReceipt(snapshot);
              }
            }
          );
          await deleteReceipts([...selectedIds]);
          invalidateScopedReceiptsCache(activeScope, currentWorkspaceId);
          exitSelectMode();
          await reload();
        } finally {
          setDeleting(false);
        }
      },
    });
  }

  if (blocking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <AppHeader />

        <WorkspaceScopeBar />

        <View style={styles.titleRow}>
          <MockupScreenTitle title={t('receipts.title')} subtitle={t('receipts.subtitle')} />
          {filteredReceipts.length > 0 && !isWorkspaceView ? (
            <Pressable
              style={styles.selectBtn}
              onPress={() => (selectMode ? exitSelectMode() : enterSelectMode())}>
              <Text style={styles.selectBtnText}>{selectMode ? t('common.cancel') : t('common.select')}</Text>
            </Pressable>
          ) : null}
        </View>

        <MockupSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('receipts.searchPlaceholder')}
        />

        <MockupFilterChips options={storeChips} selected={selectedStore} onSelect={setSelectedStore} />

        {!selectMode ? (
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={() => router.push('/receipt/manual')}>
              <SymbolView
                name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }}
                tintColor={SmartCartColors.primary}
                size={16}
              />
              <Text style={styles.actionBtnText}>{t('common.manual')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={() => {
                if (!exportUnlocked && !requestExportAccess()) return;
                void shareReceiptExport('json');
              }}>
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'upload', web: 'upload' }}
                tintColor={SmartCartColors.primary}
                size={16}
              />
              <Text style={styles.actionBtnText}>{t('receipts.exportJson')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={() => {
                if (!exportUnlocked && !requestExportAccess()) return;
                void shareReceiptExport('csv');
              }}>
              <SymbolView
                name={{ ios: 'tablecells', android: 'grid_on', web: 'grid_on' }}
                tintColor={SmartCartColors.primary}
                size={16}
              />
              <Text style={styles.actionBtnText}>{t('receipts.exportCsv')}</Text>
            </Pressable>
          </View>
        ) : null}

        {grouped.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('receipts.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('receipts.emptyBody')}</Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.monthSection}>
              <MockupSectionLabel>{group.label}</MockupSectionLabel>
              <View style={styles.listCard}>
                {group.items.map((item, i) => (
                  <ReceiptRow
                    key={item.id}
                    storeName={item.storeName}
                    date={item.date}
                    total={getReceiptDisplayTotal(item)}
                    isLast={i === group.items.length - 1}
                    selectMode={selectMode}
                    selected={selectedIds.has(item.id)}
                    onPress={() => handleRowPress(item)}
                    onLongPress={() => handleRowLongPress(item)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        <View style={{ height: selectMode ? 88 : 24 }} />
      </ScrollView>

      {selectMode && selectedIds.size > 0 ? (
        <View style={[styles.footer, { paddingBottom: 12 }]}>
          <Pressable
            style={[styles.deleteBulkBtn, deleting && styles.deleteBulkBtnDisabled]}
            disabled={deleting}
            onPress={confirmBulkDelete}>
            <Text style={styles.deleteBulkBtnText}>
              {deleting ? 'Deleting…' : `Delete (${selectedIds.size})`}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <UndoSnackbar pending={undoPending} onUndo={() => void undo()} bottomInset={getTabBarHeight(insets.bottom) + 16} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SmartCartColors.background },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SmartCartColors.background },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  selectBtn: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  selectBtnText: { fontSize: 14, fontWeight: '700', color: SmartCartColors.primaryDark },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  actionBtnPressed: { backgroundColor: SmartCartColors.badge },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: SmartCartColors.primaryDark },
  monthSection: { marginBottom: 8 },
  listCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  emptyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  emptyBody: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 8, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: SmartCartColors.background,
    borderTopWidth: 1,
    borderTopColor: SmartCartColors.border,
  },
  deleteBulkBtn: {
    backgroundColor: SmartCartColors.danger,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBulkBtnDisabled: { opacity: 0.6 },
  deleteBulkBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
