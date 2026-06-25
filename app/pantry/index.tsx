import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import { CategoryPills } from '@/src/components/CategoryPills';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import {
  MockupCard,
  MockupPrimaryButton,
  MockupScreenTitle,
  MockupTabs,
} from '@/src/components/mockup/MockupUI';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { UndoSnackbar } from '@/src/components/UndoSnackbar';
import { GROCERY_CATEGORIES } from '@/src/data/groceryCatalog';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import { useUndoDelete } from '@/src/hooks/useUndoDelete';
import {
  addManualPantryItem,
  addPantryItemsToShoppingList,
  DEFAULT_LOW_STOCK_THRESHOLD,
  getPantryQuickAddItems,
  groupPantryItemsByCategory,
  inferDefaultShelfLifeDays,
  inferPantryCategory,
  loadPantryItems,
  PANTRY_CATEGORIES,
  PANTRY_FALLBACK_CATEGORY,
  removePantryItem,
  removePantryItems,
  savePantryItemAmount,
  SHELF_LIFE_OPTIONS,
  type PantryItemView,
} from '@/src/services/pantryService';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { useFocusReload } from '@/src/hooks/useFocusReload';
import { PantryLimitError } from '@/src/services/tierLimits';
import { promptPantryLimitReached } from '@/src/utils/promptPantryLimit';
import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import {
  formatDisplayDate,
  isValidISODate,
  normalizeReceiptDate,
  parseISODateInput,
  todayISO,
} from '@/src/utils/dateParser';
import {
  computeExpiresOnDate,
  computeShelfLifeDaysFromExpires,
  LOW_STOCK_THRESHOLD_OPTIONS,
  parseLowStockThresholdInput,
} from '@/src/utils/pantryStatus';

const UNIT_SUGGESTIONS = ['ea', 'lb', 'gal', 'dozen', 'bag', 'box'];

const dateInputProps =
  Platform.OS === 'web' ? ({ type: 'date' } as const) : ({} as const);

function resolveExpiresOn(addedDate: string, shelfLifeDays: number): string {
  if (shelfLifeDays <= 0) return '';
  return computeExpiresOnDate(addedDate, shelfLifeDays) ?? '';
}

function emptyMessage(activeTab: string): string {
  if (activeTab === 'running_low') {
    return 'Nothing running low. Items appear here when quantity drops to your low-stock threshold.';
  }
  if (activeTab === 'expiring') {
    return 'Nothing expiring soon. Items appear here when they are within 3 days of your expiry setting.';
  }
  return 'No pantry items yet. Add items manually or scan receipts to populate your pantry.';
}

function statusPillStyle(status: PantryItemView['status']) {
  switch (status) {
    case 'expiring_soon':
      return { bg: '#FEF3C7', text: '#D97706' };
    case 'running_low':
      return { bg: '#FEE2E2', text: SmartCartColors.danger };
    default:
      return { bg: SmartCartColors.badge, text: SmartCartColors.primaryDark };
  }
}

