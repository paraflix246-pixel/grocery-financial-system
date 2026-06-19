import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

type Deal = {
  id: string;
  title: string;
  store: string;
  discount: string;
  category: string;
  emoji: string;
};

const CURATED_DEALS: Deal[] = [
  { id: '1', title: 'Weekly produce bundle', store: 'Aldi', discount: '15% off', category: 'Produce', emoji: '🥬' },
  { id: '2', title: 'Family pack chicken', store: 'Walmart', discount: '$2 off', category: 'Meat', emoji: '🍗' },
  { id: '3', title: 'Organic milk gallon', store: 'Target', discount: '10% off', category: 'Dairy', emoji: '🥛' },
  { id: '4', title: 'Bulk paper towels', store: 'Costco', discount: '$5 off', category: 'Household', emoji: '🧻' },
  { id: '5', title: 'Snack variety pack', store: 'Kroger', discount: 'BOGO 50%', category: 'Snacks', emoji: '🍿' },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Marketplace" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Curated grocery deals from partner stores. Tap a deal to learn more — links open in your browser.
        </Text>

        {CURATED_DEALS.map((deal) => (
          <Pressable
            key={deal.id}
            style={({ pressed }) => [styles.dealCard, pressed && styles.dealPressed]}
            onPress={() =>
              WebBrowser.openBrowserAsync(
                `https://www.google.com/search?q=${encodeURIComponent(deal.store + ' ' + deal.title + ' deal')}`
              )
            }>
            <Text style={styles.dealEmoji}>{deal.emoji}</Text>
            <View style={styles.dealInfo}>
              <Text style={styles.dealTitle}>{deal.title}</Text>
              <Text style={styles.dealStore}>{deal.store} · {deal.category}</Text>
            </View>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{deal.discount}</Text>
            </View>
          </Pressable>
        ))}

        <View style={styles.note}>
          <SymbolView name={{ ios: 'info.circle', android: 'info', web: 'info' }} tintColor={SmartCartColors.textMuted} size={16} />
          <Text style={styles.noteText}>
            Deals are illustrative for MVP. Future versions will personalize offers from your shopping history.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 20 },
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  dealPressed: { borderColor: SmartCartColors.primary, backgroundColor: SmartCartColors.badge },
  dealEmoji: { fontSize: 32 },
  dealInfo: { flex: 1 },
  dealTitle: { fontSize: 15, fontWeight: '700', color: SmartCartColors.text },
  dealStore: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
  discountBadge: {
    backgroundColor: SmartCartColors.badge,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SmartCartRadius.pill,
  },
  discountText: { fontSize: 12, fontWeight: '800', color: SmartCartColors.primaryDark },
  note: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 12, color: SmartCartColors.textMuted, lineHeight: 17 },
});
