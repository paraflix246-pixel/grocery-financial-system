import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,

  Platform,

  Pressable,

  RefreshControl,

  ScrollView,

  StyleSheet,

  View,

} from 'react-native';

import { SymbolView } from 'expo-symbols';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';



import { Text } from '@/components/Themed';

import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';

import { CreateShoppingListBanner } from '@/src/components/CreateShoppingListBanner';

import { AppHeader } from '@/src/components/AppHeader';

import { MockupSectionLabel } from '@/src/components/mockup/MockupUI';

import { ListTemplateRow } from '@/src/components/shoppingLists/ListTemplateRow';

import { ShoppingListCard } from '@/src/components/shoppingLists/ShoppingListCard';

import {

  buildListDifferentiator,

  getListItemCount,

  sortListsForDisplay,

} from '@/src/components/shoppingLists/shoppingListDisplay';

import { STARTER_LIST_ITEMS } from '@/src/data/starterListItems';

import { LIST_TEMPLATES } from '@/src/data/listTemplates';

import { getGroceryItemByCanonical, getGroceryTypicalPrice } from '@/src/data/groceryCatalog';

import { createListItem } from '@/src/services/storageService';

import { getCustomCatalogEntries } from '@/src/services/customCatalogService';

import type { CustomCatalogEntry } from '@/src/services/customCatalogLogic';

import { getFrequentPurchasedItems } from '@/src/services/priceRecommendationService';

import { getFrequentItemsForStore } from '@/src/services/storeMemoryService';

import type { StoreDefinition } from '@/src/data/stores';

import type { GroceryList } from '@/src/models/types';

import { getAllStores } from '@/src/services/storeService';

import { getLastOpenedListId, getOpenLastListPreference, consumeSkipOpenLastList } from '@/src/utils/listNavigationPrefs';

import { suggestNewListName } from '@/src/utils/shoppingListCreate';

import { confirmDestructiveAction } from '@/src/utils/confirmDelete';

import { useListStore } from '@/src/store/useListStore';

import { loadCheckedIds, saveCheckedIds } from '@/src/utils/listCheckedStorage';

import { useFeatureGate } from '@/src/hooks/useFeatureGate';

import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography } from '@/src/theme/smartCart';
import { getTabScreenScrollBottomPadding } from '@/src/utils/safeAreaLayout';



