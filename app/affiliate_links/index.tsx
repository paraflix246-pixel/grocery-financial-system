import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { SmartCartColors, SmartCartRadius, SmartCartShadow } from '@/src/theme/smartCart';

const PARTNERS = [
  { name: 'Instacart', desc: 'Same-day grocery delivery', url: 'https://www.instacart.com', emoji: '🛵' },
  { name: 'Amazon Fresh', desc: 'Prime grocery delivery', url: 'https://www.amazon.com/fresh', emoji: '📦' },
  { name: 'Walmart Grocery', desc: 'Pickup & delivery', url: 'https://www.walmart.com/grocery', emoji: '🏪' },
  { name: 'Kroger Delivery', desc: 'Ship & deliver', url: 'https://www.kroger.com/delivery', emoji: '🚚' },
  { name: 'Target Shipt', desc: 'Target same-day', url: 'https://www.target.com/c/shipt', emoji: '🎯' },
];

export default function AffiliateLinksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Delivery Partners" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Order groceries for delivery through our affiliate partners. SmartCart may earn a commission on qualifying orders.
        </Text>

        {PARTNERS.map((partner) => (
          <Pressable
            key={partner.name}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => WebBrowser.openBrowserAsync(partner.url)}>
            <Text style={styles.emoji}>{partner.emoji}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{partner.name}</Text>
              <Text style={styles.desc}>{partner.desc}</Text>
            </View>
            <SymbolView
              name={{ ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' }}
              tintColor={SmartCartColors.primary}
              size={18}
            />
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
    alignItems: 'center',
    backgroundColor: SmartCartColors.card,
    borderRadius: SmartCartRadius.md,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: SmartCartColors.border,
    ...SmartCartShadow.cardSoft,
  },
  cardPressed: { borderColor: SmartCartColors.primary },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: SmartCartColors.text },
  desc: { fontSize: 12, color: SmartCartColors.textSecondary, marginTop: 2 },
});
