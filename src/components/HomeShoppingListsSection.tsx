import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { MockupSectionLabel } from '@/src/components/mockup/MockupUI';
import { ShoppingListCard } from '@/src/components/shoppingLists/ShoppingListCard';
import {
  buildListDifferentiator,
  getListItemCount,
  partitionLists,
} from '@/src/components/shoppingLists/shoppingListDisplay';
import { useFocusReload } from '@/src/hooks/useFocusReload';
import { useListStore } from '@/src/store/useListStore';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { skipOpenLastListOnNextFocus } from '@/src/utils/listNavigationPrefs';
import { sumPlannedTotal, formatCurrency } from '@/src/utils/priceParser';

const PREVIEW_LIST_LIMIT = 3;

export function HomeShoppingListsSection() {
  const router = useRouter();
  const lists = useListStore((s) => s.lists);
  const activeListId = useListStore((s) => s.activeListId);
  const itemsByList = useListStore((s) => s.itemsByList);
  const loadedListIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    await useListStore.getState().loadLists();
    const { lists: currentLists, activeListId: activeId } = useListStore.getState();
    const idsToLoad = currentLists
      .slice(0, PREVIEW_LIST_LIMIT + 1)
      .map((list) => list.id)
      .filter((id) => !loadedListIds.current.has(id));
    await Promise.all(
      idsToLoad.map(async (id) => {
        await useListStore.getState().loadListItems(id);
        loadedListIds.current.add(id);
      })
    );
    if (activeId && !loadedListIds.current.has(activeId)) {
      await useListStore.getState().loadListItems(activeId);
      loadedListIds.current.add(activeId);
    }
  }, []);

  useFocusReload(load);

  useEffect(() => {
    void load();
  }, [load, lists.length, activeListId]);

  const { activeList, populatedLists } = useMemo(
    () => partitionLists(lists, activeListId, itemsByList),
    [lists, activeListId, itemsByList]
  );

  const previewLists = useMemo(() => {
    const others = populatedLists.slice(0, PREVIEW_LIST_LIMIT);
    return others;
  }, [populatedLists]);

  if (lists.length === 0) return null;

  function openList(listId: string, add?: boolean) {
    router.push(add ? (`/list/${listId}?add=1` as never) : (`/list/${listId}` as never));
  }

  function listSubtitle(list: (typeof lists)[number]) {
    const items = itemsByList[list.id] ?? [];
    const count = items.length;
    const est = sumPlannedTotal(items);
    const estLabel = est > 0 ? ` · ${formatCurrency(est)} est.` : '';
    const differentiator = buildListDifferentiator(list, lists, count);
    if (differentiator) return differentiator;
    return `${count} item${count === 1 ? '' : 's'}${estLabel}`;
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Shopping Lists</Text>
          <Text style={styles.subtitle}>Plan trips, track totals, shop smarter</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, pressed && styles.viewAllPressed]}
          onPress={() => {
            skipOpenLastListOnNextFocus();
            router.push('/(tabs)/shopping-lists?browse=1' as never);
          }}
          accessibilityRole="button"
          accessibilityLabel="View all shopping lists">
          <Text style={styles.viewAllText}>View all</Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={SmartCartColors.primary}
            size={14}
          />
        </Pressable>
      </View>

      {activeList ? (
        <ShoppingListCard
          list={activeList}
          items={itemsByList[activeList.id] ?? []}
          variant="hero"
          subtitle={listSubtitle(activeList)}
          onOpen={() => openList(activeList.id)}
          onAddItem={() => openList(activeList.id, true)}
        />
      ) : null}

      {previewLists.length > 0 ? (
        <View style={styles.listGroup}>
          <MockupSectionLabel>Your lists</MockupSectionLabel>
          {previewLists.map((list) => (
            <ShoppingListCard
              key={list.id}
              list={list}
              items={itemsByList[list.id] ?? []}
              variant="default"
              subtitle={listSubtitle(list)}
              onOpen={() => openList(list.id)}
            />
          ))}
        </View>
      ) : null}

      <Text style={styles.hint}>Tap ⋯ on any list to rename or delete.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: SmartCartColors.text,
  },
  subtitle: {
    fontSize: 12,
    color: SmartCartColors.textSecondary,
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.badge,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  viewAllPressed: { opacity: 0.9 },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: SmartCartColors.primaryDark,
  },
  listGroup: { gap: 0 },
  hint: {
    fontSize: 11,
    color: SmartCartColors.textMuted,
    lineHeight: 16,
  },
});
