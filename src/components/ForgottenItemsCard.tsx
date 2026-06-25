import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ItemEmojiAvatar } from '@/src/components/ItemEmojiAvatar';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import type { RepurchaseCadence } from '@/src/utils/repurchaseCadence';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type Props = {
  items: RepurchaseCadence[];
  onAdd: (item: RepurchaseCadence) => void;
};

export function ForgottenItemsCard({ items, onAdd }: Props) {
  if (items.length === 0) return null;

  const top = items[0];
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Usually buy</Text>
      <View style={styles.row}>
        <ItemEmojiAvatar emoji={getItemEmoji(top.displayName, top.displayName)} size="md" />
        <View style={styles.body}>
          <Text style={styles.message}>
            You usually buy {top.displayName} every {top.medianDaysBetween} days. It&apos;s been{' '}
            {top.daysSinceLastPurchase}. Add them?
          </Text>
        </View>
      </View>
      <Pressable style={styles.btn} onPress={() => onAdd(top)}>
        <Text style={styles.btnText}>Add to list</Text>
      </Pressable>
      {items.length > 1 ? (
        <Text style={styles.more}>{items.length - 1} more item{items.length === 2 ? '' : 's'} overdue</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.lg,
    padding: 16,
    gap: 12,
    ...SmartCartShadow.cardSoft,
  },
  title: { fontSize: 12, fontWeight: '700', color: SmartCartColors.textSecondary },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  body: { flex: 1 },
  message: { fontSize: 14, fontWeight: '600', color: SmartCartColors.text, lineHeight: 20 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: SmartCartColors.primary,
    borderRadius: SmartCartRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  more: { fontSize: 12, color: SmartCartColors.textSecondary },
});
