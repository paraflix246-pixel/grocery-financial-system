import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { getReceipts } from '@/src/services/storageService';
import {
  addStore,
  getAllStores,
  removeStoreFromList,
  setStoreFavorite,
} from '@/src/services/storeService';
import type { StoreDefinition } from '@/src/data/stores';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { StoreLimitError } from '@/src/services/tierLimits';
import { promptStoreLimitReached } from '@/src/utils/promptPantryLimit';
import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import { formatCurrency } from '@/src/utils/priceParser';

type StoreSummary = StoreDefinition & {
  receiptCount: number;
  totalSpent: number;
};

export default function StoresScreen() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreRegion, setNewStoreRegion] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allStores, receipts] = await Promise.all([getAllStores(), getReceipts()]);
      const stats = new Map<string, { count: number; total: number }>();

      for (const receipt of receipts) {
        const key = receipt.storeName.trim().toLowerCase();
        const entry = stats.get(key) ?? { count: 0, total: 0 };
        entry.count += 1;
        entry.total += receipt.total;
        stats.set(key, entry);
      }

      setStores(
        allStores.map((store) => {
          const entry = stats.get(store.name.trim().toLowerCase());
          return {
            ...store,
            receiptCount: entry?.count ?? 0,
            totalSpent: entry?.total ?? 0,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openAddModal() {
    setNewStoreName('');
    setNewStoreRegion('');
    setAddModalOpen(true);
  }

  function closeAddModal() {
    setAddModalOpen(false);
    setNewStoreName('');
    setNewStoreRegion('');
  }

  async function handleAddStore() {
    const name = newStoreName.trim();
    if (!name) {
      Alert.alert('Store name required', 'Enter a store name to add.');
      return;
    }
    setSaving(true);
    try {
      await addStore(name, newStoreRegion.trim() || undefined);
      closeAddModal();
      await load();
    } catch (error) {
      if (error instanceof StoreLimitError) {
        promptStoreLimitReached(() => router.push('/paywall' as never));
        return;
      }
      Alert.alert('Could not add store', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFavorite(store: StoreSummary) {
    await setStoreFavorite(store.id, !store.isFavorite);
    await load();
  }

  function confirmRemoveStore(store: StoreSummary) {
    const receiptNote =
      store.receiptCount > 0
        ? ` Your ${store.receiptCount} receipt${store.receiptCount === 1 ? '' : 's'} from ${store.name} will stay in history.`
        : '';
    confirmDestructiveAction({
      title: `Remove ${store.name}?`,
      message: `Remove this store from your list.${receiptNote}`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        await removeStoreFromList(store);
        await load();
      },
    });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Stores"
        rightAction={
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Add store"
            onPress={openAddModal}>
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              tintColor={SmartCartColors.primary}
              size={22}
            />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SmartCartColors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.lead}>
            Favorite stores appear first. Tap a store to view receipts. Removing a store hides it from
            this list but keeps receipt history.
          </Text>

          {stores.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No stores yet</Text>
              <Text style={styles.emptyBody}>
                Add a store manually or scan a receipt to register one automatically.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.emptyBtn, pressed && styles.emptyBtnPressed]}
                accessibilityRole="button"
                onPress={openAddModal}>
                <Text style={styles.emptyBtnText}>Add a store</Text>
              </Pressable>
            </View>
          ) : (
            stores.map((store) => (
              <View key={store.id} style={styles.storeRow}>
                <Pressable
                  style={({ pressed }) => [styles.favoriteBtn, pressed && styles.iconPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={store.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  onPress={() => handleToggleFavorite(store)}>
                  <SymbolView
                    name={{
                      ios: store.isFavorite ? 'star.fill' : 'star',
                      android: store.isFavorite ? 'star' : 'star_border',
                      web: store.isFavorite ? 'star' : 'star_border',
                    }}
                    tintColor={store.isFavorite ? SmartCartColors.accentOrange : SmartCartColors.textMuted}
                    size={22}
                  />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.storeMain, pressed && styles.storeMainPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${store.name}`}
                  onPress={() => router.push(`/stores/${store.id}` as never)}
                  onLongPress={() => confirmRemoveStore(store)}>
                  <StoreBrandAvatar store={store.name} size={44} />
                  <View style={styles.storeInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.storeName}>{store.name}</Text>
                      {store.isFavorite ? (
                        <View style={styles.favoritePill}>
                          <Text style={styles.favoritePillText}>Favorite</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.storeMeta}>
                      {store.receiptCount} receipt{store.receiptCount === 1 ? '' : 's'}
                      {store.totalSpent > 0 ? ` · ${formatCurrency(store.totalSpent)} total` : ''}
                      {store.region ? ` · ${store.region}` : ''}
                    </Text>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    tintColor={SmartCartColors.textMuted}
                    size={16}
                  />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, pressed && styles.iconPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${store.name}`}
                  onPress={() => confirmRemoveStore(store)}>
                  <SymbolView
                    name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                    tintColor={SmartCartColors.danger}
                    size={20}
                  />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={addModalOpen} animationType="slide" transparent onRequestClose={closeAddModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={closeAddModal} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add store</Text>
            <Text style={styles.modalLabel}>Store name</Text>
            <TextInput
              style={styles.input}
              value={newStoreName}
              onChangeText={setNewStoreName}
              placeholder="e.g. Whole Foods"
              placeholderTextColor={SmartCartColors.textMuted}
              autoFocus
              returnKeyType="next"
            />
            <Text style={styles.modalLabel}>Region (optional)</Text>
            <TextInput
              style={styles.input}
              value={newStoreRegion}
              onChangeText={(value) => setNewStoreRegion(value.toUpperCase())}
              placeholder="e.g. TX"
              placeholderTextColor={SmartCartColors.textMuted}
              autoCapitalize="characters"
              maxLength={2}
              returnKeyType="done"
              onSubmitEditing={() => void handleAddStore()}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
                onPress={closeAddModal}
                disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.saveBtnPressed,
                  saving && styles.saveBtnDisabled,
                ]}
                onPress={() => void handleAddStore()}
                disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Adding…' : 'Add store'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: SmartCartRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SmartCartColors.badge,
  },
  headerBtnPressed: { opacity: 0.8 },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 16 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  favoriteBtn: {
    paddingLeft: 12,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  deleteBtn: {
    paddingRight: 12,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  iconPressed: { opacity: 0.7 },
  storeMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  storeMainPressed: { opacity: 0.85 },
  storeInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  storeName: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  favoritePill: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  favoritePillText: { fontSize: 10, fontWeight: '700', color: SmartCartColors.primaryDark },
  storeMeta: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 3 },
  emptyCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 24,
    alignItems: 'center',
    ...SmartCartShadow.card,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: SmartCartColors.text },
  emptyBody: {
    fontSize: 14,
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnPressed: { opacity: 0.9 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    backgroundColor: SmartCartColors.card,
    borderTopLeftRadius: SmartCartRadius.lg,
    borderTopRightRadius: SmartCartRadius.lg,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    ...SmartCartShadow.card,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: SmartCartColors.text, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: SmartCartColors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.background,
    marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  cancelBtnPressed: { backgroundColor: SmartCartColors.badge },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.textSecondary },
  saveBtn: {
    flex: 1,
    borderRadius: SmartCartRadius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: SmartCartColors.primary,
  },
  saveBtnPressed: { opacity: 0.9 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
