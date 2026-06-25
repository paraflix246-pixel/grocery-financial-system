import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { HorizontalScrollRow } from '@/src/components/HorizontalScrollRow';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import type { FrequentPurchasedItem } from '@/src/services/priceRecommendationLogic';
import { SmartCartColors, SmartCartRadius } from '@/src/theme/smartCart';
import { formatDisplayDate } from '@/src/utils/dateParser';

type Props = {
  title?: string;
  subtitle?: string;
  items: FrequentPurchasedItem[];
  existingNames: Set<string>;
  onAdd: (item: FrequentPurchasedItem) => void;
  loading?: boolean;
  /** Hide items already on the list instead of showing them as disabled. */
  hideOnList?: boolean;
  onHide?: () => void;
};

function SectionHeader({
  title,
  subtitle,
  onHide,
}: {
  title: string;
  subtitle?: string;
  onHide?: () => void;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onHide ? (
        <Pressable
          style={({ pressed }) => [styles.hideBtn, pressed && styles.hideBtnPressed]}
          onPress={onHide}
          accessibilityRole="button"
          accessibilityLabel="Hide suggestions">
          <Text style={styles.hideBtnText}>Hide suggestions</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function BuyAgainSection({
  title = 'Buy Again',
  subtitle = 'Tap to add from your purchase history',
  items,
  existingNames,
  onAdd,
  loading,
  hideOnList = false,
  onHide,
}: Props) {
  const visibleItems = hideOnList
    ? items.filter((item) => !existingNames.has(item.name.toLowerCase()))
    : items;

  if (loading) {
    return (
      <View style={styles.card}>
        <SectionHeader title={title} subtitle={subtitle} onHide={onHide} />
        <Text style={styles.hint}>Loading your usual items…</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.card}>
        <SectionHeader title={title} subtitle={subtitle} onHide={onHide} />
        <Text style={styles.hint}>Scan receipts to see what you buy most often.</Text>
      </View>
    );
  }

  if (hideOnList && visibleItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <SectionHeader title={title} subtitle={subtitle} onHide={onHide} />
      <HorizontalScrollRow contentContainerStyle={styles.row}>
        {visibleItems.map((item) => {
          const onList = existingNames.has(item.name.toLowerCase());
          return (
            <Pressable
              key={item.canonicalName}
              style={[styles.chip, onList && styles.chipOnList]}
              onPress={() => onAdd(item)}
              disabled={onList}
              accessibilityLabel={`Add ${item.name}`}>
              <ItemEmojiAvatar emoji={getItemEmoji(item.canonicalName, item.name)} size="sm" />
              <View style={styles.chipBody}>
                <Text style={styles.chipName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.chipMeta}>
                  {onList ? 'On list' : formatDisplayDate(item.lastPurchaseDate)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </HorizontalScrollRow>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.badgeGreen,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerCopy: { flex: 1, gap: 2, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '800', color: SmartCartColors.text },
  subtitle: { fontSize: 12, color: SmartCartColors.textSecondary },
  hideBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SmartCartRadius.pill,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    flexShrink: 0,
  },
  hideBtnPressed: { opacity: 0.85 },
  hideBtnText: { fontSize: 11, fontWeight: '700', color: SmartCartColors.textSecondary },
  hint: { fontSize: 12, color: SmartCartColors.textSecondary },
  row: { gap: 10, paddingVertical: 2 },
  chip: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: SmartCartRadius.md,
    backgroundColor: SmartCartColors.card,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
  },
  chipOnList: { opacity: 0.55 },
  chipBody: { flex: 1 },
  chipName: { fontSize: 12, fontWeight: '700', color: SmartCartColors.text },
  chipMeta: { fontSize: 10, color: SmartCartColors.textSecondary, marginTop: 2 },
});
