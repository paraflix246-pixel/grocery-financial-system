import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

const SPONSORED = [
  { brand: 'Organic Valley', product: 'Grass-fed butter', savings: 'Save $1.50', sponsor: 'Sponsored', emoji: '🧈' },
  { brand: 'Barilla', product: 'Pasta family pack', savings: '20% off', sponsor: 'Sponsored', emoji: '🍝' },
  { brand: 'Chobani', product: 'Greek yogurt 4-pack', savings: 'BOGO', sponsor: 'Sponsored', emoji: '🥣' },
];

export default function SponsoredOffersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Sponsored Offers" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Featured products from brand partners. Offers are clearly labeled and do not affect your spending analytics.
        </Text>

        {SPONSORED.map((item) => (
          <Pressable key={item.product} style={styles.card}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.info}>
              <Text style={styles.brand}>{item.brand}</Text>
              <Text style={styles.product}>{item.product}</Text>
              <View style={styles.tagRow}>
                <View style={styles.sponsorTag}>
                  <Text style={styles.sponsorText}>{item.sponsor}</Text>
                </View>
                <Text style={styles.savings}>{item.savings}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SmartCartColors.background },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 14, color: SmartCartColors.textSecondary, lineHeight: 20, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  emoji: { fontSize: 36 },
  info: { flex: 1 },
  brand: { fontSize: 12, fontWeight: '600', color: SmartCartColors.textMuted, textTransform: 'uppercase' },
  product: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text, marginTop: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  sponsorTag: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  sponsorText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  savings: { fontSize: 13, fontWeight: '700', color: SmartCartColors.primaryDark },
});
