import { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { AppBottomSheetModal } from '@/src/components/AppBottomSheetModal';
import { MockupCard } from '@/src/components/mockup/MockupUI';
import { StoreBrandAvatar } from '@/src/components/StoreBrandAvatar';
import { LinearProgressBar } from '@/src/components/LinearProgressBar';
import type { GroceryList, ListItem } from '@/src/models/types';
import type { CustomCatalogEntry } from '@/src/services/customCatalogLogic';
import { ShoppingListItemRow } from '@/src/components/shoppingLists/ShoppingListItemRow';
import { SmartCartColors, SmartCartRadius, SmartCartShadow, SmartCartTypography, STORE_BRAND } from '@/src/theme/smartCart';
import { confirmDestructiveAction } from '@/src/utils/confirmDelete';
import { formatCurrency, sumPlannedTotal } from '@/src/utils/priceParser';

type ListOptionsHandlers = {
  onActivate: () => void | Promise<void>;
  onRename: (name: string) => void | Promise<void>;
  onComplete: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onShare?: () => void | Promise<void>;
};

type Props = {
  list: GroceryList;
  items: ListItem[];
  variant?: 'hero' | 'default' | 'muted';
  isActive?: boolean;
  subtitle?: string;
  onOpen: () => void;
  onAddItem?: () => void;
  options?: ListOptionsHandlers;
  checkedIds?: Set<string>;
  onToggleChecked?: (itemId: string) => void;
  onItemPress?: (item: ListItem) => void;
  customCatalogByKey?: Map<string, CustomCatalogEntry>;
  /** When true (hero only), renders list items inline inside the active banner. */
  inlineItems?: boolean;
  /** Hero accordion: when false, shows a compact row until expanded. Defaults to true. */
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Shows a trash icon for one-tap delete (empty lists section). */
  showQuickDelete?: boolean;
  /** When false, share actions show a Pro label. */
  familyShareUnlocked?: boolean;
};

function confirmDeleteList(list: GroceryList, itemCount: number, onDelete: () => void) {
  const listKind = list.storeName ? 'store list' : 'list';
  const itemsNote =
    itemCount > 0
      ? ` and all ${itemCount} item${itemCount === 1 ? '' : 's'}`
      : '';
  const storeNote = list.storeName ? ` (${list.storeName})` : '';

  confirmDestructiveAction({
    title: `Delete ${listKind}?`,
    message: `Permanently delete "${list.name}"${storeNote}${itemsNote}. Are you sure?`,
    onConfirm: onDelete,
  });
}

function ListAvatar({ list, size = 44 }: { list: GroceryList; size?: number }) {
  if (list.storeName) {
    return <StoreBrandAvatar store={list.storeName} variant="card" size={size} />;
  }
  return (
    <View style={[styles.genericAvatar, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <SymbolView
        name={{ ios: 'list.bullet.clipboard', android: 'checklist', web: 'checklist' }}
        tintColor={SmartCartColors.primaryDark}
        size={Math.round(size * 0.45)}
      />
    </View>
  );
}

function RecurrenceBadge({ recurrence }: { recurrence: GroceryList['recurrence'] }) {
  if (!recurrence) return null;
  return (
    <View style={styles.recurrencePill}>
      <Text style={styles.recurrencePillText}>{recurrence === 'weekly' ? 'Weekly' : 'Monthly'}</Text>
    </View>
  );
}

function CompletedBadge() {
  return (
    <View style={styles.completedPill}>
      <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} tintColor="#15803D" size={12} />
      <Text style={styles.completedPillText}>Completed</Text>
    </View>
  );
}

function ListOptionsSheet({
  visible,
  list,
  itemCount,
  isActive,
  isCompleted,
  options,
  familyShareUnlocked = true,
  onClose,
}: {
  visible: boolean;
  list: GroceryList;
  itemCount: number;
  isActive: boolean;
  isCompleted: boolean;
  options: ListOptionsHandlers;
  familyShareUnlocked?: boolean;
  onClose: () => void;
}) {
  const deleteLabel = list.storeName ? 'Delete store list' : 'Delete list';
  const [mode, setMode] = useState<'menu' | 'rename'>('menu');
  const [renameValue, setRenameValue] = useState(list.name);

  useEffect(() => {
    if (visible) {
      setMode('menu');
      setRenameValue(list.name);
    }
  }, [visible, list.name]);

  const runAfterClose = useCallback(
    (action: () => void | Promise<void>) => {
      onClose();
      requestAnimationFrame(() => {
        void Promise.resolve(action());
      });
    },
    [onClose]
  );

  const handleSaveRename = useCallback(() => {
    const next = renameValue.trim();
    if (!next || next === list.name) {
      onClose();
      return;
    }
    onClose();
    requestAnimationFrame(() => {
      void Promise.resolve(options.onRename(next));
    });
  }, [renameValue, list.name, onClose, options]);

  if (mode === 'rename') {
    return (
      <AppBottomSheetModal visible={visible} onClose={onClose}>
        <View style={styles.optionsSheet}>
          <Text style={styles.optionsSheetTitle}>Rename list</Text>
          <Text style={styles.optionsSheetSubtitle}>Choose a name you will recognize while shopping.</Text>
          <TextInput
            style={styles.renameInput}
            value={renameValue}
            onChangeText={setRenameValue}
            placeholder="List name"
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleSaveRename}
            {...(Platform.OS === 'web' ? { autoComplete: 'off' as const } : null)}
          />
          <Pressable
            style={({ pressed }) => [styles.optionsPrimaryBtn, pressed && styles.optionsActionPressed]}
            accessibilityRole="button"
            onPress={handleSaveRename}>
            <Text style={styles.optionsPrimaryBtnText}>Save name</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.optionsCancel, pressed && styles.optionsCancelPressed]}
            accessibilityRole="button"
            onPress={() => setMode('menu')}>
            <Text style={styles.optionsCancelText}>Back</Text>
          </Pressable>
        </View>
      </AppBottomSheetModal>
    );
  }

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <View style={styles.optionsSheet}>
        <Text style={styles.optionsSheetTitle}>{list.name}</Text>
        <Text style={styles.optionsSheetSubtitle}>
          {itemCount} item{itemCount === 1 ? '' : 's'}
          {list.storeName ? ` · ${list.storeName}` : ''}
        </Text>

        {isActive ? (
          <View style={styles.optionsActionDisabled}>
            <SymbolView
              name={{ ios: 'star.fill', android: 'star', web: 'star' }}
              tintColor={SmartCartColors.textMuted}
              size={18}
            />
            <Text style={styles.optionsActionDisabledText}>Already active</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.optionsAction, pressed && styles.optionsActionPressed]}
            accessibilityRole="button"
            onPress={() => runAfterClose(options.onActivate)}>
            <SymbolView
              name={{ ios: 'star', android: 'star_border', web: 'star_border' }}
              tintColor={SmartCartColors.primaryDark}
              size={18}
            />
            <Text style={styles.optionsActionText}>Set as active</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.optionsAction, pressed && styles.optionsActionPressed]}
          accessibilityRole="button"
          onPress={() => setMode('rename')}>
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            tintColor={SmartCartColors.primaryDark}
            size={18}
          />
          <Text style={styles.optionsActionText}>Rename</Text>
        </Pressable>

        {options.onShare ? (
          <Pressable
            style={({ pressed }) => [styles.optionsShare, pressed && styles.optionsSharePressed]}
            accessibilityRole="button"
            onPress={() => runAfterClose(options.onShare!)}>
            <SymbolView
              name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
              tintColor={SmartCartColors.primaryDark}
              size={18}
            />
            <View style={styles.optionsShareCopy}>
              <Text style={styles.optionsShareText}>
                Share with family{familyShareUnlocked ? '' : ' (Pro)'}
              </Text>
              {!familyShareUnlocked ? (
                <Text style={styles.optionsShareHint}>Upgrade to share lists with your household</Text>
              ) : null}
            </View>
          </Pressable>
        ) : null}

        {isCompleted ? (
          <View style={styles.optionsActionDisabled}>
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              tintColor={SmartCartColors.primaryDark}
              size={18}
            />
            <Text style={styles.optionsActionDisabledText}>List completed</Text>
          </View>
        ) : itemCount === 0 ? (
          <View style={styles.optionsActionDisabled}>
            <SymbolView
              name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
              tintColor={SmartCartColors.textMuted}
              size={18}
            />
            <Text style={styles.optionsActionDisabledText}>Add items to complete</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.optionsComplete, pressed && styles.optionsCompletePressed]}
            accessibilityRole="button"
            onPress={() => runAfterClose(options.onComplete)}>
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              tintColor={SmartCartColors.primaryDark}
              size={18}
            />
            <Text style={styles.optionsCompleteText}>Complete list</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.optionsActionDanger, pressed && styles.optionsActionDangerPressed]}
          accessibilityRole="button"
          onPress={() => {
            onClose();
            requestAnimationFrame(() => {
              confirmDeleteList(list, itemCount, () => {
                void Promise.resolve(options.onDelete());
              });
            });
          }}>
          <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={SmartCartColors.danger} size={18} />
          <Text style={styles.optionsActionDangerText}>{deleteLabel}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.optionsCancel, pressed && styles.optionsCancelPressed]}
          accessibilityRole="button"
          onPress={onClose}>
          <Text style={styles.optionsCancelText}>Cancel</Text>
        </Pressable>
      </View>
    </AppBottomSheetModal>
  );
}

