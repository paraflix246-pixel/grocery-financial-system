import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { AppHeader } from '@/src/components/AppHeader';
import { STARTER_LIST_ITEMS } from '@/src/data/starterListItems';
import { createListItem } from '@/src/services/storageService';
import { useListStore } from '@/src/store/useListStore';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency, sumPlannedTotal } from '@/src/utils/priceParser';

const TAB_BAR_PADDING = Platform.OS === 'web' ? 88 : 24;

export default function ListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lists = useListStore((s) => s.lists);
  const activeListId = useListStore((s) => s.activeListId);
  const loading = useListStore((s) => s.loading);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [itemsTick, setItemsTick] = useState(0);
  const loadedListIds = useRef(new Set<string>());

  const listIdsKey = useMemo(
    () =>
      lists
        .map((list) => list.id)
        .sort()
        .join(','),
    [lists]
  );

  async function createWeeklyShoppingList(withStarterItems: boolean) {
    if (creating) return;
    setCreating(true);
    try {
      const list = await useListStore.getState().addList('Weekly Shopping');
      if (withStarterItems) {
        await Promise.all(
          STARTER_LIST_ITEMS.map((item, index) =>
            createListItem(list.id, {
              name: item.name,
              expectedPrice: item.expectedPrice,
              quantity: item.quantity,
              category: item.category,
              storePreference: item.storePreference,
              sortOrder: index,
            })
          )
        );
        await useListStore.getState().loadListItems(list.id);
      }
      router.push(`/list/${list.id}`);
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const currentLists = useListStore.getState().lists;
    const currentIds = new Set(currentLists.map((list) => list.id));
    for (const id of loadedListIds.current) {
      if (!currentIds.has(id)) {
        loadedListIds.current.delete(id);
      }
    }

    const pending = currentLists
      .filter((list) => !loadedListIds.current.has(list.id))
      .map((list) => {
        loadedListIds.current.add(list.id);
        return useListStore.getState().loadListItems(list.id);
      });

    if (pending.length === 0) return undefined;

    void Promise.all(pending).then(() => {
      if (!cancelled) setItemsTick((tick) => tick + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [listIdsKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      loadedListIds.current.clear();
      const currentLists = useListStore.getState().lists;
      await useListStore.getState().loadLists();
      await Promise.all(
        currentLists.map((list) => useListStore.getState().loadListItems(list.id))
      );
      setItemsTick((tick) => tick + 1);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading && lists.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={SmartCartColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerWrap}>
        <AppHeader />
      </View>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Grocery List</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Create blank list"
            disabled={creating}
            onPress={async () => {
              if (creating) return;
              setCreating(true);
              try {
                const list = await useListStore.getState().addList('Weekly Shopping');
                router.push(`/list/${list.id}`);
              } finally {
                setCreating(false);
              }
            }}>
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={SmartCartColors.text} size={22} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        extraData={itemsTick}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_PADDING }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SmartCartColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Build your first grocery list</Text>
            <Text style={styles.empty}>
              Start with common weekly items, then check off what you plan to buy.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.createBtn, pressed && styles.pressed, creating && styles.disabled]}
              accessibilityRole="button"
              disabled={creating}
              onPress={() => createWeeklyShoppingList(true)}>
              <Text style={styles.createBtnText}>Create Weekly Shopping</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.blankBtn, pressed && styles.outlinePressed, creating && styles.disabled]}
              accessibilityRole="button"
              disabled={creating}
              onPress={() => createWeeklyShoppingList(false)}>
              <Text style={styles.blankBtnText}>Start Blank</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const items = useListStore.getState().itemsByList[item.id] ?? [];
          const planned = sumPlannedTotal(items);
          const isActive = item.id === activeListId;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                isActive && styles.activeCard,
                pressed && styles.outlinePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.name}`}
              onPress={() => router.push(`/list/${item.id}`)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {items.length} items · {formatCurrency(planned)} est.
              </Text>
              {isActive && <Text style={styles.activeBadge}>Active</Text>}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SmartCartColors.background,
    ...(Platform.OS === 'web' ? { overflow: 'hidden' as const } : null),
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SmartCartColors.background },
  headerWrap: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: SmartCartColors.text },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SmartCartColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  list: { padding: 16, paddingTop: 0 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 20 },
  emptyTitle: { textAlign: 'center', color: SmartCartColors.text, fontSize: 20, fontWeight: '800' },
  empty: { textAlign: 'center', color: SmartCartColors.textSecondary, fontSize: 15, lineHeight: 21 },
  createBtn: {
    backgroundColor: SmartCartColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 2,
    borderColor: SmartCartColors.primaryDark,
    minWidth: 240,
    alignItems: 'center',
    ...SmartCartShadow.pill,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  blankBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.card,
    borderWidth: 2,
    borderColor: SmartCartColors.primary,
    minWidth: 240,
    alignItems: 'center',
  },
  blankBtnText: { color: SmartCartColors.primaryDark, fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.card,
  },
  activeCard: { borderWidth: 2, borderColor: SmartCartColors.primary },
  cardTitle: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  cardMeta: { marginTop: 6, color: SmartCartColors.textSecondary, fontSize: 14 },
  activeBadge: { marginTop: 8, color: SmartCartColors.primary, fontWeight: '700', fontSize: 12 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  outlinePressed: {
    backgroundColor: SmartCartColors.badge,
    borderColor: SmartCartColors.primaryDark,
  },
  disabled: { opacity: 0.6 },
});
