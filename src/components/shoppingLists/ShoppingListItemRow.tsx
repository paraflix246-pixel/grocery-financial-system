import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/Themed';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { getQuantityLabel } from '@/src/data/starterListItems';
import type { ListItem } from '@/src/models/types';
import type { CustomCatalogEntry } from '@/src/services/customCatalogLogic';
import { resolveListItemEmoji } from '@/src/services/customCatalogLogic';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';
import { formatCurrency } from '@/src/utils/priceParser';

type Props = {
  item: ListItem;
  checked: boolean;
  onToggleChecked: () => void;
  onPress?: () => void;
  customCatalogByKey?: Map<string, CustomCatalogEntry>;
  showDivider?: boolean;
  variant?: 'default' | 'hero';
};

export function ShoppingListItemRow({
  item,
  checked,
  onToggleChecked,
  onPress,
  customCatalogByKey,
  showDivider = false,
  variant = 'default',
}: Props) {
  if (variant === 'hero') {
    return (
      <Pressable
        style={({ pressed }) => [styles.heroBannerWrap, pressed && styles.heroBannerPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={item.name}>
        <LinearGradient
          colors={
            checked
              ? ['#EDE9FE', '#E9D5FF', '#DDD6FE']
              : ['#FAF5FF', '#F3E8FF', '#E9D5FF']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroBanner, checked && styles.heroBannerChecked]}>
          <Pressable
            style={[styles.heroCheckbox, checked && styles.heroCheckboxChecked]}
            onPress={onToggleChecked}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            hitSlop={6}>
            {checked ? (
              <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} tintColor="#fff" size={14} />
            ) : null}
          </Pressable>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.heroItemThumb} />
          ) : (
            <View style={styles.heroEmojiCircle}>
              <ItemEmojiAvatar emoji={resolveListItemEmoji(item.name, customCatalogByKey)} size="sm" />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.heroItemName, checked && styles.itemChecked]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.heroItemQty, checked && styles.itemChecked]}>
              {getQuantityLabel(item.name, item.quantity)}
            </Text>
          </View>
          <View style={styles.heroPricePill}>
            <Text style={[styles.heroItemPrice, checked && styles.itemChecked]}>
              {formatCurrency(item.expectedPrice * item.quantity)}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.row, showDivider && styles.rowDivider]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.name}>
      <Pressable
        style={[styles.checkbox, checked && styles.checkboxChecked]}
        onPress={onToggleChecked}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        hitSlop={6}>
        {checked ? (
          <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} tintColor="#fff" size={14} />
        ) : null}
      </Pressable>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
      ) : (
        <ItemEmojiAvatar emoji={resolveListItemEmoji(item.name, customCatalogByKey)} size="sm" />
      )}
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, checked && styles.itemChecked]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.itemQty, checked && styles.itemChecked]}>
          {getQuantityLabel(item.name, item.quantity)}
        </Text>
      </View>
      <Text style={[styles.itemPrice, checked && styles.itemChecked]}>
        {formatCurrency(item.expectedPrice * item.quantity)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: SmartCartColors.border,
  },
  heroBannerWrap: {
    borderRadius: SmartCartRadius.md,
    ...SmartCartShadow.cardSoft,
  },
  heroBannerPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderRadius: SmartCartRadius.md,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
  },
  heroBannerChecked: {
    borderColor: '#A78BFA',
    opacity: 0.92,
  },
  heroCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#A78BFA',
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCheckboxChecked: {
    backgroundColor: '#9333EA',
    borderColor: '#7E22CE',
  },
  heroEmojiCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  heroItemThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  heroItemName: { fontSize: 15, fontWeight: '800', color: '#5B21B6', letterSpacing: -0.2 },
  heroItemQty: { fontSize: 12, fontWeight: '600', color: '#7C3AED', marginTop: 2 },
  heroPricePill: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SmartCartRadius.pill,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  heroItemPrice: { fontSize: 13, fontWeight: '800', color: '#6D28D9' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SmartCartColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: SmartCartColors.primary,
    borderColor: SmartCartColors.primary,
  },
  itemThumb: {
    width: 32,
    height: 32,
    borderRadius: SmartCartRadius.sm,
    backgroundColor: SmartCartColors.border,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: '700', color: SmartCartColors.text },
  itemChecked: {
    textDecorationLine: 'line-through',
    textDecorationColor: SmartCartColors.danger,
    color: SmartCartColors.danger,
  },
  itemQty: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '800', color: SmartCartColors.text },
});