export default function ListsScreen() {

  const { t } = useTranslation();
  const router = useRouter();

  const { action, browse } = useLocalSearchParams<{ action?: string; browse?: string }>();

  const insets = useSafeAreaInsets();

  const lists = useListStore((s) => s.lists);

  const activeListId = useListStore((s) => s.activeListId);

  const loading = useListStore((s) => s.loading);

  const itemsByList = useListStore((s) => s.itemsByList);

  const { unlocked: familyShareUnlocked, requestAccess: requestFamilyShare } = useFeatureGate('family_plans');

  const [refreshing, setRefreshing] = useState(false);

  const [creating, setCreating] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [storeOptions, setStoreOptions] = useState<StoreDefinition[]>([]);

  const [selectedStore, setSelectedStore] = useState<StoreDefinition | null>(null);

  const [checkedIdsByList, setCheckedIdsByList] = useState<Record<string, Set<string>>>({});

  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  const [customCatalogByKey, setCustomCatalogByKey] = useState<Map<string, CustomCatalogEntry>>(new Map());



  const loadedListIds = useRef(new Set<string>());

  const [itemsTick, setItemsTick] = useState(0);

  const listIdsKey = useMemo(

    () =>

      lists

        .map((list) => list.id)

        .sort()

        .join(','),

    [lists]

  );



  const displayLists = useMemo(
    () => sortListsForDisplay(lists),
    [lists]
  );

  useEffect(() => {
    if (displayLists.length === 0) {
      setExpandedListId(null);
      return;
    }
    setExpandedListId((current) => {
      if (current && displayLists.some((list) => list.id === current)) return current;
      return displayLists[0].id;
    });
  }, [displayLists]);



  useFocusEffect(

    useCallback(() => {

      void getAllStores().then(setStoreOptions);

      void (async () => {

        if (consumeSkipOpenLastList() || browse === '1') return;

        const shouldOpenLast = await getOpenLastListPreference();

        if (!shouldOpenLast) return;

        const lastId = await getLastOpenedListId();

        if (lastId && lists.some((list) => list.id === lastId)) {

          router.push(`/list/${lastId}`);

        }

      })();

    }, [lists, router, browse])

  );

  useEffect(() => {
    if (action === 'create') {
      setShowCreateModal(true);
    }
  }, [action]);



  async function seedRecurringItems(listId: string, storeName?: string) {

    const frequent = storeName

      ? await getFrequentItemsForStore(storeName, 5)

      : (await getFrequentPurchasedItems(5)).map((item) => ({

          name: item.name,

          purchaseCount: item.purchaseCount,

        }));

    await Promise.all(

      frequent.map((item, index) => {

        const catalog = getGroceryItemByCanonical(item.name);

        return createListItem(listId, {

          name: item.name,

          expectedPrice: catalog ? getGroceryTypicalPrice(catalog) : 0,

          quantity: 1,

          category: catalog?.category ?? 'Pantry',

          sortOrder: index,

        });

      })

    );

    await useListStore.getState().loadListItems(listId);

  }



  async function createFromTemplate(templateId: string) {

    if (creating) return;

    setCreating(true);

    try {

      const template = LIST_TEMPLATES.find((entry) => entry.id === templateId);

      if (!template) return;

      const list = await useListStore.getState().addList(template.name, {

        storeId: template.storeId,

        storeName: template.storeName,

        recurrence: template.recurrence,

        layoutMode: template.storeName ? 'store' : 'category',

        setActive: true,

      });

      if (template.recurrence) {

        await seedRecurringItems(list.id, template.storeName);

      }

      router.push(`/list/${list.id}`);

    } finally {

      setCreating(false);

    }

  }



  async function createListWithOptions(name: string, store?: StoreDefinition | null) {

    if (creating) return;

    setCreating(true);

    try {

      const list = await useListStore.getState().addList(name, {

        storeId: store?.id,

        storeName: store?.name,

        layoutMode: store ? 'store' : 'category',

        setActive: true,

      });

      await useListStore.getState().activateList(list.id);

      setShowCreateModal(false);

      setSelectedStore(null);

      router.push(`/list/${list.id}`);

    } finally {

      setCreating(false);

    }

  }



  async function createWeeklyShoppingList(withStarterItems: boolean) {

    if (creating) return;

    setCreating(true);

    try {

      const list = await useListStore.getState().addList(suggestNewListName(useListStore.getState().lists));

      await useListStore.getState().activateList(list.id);

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



  useEffect(() => {

    if (lists.length === 0) {

      setCheckedIdsByList({});

      return;

    }



    let cancelled = false;

    void (async () => {

      const [checkedEntries, customEntries] = await Promise.all([

        Promise.all(

          lists.map(async (list) => [list.id, await loadCheckedIds(list.id)] as const)

        ),

        getCustomCatalogEntries(),

      ]);

      if (cancelled) return;

      setCheckedIdsByList(Object.fromEntries(checkedEntries));

      setCustomCatalogByKey(new Map(customEntries.map((entry) => [entry.itemKey, entry])));

    })();



    return () => {

      cancelled = true;

    };

  }, [listIdsKey]);



  const toggleItemChecked = useCallback(

    async (listId: string, itemId: string) => {

      setCheckedIdsByList((prev) => {

        const current = prev[listId] ?? new Set<string>();

        const next = new Set(current);

        if (next.has(itemId)) next.delete(itemId);

        else next.add(itemId);

        void saveCheckedIds(listId, next);

        return { ...prev, [listId]: next };

      });

    },

    []

  );



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



  const openList = useCallback(

    async (listId: string, options?: { add?: boolean }) => {

      await useListStore.getState().activateList(listId);

      const query = options?.add ? '?add=1' : '';

      router.push(`/list/${listId}${query}`);

    },

    [router]

  );

  const shareListWithFamily = useCallback(
    (listId: string) => {
      if (!requestFamilyShare()) return;
      router.push(`/list/share?listId=${listId}` as never);
    },
    [requestFamilyShare, router]
  );



  const listOptions = useCallback(

    (list: GroceryList) => ({

      onActivate: async () => {
        await useListStore.getState().activateList(list.id);
        setItemsTick((tick) => tick + 1);
      },

      onRename: async (name: string) => {
        await useListStore.getState().renameList(list.id, name);
        setItemsTick((tick) => tick + 1);
      },

      onComplete: async () => {
        const items = useListStore.getState().itemsByList[list.id] ?? [];
        if (items.length > 0) {
          const allChecked = new Set(items.map((item) => item.id));
          await saveCheckedIds(list.id, allChecked);
          if (activeListId === list.id) {
            setCheckedIdsByList((prev) => ({ ...prev, [list.id]: allChecked }));
          }
        }
        await useListStore.getState().completeList(list.id);
        setItemsTick((tick) => tick + 1);
      },

      onDelete: async () => {
        await useListStore.getState().removeList(list.id);
        setItemsTick((tick) => tick + 1);
      },

      onShare: () => shareListWithFamily(list.id),

    }),

    [activeListId, shareListWithFamily]

  );



  function confirmDeleteAllEmpty() {

    const emptyLists = lists.filter((list) => getListItemCount(list.id, itemsByList) === 0);

    if (emptyLists.length === 0) return;

    confirmDestructiveAction({

      title: 'Delete all empty lists?',

      message: `Permanently delete ${emptyLists.length} empty list${emptyLists.length === 1 ? '' : 's'}? This cannot be undone.`,

      onConfirm: async () => {

        await Promise.all(emptyLists.map((list) => useListStore.getState().removeList(list.id)));

      },

    });

  }



  function renderHeroList(list: GroceryList) {

    const items = itemsByList[list.id] ?? [];

    const itemCount = getListItemCount(list.id, itemsByList);

    const subtitle = buildListDifferentiator(list, lists, itemCount);



    return (

      <ShoppingListCard

        key={list.id}

        list={list}

        items={items}

        variant="hero"

        isActive={list.id === activeListId}

        inlineItems

        expanded={list.id === expandedListId}

        onToggleExpand={() => setExpandedListId(list.id)}

        checkedIds={checkedIdsByList[list.id] ?? new Set()}

        onToggleChecked={(itemId) => void toggleItemChecked(list.id, itemId)}

        onItemPress={() => openList(list.id)}

        customCatalogByKey={customCatalogByKey}

        subtitle={subtitle}

        onOpen={() => openList(list.id)}

        onAddItem={() => openList(list.id, { add: true })}

        options={listOptions(list)}

        familyShareUnlocked={familyShareUnlocked}

      />

    );

  }



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

        <View style={styles.titleBlock}>

          <Text style={styles.pageTitle}>{t('lists.title')}</Text>

          <Text style={styles.pageSubtitle}>{t('lists.subtitle')}</Text>

        </View>

        <Pressable

          style={({ pressed }) => [styles.newListBtn, pressed && styles.pressed, creating && styles.disabled]}

          accessibilityRole="button"

          accessibilityLabel={t('lists.createNewA11y')}

          disabled={creating}

          onPress={() => setShowCreateModal(true)}>

          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor="#fff" size={16} />

          <Text style={styles.newListBtnText}>New list</Text>

        </Pressable>

      </View>



      <ScrollView

        key={itemsTick}

        contentContainerStyle={[styles.list, { paddingBottom: getTabScreenScrollBottomPadding(insets.bottom) }]}

        refreshControl={

          Platform.OS === 'web' ? undefined : (

            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SmartCartColors.primary} />

          )

        }>

        {lists.length === 0 ? (

          <View style={styles.emptyWrap}>

            <CreateShoppingListBanner
              variant="empty"
              onPress={() => setShowCreateModal(true)}
            />

            <MockupSectionLabel>Or pick a quick-start template</MockupSectionLabel>

            <ListTemplateRow onSelect={createFromTemplate} disabled={creating} />

            <Pressable

              style={({ pressed }) => [styles.createBtn, pressed && styles.pressed, creating && styles.disabled]}

              accessibilityRole="button"

              disabled={creating}

              onPress={() => createWeeklyShoppingList(true)}>

              <Text style={styles.createBtnText}>Start with weekly staples</Text>
            </Pressable>

            <Pressable

              style={({ pressed }) => [styles.blankBtn, pressed && styles.outlinePressed, creating && styles.disabled]}

              accessibilityRole="button"

              disabled={creating}

              onPress={() => createWeeklyShoppingList(false)}>

              <Text style={styles.blankBtnText}>Blank list</Text>

            </Pressable>

          </View>

        ) : (

          <>

            {!familyShareUnlocked ? (
              <Pressable
                style={({ pressed }) => [styles.familyShareBanner, pressed && styles.familyShareBannerPressed]}
                accessibilityRole="button"
                accessibilityLabel="Upgrade to Pro to share lists with your household"
                onPress={() => requestFamilyShare()}>
                <View style={styles.familyShareBannerIcon}>
                  <SymbolView
                    name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                    tintColor={SmartCartColors.primaryDark}
                    size={18}
                  />
                </View>
                <View style={styles.familyShareBannerCopy}>
                  <Text style={styles.familyShareBannerTitle}>Share lists with your household</Text>
                  <Text style={styles.familyShareBannerSub}>Upgrade to Pro</Text>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={SmartCartColors.primaryDark}
                  size={16}
                />
              </Pressable>
            ) : null}

            {displayLists.map((list) => renderHeroList(list))}



            <View style={styles.section}>

              <MockupSectionLabel>Quick templates</MockupSectionLabel>

              <Text style={styles.sectionHint}>One tap to create a store-ready list</Text>

              <ListTemplateRow onSelect={createFromTemplate} disabled={creating} />

            </View>



            <Text style={styles.footerHint}>

              Tap a list to expand it. Use ⋯ to rename, share, complete, or delete.

            </Text>

          </>

        )}

      </ScrollView>



      <AppBottomSheetModal

        visible={showCreateModal}

        onClose={() => {

          setShowCreateModal(false);

          setSelectedStore(null);

        }}

        cardStyle={styles.createModal}>

        <Text style={styles.createModalTitle}>New shopping list</Text>

        <Text style={styles.createModalHint}>Link a store for layout and buy-again suggestions, or keep it general.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeChipRow}>

          <Pressable

            style={[styles.storeChip, !selectedStore && styles.storeChipActive]}

            onPress={() => setSelectedStore(null)}>

            <Text style={[styles.storeChipText, !selectedStore && styles.storeChipTextActive]}>Any store</Text>

          </Pressable>

          {storeOptions.slice(0, 12).map((store) => {

            const active = selectedStore?.id === store.id;

            return (

              <Pressable

                key={store.id}

                style={[styles.storeChip, active && styles.storeChipActive]}

                onPress={() => setSelectedStore(store)}>

                <Text style={[styles.storeChipText, active && styles.storeChipTextActive]} numberOfLines={1}>

                  {store.name}

                </Text>

              </Pressable>

            );

          })}

        </ScrollView>

        <Pressable

          style={[styles.createBtn, creating && styles.disabled]}

          disabled={creating}

          onPress={() =>
            void createListWithOptions(suggestNewListName(useListStore.getState().lists), selectedStore)
          }>

          <Text style={styles.createBtnText}>{t('lists.createList')}</Text>

        </Pressable>

      </AppBottomSheetModal>

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

    alignItems: 'flex-start',

    paddingHorizontal: 16,

    marginBottom: 8,

    gap: 12,

  },

  titleBlock: { flex: 1 },

  pageTitle: { fontSize: 28, ...SmartCartTypography.display, color: SmartCartColors.text },

  pageSubtitle: { fontSize: 14, color: SmartCartColors.textSecondary, marginTop: 2 },

  newListBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    backgroundColor: SmartCartColors.primary,

    paddingHorizontal: 14,

    paddingVertical: 10,

    borderRadius: SmartCartRadius.pill,

    borderWidth: 2,

    borderColor: SmartCartColors.primaryDark,

    ...SmartCartShadow.pill,

  },

  newListBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  list: { padding: 16, paddingTop: 4 },

  familyShareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    ...SmartCartShadow.cardSoft,
  },

  familyShareBannerPressed: { backgroundColor: '#DCFCE7' },

  familyShareBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22, 101, 52, 0.15)',
  },

  familyShareBannerCopy: { flex: 1 },

  familyShareBannerTitle: { fontSize: 14, fontWeight: '800', color: SmartCartColors.primaryDark },

  familyShareBannerSub: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary, marginTop: 2 },

  section: { marginBottom: 20 },

  sectionHint: { fontSize: 13, color: SmartCartColors.textMuted, marginBottom: 10, marginTop: -4 },

  collapsibleHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 4,

    gap: 8,

  },

  collapsibleHeaderMain: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

  },

  deleteAllBtn: {

    paddingHorizontal: 10,

    paddingVertical: 6,

    borderRadius: SmartCartRadius.pill,

    borderWidth: 1,

    borderColor: '#FECACA',

    backgroundColor: '#FEF2F2',

  },

  deleteAllBtnText: { fontSize: 11, fontWeight: '700', color: SmartCartColors.danger },

  footerHint: {

    fontSize: 12,

    color: SmartCartColors.textMuted,

    textAlign: 'center',

    marginTop: 4,

    marginBottom: 8,

  },

  emptyWrap: { alignItems: 'stretch', marginTop: 24, gap: 12 },

  createBtn: {

    backgroundColor: SmartCartColors.primary,

    paddingHorizontal: 24,

    paddingVertical: 14,

    borderRadius: SmartCartRadius.pill,

    borderWidth: 2,

    borderColor: SmartCartColors.primaryDark,

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

    alignItems: 'center',

  },

  blankBtnText: { color: SmartCartColors.primaryDark, fontWeight: '700', fontSize: 15 },

  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },

  outlinePressed: { backgroundColor: SmartCartColors.badge },

  disabled: { opacity: 0.6 },

  createModal: { padding: 24, gap: 12 },

  createModalTitle: { fontSize: 18, fontWeight: '800', color: SmartCartColors.text },

  createModalHint: { fontSize: 13, color: SmartCartColors.textSecondary, lineHeight: 18 },

  storeChipRow: { gap: 8, paddingVertical: 4 },

  storeChip: {

    paddingHorizontal: 12,

    paddingVertical: 8,

    borderRadius: SmartCartRadius.pill,

    backgroundColor: SmartCartColors.card,

    borderWidth: 1,

    borderColor: SmartCartColors.border,

    maxWidth: 140,

  },

  storeChipActive: { backgroundColor: SmartCartColors.badge, borderColor: SmartCartColors.primary },

  storeChipText: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary },

  storeChipTextActive: { color: SmartCartColors.primaryDark },

});


