import AsyncStorage from '@react-native-async-storage/async-storage';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { CategoryPills } from '@/src/components/CategoryPills';
import { LinearProgressBar } from '@/src/components/LinearProgressBar';
import { STARTER_CATEGORIES, getQuantityLabel } from '@/src/data/starterListItems';
import type { ListItem } from '@/src/models/types';
import {
  createListItem,
  deleteListItem,
  getListById,
} from '@/src/services/storageService';
import { useListStore } from '@/src/store/useListStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';
import { formatCurrency, sumPlannedTotal } from '@/src/utils/priceParser';

const CHECKED_KEY = (listId: string) => `list_checked_${listId}`;

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = id ?? '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshItems, itemsByList } = useListStore();
  const [listName, setListName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Produce');

  const items = itemsByList[listId] ?? [];

  const load = useCallback(async () => {
    if (!listId || listId === 'new') return;
    setLoading(true);
    const list = await getListById(listId);
    setListName(list?.name ?? 'Weekly Shopping');
    await useListStore.getState().activateList(listId);
    await refreshItems(listId);
    const stored = await AsyncStorage.getItem(CHECKED_KEY(listId));
    if (stored) setCheckedIds(new Set(JSON.parse(stored) as string[]));
    setLoading(false);
  }, [listId, refreshItems]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleChecked = async (itemId: string) => {
    const next = new Set(checkedIds);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setCheckedIds(next);
    await AsyncStorage.setItem(CHECKED_KEY(listId), JSON.stringify([...next]));
  };

  const categories = useMemo(() => {
    const cats = new Set([...STARTER_CATEGORIES.slice(1), ...items.map((i) => i.category || 'Other')]);
    return [
      { label: 'All', count: items.length },
      ...Array.from(cats).map((c) => ({
        label: c,
        count: items.filter((i) => (i.category || 'Other') === c).length,
      })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return items;
    return items.filter((i) => (i.category || 'Other') === selectedCategory);
  }, [items, selectedCategory]);

  const grouped = useMemo(() => {
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
  }, [filteredItems]);

  const checkedCount = items.filter((i) => checkedIds.has(i.id)).length;
  const plannedTotal = sumPlannedTotal(items);

  function openAddModal(category = selectedCategory) {
    if (category && category !== 'All') setNewItemCategory(category);
    setShowAddModal(true);
  }

  async function handleAddItem() {
    const name = newItemName.trim();
    if (!name || !listId) return;
    await createListItem(listId, {
      name,
      expectedPrice: parseFloat(newItemPrice) || 0,
      quantity: parseFloat(newItemQty) || 1,
      category: newItemCategory,
    });
    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
    setShowAddModal(false);
    await refreshItems(listId);
  }

  async function handleDeleteItem(itemId: string) {
    await deleteListItem(itemId);
    const next = new Set(checkedIds);
    next.delete(itemId);
    setCheckedIds(next);
    await AsyncStorage.setItem(CHECKED_KEY(listId), JSON.stringify([...next]));
    await refreshItems(listId);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={SmartCartColors.text} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>My Grocery List</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => openAddModal()}>
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={SmartCartColors.text} size={20} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() =>
              Alert.alert(listName, 'List options', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear checked', onPress: () => { setCheckedIds(new Set()); AsyncStorage.removeItem(CHECKED_KEY(listId)); } },
              ])
            }>
            <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} tintColor={SmartCartColors.text} size={20} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressCard}>
          <Text style={styles.listName}>{listName}</Text>
          <Text style={styles.listDate}>{formatDisplayDate(new Date().toISOString().split('T')[0])}</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {checkedCount} of {items.length} items
            </Text>
            <Text style={styles.estTotal}>{formatCurrency(plannedTotal)} est.</Text>
          </View>
          <LinearProgressBar percent={items.length > 0 ? checkedCount / items.length : 0} height={6} />
        </View>

        <CategoryPills
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {grouped.map(([category, catItems]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.itemGroupCard}>
            {catItems.map((item, index) => {
              const checked = checkedIds.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={[styles.itemRow, index > 0 && styles.itemRowDivider]}
                  onPress={() => toggleChecked(item.id)}
                  onLongPress={() =>
                    Alert.alert(item.name, undefined, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteItem(item.id) },
                    ])
                  }>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && (
                      <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} tintColor="#fff" size={14} />
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, checked && styles.itemChecked]}>{item.name}</Text>
                    <Text style={styles.itemQty}>
                      {getQuantityLabel(item.name, item.quantity)}
                    </Text>
                  </View>
                  <Text style={[styles.itemPrice, checked && styles.itemChecked]}>
                    {formatCurrency(item.expectedPrice * item.quantity)}
                  </Text>
                </Pressable>
              );
            })}
            </View>
          </View>
        ))}

        {items.length === 0 && (
          <Text style={styles.empty}>No items yet — tap + Add Item below.</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.addBtn} onPress={() => openAddModal()}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor="#fff" size={20} />
          <Text style={styles.addBtnText}>Add Item</Text>
        </Pressable>
        <Pressable style={styles.barcodeBtn} onPress={() => router.push('/(tabs)/scan')}>
          <SymbolView name={{ ios: 'barcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }} tintColor={SmartCartColors.primary} size={24} />
        </Pressable>
      </View>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Item</Text>
            <TextInput style={styles.input} placeholder="Item name" value={newItemName} onChangeText={setNewItemName} />
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
                    onPress={() => setNewItemCategory(category)}>
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput style={styles.input} placeholder="Custom category" value={newItemCategory} onChangeText={setNewItemCategory} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveItemBtn} onPress={handleAddItem}>
                <Text style={styles.saveItemText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SmartCartColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, paddingBottom: 120, gap: 14 },
  progressCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    ...SmartCartShadow.card,
  },
  listName: { fontSize: 20, fontWeight: '800', color: SmartCartColors.text },
  listDate: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  progressText: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text },
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
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  itemChecked: { textDecorationLine: 'line-through', color: SmartCartColors.textMuted },
  itemQty: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '800', color: SmartCartColors.text },
  empty: { textAlign: 'center', color: SmartCartColors.textSecondary, marginTop: 24 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: SmartCartColors.background,
    borderTopWidth: 1,
    borderTopColor: SmartCartColors.border,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 16,
    ...SmartCartShadow.fab,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: SmartCartColors.card,
    borderTopLeftRadius: SmartCartRadius.lg,
    borderTopRightRadius: SmartCartRadius.lg,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
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
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  cancelText: { fontSize: 16, fontWeight: '600', color: SmartCartColors.textSecondary, padding: 8 },
  saveItemBtn: { backgroundColor: SmartCartColors.primary, borderRadius: SmartCartRadius.sm, paddingHorizontal: 24, paddingVertical: 10 },
  saveItemText: { color: '#fff', fontWeight: '700' },
});
