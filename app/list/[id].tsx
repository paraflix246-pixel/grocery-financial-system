import AsyncStorage from '@react-native-async-storage/async-storage';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import { canNavigateBack } from '@/src/components/BackButton';
import { BuyAgainSection } from '@/src/components/BuyAgainSection';
import { CategoryPills } from '@/src/components/CategoryPills';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { ItemPicker } from '@/src/components/ItemPicker';
import { LinearProgressBar } from '@/src/components/LinearProgressBar';
import { FeedbackSnackbar } from '@/src/components/FeedbackSnackbar';
import { StatusBanner } from '@/src/components/StatusBanner';
import { UndoSnackbar } from '@/src/components/UndoSnackbar';
import { getGroceryItemByCanonical, getGroceryItemByName, getGroceryTypicalPrice, getPopularGroceryItems } from '@/src/data/groceryCatalog';
import { getStoreLayoutForName, groupItemsByStoreLayout } from '@/src/data/storeLayouts';
import { MEAL_TEMPLATES } from '@/src/data/mealTemplates';
import { STARTER_CATEGORIES, getQuantityLabel } from '@/src/data/starterListItems';
import { useFeatureGate } from '@/src/hooks/useFeatureGate';
import { useUndoDelete } from '@/src/hooks/useUndoDelete';
import type { ListItem } from '@/src/models/types';
import { getFrequentPurchasedItems } from '@/src/services/priceRecommendationService';
import { scheduleFamilyListPush } from '@/src/services/familySyncService';
import { getFrequentItemsForStore } from '@/src/services/storeMemoryService';
import { registerCustomGroceryItem, getCustomCatalogEntries } from '@/src/services/customCatalogService';
import type { CustomCatalogEntry } from '@/src/services/customCatalogLogic';
import { resolveListItemEmoji } from '@/src/services/customCatalogLogic';
import type { ItemPickerSelection } from '@/src/services/itemPickerService';
import {
  createListItem,
  deleteListItem,
  deleteListItems,
  getListById,
  patchList,
  updateListItem,
} from '@/src/services/storageService';
import { useListStore } from '@/src/store/useListStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import {
  getBuyAgainHidden,
  getListScrollOffset,
  saveLastOpenedListId,
  saveListScrollOffset,
  setBuyAgainHidden,
  skipOpenLastListOnNextFocus,
} from '@/src/utils/listNavigationPrefs';
import { listCheckedKey, loadCheckedIds, saveCheckedIds } from '@/src/utils/listCheckedStorage';
import { formatCurrency, sumPlannedTotal } from '@/src/utils/priceParser';
import { inferPantryCategory } from '@/src/utils/pantryCategory';
import { showInfoAlert } from '@/src/utils/platformAlert';
import type { FrequentPurchasedItem } from '@/src/services/priceRecommendationLogic';

const DEFAULT_ADD_CATEGORY = 'Produce';

function resolveAddItemName(name: string, selection: ItemPickerSelection | null): string {
  const fromField = name.trim();
  const fromPicker = selection?.itemName?.trim() ?? '';
  return fromField || fromPicker;
}

function resolveItemCategory(
  itemName: string,
  selectedCategory: string,
  selection: ItemPickerSelection | null
): string {
  if (selection?.category?.trim()) return selection.category.trim();
  const catalog = getGroceryItemByCanonical(itemName) ?? getGroceryItemByName(itemName);
  if (catalog?.category) return catalog.category;
  if (selectedCategory.trim() && selectedCategory !== DEFAULT_ADD_CATEGORY) {
    return selectedCategory.trim();
  }
  return inferPantryCategory(itemName) || selectedCategory.trim() || 'Other';
}