export default function PantryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<PantryItemView[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItemView | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemUnit, setItemUnit] = useState('');
  const [itemCategory, setItemCategory] = useState<string>(PANTRY_FALLBACK_CATEGORY);
  const [itemLowThreshold, setItemLowThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [itemLowThresholdInput, setItemLowThresholdInput] = useState(String(DEFAULT_LOW_STOCK_THRESHOLD));
  const [itemShelfLifeDays, setItemShelfLifeDays] = useState(0);
  const [itemAddedDate, setItemAddedDate] = useState(todayISO());
  const [itemExpiresOn, setItemExpiresOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const { pending: undoPending, scheduleUndo, undo } = useUndoDelete();

  const quickAddItems = useMemo(() => getPantryQuickAddItems(), []);

  const load = useCallback(async () => {
    setItems(await loadPantryItems());
  }, []);

  const { blocking } = useFocusReload(load);

  const statusFiltered = useMemo(() => {
    if (activeTab === 'running_low') return items.filter((i) => i.status === 'running_low');
    if (activeTab === 'expiring') return items.filter((i) => i.status === 'expiring_soon');
    return items;
  }, [activeTab, items]);

  const categoryPills = useMemo(() => {
    const present = new Set(statusFiltered.map((i) => i.category));
    return [
      { label: 'All', count: statusFiltered.length },
      ...PANTRY_CATEGORIES.filter((c) => c !== 'All' && present.has(c)).map((label) => ({
        label,
        count: statusFiltered.filter((i) => i.category === label).length,
      })),
    ];
  }, [statusFiltered]);

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return statusFiltered;
    return statusFiltered.filter((i) => i.category === selectedCategory);
  }, [statusFiltered, selectedCategory]);

  const groupedByCategory = useMemo(() => {
    if (selectedCategory !== 'All' || activeTab !== 'all') return null;
    return groupPantryItemsByCategory(filtered);
  }, [activeTab, filtered, selectedCategory]);

  const stats = useMemo(
    () => ({
      total: items.length,
      runningLow: items.filter((i) => i.status === 'running_low').length,
      expiringSoon: items.filter((i) => i.status === 'expiring_soon').length,
    }),
    [items]
  );

  const isAddModalOpen = showModal && !editingItem;

  const canSavePantryItem = useMemo(() => {
    const quantity = parseFloat(itemQty);
    if (!Number.isFinite(quantity) || quantity <= 0) return false;
    if (!itemName.trim()) return false;

    const lowThreshold = parseLowStockThresholdInput(itemLowThresholdInput);
    if (lowThreshold == null) return false;

    const addedDate = normalizeReceiptDate(itemAddedDate);
    if (!isValidISODate(addedDate)) return false;

    if (itemExpiresOn.trim()) {
      const expiresOn = parseISODateInput(itemExpiresOn);
      if (!expiresOn) return false;
      const derived = computeShelfLifeDaysFromExpires(addedDate, expiresOn);
      if (derived == null) return false;
    }

    return true;
  }, [itemAddedDate, itemExpiresOn, itemLowThresholdInput, itemName, itemQty]);

  function resetPantryModalFields(options: {
    addedDate: string;
    lowThreshold: number;
    shelfLifeDays: number;
  }) {
    setItemAddedDate(options.addedDate);
    setItemLowThreshold(options.lowThreshold);
    setItemLowThresholdInput(String(options.lowThreshold));
    setItemShelfLifeDays(options.shelfLifeDays);
    setItemExpiresOn(resolveExpiresOn(options.addedDate, options.shelfLifeDays));
  }

  function selectLowThreshold(threshold: number) {
    setItemLowThreshold(threshold);
    setItemLowThresholdInput(String(threshold));
  }

  function handleLowThresholdInputChange(text: string) {
    setItemLowThresholdInput(text);
    const parsed = parseLowStockThresholdInput(text);
    if (parsed != null) setItemLowThreshold(parsed);
  }

  function selectShelfLife(days: number) {
    setItemShelfLifeDays(days);
    const added = isValidISODate(itemAddedDate) ? itemAddedDate : todayISO();
    setItemExpiresOn(resolveExpiresOn(added, days));
  }

  function handleAddedDateChange(text: string) {
    setItemAddedDate(text);
    const parsed = parseISODateInput(text);
    if (!parsed) return;
    setItemAddedDate(parsed);
    if (itemExpiresOn && isValidISODate(itemExpiresOn)) {
      const shelf = computeShelfLifeDaysFromExpires(parsed, itemExpiresOn);
      if (shelf != null) setItemShelfLifeDays(shelf);
      return;
    }
    if (itemShelfLifeDays > 0) {
      setItemExpiresOn(resolveExpiresOn(parsed, itemShelfLifeDays));
    }
  }

  function handleExpiresOnChange(text: string) {
    setItemExpiresOn(text);
    if (!text.trim()) {
      setItemShelfLifeDays(0);
      return;
    }
    const parsed = parseISODateInput(text);
    if (!parsed) return;
    setItemExpiresOn(parsed);
    const added = isValidISODate(itemAddedDate) ? itemAddedDate : todayISO();
    const shelf = computeShelfLifeDaysFromExpires(added, parsed);
    if (shelf != null) setItemShelfLifeDays(shelf);
  }

  function suggestedShelfLife(name: string, category: string): number {
    return inferDefaultShelfLifeDays({ name, category }) ?? 0;
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function enterSelectMode(itemId?: string) {
    setSelectMode(true);
    setSelectedIds(itemId ? new Set([itemId]) : new Set());
  }

  function toggleSelection(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function closeModal() {
    setShowModal(false);
    setEditingItem(null);
  }

  function openAddModal() {
    void (async () => {
      const { getPantryLimitStatus } = await import('@/src/services/tierLimits');
      const status = await getPantryLimitStatus();
      if (!status.allowed) {
        promptPantryLimitReached(() => router.push('/paywall' as never));
        return;
      }
      setEditingItem(null);
      setItemName('');
      setItemQty('1');
      setItemUnit('');
      const category = selectedCategory !== 'All' ? selectedCategory : PANTRY_FALLBACK_CATEGORY;
      setItemCategory(category);
      resetPantryModalFields({
        addedDate: todayISO(),
        lowThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        shelfLifeDays: suggestedShelfLife('', category),
      });
      setShowModal(true);
    })();
  }

  function openEditModal(item: PantryItemView) {
    setEditingItem(item);
    setItemName(item.name);
    setItemQty(String(item.quantity));
    setItemUnit(item.unit ?? '');
    setItemCategory(item.category);
    resetPantryModalFields({
      addedDate: item.addedDate,
      lowThreshold: item.lowStockThreshold,
      shelfLifeDays: item.shelfLifeDays ?? item.effectiveShelfLifeDays ?? 0,
    });
    setShowModal(true);
  }

  function selectQuickAdd(name: string, unit?: string, category?: string) {
    setItemName(name);
    setItemQty('1');
    setItemUnit(unit?.replace(/^1\s+/, '').split(' ')[0] ?? '');
    const nextCategory = category ?? inferPantryCategory(name);
    setItemCategory(nextCategory);
    const shelfLife = suggestedShelfLife(name, nextCategory);
    setItemShelfLifeDays(shelfLife);
    const added = isValidISODate(itemAddedDate) ? itemAddedDate : todayISO();
    setItemExpiresOn(resolveExpiresOn(added, shelfLife));
  }

  function handleCategorySelect(category: string) {
    setItemCategory(category);
    if (!editingItem) {
      selectShelfLife(suggestedShelfLife(itemName, category));
    }
  }

  async function handleSaveItem() {
    const quantity = parseFloat(itemQty);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    if (!itemName.trim()) return;

    const lowThreshold = parseLowStockThresholdInput(itemLowThresholdInput);
    if (lowThreshold == null) return;

    const addedDate = normalizeReceiptDate(itemAddedDate);
    if (!isValidISODate(addedDate)) return;

    let shelfLifeDays = itemShelfLifeDays;
    if (itemExpiresOn.trim()) {
      const expiresOn = parseISODateInput(itemExpiresOn);
      if (!expiresOn) return;
      const derived = computeShelfLifeDaysFromExpires(addedDate, expiresOn);
      if (derived == null) return;
      shelfLifeDays = derived;
    }

    setSaving(true);
    try {
      const payload = {
        name: itemName.trim(),
        quantity,
        unit: itemUnit.trim() || undefined,
        category: itemCategory,
        lowStockThreshold: lowThreshold,
        shelfLifeDays,
        addedDate,
      };
      if (editingItem) {
        await savePantryItemAmount(editingItem.id, payload);
      } else {
        await addManualPantryItem(payload);
      }
      closeModal();
      await load();
    } catch (error) {
      if (error instanceof PantryLimitError) {
        promptPantryLimitReached(() => router.push('/paywall' as never));
        return;
      }
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function restorePantryItem(snapshot: PantryItemView) {
    await addManualPantryItem({
      name: snapshot.name,
      quantity: snapshot.quantity,
      unit: snapshot.unit,
      category: snapshot.category,
      lowStockThreshold: snapshot.lowStockThreshold,
      shelfLifeDays: snapshot.shelfLifeDays ?? snapshot.effectiveShelfLifeDays ?? undefined,
      addedDate: snapshot.addedDate,
    });
    await load();
  }

  function confirmDelete(item: PantryItemView) {
    const snapshot = { ...item };
    confirmDestructiveAction({
      title: `Delete ${item.name}?`,
      message: 'Remove this item from your pantry. Are you sure?',
      onConfirm: async () => {
        scheduleUndo(
          item.name,
          async () => {},
          async () => restorePantryItem(snapshot)
        );
        await removePantryItem(item.id);
        closeModal();
        await load();
      },
    });
  }

  function confirmBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    confirmDestructiveAction({
      title: `Delete ${count} item${count === 1 ? '' : 's'}?`,
      message: `Remove ${count} item${count === 1 ? '' : 's'} from your pantry. Are you sure?`,
      onConfirm: async () => {
        const snapshots = items.filter((item) => selectedIds.has(item.id));
        scheduleUndo(
          `${count} item${count === 1 ? '' : 's'}`,
          async () => {},
          async () => {
            for (const snapshot of snapshots) {
              await restorePantryItem(snapshot);
            }
          }
        );
        await removePantryItems([...selectedIds]);
        exitSelectMode();
        await load();
      },
    });
  }

  function handleRowPress(item: PantryItemView) {
    if (selectMode) {
      toggleSelection(item.id);
      return;
    }
    openEditModal(item);
  }

  function handleRowLongPress(item: PantryItemView) {
    if (selectMode) return;
    enterSelectMode(item.id);
  }

  async function handleAddToShoppingList(itemsToAdd: PantryItemView[]) {
    if (itemsToAdd.length === 0) return;
    setAddingToList(true);
    try {
      const result = await addPantryItemsToShoppingList(itemsToAdd);
      if (result.added === 0 && result.skipped > 0) {
        Alert.alert('Already on list', `These items are already on ${result.listName}.`);
        return;
      }
      const skippedNote =
        result.skipped > 0 ? ` ${result.skipped} already on the list.` : '';
      Alert.alert(
        'Added to shopping list',
        `${result.added} item${result.added === 1 ? '' : 's'} added to ${result.listName}.${skippedNote}`
      );
    } finally {
      setAddingToList(false);
    }
  }

  async function handleAddAllRunningLowToList() {
    const runningLowItems = items.filter((item) => item.status === 'running_low');
    await handleAddToShoppingList(runningLowItems);
  }

  async function handleAddAllExpiringToList() {
    const expiringItems = items.filter((item) => item.status === 'expiring_soon');
    await handleAddToShoppingList(expiringItems);
  }

  function formatShelfLifeMeta(item: PantryItemView): string {
    if (item.effectiveShelfLifeDays == null) return 'No expiry';
    return `Expires in ${item.effectiveShelfLifeDays} days`;
  }

  function renderPantryItem(item: PantryItemView) {
    const pill = statusPillStyle(item.status);
    const selected = selectedIds.has(item.id);
    return (
      <Pressable
        key={item.id}
        style={[styles.listRow, selected && styles.listRowSelected]}
        onPress={() => handleRowPress(item)}
        onLongPress={() => handleRowLongPress(item)}>
        {selectMode ? (
          <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
            {selected && (
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                tintColor="#fff"
                size={14}
              />
            )}
          </View>
        ) : (
          <ItemEmojiAvatar emoji={item.emoji} size="md" shape="square" />
        )}
        <View style={styles.listBody}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {item.quantityLabel} · Low at {item.lowStockThreshold} · {formatShelfLifeMeta(item)} ·{' '}
            {item.category} · Added {formatDisplayDate(item.addedDate)}
          </Text>
          {item.category === PANTRY_FALLBACK_CATEGORY && !item.categoryUserSet ? (
            <Text style={styles.recategorizeHint}>Tap to choose a group</Text>
          ) : null}
        </View>
        {!selectMode ? (
          <View style={styles.rowActions}>
            {activeTab === 'running_low' || activeTab === 'expiring' ? (
              <Pressable style={styles.addListBtn} onPress={() => void handleAddToShoppingList([item])}>
                <Text style={styles.addListBtnText}>Add to list</Text>
              </Pressable>
            ) : null}
            <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.statusText, { color: pill.text }]}>{item.statusLabel}</Text>
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Pantry"
        rightAction={
          <Pressable
            style={styles.headerActionBtn}
            onPress={() => (selectMode ? exitSelectMode() : enterSelectMode())}>
            <Text style={styles.headerActionText}>{selectMode ? 'Cancel' : 'Select'}</Text>
          </Pressable>
        }
      />
      {blocking ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            pointerEvents={showModal ? 'none' : 'auto'}
            style={showModal ? styles.listHiddenUnderModal : undefined}>
            <MockupScreenTitle title="Pantry" subtitle="Track what you have on hand" />

            <View style={styles.statsRow}>
              <MockupCard style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Items in Pantry</Text>
              </MockupCard>
              <MockupCard style={styles.statCard}>
                <Text style={[styles.statValue, stats.runningLow > 0 && styles.statValueWarn]}>
                  {stats.runningLow}
                </Text>
                <Text style={styles.statLabel}>Running Low</Text>
              </MockupCard>
              <MockupCard style={styles.statCard}>
                <Text style={[styles.statValue, stats.expiringSoon > 0 && styles.statValueExpiring]}>
                  {stats.expiringSoon}
                </Text>
                <Text style={styles.statLabel}>Expiring Soon</Text>
              </MockupCard>
            </View>

            <MockupTabs
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'running_low', label: 'Running Low' },
                { id: 'expiring', label: 'Expiring Soon' },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />

            <CategoryPills
              categories={categoryPills}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />

            {filtered.length === 0 ? (
              <MockupCard>
                <Text style={styles.empty}>{emptyMessage(activeTab)}</Text>
              </MockupCard>
            ) : (
              <>
                {activeTab === 'running_low' && !selectMode ? (
                  <MockupCard style={styles.sectionBanner}>
                    <Text style={styles.sectionBannerTitle}>Running low</Text>
                    <Text style={styles.sectionBannerSubtitle}>
                      Restock these items — add them to your shopping list?
                    </Text>
                    <Pressable
                      style={[styles.addAllBtn, addingToList && styles.addAllBtnDisabled]}
                      onPress={handleAddAllRunningLowToList}
                      disabled={addingToList}>
                      <Text style={styles.addAllBtnText}>
                        {addingToList ? 'Adding…' : 'Add all to shopping list'}
                      </Text>
                    </Pressable>
                  </MockupCard>
                ) : null}
                {activeTab === 'expiring' && !selectMode ? (
                  <MockupCard style={styles.sectionBanner}>
                    <Text style={styles.sectionBannerTitle}>Expiring soon</Text>
                    <Text style={styles.sectionBannerSubtitle}>
                      Restock before they go bad — add them to your shopping list?
                    </Text>
                    <Pressable
                      style={[styles.addAllBtn, addingToList && styles.addAllBtnDisabled]}
                      onPress={handleAddAllExpiringToList}
                      disabled={addingToList}>
                      <Text style={styles.addAllBtnText}>
                        {addingToList ? 'Adding…' : 'Add all to shopping list'}
                      </Text>
                    </Pressable>
                  </MockupCard>
                ) : null}
                {groupedByCategory
                  ? groupedByCategory.map((group) => (
                      <View key={group.category} style={styles.groupSection}>
                        <Text style={styles.groupHeader}>{group.category}</Text>
                        {group.items.map((item) => renderPantryItem(item))}
                      </View>
                    ))
                  : filtered.map((item) => renderPantryItem(item))}
              </>
            )}
          </ScrollView>

        </>
      )}

      <AppBottomSheetModal
        visible={showModal}
        onClose={closeModal}
        contentContainerStyle={isAddModalOpen ? styles.addModalContent : undefined}>
        <Text style={styles.modalTitle}>{editingItem ? 'Update Amount' : 'Add to Pantry'}</Text>

        {editingItem ? (
          <View style={styles.editItemHeader}>
            <ItemEmojiAvatar
              emoji={getItemEmoji(undefined, itemName) || editingItem.emoji}
              size="lg"
              shape="square"
            />
            <TextInput
              style={styles.editItemNameInput}
              value={itemName}
              onChangeText={setItemName}
              placeholder="Item name"
              placeholderTextColor={SmartCartColors.textSecondary}
            />
          </View>
        ) : (
          <>
            <Text style={styles.quickAddLabel}>Quick add</Text>
            <HorizontalScrollRow contentContainerStyle={styles.quickAddRow}>
              {quickAddItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.quickAddTile}
                  onPress={() => selectQuickAdd(item.canonicalName, item.unit, item.category)}>
                  <ItemEmojiAvatar emoji={item.emoji} size="sm" />
                  <Text style={styles.quickAddName} numberOfLines={2}>
                    {item.canonicalName}
                  </Text>
                </Pressable>
              ))}
            </HorizontalScrollRow>
            <TextInput
              style={styles.input}
              placeholder="Item name"
              value={itemName}
              onChangeText={setItemName}
            />
          </>
        )}

        <View style={styles.modalSection}>
          <Text style={styles.fieldLabel}>Group</Text>
          {itemCategory === PANTRY_FALLBACK_CATEGORY ? (
            <Text style={styles.fieldHint}>
              Uncertain items start here — pick the aisle that fits best.
            </Text>
          ) : null}
          <HorizontalScrollRow contentContainerStyle={styles.unitChipRow}>
            {GROCERY_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[styles.unitChip, itemCategory === category && styles.unitChipActive]}
                onPress={() => handleCategorySelect(category)}>
                <Text style={[styles.unitChipText, itemCategory === category && styles.unitChipTextActive]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </HorizontalScrollRow>
        </View>

        <View style={styles.modalSection}>
          <View style={styles.qtyRow}>
          <View style={styles.qtyField}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              value={itemQty}
              onChangeText={setItemQty}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.qtyField}>
            <Text style={styles.fieldLabel}>Unit</Text>
            <TextInput
              style={styles.input}
              placeholder="gal, lb, ea"
              value={itemUnit}
              onChangeText={setItemUnit}
              autoCapitalize="none"
            />
          </View>
        </View>

        <HorizontalScrollRow contentContainerStyle={styles.unitChipRow}>
          {UNIT_SUGGESTIONS.map((unit) => (
            <Pressable
              key={unit}
              style={[styles.unitChip, itemUnit === unit && styles.unitChipActive]}
              onPress={() => setItemUnit(unit)}>
              <Text style={[styles.unitChipText, itemUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
            </Pressable>
          ))}
        </HorizontalScrollRow>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.fieldLabel}>Low at</Text>
        <Text style={styles.fieldHint}>Show in Running Low when quantity is at or below this amount.</Text>
        <HorizontalScrollRow contentContainerStyle={styles.unitChipRow}>
          {LOW_STOCK_THRESHOLD_OPTIONS.map((threshold) => (
            <Pressable
              key={threshold}
              style={[styles.unitChip, itemLowThreshold === threshold && styles.unitChipActive]}
              onPress={() => selectLowThreshold(threshold)}>
              <Text
                style={[
                  styles.unitChipText,
                  itemLowThreshold === threshold && styles.unitChipTextActive,
                ]}>
                {threshold}
              </Text>
            </Pressable>
          ))}
        </HorizontalScrollRow>
        <TextInput
          style={styles.input}
          placeholder="Custom amount (1–999)"
          value={itemLowThresholdInput}
          onChangeText={handleLowThresholdInputChange}
          keyboardType="number-pad"
        />
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.fieldLabel}>Added on</Text>
        <Text style={styles.fieldHint}>
          {!editingItem
            ? 'Defaults to today when you add an item manually.'
            : editingItem.source === 'receipt'
              ? `Auto-set from receipt on ${formatDisplayDate(editingItem.addedDate)}. You can override if needed.`
              : 'Set when you added this item manually. You can change it if needed.'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={itemAddedDate}
          onChangeText={handleAddedDateChange}
          autoCapitalize="none"
          autoCorrect={false}
          {...dateInputProps}
        />
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.fieldLabel}>Expires in</Text>
        <Text style={styles.fieldHint}>
          Show in Expiring Soon when within 3 days of expiry. Use chips or set an exact date below.
        </Text>
        <HorizontalScrollRow contentContainerStyle={styles.unitChipRow}>
          <Pressable
            style={[styles.unitChip, itemShelfLifeDays === 0 && styles.unitChipActive]}
            onPress={() => selectShelfLife(0)}>
            <Text style={[styles.unitChipText, itemShelfLifeDays === 0 && styles.unitChipTextActive]}>
              None
            </Text>
          </Pressable>
          {SHELF_LIFE_OPTIONS.map((days) => (
            <Pressable
              key={days}
              style={[styles.unitChip, itemShelfLifeDays === days && styles.unitChipActive]}
              onPress={() => selectShelfLife(days)}>
              <Text
                style={[styles.unitChipText, itemShelfLifeDays === days && styles.unitChipTextActive]}>
                {days}d
              </Text>
            </Pressable>
          ))}
        </HorizontalScrollRow>
        <Text style={styles.fieldLabel}>Expires on</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (optional)"
          value={itemExpiresOn}
          onChangeText={handleExpiresOnChange}
          autoCapitalize="none"
          autoCorrect={false}
          {...dateInputProps}
        />
        </View>

        <View style={styles.modalActions}>
          {editingItem ? (
            <>
              <Pressable onPress={() => confirmDelete(editingItem)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (saving || !canSavePantryItem) && styles.saveBtnDisabled]}
                onPress={handleSaveItem}
                disabled={saving || !canSavePantryItem}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={closeModal}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </AppBottomSheetModal>

      {!blocking && selectMode && selectedIds.size > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={styles.deleteBulkBtn} onPress={confirmBulkDelete}>
            <Text style={styles.deleteBulkBtnText}>Delete ({selectedIds.size})</Text>
          </Pressable>
        </View>
      ) : !blocking && !(showModal && editingItem) ? (
        <View
          style={[
            styles.footer,
            isAddModalOpen && styles.footerAboveModal,
            { paddingBottom: insets.bottom + 12 },
          ]}>
          <MockupPrimaryButton
            label={isAddModalOpen ? (saving ? 'Adding…' : 'Add to Pantry') : 'Add to Pantry'}
            onPress={isAddModalOpen ? handleSaveItem : openAddModal}
            disabled={isAddModalOpen && (saving || !canSavePantryItem)}
          />
        </View>
      ) : null}

      <UndoSnackbar pending={undoPending} onUndo={() => void undo()} bottomInset={insets.bottom + 72} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  listHiddenUnderModal: Platform.select({
    web: { opacity: 0, pointerEvents: 'none', display: 'none' },
    default: { opacity: 0, pointerEvents: 'none' },
  }),
  headerActionBtn: { width: 72, alignItems: 'flex-end' },
  headerActionText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.primary },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard: { flex: 1, alignItems: 'center', marginBottom: 16 },
  statValue: { fontSize: 28, fontWeight: '800', color: SmartCartColors.text },
  statValueWarn: { color: SmartCartColors.danger },
  statValueExpiring: { color: '#D97706' },
  statLabel: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary, marginTop: 4 },
  groupSection: { marginBottom: 8 },
  groupHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  listRowSelected: { borderColor: SmartCartColors.primary, backgroundColor: SmartCartColors.badge },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SmartCartColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: SmartCartColors.primary, borderColor: SmartCartColors.primary },
  listBody: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  itemMeta: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  recategorizeHint: { fontSize: 11, color: SmartCartColors.primary, marginTop: 2 },
  statusPill: { borderRadius: SmartCartRadius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { fontSize: 14, color: SmartCartColors.textSecondary, textAlign: 'center' },
  sectionBanner: { marginBottom: 12, gap: 8 },
  sectionBannerTitle: { fontSize: 16, fontWeight: '800', color: SmartCartColors.text },
  sectionBannerSubtitle: { fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 18 },
  addAllBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addAllBtnDisabled: { opacity: 0.6 },
  addAllBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rowActions: { alignItems: 'flex-end', gap: 6 },
  addListBtn: {
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: SmartCartColors.badge,
    borderWidth: 1,
    borderColor: SmartCartColors.primary,
  },
  addListBtnText: { fontSize: 11, fontWeight: '700', color: SmartCartColors.primaryDark },
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
  footerAboveModal: Platform.select({
    web: { zIndex: 60 },
    default: { zIndex: 10, elevation: 10 },
  }),
  addModalContent: { paddingBottom: 100 },
  deleteBulkBtn: {
    backgroundColor: SmartCartColors.danger,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBulkBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: SmartCartColors.text, marginBottom: 16 },
  editItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmartCartColors.background,
    borderRadius: SmartCartRadius.lg,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    padding: 14,
    marginBottom: 16,
  },
  editItemNameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.card,
    paddingVertical: 0,
  },
  quickAddLabel: { fontSize: 12, fontWeight: '700', color: SmartCartColors.textSecondary, marginBottom: 8 },
  quickAddRow: { gap: 10, paddingBottom: 12 },
  quickAddTile: {
    width: 84,
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  quickAddName: { fontSize: 11, fontWeight: '600', color: SmartCartColors.text, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.background,
    marginBottom: 10,
  },
  qtyRow: { flexDirection: 'row', gap: 10 },
  qtyField: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: SmartCartColors.textSecondary, marginBottom: 6 },
  fieldHint: { fontSize: 11, color: SmartCartColors.textSecondary, marginBottom: 8, marginTop: -2 },
  unitChipRow: { gap: 8, paddingVertical: 4, marginBottom: 8 },
  unitChip: {
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  unitChipActive: { backgroundColor: SmartCartColors.badge, borderColor: SmartCartColors.primary },
  unitChipText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary },
  unitChipTextActive: { color: SmartCartColors.primaryDark },
  modalSection: { marginBottom: 16 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: SmartCartColors.border,
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: SmartCartColors.textSecondary },
  deleteText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.danger },
  saveBtn: {
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
