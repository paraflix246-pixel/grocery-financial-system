import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

const OFFERS = [
  { retailer: 'Aldi', rate: '2% back', cap: 'Up to $10/mo', category: 'All groceries' },
  { retailer: 'Walmart', rate: '1.5% back', cap: 'Up to $15/mo', category: 'Online orders' },
  { retailer: 'Target', rate: '3% back', cap: 'Up to $20/mo', category: 'RedCard holders' },
  { retailer: 'Kroger', rate: '2% back', cap: 'Fuel points bonus', category: 'In-store' },
];

export default function CashbackScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <ScreenHeader title="Cashback" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroAmount}>Earn while you shop</Text>
          <Text style={styles.heroSub}>Link your cards to activate cashback at participating retailers.</Text>
        </View>

        {OFFERS.map((offer) => (
          <View key={offer.retailer} style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <Text style={styles.retailer}>{offer.retailer}</Text>
              <View style={styles.rateBadge}>
                <Text style={styles.rateText}>{offer.rate}</Text>
              </View>
            </View>
            <Text style={styles.category}>{offer.category}</Text>
            <Text style={styles.cap}>{offer.cap}</Text>
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Cashback offers shown for demonstration. Activation requires linking a payment method in a future release.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: SmartCartColors.bannerGreen,
    borderRadius: SmartCartRadius.lg,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  heroAmount: { fontSize: 20, fontWeight: '800', color: SmartCartColors.primaryDark },
  heroSub: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 6, lineHeight: 18 },
  offerCard: {
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  retailer: { fontSize: 17, fontWeight: '700', color: SmartCartColors.text },
  rateBadge: {
    backgroundColor: SmartCartColors.accentOrange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SmartCartRadius.pill,
  },
  rateText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  category: { fontSize: 13, color: SmartCartColors.textSecondary, marginTop: 8 },
  cap: { fontSize: 12, color: SmartCartColors.textMuted, marginTop: 4 },
  disclaimer: { marginTop: 16, padding: 14, backgroundColor: SmartCartColors.card, borderRadius: SmartCartRadius.sm },
  disclaimerText: { fontSize: 12, color: SmartCartColors.textMuted, lineHeight: 17 },
});