export default function ListDetailScreen() {
  const { id, add } = useLocalSearchParams<{ id: string; add?: string }>();
  const listId = id ?? '';
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { unlocked: familyShareUnlocked, requestAccess: requestFamilyShare } = useFeatureGate('family_plans');
  const { refreshItems, itemsByList } = useListStore();
  const [listName, setListName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [itemModalMode, setItemModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Produce');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [listStoreName, setListStoreName] = useState<string | undefined>();
  const [layoutMode, setLayoutMode] = useState<'category' | 'store'>('category');
  const [buyAgainItems, setBuyAgainItems] = useState<FrequentPurchasedItem[]>([]);
  const [buyAgainLoading, setBuyAgainLoading] = useState(true);
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<ItemPickerSelection | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const [pickerRefreshKey, setPickerRefreshKey] = useState(0);
  const [customCatalogByKey, setCustomCatalogByKey] = useState<Map<string, CustomCatalogEntry>>(new Map());
  const scrollRef = useRef<ScrollView>(null);
  const addItemFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [addItemFeedback, setAddItemFeedback] = useState<string | null>(null);
  const { pending: undoPending, scheduleUndo, undo } = useUndoDelete();

  const refreshAndSync = useCallback(
    async () => {
      await refreshItems(listId);
      scheduleFamilyListPush(listId);
    },
    [listId, refreshItems]
  );

  const items = itemsByList[listId] ?? [];
  const visibleItems = useMemo(
    () => items.filter((item) => !pendingDeleteIds.has(item.id)),
    [items, pendingDeleteIds]
  );
  const existingItemNames = useMemo(
    () => new Set(visibleItems.map((i) => i.name.trim().toLowerCase())),
    [visibleItems]
  );

  const load = useCallback(async () => {
    if (!listId || listId === 'new') return;
    setLoading(true);
    const list = await getListById(listId);
    setListName(list?.name ?? 'My Shopping List');
    setListStoreName(list?.storeName);
    setLayoutMode(list?.layoutMode === 'store' && list?.storeName ? 'store' : 'category');
    await useListStore.getState().activateList(listId);
    await refreshItems(listId);
    await saveLastOpenedListId(listId);
    const stored = await loadCheckedIds(listId);
    setCheckedIds(stored);
    setSuggestionsHidden(await getBuyAgainHidden(listId));
    setBuyAgainLoading(true);
    try {
      const customEntries = await getCustomCatalogEntries();
      setCustomCatalogByKey(new Map(customEntries.map((entry) => [entry.itemKey, entry])));
      if (list?.storeName) {
        const storeItems = await getFrequentItemsForStore(list.storeName, 8);
        setBuyAgainItems(
          storeItems.map((item) => ({
            name: item.name,
            canonicalName: item.name,
            purchaseCount: item.purchaseCount,
            totalSpend: 0,
            lastPurchaseDate: item.lastPurchaseDate,
          }))
        );
      } else {
        setBuyAgainItems(await getFrequentPurchasedItems(8));
      }
    } finally {
      setBuyAgainLoading(false);
    }
    setLoading(false);
    const scrollY = await getListScrollOffset(listId);
    if (scrollY > 0) {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: scrollY, animated: false }));
    }
  }, [listId, refreshItems]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleChecked = async (itemId: string) => {
    const next = new Set(checkedIds);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setCheckedIds(next);
    await saveCheckedIds(listId, next);
  };

  const categories = useMemo(() => {
    const catsWithItems = new Set(visibleItems.map((i) => i.category || 'Other'));
    const ordered: string[] = [];
    for (const category of STARTER_CATEGORIES.slice(1)) {
      if (catsWithItems.has(category)) ordered.push(category);
    }
    for (const category of catsWithItems) {
      if (!ordered.includes(category)) ordered.push(category);
    }
    return [
      { label: 'All', count: visibleItems.length },
      ...ordered.map((c) => ({
        label: c,
        count: visibleItems.filter((i) => (i.category || 'Other') === c).length,
      })),
    ];
  }, [visibleItems]);

  useEffect(() => {
    if (selectedCategory !== 'All' && !categories.some((c) => c.label === selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [categories, selectedCategory]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return visibleItems;
    return visibleItems.filter((i) => (i.category || 'Other') === selectedCategory);
  }, [visibleItems, selectedCategory]);

  const grouped = useMemo((): [string, ListItem[]][] => {
    if (layoutMode === 'store' && listStoreName) {
      const layout = getStoreLayoutForName(listStoreName);
      if (layout) {
        return groupItemsByStoreLayout(filteredItems, layout).map((group) => [
          group.sectionLabel,
          group.items,
        ]);
      }
    }
    const groups = new Map<string, ListItem[]>();
    for (const item of filteredItems) {
      const cat = item.category || 'Other';
      const bucket = groups.get(cat) ?? [];
      bucket.push(item);
      groups.set(cat, bucket);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const aIndex = STARTER_CATEGORIES.indexOf(a);
      const bIndex = STARTER_CATEGORIES.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [filteredItems, layoutMode, listStoreName]);

  const checkedCount = visibleItems.filter((i) => checkedIds.has(i.id)).length;
  const plannedTotal = sumPlannedTotal(visibleItems);

  function clearAddItemFeedback() {
    if (addItemFeedbackTimeoutRef.current) {
      clearTimeout(addItemFeedbackTimeoutRef.current);
      addItemFeedbackTimeoutRef.current = null;
    }
    setAddItemFeedback(null);
  }

  function showAddItemFeedback(itemName: string) {
    setAddItemFeedback(`Added ${itemName} to list`);
    if (addItemFeedbackTimeoutRef.current) clearTimeout(addItemFeedbackTimeoutRef.current);
    addItemFeedbackTimeoutRef.current = setTimeout(() => {
      setAddItemFeedback(null);
      addItemFeedbackTimeoutRef.current = null;
    }, 3000);
  }

  function resetAddItemForm() {
    setPickerSelection(null);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
    setPickerRefreshKey((key) => key + 1);
  }

  function closeItemModal() {
    clearAddItemFeedback();
    setItemModalMode(null);
    setEditingItemId(null);
    setPickerSelection(null);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
    setNewItemCategory(DEFAULT_ADD_CATEGORY);
  }

  useEffect(() => {
    return () => {
      if (addItemFeedbackTimeoutRef.current) clearTimeout(addItemFeedbackTimeoutRef.current);
    };
  }, []);

  function openAddModal(category = selectedCategory) {
    if (category && category !== 'All') setNewItemCategory(category);
    else setNewItemCategory(DEFAULT_ADD_CATEGORY);
    setEditingItemId(null);
    setPickerSelection(null);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
    setPickerRefreshKey((key) => key + 1);
    setItemModalMode('add');
  }

  function openEditModal(item: ListItem) {
    setEditingItemId(item.id);
    setPickerSelection(null);
    setNewItemName(item.name);
    setNewItemQty(String(item.quantity));
    setNewItemPrice(item.expectedPrice > 0 ? item.expectedPrice.toFixed(2) : '');
    setNewItemCategory(item.category?.trim() || DEFAULT_ADD_CATEGORY);
    setPickerRefreshKey((key) => key + 1);
    setItemModalMode('edit');
  }

  useEffect(() => {
    if (loading || add !== '1') return;
    openAddModal();
    router.setParams({ add: undefined });
  }, [loading, add, router]);

  function syncCustomSelectionCategory(category: string) {
    setNewItemCategory(category);
    if (pickerSelection?.isUserDefined) {
      setPickerSelection({
        ...pickerSelection,
        category,
      });
    }
  }

  function selectCatalogItem(name: string, category: string, price: number) {
    setNewItemName(name);
    setNewItemCategory(category);
    setNewItemPrice(price.toFixed(2));
    setNewItemQty('1');
  }

  const quickAddItems = useMemo(() => getPopularGroceryItems(), []);

  const newItemNameTrimmed = resolveAddItemName(newItemName, pickerSelection);
  const canSaveItem = newItemNameTrimmed.length > 0;
  const itemModalBusy = addingItem || savingItem;

  async function handleSaveItem() {
    const itemName = resolveAddItemName(newItemName, pickerSelection);
    if (!itemName || !listId || itemModalBusy) return;

    const quantity = parseFloat(newItemQty) || 1;
    const unitPrice = parseFloat(newItemPrice);
    const expectedPrice =
      (Number.isFinite(unitPrice) ? unitPrice : undefined) ??
      pickerSelection?.suggestedTargetPrice ??
      pickerSelection?.lastSeen?.price ??
      0;
    const category = resolveItemCategory(itemName, newItemCategory, pickerSelection);

    if (itemModalMode === 'edit' && editingItemId) {
      setSavingItem(true);
      try {
        await registerCustomGroceryItem(itemName, category).then((entry) => {
          setCustomCatalogByKey((prev) => new Map(prev).set(entry.itemKey, entry));
        });
        await updateListItem(editingItemId, {
          name: itemName,
          expectedPrice,
          quantity,
          category,
        });
        closeItemModal();
        await refreshAndSync();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save item. Please try again.';
        showInfoAlert('Could not save item', message);
      } finally {
        setSavingItem(false);
      }
      return;
    }

    setAddingItem(true);
    try {
      await registerCustomGroceryItem(itemName, category).then((entry) => {
        setCustomCatalogByKey((prev) => new Map(prev).set(entry.itemKey, entry));
      });
      await createListItem(listId, {
        name: itemName,
        expectedPrice,
        quantity,
        category,
      });
      showAddItemFeedback(itemName);
      resetAddItemForm();
      await refreshAndSync();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add item. Please try again.';
      showInfoAlert('Could not add item', message);
    } finally {
      setAddingItem(false);
    }
  }

  async function handleBuyAgainAdd(item: FrequentPurchasedItem) {
    if (!listId || existingItemNames.has(item.name.toLowerCase())) return;
    const catalog = getGroceryItemByCanonical(item.name);
    await createListItem(listId, {
      name: item.name,
      expectedPrice: catalog ? getGroceryTypicalPrice(catalog) : 0,
      quantity: 1,
      category: catalog?.category ?? 'Pantry',
    });
    await refreshAndSync();
  }

  async function hideSuggestions() {
    setSuggestionsHidden(true);
    await setBuyAgainHidden(listId, true);
  }

  async function showSuggestions() {
    setSuggestionsHidden(false);
    await setBuyAgainHidden(listId, false);
  }

  function renderSuggestionsBlock(placement: 'top' | 'bottom') {
    const belongsHere = visibleItems.length === 0 ? placement === 'top' : placement === 'bottom';
    if (!belongsHere) return null;

    if (suggestionsHidden) {
      return (
        <Pressable
          style={({ pressed }) => [styles.showSuggestionsBtn, pressed && styles.showSuggestionsBtnPressed]}
          onPress={() => void showSuggestions()}
          accessibilityRole="button"
          accessibilityLabel="Show purchase suggestions">
          <Text style={styles.showSuggestionsText}>Show suggestions</Text>
        </Pressable>
      );
    }

    return (
      <BuyAgainSection
        items={buyAgainItems}
        existingNames={existingItemNames}
        onAdd={handleBuyAgainAdd}
        loading={buyAgainLoading}
        hideOnList
        onHide={() => void hideSuggestions()}
        title={
          visibleItems.length === 0
            ? listStoreName
              ? `${listStoreName} favorites`
              : 'Buy again'
            : listStoreName
              ? `Add from ${listStoreName}`
              : 'Add more'
        }
        subtitle={
          visibleItems.length === 0 ? 'Suggestions from your purchase history' : 'From your purchase history'
        }
      />
    );
  }

  async function handleMealTemplateAdd(templateId: string) {
    const template = MEAL_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template || !listId) return;
    for (const entry of template.items) {
      if (existingItemNames.has(entry.name.trim().toLowerCase())) continue;
      const catalog = getGroceryItemByCanonical(entry.name);
      await createListItem(listId, {
        name: entry.name,
        expectedPrice: catalog ? getGroceryTypicalPrice(catalog) : 0,
        quantity: entry.quantity ?? 1,
        category: entry.category,
      });
    }
    await refreshAndSync();
  }

  async function setLayout(mode: 'category' | 'store') {
    setLayoutMode(mode);
    await patchList(listId, { layoutMode: mode });
  }

  function clearPendingDelete(ids: Iterable<string>) {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  function markPendingDelete(ids: Iterable<string>) {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function handleDeleteItem(item: ListItem) {
    markPendingDelete([item.id]);
    scheduleUndo(
      item.name,
      async () => {
        await deleteListItem(item.id);
        clearPendingDelete([item.id]);
        const next = new Set(checkedIds);
        next.delete(item.id);
        setCheckedIds(next);
        await saveCheckedIds(listId, next);
        await refreshAndSync();
      },
      async () => {
        clearPendingDelete([item.id]);
      }
    );
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

  function confirmBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    confirmDestructiveAction({
      title: `Delete ${count} item${count === 1 ? '' : 's'}?`,
      message: `Permanently remove ${count} item${count === 1 ? '' : 's'} from this list. Are you sure?`,
      onConfirm: async () => {
        const idsToDelete = [...selectedIds];
        markPendingDelete(idsToDelete);
        exitSelectMode();
        scheduleUndo(
          `${count} item${count === 1 ? '' : 's'}`,
          async () => {
            setDeleting(true);
            try {
              await deleteListItems(idsToDelete);
              clearPendingDelete(idsToDelete);
              const next = new Set(checkedIds);
              for (const id of idsToDelete) next.delete(id);
              setCheckedIds(next);
              await saveCheckedIds(listId, next);
              await refreshAndSync();
            } finally {
              setDeleting(false);
            }
          },
          async () => {
            clearPendingDelete(idsToDelete);
          }
        );
      },
    });
  }

  function confirmDeleteList() {
    confirmDestructiveAction({
      title: 'Delete list?',
      message: `Permanently delete "${listName}" and all ${items.length} item${items.length === 1 ? '' : 's'}. Are you sure?`,
      onConfirm: async () => {
        await useListStore.getState().removeList(listId);
        router.replace('/(tabs)/shopping-lists?browse=1' as never);
      },
    });
  }

  function handleRowPress(item: ListItem) {
    if (selectMode) {
      toggleSelection(item.id);
      return;
    }
    openEditModal(item);
  }

  function handleCheckboxPress(item: ListItem) {
    if (selectMode) {
      toggleSelection(item.id);
      return;
    }
    void toggleChecked(item.id);
  }

  function handleRowLongPress(item: ListItem) {
    if (selectMode) return;
    enterSelectMode(item.id);
  }

  async function handleCompleteList() {
    if (!listId || savingList || visibleItems.length === 0) return;
    setSavingList(true);
    try {
      const wasActive = await useListStore.getState().completeList(listId);
      setCheckedIds(new Set());
      await AsyncStorage.removeItem(listCheckedKey(listId));
      skipOpenLastListOnNextFocus();
      showInfoAlert(
        'List complete!',
        wasActive
          ? `"${listName}" is done and removed from your active list.`
          : `"${listName}" is complete — all items checked off.`
      );
      router.replace('/(tabs)/shopping-lists?browse=1' as never);
    } finally {
      setSavingList(false);
    }
  }

  async function handleSaveList() {
    if (!listId || savingList) return;
    setSavingList(true);
    try {
      await refreshAndSync();
      skipOpenLastListOnNextFocus();
      if (canNavigateBack(navigation as { canGoBack: () => boolean })) {
        router.back();
      } else {
        router.replace('/(tabs)/shopping-lists?browse=1' as never);
      }
    } finally {
      setSavingList(false);
    }
  }

  const showSaveList = visibleItems.length > 0 && !selectMode && !itemModalMode;
  const allItemsChecked =
    visibleItems.length > 0 && checkedCount === visibleItems.length && !selectMode && !itemModalMode;
  const footerBottomInset = insets.bottom + (showSaveList || allItemsChecked ? 120 : 72);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {listName}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => (selectMode ? exitSelectMode() : enterSelectMode())}>
            <Text style={styles.selectText}>{selectMode ? 'Cancel' : 'Select'}</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => openAddModal()}>
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={SmartCartColors.text} size={20} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() =>
              Alert.alert(listName, 'List options', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: familyShareUnlocked ? 'Share with family' : 'Share with family (Pro)',
                  onPress: () => {
                    if (!requestFamilyShare()) return;
                    router.push(`/list/share?listId=${listId}` as never);
                  },
                },
                {
                  text: 'Clear checked',
                  onPress: () => {
                    setCheckedIds(new Set());
                    void AsyncStorage.removeItem(listCheckedKey(listId));
                  },
                },
                {
                  text: 'Delete list',
                  style: 'destructive',
                  onPress: confirmDeleteList,
                },
              ])
            }>
            <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} tintColor={SmartCartColors.text} size={20} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onScroll={(e) => {
          void saveListScrollOffset(listId, e.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={120}>
        {visibleItems.length > 0 ? (
          <View style={styles.compactSummary}>
            <View style={styles.compactSummaryRow}>
              <Text style={styles.compactSummaryText}>
                {checkedCount}/{visibleItems.length} checked · {formatCurrency(plannedTotal)} est.
              </Text>
              {listStoreName ? <Text style={styles.storeBadgeCompact}>{listStoreName}</Text> : null}
            </View>
            <LinearProgressBar
              percent={visibleItems.length > 0 ? checkedCount / visibleItems.length : 0}
              height={4}
            />
          </View>
        ) : null}

        {allItemsChecked ? (
          <StatusBanner
            message="All items checked — tap Complete List when you're done shopping."
            emoji="✅"
          />
        ) : null}

        {renderSuggestionsBlock('top')}

        <View style={styles.listSection}>
          {listStoreName && getStoreLayoutForName(listStoreName) ? (
            <View style={styles.layoutToggleRow}>
              <Pressable
                style={[styles.layoutChip, layoutMode === 'category' && styles.layoutChipActive]}
                onPress={() => void setLayout('category')}>
                <Text style={[styles.layoutChipText, layoutMode === 'category' && styles.layoutChipTextActive]}>
                  By category
                </Text>
              </Pressable>
              <Pressable
                style={[styles.layoutChip, layoutMode === 'store' && styles.layoutChipActive]}
                onPress={() => void setLayout('store')}>
                <Text style={[styles.layoutChipText, layoutMode === 'store' && styles.layoutChipTextActive]}>
                  Store layout
                </Text>
              </Pressable>
            </View>
          ) : null}

          {visibleItems.length > 0 ? (
            <CategoryPills
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          ) : null}

          {grouped.map(([category, catItems]) => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.itemGroupCard}>
              {catItems.map((item, index) => {
                const checked = checkedIds.has(item.id);
                const selected = selectedIds.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.itemRow, index > 0 && styles.itemRowDivider, selected && styles.itemRowSelected]}
                    onPress={() => handleRowPress(item)}
                    onLongPress={() => handleRowLongPress(item)}>
                    {selectMode ? (
                      <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                        {selected ? (
                          <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} tintColor="#fff" size={14} />
                        ) : null}
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.checkbox, checked && styles.checkboxChecked]}
                        onPress={() => handleCheckboxPress(item)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}>
                        {checked && (
                          <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} tintColor="#fff" size={14} />
                        )}
                      </Pressable>
                    )}
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
                    ) : (
                      <ItemEmojiAvatar
                        emoji={resolveListItemEmoji(item.name, customCatalogByKey)}
                        size="sm"
                      />
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, checked && !selectMode && styles.itemChecked]}>{item.name}</Text>
                      <Text style={[styles.itemQty, checked && !selectMode && styles.itemChecked]}>
                        {getQuantityLabel(item.name, item.quantity)}
                      </Text>
                    </View>
                    <Text style={[styles.itemPrice, checked && !selectMode && styles.itemChecked]}>
                      {formatCurrency(item.expectedPrice * item.quantity)}
                    </Text>
                    {!selectMode ? (
                      <Pressable
                        style={styles.deleteItemBtn}
                        hitSlop={8}
                        onPress={() => handleDeleteItem(item)}
                        accessibilityLabel={`Delete ${item.name}`}>
                        <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={SmartCartColors.danger} size={16} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
              </View>
            </View>
          ))}

          {visibleItems.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.empty}>Tap + above, or pick a suggestion.</Text>
            </View>
          )}
        </View>

        {renderSuggestionsBlock('bottom')}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 12 },
        ]}>
        {selectMode && selectedIds.size > 0 ? (
          <Pressable
            style={[styles.deleteBulkBtn, deleting && styles.deleteBulkBtnDisabled]}
            disabled={deleting}
            onPress={confirmBulkDelete}>
            <Text style={styles.deleteBulkBtnText}>
              {deleting ? 'Deleting…' : `Delete (${selectedIds.size})`}
            </Text>
          </Pressable>
        ) : !itemModalMode ? (
          <View style={styles.footerContent}>
            {allItemsChecked ? (
              <Pressable
                style={[styles.completeListBtn, savingList && styles.saveListBtnDisabled]}
                disabled={savingList}
                accessibilityRole="button"
                onPress={() => void handleCompleteList()}>
                <SymbolView
                  name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                  tintColor="#fff"
                  size={20}
                />
                <Text style={styles.saveListBtnText}>
                  {savingList ? 'Completing…' : 'Complete List'}
                </Text>
              </Pressable>
            ) : showSaveList ? (
              <Pressable
                style={[styles.saveListBtnPrimary, savingList && styles.saveListBtnDisabled]}
                disabled={savingList}
                accessibilityRole="button"
                onPress={() => void handleSaveList()}>
                <Text style={styles.saveListBtnText}>{savingList ? 'Saving…' : 'Save List'}</Text>
              </Pressable>
            ) : null}
            <View style={styles.footerSecondaryRow}>
              <Pressable
                style={styles.familyShareBtn}
                onPress={() => {
                  if (!requestFamilyShare()) return;
                  router.push(`/list/share?listId=${listId}` as never);
                }}
                accessibilityLabel={
                  familyShareUnlocked ? 'Share with family' : 'Share with family, Pro feature'
                }>
                <SymbolView
                  name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                  tintColor={SmartCartColors.primaryDark}
                  size={18}
                />
              </Pressable>
              <Pressable
                style={showSaveList || allItemsChecked ? styles.addBtnSecondary : styles.addBtnPrimaryEmpty}
                onPress={() => openAddModal()}>
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'add' }}
                  tintColor={showSaveList || allItemsChecked ? SmartCartColors.primaryDark : '#fff'}
                  size={18}
                />
                <Text
                  style={
                    showSaveList || allItemsChecked ? styles.addBtnSecondaryText : styles.addBtnPrimaryEmptyText
                  }>
                  Add Item
                </Text>
              </Pressable>
              <Pressable style={styles.barcodeBtn} onPress={() => router.push('/(tabs)/scan')}>
                <SymbolView name={{ ios: 'barcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }} tintColor={SmartCartColors.primary} size={24} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <UndoSnackbar pending={undoPending} onUndo={() => void undo()} bottomInset={footerBottomInset} />

      <AppBottomSheetModal
        visible={itemModalMode != null}
        onClose={closeItemModal}
        cardStyle={styles.modalCard}
        contentContainerStyle={styles.modalScrollContent}
        footer={
          <View style={styles.modalFooterStack}>
            <FeedbackSnackbar message={addItemFeedback} />
            <View style={styles.modalActions}>
              <Pressable onPress={closeItemModal} accessibilityRole="button">
                <Text style={styles.cancelText}>
                  {itemModalMode === 'add' ? 'Done' : 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.saveItemBtn, (!canSaveItem || itemModalBusy) && styles.addBtnDisabled]}
                disabled={!canSaveItem || itemModalBusy}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSaveItem || itemModalBusy }}
                onPress={() => void handleSaveItem()}>
                <Text style={styles.saveItemText}>
                  {itemModalMode === 'edit'
                    ? savingItem
                      ? 'Saving…'
                      : 'Save'
                    : addingItem
                      ? 'Adding…'
                      : 'Add'}
                </Text>
              </Pressable>
            </View>
          </View>
        }
        footerStyle={styles.modalFooter}>
            <Text style={styles.modalTitle}>{itemModalMode === 'edit' ? 'Edit Item' : 'Add Item'}</Text>
            <ItemPicker
              selection={pickerSelection}
              refreshKey={pickerRefreshKey}
              categoryHint={newItemCategory}
              onQueryChange={setNewItemName}
              onSelect={(selection) => {
                setPickerSelection(selection);
                setNewItemName(selection.itemName);
                if (selection.category) {
                  setNewItemCategory(selection.category);
                }
                if (selection.suggestedTargetPrice != null) {
                  setNewItemPrice(selection.suggestedTargetPrice.toFixed(2));
                } else if (selection.lastSeen?.price != null) {
                  setNewItemPrice(selection.lastSeen.price.toFixed(2));
                }
              }}
              onClear={() => {
                setPickerSelection(null);
              }}
            />
            {itemModalMode === 'add' ? (
              <>
            <Text style={styles.quickAddLabel}>Common items</Text>
            <HorizontalScrollRow contentContainerStyle={styles.quickAddRow}>
              {quickAddItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.quickAddTile}
                  onPress={() => selectCatalogItem(item.canonicalName, item.category, getGroceryTypicalPrice(item))}>
                  <ItemEmojiAvatar emoji={item.emoji} size="md" />
                  <Text style={styles.quickAddName} numberOfLines={2}>
                    {item.canonicalName}
                  </Text>
                </Pressable>
              ))}
            </HorizontalScrollRow>
            <Text style={styles.quickAddLabel}>Meal kits</Text>
            <HorizontalScrollRow contentContainerStyle={styles.quickAddRow}>
              {MEAL_TEMPLATES.map((template) => (
                <Pressable
                  key={template.id}
                  style={styles.mealChip}
                  onPress={() => void handleMealTemplateAdd(template.id)}>
                  <Text style={styles.mealChipText}>{template.name}</Text>
                </Pressable>
              ))}
            </HorizontalScrollRow>
              </>
            ) : null}
            <TextInput style={styles.input} placeholder="Quantity" value={newItemQty} onChangeText={setNewItemQty} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Price" value={newItemPrice} onChangeText={setNewItemPrice} keyboardType="decimal-pad" />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryChipWrap}>
              {STARTER_CATEGORIES.slice(1).map((category) => {
                const active = newItemCategory === category;
                return (
                  <Pressable
                    key={category}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => syncCustomSelectionCategory(category)}>
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Custom category"
              value={newItemCategory}
              onChangeText={syncCustomSelectionCategory}
            />
      </AppBottomSheetModal>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: SmartCartColors.text, textAlign: 'center' },
  headerSpacer: { width: 72 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  selectText: { fontSize: 13, fontWeight: '700', color: SmartCartColors.primaryDark },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SmartCartColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, paddingBottom: 180, gap: 12 },
  compactSummary: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    ...SmartCartShadow.cardSoft,
  },
  compactSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  compactSummaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.text,
    flexShrink: 1,
  },
  storeBadgeCompact: {
    fontSize: 11,
    fontWeight: '700',
    color: SmartCartColors.primaryDark,
    backgroundColor: SmartCartColors.badge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SmartCartRadius.pill,
  },
  showSuggestionsBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  showSuggestionsBtnPressed: { opacity: 0.85 },
  showSuggestionsText: {
    fontSize: 12,
    fontWeight: '700',
    color: SmartCartColors.primaryDark,
  },
  progressCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    ...SmartCartShadow.card,
  },
  listName: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  listMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  storeBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: SmartCartColors.primaryDark,
    backgroundColor: SmartCartColors.badge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SmartCartRadius.pill,
  },
  listSection: { gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: SmartCartColors.text },
  sectionMeta: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  layoutToggleRow: { flexDirection: 'row', gap: 8 },
  layoutChip: {
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  layoutChipActive: { backgroundColor: SmartCartColors.badge, borderColor: SmartCartColors.primary },
  layoutChipText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary },
  layoutChipTextActive: { color: SmartCartColors.primaryDark },
  listDate: { fontSize: 13, color: SmartCartColors.textSecondary },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 14, marginBottom: 8 },
  progressLabels: { flex: 1, gap: 2 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: SmartCartColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  progressText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  progressHint: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 8 },
  estTotal: { fontSize: 14, fontWeight: '700', color: SmartCartColors.primary },
  categorySection: { marginTop: 2 },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: SmartCartColors.text,
    marginBottom: 8,
  },
  itemGroupCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    overflow: 'hidden',
    ...SmartCartShadow.cardSoft,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  itemRowDivider: {
    borderTopWidth: 1,
    borderTopColor: SmartCartColors.border,
  },
  itemRowSelected: { backgroundColor: SmartCartColors.badge },
  deleteItemBtn: { padding: 4, marginLeft: 4 },
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
  itemThumb: {
    width: 32,
    height: 32,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  itemChecked: {
    textDecorationLine: 'line-through',
    textDecorationColor: SmartCartColors.danger,
    color: SmartCartColors.danger,
  },
  itemQty: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '800', color: SmartCartColors.text },
  emptyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  empty: { textAlign: 'center', color: SmartCartColors.textSecondary, fontSize: 13 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: SmartCartColors.background,
    borderTopWidth: 1,
    borderTopColor: SmartCartColors.border,
  },
  footerContent: { gap: 8 },
  footerSecondaryRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  familyShareBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SmartCartColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.primary,
  },
  saveListBtnPrimary: {
    backgroundColor: SmartCartColors.primary,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.pill,
    alignItems: 'center',
    ...SmartCartShadow.fab,
  },
  completeListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.primaryDark,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.pill,
    ...SmartCartShadow.fab,
  },
  saveListBtnDisabled: { opacity: 0.6 },
  saveListBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  addBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: SmartCartColors.primary,
  },
  addBtnSecondaryText: { color: SmartCartColors.primaryDark, fontWeight: '700', fontSize: 15 },
  addBtnPrimaryEmpty: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 14,
    ...SmartCartShadow.fab,
  },
  addBtnPrimaryEmptyText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addBtnDisabled: { opacity: 0.55 },
  deleteBulkBtn: {
    flex: 1,
    backgroundColor: SmartCartColors.danger,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteBulkBtnDisabled: { opacity: 0.6 },
  deleteBulkBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  barcodeBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SmartCartColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  modalCard: {
    padding: 24,
    gap: 12,
  },
  modalScrollContent: { paddingBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  quickAddLabel: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary },
  quickAddRow: { gap: 8, paddingBottom: 4 },
  quickAddTile: {
    width: 80,
    alignItems: 'center',
    padding: 8,
    borderRadius: SmartCartRadius.sm,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    backgroundColor: SmartCartColors.background,
    gap: 4,
  },
  quickAddName: { fontSize: 10, fontWeight: '600', color: SmartCartColors.text, textAlign: 'center' },
  mealChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.badge,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  mealChipText: { fontSize: 12, fontWeight: '700', color: SmartCartColors.primaryDark },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.sm,
    padding: 12,
    fontSize: 16,
    backgroundColor: SmartCartColors.background,
    color: SmartCartColors.text,
  },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: SmartCartColors.text, marginTop: 2 },
  categoryChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: SmartCartColors.card,
  },
  categoryChipActive: {
    backgroundColor: SmartCartColors.badge,
    borderColor: SmartCartColors.primary,
  },
  categoryChipText: { fontSize: 12, fontWeight: '700', color: SmartCartColors.textSecondary },
  categoryChipTextActive: { color: SmartCartColors.primaryDark },
  modalFooter: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  modalFooterStack: {
    width: '100%',
    gap: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
  },
  cancelText: { fontSize: 16, fontWeight: '600', color: SmartCartColors.textSecondary, padding: 8 },
  saveItemBtn: { backgroundColor: SmartCartColors.primary, borderRadius: SmartCartRadius.sm, paddingHorizontal: 24, paddingVertical: 10 },
  saveItemText: { color: '#fff', fontWeight: '700' },
});