export function ShoppingListCard({
  list,
  items,
  variant = 'default',
  isActive = false,
  subtitle,
  onOpen,
  onAddItem,
  options,
  checkedIds,
  onToggleChecked,
  onItemPress,
  customCatalogByKey,
  inlineItems = false,
  expanded = true,
  onToggleExpand,
  showQuickDelete = false,
  familyShareUnlocked = true,
}: Props) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const itemCount = items.length;
  const planned = sumPlannedTotal(items);
  const isStoreList = Boolean(list.storeName);
  const storeAccent = list.storeName ? (STORE_BRAND[list.storeName]?.color ?? SmartCartColors.primary) : SmartCartColors.primary;
  const isEmpty = itemCount === 0;
  const isCompleted = Boolean(list.completedAt);
  const checkedCount = inlineItems ? items.filter((item) => checkedIds?.has(item.id)).length : 0;

  const openOptions = useCallback(() => {
    if (options) setOptionsOpen(true);
  }, [options]);

  const handleQuickDelete = useCallback(() => {
    if (options) confirmDeleteList(list, itemCount, options.onDelete);
  }, [options, list, itemCount]);

  if (variant === 'hero') {
    const isCollapsed = inlineItems && !expanded;

    return (
      <>
        <View style={[styles.heroWrap, isCompleted && styles.heroWrapCompleted, isCollapsed && styles.heroWrapCollapsed]}>
          <LinearGradient
            colors={
              isCompleted
                ? ['#FEFCE8', '#FEF9C3', '#FDE68A']
                : ['#ECFDF5', '#DCFCE7', '#BBF7D0']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroGradient,
              isCompleted && styles.heroGradientCompleted,
              isCollapsed && styles.heroGradientCollapsed,
            ]}>
            {isCollapsed ? (
              <View style={styles.heroCollapsedRow}>
                <Pressable
                  style={({ pressed }) => [styles.heroCollapsedMain, pressed && styles.heroCollapsedPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Expand ${list.name}`}
                  accessibilityState={{ expanded: false }}
                  onPress={onToggleExpand ?? onOpen}>
                  <ListAvatar list={list} size={40} />
                  <View style={styles.heroCollapsedCopy}>
                    <Text style={styles.heroCollapsedTitle} numberOfLines={1}>
                      {list.name}
                    </Text>
                    <Text style={styles.heroCollapsedMeta} numberOfLines={1}>
                      {itemCount} item{itemCount === 1 ? '' : 's'} · {formatCurrency(planned)} est.
                    </Text>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                    tintColor={SmartCartColors.primaryDark}
                    size={20}
                  />
                </Pressable>
                {options ? (
                  <Pressable
                    style={({ pressed }) => [styles.optionsBtn, styles.optionsBtnHero, pressed && styles.optionsPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="List options"
                    hitSlop={8}
                    onPress={openOptions}>
                    <SymbolView
                      name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
                      tintColor={SmartCartColors.primaryDark}
                      size={18}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <>
            <View style={styles.heroTop}>
              <View style={styles.heroBadgeRow}>
                {isCompleted ? (
                  <View style={styles.completedHeroBadge}>
                    <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} tintColor="#15803D" size={12} />
                    <Text style={styles.completedHeroBadgeText}>Completed</Text>
                  </View>
                ) : isActive ? (
                  <View style={styles.activeBadge}>
                    <SymbolView name={{ ios: 'star.fill', android: 'star', web: 'star' }} tintColor={SmartCartColors.primaryDark} size={12} />
                    <Text style={styles.activeBadgeText}>Active list</Text>
                  </View>
                ) : null}
                {list.storeName ? (
                  <View style={styles.heroStorePill}>
                    <StoreBrandAvatar store={list.storeName} size={18} />
                    <Text style={styles.heroStoreText}>{list.storeName}</Text>
                  </View>
                ) : null}
              </View>
              {options ? (
                <Pressable
                  style={({ pressed }) => [styles.optionsBtn, styles.optionsBtnHero, pressed && styles.optionsPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="List options"
                  hitSlop={8}
                  onPress={openOptions}>
                  <SymbolView
                    name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
                    tintColor={SmartCartColors.primaryDark}
                    size={18}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.heroBody}>
              <ListAvatar list={list} size={52} />
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {list.name}
                </Text>
                {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
                <Text style={styles.heroMeta}>
                  {inlineItems && itemCount > 0
                    ? `${checkedCount}/${itemCount} checked · ${formatCurrency(planned)} est.`
                    : `${itemCount} item${itemCount === 1 ? '' : 's'} · ${formatCurrency(planned)} est.`}
                </Text>
                <RecurrenceBadge recurrence={list.recurrence} />
              </View>
            </View>

            {inlineItems ? (
              <View style={styles.heroItemsSection}>
                {itemCount > 0 ? (
                  <>
                    <LinearProgressBar
                      percent={itemCount > 0 ? checkedCount / itemCount : 0}
                      height={4}
                    />
                    <View style={styles.heroItemsList}>
                      {items.map((item) => (
                        <ShoppingListItemRow
                          key={item.id}
                          item={item}
                          checked={checkedIds?.has(item.id) ?? false}
                          onToggleChecked={() => onToggleChecked?.(item.id)}
                          onPress={() => (onItemPress ? onItemPress(item) : onOpen())}
                          customCatalogByKey={customCatalogByKey}
                          variant="hero"
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={styles.heroEmptyItems}>
                    <Text style={styles.heroEmptyItemsText}>No items yet — tap Add item to start.</Text>
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.heroActions}>
              {inlineItems ? (
                <>
                  <Pressable
                    style={({ pressed }) => [styles.heroPrimaryBtn, pressed && styles.btnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Add item"
                    onPress={onAddItem ?? onOpen}>
                    <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor="#fff" size={16} />
                    <Text style={styles.heroPrimaryBtnText}>Add item</Text>
                  </Pressable>
                  {options?.onShare && isActive ? (
                    <Pressable
                      style={({ pressed }) => [styles.heroShareBtn, pressed && styles.heroSharePressed]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        familyShareUnlocked ? 'Share with family' : 'Share with family, Pro feature'
                      }
                      onPress={() => void Promise.resolve(options.onShare?.())}>
                      <SymbolView
                        name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                        tintColor={SmartCartColors.primaryDark}
                        size={16}
                      />
                      <Text style={styles.heroShareBtnText}>
                        Share{familyShareUnlocked ? '' : ' · Pro'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={({ pressed }) => [styles.heroDetailsBtn, pressed && styles.heroDetailsPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Full list details"
                    onPress={onOpen}>
                    <Text style={styles.heroDetailsBtnText}>Full details</Text>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      tintColor={SmartCartColors.primaryDark}
                      size={14}
                    />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={({ pressed }) => [styles.heroPrimaryBtn, pressed && styles.btnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Open list"
                    onPress={onOpen}>
                    <Text style={styles.heroPrimaryBtnText}>Open list</Text>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      tintColor="#fff"
                      size={14}
                    />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.heroSecondaryBtn, pressed && styles.heroSecondaryPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Add item"
                    onPress={onAddItem ?? onOpen}>
                    <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={SmartCartColors.primaryDark} size={16} />
                    <Text style={styles.heroSecondaryBtnText}>Add item</Text>
                  </Pressable>
                </>
              )}
            </View>
              </>
            )}
          </LinearGradient>
        </View>
        {options ? (
          <ListOptionsSheet
            visible={optionsOpen}
            list={list}
            itemCount={itemCount}
            isActive={isActive}
            isCompleted={isCompleted}
            options={options}
            familyShareUnlocked={familyShareUnlocked}
            onClose={() => setOptionsOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <MockupCard
        style={[
          styles.card,
          isStoreList && { borderLeftWidth: 4, borderLeftColor: storeAccent },
          !isStoreList && styles.generalCard,
          variant === 'muted' && styles.mutedCard,
          isActive && styles.activeOutline,
          isCompleted && styles.completedOutline,
        ]}>
        <View style={styles.cardRow}>
          <Pressable
            style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${list.name}`}
            onPress={onOpen}
            onLongPress={openOptions}>
            <ListAvatar list={list} size={42} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, variant === 'muted' && styles.mutedTitle]} numberOfLines={1}>
                {list.name}
              </Text>
              {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
              <View style={styles.metaRow}>
                <Text style={[styles.cardMeta, variant === 'muted' && styles.mutedMeta]}>
                  {itemCount} item{itemCount === 1 ? '' : 's'} · {formatCurrency(planned)} est.
                </Text>
                {isEmpty ? (
                  <View style={styles.emptyBadge}>
                    <Text style={styles.emptyBadgeText}>Empty</Text>
                  </View>
                ) : null}
                {isActive ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                ) : null}
                {isCompleted ? <CompletedBadge /> : null}
                <RecurrenceBadge recurrence={list.recurrence} />
              </View>
            </View>
          </Pressable>

          {options ? (
            <View style={styles.cardActions}>
              {showQuickDelete ? (
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, pressed && styles.optionsPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${list.name}`}
                  hitSlop={8}
                  onPress={handleQuickDelete}>
                  <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={SmartCartColors.danger} size={18} />
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.optionsBtn, pressed && styles.optionsPressed]}
                accessibilityRole="button"
                accessibilityLabel="List options"
                hitSlop={8}
                onPress={openOptions}>
                <SymbolView
                  name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
                  tintColor={SmartCartColors.textMuted}
                  size={18}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      </MockupCard>

      {options ? (
        <ListOptionsSheet
          visible={optionsOpen}
          list={list}
          itemCount={itemCount}
          isActive={isActive}
          isCompleted={isCompleted}
          options={options}
          familyShareUnlocked={familyShareUnlocked}
          onClose={() => setOptionsOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  heroWrap: { marginBottom: 20, borderRadius: SmartCartRadius.lg, overflow: 'hidden', ...SmartCartShadow.card },
  heroWrapCompleted: { ...SmartCartShadow.glow },
  heroWrapCollapsed: { marginBottom: 8 },
  heroGradient: {
    padding: 18,
    borderRadius: SmartCartRadius.lg,
    borderWidth: 2,
    borderColor: SmartCartColors.primary,
  },
  heroGradientCompleted: {
    borderColor: '#FACC15',
  },
  heroGradientCollapsed: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroCollapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCollapsedMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  heroCollapsedPressed: { opacity: 0.92 },
  heroCollapsedCopy: { flex: 1, gap: 2, minWidth: 0 },
  heroCollapsedTitle: { fontSize: 16, fontWeight: '800', color: SmartCartColors.text },
  heroCollapsedMeta: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SmartCartRadius.pill,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '800', color: SmartCartColors.primaryDark },
  completedHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  completedHeroBadgeText: { fontSize: 11, fontWeight: '800', color: '#15803D' },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  completedPillText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  heroStorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SmartCartRadius.pill,
  },
  heroStoreText: { fontSize: 11, fontWeight: '700', color: SmartCartColors.text },
  heroBody: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  heroTextBlock: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 22, ...SmartCartTypography.display, color: SmartCartColors.text },
  heroSubtitle: { fontSize: 12, color: SmartCartColors.textSecondary },
  heroMeta: { fontSize: 14, fontWeight: '600', color: SmartCartColors.primaryDark, marginTop: 2 },
  heroItemsSection: { marginTop: 14, gap: 8 },
  heroItemsList: { gap: 8 },
  heroEmptyItems: {
    backgroundColor: 'rgba(243, 232, 255, 0.85)',
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  heroEmptyItemsText: { fontSize: 13, fontWeight: '600', color: '#7C3AED', textAlign: 'center' },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SmartCartColors.primary,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 2,
    borderColor: SmartCartColors.primaryDark,
    ...SmartCartShadow.pill,
  },
  heroPrimaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: SmartCartColors.primary,
  },
  heroSecondaryBtnText: { color: SmartCartColors.primaryDark, fontWeight: '700', fontSize: 13 },
  heroDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(22, 101, 52, 0.2)',
  },
  heroDetailsBtnText: { color: SmartCartColors.primaryDark, fontWeight: '700', fontSize: 13 },
  heroShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    borderColor: SmartCartColors.primary,
  },
  heroShareBtnText: { color: SmartCartColors.primaryDark, fontWeight: '800', fontSize: 12 },
  heroSharePressed: { backgroundColor: SmartCartColors.badge },
  heroDetailsPressed: { backgroundColor: SmartCartColors.badge },
  heroSecondaryPressed: { backgroundColor: SmartCartColors.badge },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  card: { marginBottom: 10 },
  generalCard: { backgroundColor: SmartCartColors.card },
  mutedCard: { opacity: 0.72, backgroundColor: SmartCartColors.background },
  activeOutline: { borderColor: SmartCartColors.primary, borderWidth: 2 },
  completedOutline: {
    borderColor: '#FACC15',
    borderWidth: 2,
    backgroundColor: '#FEFCE8',
  },
  cardPressed: { opacity: 0.92 },
  cardRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cardMain: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start', minWidth: 0 },
  genericAvatar: {
    backgroundColor: SmartCartColors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  mutedTitle: { color: SmartCartColors.textSecondary },
  cardSubtitle: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  cardMeta: { fontSize: 13, color: SmartCartColors.textSecondary },
  mutedMeta: { color: SmartCartColors.textMuted },
  emptyBadge: {
    backgroundColor: SmartCartColors.background,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  emptyBadgeText: { fontSize: 10, fontWeight: '700', color: SmartCartColors.textMuted },
  activePill: {
    backgroundColor: SmartCartColors.badge,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: { fontSize: 10, fontWeight: '700', color: SmartCartColors.primaryDark },
  recurrencePill: {
    backgroundColor: '#FEF3C7',
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recurrencePillText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  optionsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsBtnHero: { backgroundColor: 'rgba(255,255,255,0.65)' },
  optionsPressed: { backgroundColor: SmartCartColors.badge },
  optionsSheet: { gap: 8 },
  optionsSheetTitle: { fontSize: 18, fontWeight: '800', color: SmartCartColors.text },
  optionsSheetSubtitle: { fontSize: 14, color: SmartCartColors.textSecondary, marginBottom: 8 },
  optionsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  optionsActionPressed: { backgroundColor: SmartCartColors.badge },
  optionsComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  optionsCompletePressed: { backgroundColor: '#DCFCE7' },
  optionsCompleteText: { fontSize: 15, fontWeight: '800', color: SmartCartColors.primaryDark },
  optionsShare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  optionsSharePressed: { backgroundColor: '#DCFCE7' },
  optionsShareCopy: { flex: 1, gap: 2 },
  optionsShareText: { fontSize: 15, fontWeight: '800', color: SmartCartColors.primaryDark },
  optionsShareHint: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textSecondary },
  optionsActionText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  optionsActionDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  optionsActionDangerPressed: { backgroundColor: '#FEE2E2' },
  optionsActionDangerText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.danger },
  optionsCancel: {
    marginTop: 4,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  optionsCancelPressed: { backgroundColor: SmartCartColors.badge },
  optionsCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: SmartCartColors.textSecondary,
    textAlign: 'center',
  },
  renameInput: {
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    borderRadius: SmartCartRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: SmartCartColors.text,
    backgroundColor: SmartCartColors.card,
    marginBottom: 4,
  },
  optionsPrimaryBtn: {
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: SmartCartColors.primary,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  optionsPrimaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  optionsActionDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SmartCartRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: SmartCartColors.background,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    opacity: 0.72,
  },
  optionsActionDisabledText: { fontSize: 15, fontWeight: '700', color: SmartCartColors.textMuted },
});
